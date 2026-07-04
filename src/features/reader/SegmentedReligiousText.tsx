import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ReligiousTextSegment } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

type SegmentedReligiousTextProps = {
  arabicFontScale: number;
  arabicText: string;
  segments?: ReligiousTextSegment[];
  translation: string;
  transliteration: string;
};

type BuildSegmentsInput = Pick<
  SegmentedReligiousTextProps,
  'arabicText' | 'translation' | 'transliteration'
>;

function splitTextIntoSegments(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildSegments({
  arabicText,
  translation,
  transliteration,
}: BuildSegmentsInput): ReligiousTextSegment[] {
  const arabicLines = splitTextIntoSegments(arabicText);
  const transliterationLines = splitTextIntoSegments(transliteration);
  const translationLines = splitTextIntoSegments(translation);
  const segmentCount = Math.max(arabicLines.length, transliterationLines.length, translationLines.length);

  return Array.from({ length: segmentCount }, (_, index) => ({
    arabic: arabicLines[index],
    transliteration: transliterationLines[index],
    translation: translationLines[index],
  })).filter((segment) => segment.arabic || segment.transliteration || segment.translation);
}

export function SegmentedReligiousText({
  arabicFontScale,
  arabicText,
  segments: providedSegments,
  translation,
  transliteration,
}: SegmentedReligiousTextProps) {
  const theme = useTheme();
  const segments = providedSegments ?? buildSegments({ arabicText, translation, transliteration });

  return (
    <View style={styles.list}>
      {segments.map((segment, index) => (
        <View
          key={`${segment.arabic ?? ''}-${segment.transliteration ?? ''}-${index}`}
          style={[styles.segment, { borderColor: theme.border }]}>
          {segment.arabic ? (
            <ThemedText
              style={[
                styles.arabic,
                {
                  fontSize: 28 * arabicFontScale,
                  lineHeight: 46 * arabicFontScale,
                },
              ]}>
              {segment.arabic}
            </ThemedText>
          ) : null}

          {segment.transliteration ? (
            <ThemedText style={styles.transliteration} themeColor="textSecondary">
              {segment.transliteration}
            </ThemedText>
          ) : null}

          {segment.translation ? (
            <ThemedText style={styles.translation}>{segment.translation}</ThemedText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  segment: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  arabic: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  transliteration: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  translation: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
});
