import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';

export default function DisclaimerScreen() {
  return (
    <Screen>
      <Section title="Inhaltlicher Hinweis">
        <ThemedText>
          Diese App ist ein Software-Begleiter und Inhaltscontainer. Sie ist keine religiöse
          Autorität.
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Duas, Ziyarat, Übersetzungen, historische Hinweise, empfohlene Handlungen und Ortsdaten
          sollten von qualifizierten Gelehrten oder Redakteuren geprüft werden, bevor sie als
          verifiziert gelten.
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Platzhaltertext wird verwendet, solange geprüftes Arabisch, Transliteration, Übersetzung
          oder Quellenangaben noch nicht vorliegen.
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Verlinkte duas.org-Seiten dienen als externe Quelle. Volltexte werden erst nach
          Rechteklärung und fachlicher Inhaltsprüfung offline gespeichert.
        </ThemedText>
      </Section>
    </Screen>
  );
}
