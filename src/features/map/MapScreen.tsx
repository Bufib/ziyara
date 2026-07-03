import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { allPlaces } from "@/data/places";
import type { Place } from "@/domain/types";
import { placeRoute } from "@/features/navigation/routes";
import { openNavigation } from "@/features/places/openNavigation";
import { useTheme } from "@/hooks/use-theme";

const iraqRegion: Region = {
  latitude: 33.1,
  longitude: 43.9,
  latitudeDelta: 7.5,
  longitudeDelta: 7.5,
};

export function MapExperience() {
  const theme = useTheme();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(
    allPlaces[0],
  );
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "granted" | "denied"
  >("idle");
  const [userLocation, setUserLocation] =
    useState<Location.LocationObject | null>(null);

  useEffect(() => {
    let mounted = true;
    Location.getForegroundPermissionsAsync()
      .then((permission) => {
        if (!mounted) return;
        setLocationStatus(permission.granted ? "granted" : "idle");
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const requestLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setLocationStatus("denied");
      return;
    }

    setLocationStatus("granted");
    const current = await Location.getCurrentPositionAsync({});
    setUserLocation(current);
  };

  const markerColor = useMemo(() => theme.accent, [theme.accent]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <MapView
        initialRegion={iraqRegion}
        showsUserLocation={locationStatus === "granted"}
        style={styles.map}
      >
        {allPlaces.map((place) => (
          <Marker
            coordinate={{
              latitude: place.latitude,
              longitude: place.longitude,
            }}
            description={`${place.city}, ${place.province}`}
            key={place.id}
            onPress={() => setSelectedPlace(place)}
            pinColor={markerColor}
            title={place.name}
          />
        ))}
        {userLocation ? (
          <Marker
            coordinate={userLocation.coords}
            pinColor={theme.warning}
            title="Dein aktueller Standort"
          />
        ) : null}
      </MapView>

      {locationStatus === "denied" && (
        <View
          style={[styles.permission, { backgroundColor: theme.warningSoft }]}
        >
          <ThemedText type="smallBold">
            Standortberechtigung abgelehnt
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Orte bleiben sichtbar. Aktiviere den Standort bei Bedarf in den
            Geräteeinstellungen.
          </ThemedText>
        </View>
      )}

      {selectedPlace && (
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitle}>
              <ThemedText type="heading">{selectedPlace.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {selectedPlace.city}, {selectedPlace.province}
              </ThemedText>
            </View>
            <Badge status={selectedPlace.verificationStatus} />
          </View>

          <View style={styles.sheetActions}>
            <Button
              icon="info"
              label="Details"
              onPress={() => router.push(placeRoute(selectedPlace.slug))}
            />
            <Button
              icon="map"
              label="Navigieren"
              variant="secondary"
              onPress={() => openNavigation(selectedPlace)}
            />
            <Button
              icon="book"
              label="Handlungen"
              variant="secondary"
              onPress={() => router.push(placeRoute(selectedPlace.slug))}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  topBar: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  notice: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.half,
    padding: Spacing.three,
  },
  permission: {
    borderRadius: 8,
    gap: Spacing.half,
    marginHorizontal: Spacing.three,
    padding: Spacing.three,
  },
  sheet: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: Spacing.three,
    gap: Spacing.two,
    left: Spacing.three,
    padding: Spacing.three,
    position: "absolute",
    right: Spacing.three,
  },
  sheetHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  sheetTitle: {
    flex: 1,
    gap: Spacing.half,
  },
  sheetActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
});
