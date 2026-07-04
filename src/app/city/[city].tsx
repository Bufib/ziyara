import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { Section } from "@/components/ui/section";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { getPlacesByCity } from "@/data/places";
import type { Place, PlaceImage } from "@/domain/types";
import { useI18n } from "@/features/i18n/i18n";
import { localizeCityName, localizePlaces } from "@/features/i18n/localizedData";
import { placeRoute, singleRouteParam } from "@/features/navigation/routes";
import { CityLocationMap } from "@/features/places/CityLocationMap";

function getPlaceImageSource(image: PlaceImage) {
  return image.asset ?? { uri: image.uri ?? "" };
}

function getCityRegion(places: Place[]) {
  if (places.length === 0) {
    return null;
  }

  const anchorPlace = places[0];

  return {
    latitude: anchorPlace.latitude,
    longitude: anchorPlace.longitude,
    latitudeDelta: 0.018,
    longitudeDelta: 0.018,
  };
}

function PlaceCard({ place }: { place: Place }) {
  const { t } = useI18n();
  const coverImage = place.images[0];

  if (!coverImage) {
    return (
      <Card onPress={() => router.push(placeRoute(place.slug))}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <ThemedText type="heading">{place.name}</ThemedText>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Pressable
      accessibilityLabel={`${place.name} ${t("common.details")}`}
      accessibilityRole="button"
      onPress={() => router.push(placeRoute(place.slug))}
      style={({ pressed }) => [
        styles.placeImageCard,
        pressed && styles.pressed,
      ]}
    >
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel={coverImage.description}
        contentFit="cover"
        source={getPlaceImageSource(coverImage)}
        style={StyleSheet.absoluteFill}
        transition={160}
      />
      <View style={styles.placeImageOverlay} />
      <View style={styles.placeImageContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <ThemedText style={styles.placeImageTitle}>
              {place.name}
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function CityScreen() {
  const params = useLocalSearchParams<{ city?: string | string[] }>();
  const city = singleRouteParam(params.city);
  const { language, t } = useI18n();
  const places = localizePlaces(getPlacesByCity(city), language);
  const title = city ? localizeCityName(city, language) : t("city.titleFallback");
  const cityRegion = getCityRegion(places);

  return (
    <Screen
      contentStyle={styles.screenContent}
      safeAreaEdges={["right", "bottom", "left"]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="eyebrow" themeColor="accent">
            {t("nav.city")}
          </ThemedText>
          <ThemedText type="title">{title}</ThemedText>
          {cityRegion ? (
            <CityLocationMap
              city={title}
              placeCount={places.length}
              region={cityRegion}
            />
          ) : null}
          <ThemedText themeColor="textSecondary">
            {t("city.offlineBody")}
          </ThemedText>
        </View>
      </View>

      <Section
        title={t(places.length === 1 ? "city.placeCount.one" : "city.placeCount.many", {
          count: places.length,
        })}
      >
        <View style={styles.list}>
          {places.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}

          {places.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText type="heading">
                {t("city.emptyTitle")}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {t("city.emptyBody")}
              </ThemedText>
              <Button
                icon="map"
                label={t("common.openMap")}
                onPress={() => router.push("/map")}
              />
            </View>
          ) : null}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  empty: {
    gap: Spacing.three,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.three,
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.three,
  },
  placeImageCard: {
    borderRadius: 8,
    minHeight: 156,
    overflow: "hidden",
  },
  placeImageContent: {
    gap: Spacing.two,
    minHeight: 156,
    padding: Spacing.three,
    justifyContent: "center"
  },
  placeImageDescription: {
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 3,
  },
  placeImageMeta: {
    color: "rgba(255, 255, 255, 0.86)",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 3,
  },
  placeImageOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  placeImageTitle: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: 700,
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.56)",
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 4,
  },
  pressed: {
    opacity: 0.76,
  },
  screenContent: {
    paddingTop: Spacing.two,
  },
});
