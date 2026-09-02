import { Redirect } from "expo-router";
import { useEffect } from "react";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { Colors } from "@/constants/theme";
import { useAuth } from "@/features/auth/auth-context";
import { useI18n } from "@/features/i18n/i18n";
import { onboardingRoute } from "@/features/navigation/routes";
import {
  getOnboardingGateDecision,
  useOnboarding,
} from "@/features/onboarding/onboarding-state";
import { useResolvedTheme } from "@/features/theme/theme-mode";

export default function TabsLayout() {
  const scheme = useResolvedTheme();
  const colors = Colors[scheme];
  const { isLoading: isAuthLoading, session } = useAuth();
  const { t } = useI18n();
  const { completeOnboarding, hasCompletedOnboarding, loaded } = useOnboarding();
  const gateDecision = getOnboardingGateDecision(loaded, hasCompletedOnboarding);

  useEffect(() => {
    if (loaded && session && !hasCompletedOnboarding) {
      completeOnboarding();
    }
  }, [completeOnboarding, hasCompletedOnboarding, loaded, session]);

  if (gateDecision === "loading" || (gateDecision === "onboarding" && isAuthLoading)) {
    return null;
  }

  if (gateDecision === "onboarding" && !session) {
    return <Redirect href={onboardingRoute()} />;
  }

  return (
    <NativeTabs
      backgroundColor={colors.background}
      iconColor={{ default: colors.textSecondary, selected: colors.accent }}
      indicatorColor={colors.backgroundSelected}
      labelStyle={{
        default: { color: colors.textSecondary, fontSize: 12 },
        selected: { color: colors.text, fontSize: 12 },
      }}
      tintColor={colors.accent}
      unstable_nativeProps={{ colorScheme: scheme }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t("nav.home")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md={{ default: "home", selected: "home_filled" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="map">
        <NativeTabs.Trigger.Label>{t("nav.map")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "map", selected: "map.fill" }}
          md="map"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>{t("nav.search")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="bookmarks">
        <NativeTabs.Trigger.Label>{t("nav.bookmarks")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "bookmark", selected: "bookmark.fill" }}
          md={{ default: "bookmark_border", selected: "bookmark" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{t("nav.settings")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          md="settings"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
