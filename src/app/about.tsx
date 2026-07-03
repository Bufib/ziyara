import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';

export default function AboutScreen() {
  return (
    <Screen>
      <Section title="Über Shia Ziyarah Iraq">
        <ThemedText>
          Shia Ziyarah Iraq ist als Offline-First-Begleiter für Pilgerinnen und Pilger aufgebaut,
          die wichtige schiitische Ziyarah-Orte im Irak besuchen.
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Der aktuelle Build nutzt Expo SDK 57, Expo Router, TypeScript, React Native Maps, Expo
          Location, SQLite-Vorbereitung und lokal gespeicherte Einstellungen.
        </ThemedText>
      </Section>

      <Section title="Redaktionelles Prinzip">
        <ThemedText themeColor="textSecondary">
          Religiöse Texte, Übersetzungen, Transliterationen und Aussagen dürfen nur mit
          Quellenangaben und qualifizierter Prüfung ergänzt werden. Platzhalter bleiben sichtbar,
          bis diese Prüfung abgeschlossen ist.
        </ThemedText>
      </Section>
    </Screen>
  );
}
