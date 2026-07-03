import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { SourceReferenceList } from '@/components/source-reference-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';
import { recommendedActTypeLabels } from '@/data/labels';
import { getPlaceBySlug } from '@/data/places';
import { getRecommendedActsForPlace } from '@/data/recommendedActs';
import { getSourceReferencesByIds } from '@/data/sourceReferences';
import { readerRoute, singleRouteParam } from '@/features/navigation/routes';
import { useBookmarks } from '@/features/storage/useBookmarks';
import { openNavigation } from '@/features/places/openNavigation';
import { Spacing } from '@/constants/theme';

export default function PlaceDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = singleRouteParam(params.slug);
  const place = getPlaceBySlug(slug);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  if (!place) {
    return (
      <Screen>
        <ThemedText type="heading">Ort nicht gefunden</ThemedText>
        <Button icon="map" label="Zur Karte" onPress={() => router.push('/map')} />
      </Screen>
    );
  }

  const acts = getRecommendedActsForPlace(place.id);
  const bookmarkKey = `place:${place.slug}`;
  const sources = getSourceReferencesByIds(place.sourceReferences);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="eyebrow" themeColor="accent">
            {place.city}, {place.province}
          </ThemedText>
          <ThemedText type="title">{place.name}</ThemedText>
          <ThemedText themeColor="textSecondary">{place.shortDescription}</ThemedText>
        </View>
        <Badge status={place.verificationStatus} />
      </View>

      <View style={styles.actions}>
        <Button icon="map" label="Navigation starten" onPress={() => openNavigation(place)} />
        <Button
          icon="bookmark"
          label={isBookmarked(bookmarkKey) ? 'Gespeichert' : 'Speichern'}
          variant="secondary"
          onPress={() => toggleBookmark(bookmarkKey)}
        />
      </View>

      <Section title="Über diesen Ort">
        <ThemedText>{place.longDescription}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {place.historicalNotes}
        </ThemedText>
      </Section>

      <Section title="Empfohlene Handlungen">
        <View style={styles.list}>
          {acts.map((act) => (
            <Card
              key={act.id}
              onPress={() => {
                if (act.contentId) {
                  router.push(readerRoute(act.contentId));
                }
              }}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitle}>
                  <ThemedText type="heading">{act.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {recommendedActTypeLabels[act.type]}
                  </ThemedText>
                </View>
                <Badge status={act.verificationStatus} />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {act.shortInstruction}
              </ThemedText>
            </Card>
          ))}
        </View>
      </Section>

      <Section title="Hinweise für den Besuch">
        <View style={styles.notes}>
          {place.visitingTips.map((tip) => (
            <ThemedText key={tip} type="small">
              - {tip}
            </ThemedText>
          ))}
          <ThemedText type="small" themeColor="textSecondary">
            Öffnungszeiten: {place.openingInfo}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Barrierefreiheit: {place.accessibilityNotes}
          </ThemedText>
        </View>
      </Section>

      <Section title="Quellen und Prüfung">
        <SourceReferenceList
          emptyMessage="Redaktionelle Prüfung ausstehend."
          openButtonVariant="ghost"
          showExcerpt={false}
          showLastChecked={false}
          showOpenButton
          showUrl={false}
          sources={sources}
        />
        <Button
          icon="book"
          label="Quellenregel ansehen"
          variant="ghost"
          onPress={() => router.push('/sources')}
        />
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
  list: {
    gap: Spacing.three,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
    gap: Spacing.half,
  },
  notes: {
    gap: Spacing.two,
  },
});
