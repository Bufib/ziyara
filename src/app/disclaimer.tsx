import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';
import { useI18n } from '@/features/i18n/i18n';

export default function DisclaimerScreen() {
  const { t } = useI18n();

  return (
    <Screen>
      <Section title={t('disclaimer.title')}>
        <ThemedText>
          {t('disclaimer.body1')}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {t('disclaimer.body2')}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {t('disclaimer.body3')}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {t('disclaimer.body4')}
        </ThemedText>
      </Section>
    </Screen>
  );
}
