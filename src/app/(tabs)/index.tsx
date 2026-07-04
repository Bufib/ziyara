import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { Section } from "@/components/ui/section";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { allPlaces } from "@/data/places";
import type { Place } from "@/domain/types";
import { useI18n } from "@/features/i18n/i18n";
import { localizeCityName, localizePlace } from "@/features/i18n/localizedData";
import { cityRoute } from "@/features/navigation/routes";
import { PlaceImageCard } from "@/features/places/PlaceImageCard";
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
  const { language, t } = useI18n();
  const featuredPlaces = featuredSlugs
    .map((slug) => allPlaces.find((place) => place.slug === slug))
    .filter(isPlace)
    .map((place) => localizePlace(place, language));
  const cities = ["Karbala", "Najaf", "Kufa", "Kadhimayn", "Samarra"];

  return (
    <Screen>
      <View style={[styles.hero, { backgroundColor: theme.surface }]}>
        <View style={styles.heroText}>
          <ThemedText type="eyebrow" themeColor="accent">
            Ziyarah
          </ThemedText>
          <ThemedText type="title" style={styles.title}>
            {t("home.heroTitle")}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {t("home.heroBody")}
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <Button
            icon="map"
            label={t("common.openMap")}
            onPress={() => router.push("/map")}
            style={{ flex: 1 }}
          />
          <Button
            icon="search"
            label={t("common.search")}
            variant="secondary"
            onPress={() => router.push("/search")}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      <Section title={t("home.importantCities")}>
        <ScrollView
          style={styles.cityGrid}
          contentContainerStyle={{ gap: 5 }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {cities.map((city) => (
            <Pressable
              accessibilityRole="button"
              key={city}
              onPress={() => router.push(cityRoute(city))}
              style={({ pressed }) => [
                styles.cityPill,
                {
                  backgroundColor: "#1F7A5A",
                  borderColor: theme.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold" style={{color: "#fff"}}>
                {localizeCityName(city, language)}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </Section>

      <Section title={t("home.featuredPlaces")}>
        <View style={styles.list}>
          {featuredPlaces.map((place) => (
            <PlaceImageCard key={place.id} place={place} />
          ))}
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
    flex: 1,
    flexDirection: "row",
    gap: Spacing.two,
  },
  cityGrid: {
    flexDirection: "row",
  },
  cityPill: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  list: {
    gap: Spacing.three,
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
