import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';

import { SourceLinkButtons, SourceReferenceList } from '@/components/source-reference-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';
import { religiousContentTypeLabels } from '@/data/labels';
import { getReligiousContentBySlug } from '@/data/religiousContent';
import { getSourceReferencesByIds } from '@/data/sourceReferences';
import { singleRouteParam } from '@/features/navigation/routes';
import { useBookmarks } from '@/features/storage/useBookmarks';
import { useReaderPreferences } from '@/features/storage/useReaderPreferences';
import { useReadingPosition } from '@/features/storage/useReadingPosition';
import { Spacing } from '@/constants/theme';

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = singleRouteParam(params.slug);
  const content = getReligiousContentBySlug(slug);
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { preferences, setArabicFontScale } = useReaderPreferences();
  const { saveReadingPosition } = useReadingPosition();

  if (!content) {
    return (
      <Screen>
        <ThemedText type="heading">Leseeintrag nicht gefunden</ThemedText>
        <Button icon="search" label="Inhalte suchen" onPress={() => router.push('/search')} />
      </Screen>
    );
  }

  const bookmarkKey = `content:${content.slug}`;
  const sources = getSourceReferencesByIds(content.sourceReferences);
  const sourceText = sources
    .map((source) => `${source.title}${source.url ? `\n${source.url}` : ''}`)
    .join('\n');
  const readerText = [
    content.title,
    content.arabicText,
    content.transliteration,
    content.translation,
    content.notes,
    sourceText ? `Quellen:\n${sourceText}` : undefined,
  ]
    .filter(Boolean)
    .join('\n\n');

  return (
    <Screen
      onScroll={(event) => {
        saveReadingPosition(content.slug, event.nativeEvent.contentOffset.y);
      }}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="eyebrow" themeColor="accent">
            {religiousContentTypeLabels[content.type]}
          </ThemedText>
          <ThemedText type="title">{content.title}</ThemedText>
          <ThemedText themeColor="textSecondary">
            Version {content.version}. Geprüft von: {content.reviewedBy ?? 'Prüfung ausstehend'}.
          </ThemedText>
        </View>
        <Badge status={content.verificationStatus} />
      </View>

      <View style={styles.actions}>
        <Button
          icon="bookmark"
          label={isBookmarked(bookmarkKey) ? 'Gespeichert' : 'Speichern'}
          onPress={() => toggleBookmark(bookmarkKey)}
        />
        <Button
          icon="copy"
          label="Kopieren"
          variant="secondary"
          onPress={() => Clipboard.setStringAsync(readerText)}
        />
        <Button
          icon="share"
          label="Teilen"
          variant="secondary"
          onPress={() => Share.share({ title: content.title, message: readerText })}
        />
      </View>

      <View style={styles.fontControls}>
        <Button
          icon="minus"
          label="Text"
          variant="ghost"
          onPress={() => setArabicFontScale(Math.max(0.85, preferences.arabicFontScale - 0.1))}
        />
        <ThemedText type="smallBold">{Math.round(preferences.arabicFontScale * 100)}%</ThemedText>
        <Button
          icon="plus"
          label="Text"
          variant="ghost"
          onPress={() => setArabicFontScale(Math.min(1.6, preferences.arabicFontScale + 0.1))}
        />
      </View>

      <Section title="Volltext von duas.org">
        <ThemedText themeColor="textSecondary">
          Der Volltext ist aktuell über die Originalquelle verlinkt und wird erst nach Rechte- und
          Inhaltsprüfung offline in die App übernommen.
        </ThemedText>
        <SourceLinkButtons label="duas.org öffnen" sources={sources} />
      </Section>

      <Section title="Arabisch">
        <ThemedText
          style={[
            styles.arabic,
            {
              fontSize: 28 * preferences.arabicFontScale,
              lineHeight: 46 * preferences.arabicFontScale,
            },
          ]}>
          {content.arabicText}
        </ThemedText>
      </Section>

      <Section title="Transliteration">
        <ThemedText>{content.transliteration}</ThemedText>
      </Section>

      <Section title="Übersetzung">
        <ThemedText>{content.translation}</ThemedText>
      </Section>

      <Section title="Notizen">
        <ThemedText themeColor="textSecondary">{content.notes}</ThemedText>
      </Section>

      <Section title="Quellenangaben">
        <SourceReferenceList sources={sources} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  fontControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  arabic: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
