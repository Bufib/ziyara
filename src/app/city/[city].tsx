import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getPlacesByCity } from '@/data/places';
import { placeRoute, singleRouteParam } from '@/features/navigation/routes';

export default function CityScreen() {
  const params = useLocalSearchParams<{ city?: string | string[] }>();
  const city = singleRouteParam(params.city);
  const places = getPlacesByCity(city);
  const title = city ?? 'Stadt';

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="eyebrow" themeColor="accent">
            Stadt
          </ThemedText>
          <ThemedText type="title">{title}</ThemedText>
          <ThemedText themeColor="textSecondary">
            Offline verfügbare Orte in dieser Stadt. Religiöse und historische Details bleiben als
            zu prüfen markiert, bis die Quellenprüfung abgeschlossen ist.
          </ThemedText>
        </View>
      </View>

      <Section title={`${places.length} Ort${places.length === 1 ? '' : 'e'}`}>
        <View style={styles.list}>
          {places.map((place) => (
            <Card key={place.id} onPress={() => router.push(placeRoute(place.slug))}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitle}>
                  <ThemedText type="heading">{place.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {place.province}, {place.country}
                  </ThemedText>
                </View>
                <Badge status={place.verificationStatus} />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {place.shortDescription}
              </ThemedText>
            </Card>
          ))}

          {places.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText type="heading">Noch keine Orte für diese Stadt</ThemedText>
              <ThemedText themeColor="textSecondary">
                Der lokale Katalog enthält dafür noch keinen geprüften Platzhalter.
              </ThemedText>
              <Button icon="map" label="Karte öffnen" onPress={() => router.push('/map')} />
            </View>
          ) : null}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  empty: {
    gap: Spacing.three,
  },
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
  list: {
    gap: Spacing.three,
  },
});
