import { SourceReferenceList } from '@/components/source-reference-list';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';
import { sourceReferences } from '@/data/sourceReferences';

export default function SourcesScreen() {
  return (
    <Screen>
      <Section title="Quellenregel">
        <ThemedText>
          Jeder geprüfte religiöse Eintrag muss eine Quelle nennen. Empfohlene Handlungen ohne
          Quelle bleiben als „zu prüfen“ markiert.
        </ThemedText>
      </Section>

      <Section title="Aktuelle Quellen">
        <SourceReferenceList
          showNotes
          showOpenButton
          sources={sourceReferences}
          titleType="heading"
        />
      </Section>
    </Screen>
  );
}
