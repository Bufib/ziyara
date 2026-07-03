import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { Section } from "@/components/ui/section";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { allPlaces } from "@/data/places";
import { getRecommendedActsForPlace } from "@/data/recommendedActs";
import type { Place } from "@/domain/types";
import { cityRoute, placeRoute } from "@/features/navigation/routes";
import { useTheme } from "@/hooks/use-theme";

const featuredSlugs = [
  "shrine-imam-hussain",
  "shrine-imam-ali",
  "masjid-al-kufa",
  "shrine-kadhimayn",
];

function isPlace(place: Place | undefined): place is Place {
  return Boolean(place);
}

export default function HomeScreen() {
  const theme = useTheme();
  const featuredPlaces = featuredSlugs
    .map((slug) => allPlaces.find((place) => place.slug === slug))
    .filter(isPlace);

  return (
    <Screen>
      <View style={[styles.hero, { backgroundColor: theme.surface }]}>
        <View style={styles.heroText}>
          <ThemedText type="eyebrow" themeColor="accent">
            Ziyarah
          </ThemedText>
          <ThemedText type="title" style={styles.title}>
            Plane, lies und besuche heilige Orte mit Ruhe und Sorgfalt.
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Offline verfügbare Ortsdaten, prüfungsbewusste religiöse Inhalte,
            Merkliste und eine Karte für Pilgerinnen und Pilger im Irak.
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <Button
            icon="map"
            label="Karte öffnen"
            onPress={() => router.push("/map")}
          />
          <Button
            icon="search"
            label="Suchen"
            variant="secondary"
            onPress={() => router.push("/search")}
          />
        </View>
      </View>

      <Section title="Wichtige Städte" onAction={() => router.push("/search")}>
        <View style={styles.cityGrid}>
          {["Karbala", "Najaf", "Kufa", "Kadhimayn", "Samarra"].map((city) => (
            <Pressable
              accessibilityRole="button"
              key={city}
              onPress={() => router.push(cityRoute(city))}
              style={({ pressed }) => [
                styles.cityPill,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold">{city}</ThemedText>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Ausgewählte Orte">
        <View style={styles.list}>
          {featuredPlaces.map((place) => {
            const acts = getRecommendedActsForPlace(place.id);
            return (
              <Card
                key={place.id}
                onPress={() => router.push(placeRoute(place.slug))}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitle}>
                    <ThemedText type="heading">{place.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {place.city}, {place.province}
                    </ThemedText>
                  </View>
                  <Badge status={place.verificationStatus} />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {place.shortDescription}
                </ThemedText>
                <ThemedText type="smallBold" themeColor="accent">
                  {acts.length} empfohlene Handlung
                  {acts.length === 1 ? "" : "en"}
                </ThemedText>
              </Card>
            );
          })}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 8,
    gap: Spacing.four,
    padding: Spacing.four,
    borderWidth: 0.2,
  },
  heroText: {
    gap: Spacing.two,
  },
  title: {
    maxWidth: 640,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  cityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  cityPill: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  cardTitle: {
    flex: 1,
    gap: Spacing.half,
  },
  notice: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  pressed: {
    opacity: 0.72,
  },
});
