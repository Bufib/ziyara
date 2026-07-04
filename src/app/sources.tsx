import { SourceReferenceList } from '@/components/source-reference-list';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';
import { sourceReferences } from '@/data/sourceReferences';
import { useI18n } from '@/features/i18n/i18n';
import { localizeSourceReferences } from '@/features/i18n/localizedData';

export default function SourcesScreen() {
  const { language, t } = useI18n();
  const localizedSources = localizeSourceReferences(sourceReferences, language);

  return (
    <Screen>
      <Section title={t('sources.ruleTitle')}>
        <ThemedText>
          {t('sources.ruleBody')}
        </ThemedText>
      </Section>

      <Section title={t('sources.current')}>
        <SourceReferenceList
          showNotes
          showOpenButton
          sources={localizedSources}
          titleType="heading"
        />
      </Section>
    </Screen>
  );
}
