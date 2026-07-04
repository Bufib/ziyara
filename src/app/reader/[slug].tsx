import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';

import { SourceLinkButtons, SourceReferenceList } from '@/components/source-reference-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';
import { getReligiousContentBySlug } from '@/data/religiousContent';
import { getSourceReferencesByIds } from '@/data/sourceReferences';
import { useI18n } from '@/features/i18n/i18n';
import {
  localizeReligiousContent,
  localizeSourceReferences,
} from '@/features/i18n/localizedData';
import { singleRouteParam } from '@/features/navigation/routes';
import { SegmentedReligiousText } from '@/features/reader/SegmentedReligiousText';
import { useBookmarks } from '@/features/storage/useBookmarks';
import { useReaderPreferences } from '@/features/storage/useReaderPreferences';
import { useReadingPosition } from '@/features/storage/useReadingPosition';
import { Spacing } from '@/constants/theme';

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = singleRouteParam(params.slug);
  const rawContent = getReligiousContentBySlug(slug);
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { preferences, setArabicFontScale } = useReaderPreferences();
  const { saveReadingPosition } = useReadingPosition();
  const { language, t } = useI18n();
  const content = rawContent ? localizeReligiousContent(rawContent, language) : undefined;

  if (!content) {
    return (
      <Screen>
        <ThemedText type="heading">{t('reader.notFound')}</ThemedText>
        <Button icon="search" label={t('reader.findContent')} onPress={() => router.push('/search')} />
      </Screen>
    );
  }

  const bookmarkKey = `content:${content.slug}`;
  const sources = localizeSourceReferences(getSourceReferencesByIds(content.sourceReferences), language);
  const sourceText = sources
    .map((source) => `${source.title}${source.url ? `\n${source.url}` : ''}`)
    .join('\n');
  const readerText = [
    content.title,
    content.arabicText,
    content.transliteration,
    content.translation,
    content.notes,
    sourceText ? `${t('reader.sourcesShareTitle')}\n${sourceText}` : undefined,
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
            {t(`labels.contentType.${content.type}`)}
          </ThemedText>
          <ThemedText type="title">{content.title}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {t('reader.reviewedLine', {
              reviewer: content.reviewedBy ?? t('reader.pendingReview'),
              version: content.version,
            })}
          </ThemedText>
        </View>
        <Badge status={content.verificationStatus} />
      </View>

      <View style={styles.actions}>
        <Button
          icon="bookmark"
          label={isBookmarked(bookmarkKey) ? t('common.saved') : t('common.save')}
          onPress={() => toggleBookmark(bookmarkKey)}
        />
        <Button
          icon="copy"
          label={t('reader.copy')}
          variant="secondary"
          onPress={() => Clipboard.setStringAsync(readerText)}
        />
        <Button
          icon="share"
          label={t('reader.share')}
          variant="secondary"
          onPress={() => Share.share({ title: content.title, message: readerText })}
        />
      </View>

      <View style={styles.fontControls}>
        <Button
          icon="minus"
          label={t('reader.text')}
          variant="ghost"
          onPress={() => setArabicFontScale(Math.max(0.85, preferences.arabicFontScale - 0.1))}
        />
        <ThemedText type="smallBold">{Math.round(preferences.arabicFontScale * 100)}%</ThemedText>
        <Button
          icon="plus"
          label={t('reader.text')}
          variant="ghost"
          onPress={() => setArabicFontScale(Math.min(1.6, preferences.arabicFontScale + 0.1))}
        />
      </View>

      <Section title={t('reader.duasFullText')}>
        <ThemedText themeColor="textSecondary">
          {t('reader.duasText')}
        </ThemedText>
        <SourceLinkButtons label={t('reader.duasOpen')} sources={sources} />
      </Section>

      {preferences.lineByLine ? (
        <Section title={t('reader.text')}>
          <SegmentedReligiousText
            arabicFontScale={preferences.arabicFontScale}
            arabicText={content.arabicText}
            segments={content.segments}
            translation={content.translation}
            transliteration={content.transliteration}
          />
        </Section>
      ) : (
        <>
          <Section title={t('reader.arabic')}>
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

          <Section title={t('reader.transliteration')}>
            <ThemedText>{content.transliteration}</ThemedText>
          </Section>

          <Section title={t('reader.translation')}>
            <ThemedText>{content.translation}</ThemedText>
          </Section>
        </>
      )}

      <Section title={t('reader.notes')}>
        <ThemedText themeColor="textSecondary">{content.notes}</ThemedText>
      </Section>

      <Section title={t('reader.sources')}>
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
