import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';
import { useI18n } from '@/features/i18n/i18n';

export default function AboutScreen() {
  const { t } = useI18n();

  return (
    <Screen>
      <Section title={t('about.title')}>
        <ThemedText>
          {t('about.intro')}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {t('about.build')}
        </ThemedText>
      </Section>

      <Section title={t('about.editorialTitle')}>
        <ThemedText themeColor="textSecondary">
          {t('about.editorialBody')}
        </ThemedText>
      </Section>
    </Screen>
  );
}
