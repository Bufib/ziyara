import { useRouter } from 'expo-router';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { useBusManagement } from '@/features/bus-management/bus-management-context';
import {
  cancelGeneralAlarmReminders,
  inspectGeneralAlarmNotificationState,
  openGeneralAlarmNotificationSettings,
  registerGeneralAlarmNotifications,
  subscribeToGeneralAlarmNotificationResponses,
  syncGeneralAlarmReminders,
  unregisterGeneralAlarmNotifications,
} from '@/features/general-alarm/general-alarm-notifications';
import type { GeneralAlarmNotificationState } from '@/features/general-alarm/general-alarm-notifications.types';
import { buildGeneralAlarmReminderPlans } from '@/features/general-alarm/general-alarm-reminders';
import { useI18n } from '@/features/i18n/i18n';

type GeneralAlarmNotificationsContextValue = GeneralAlarmNotificationState & {
  disable: () => Promise<void>;
  enable: () => Promise<void>;
  isWorking: boolean;
  openSettings: () => Promise<void>;
};

const initialState: GeneralAlarmNotificationState = {
  availability: 'checking',
  permissionGranted: false,
};

const GeneralAlarmNotificationsContext =
  createContext<GeneralAlarmNotificationsContextValue | null>(null);

export function GeneralAlarmNotificationsProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const { isAdmin, session } = useAuth();
  const { activeBoarding, participants } = useBusManagement();
  const { language, t } = useI18n();
  const [notificationState, setNotificationState] = useState(initialState);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    const subscription = subscribeToGeneralAlarmNotificationResponses(() => {
      router.push('/bus');
    });
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    let isActive = true;

    if (!session?.user.id) {
      void cancelGeneralAlarmReminders();
      return () => {
        isActive = false;
      };
    }

    void inspectGeneralAlarmNotificationState().then(async (state) => {
      if (!isActive) return;
      setNotificationState(state);

      if (state.permissionGranted) {
        const registered = await registerGeneralAlarmNotifications(language, false);
        if (isActive) setNotificationState(registered);
      }
    });

    return () => {
      isActive = false;
    };
  }, [language, session?.user.id]);

  useEffect(() => {
    if (
      !session?.user.id ||
      isAdmin ||
      !notificationState.permissionGranted ||
      !activeBoarding
    ) {
      void cancelGeneralAlarmReminders();
      return;
    }

    const plans = buildGeneralAlarmReminderPlans(activeBoarding, participants);
    const reminders = plans.flatMap((plan) =>
      plan.fireDates.map((fireDate) => ({
        boardingId: plan.boardingId,
        body: t(`generalAlarm.notification.reminder.${plan.nextStatus}`, {
          code: plan.participantCode,
        }),
        fireDate,
        nextStatus: plan.nextStatus,
        participantId: plan.participantId,
        title: t('generalAlarm.notification.title'),
      })),
    );

    void syncGeneralAlarmReminders(reminders).catch(() => {
      setNotificationState((current) => ({
        availability: 'error',
        permissionGranted: current.permissionGranted,
      }));
    });
  }, [activeBoarding, isAdmin, notificationState.permissionGranted, participants, session?.user.id, t]);

  const enable = useCallback(async () => {
    if (isWorking) return;
    setIsWorking(true);
    const state = await registerGeneralAlarmNotifications(language, true);
    setNotificationState(state);
    setIsWorking(false);
  }, [isWorking, language]);

  const disable = useCallback(async () => {
    if (isWorking) return;
    setIsWorking(true);

    try {
      await unregisterGeneralAlarmNotifications();
      setNotificationState({ availability: 'denied', permissionGranted: false });
    } catch {
      setNotificationState((current) => ({
        availability: 'error',
        permissionGranted: current.permissionGranted,
      }));
    } finally {
      setIsWorking(false);
    }
  }, [isWorking]);

  const value = useMemo<GeneralAlarmNotificationsContextValue>(
    () => ({
      ...notificationState,
      disable,
      enable,
      isWorking,
      openSettings: openGeneralAlarmNotificationSettings,
    }),
    [disable, enable, isWorking, notificationState],
  );

  return (
    <GeneralAlarmNotificationsContext.Provider value={value}>
      {children}
    </GeneralAlarmNotificationsContext.Provider>
  );
}

export function useGeneralAlarmNotifications() {
  const value = useContext(GeneralAlarmNotificationsContext);
  if (!value) {
    throw new Error(
      'useGeneralAlarmNotifications must be used inside GeneralAlarmNotificationsProvider.',
    );
  }
  return value;
}
