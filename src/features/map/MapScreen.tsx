import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

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

type LocationStatus = "idle" | "loading" | "granted" | "denied" | "error";

export function MapExperience() {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(
    allPlaces[0],
  );
  const insets = useSafeAreaInsets();
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [userLocation, setUserLocation] =
    useState<Location.LocationObject | null>(null);

  const centerOnLocation = useCallback((location: Location.LocationObject) => {
    mapRef.current?.animateToRegion(
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      650,
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    Location.getForegroundPermissionsAsync()
      .then((permission) => {
        if (!mounted) return;
        setLocationStatus(permission.granted ? "granted" : "idle");
        if (permission.granted) {
          Location.getLastKnownPositionAsync({ maxAge: 60_000 }).then(
            (lastKnownLocation) => {
              if (mounted && lastKnownLocation) {
                setUserLocation(lastKnownLocation);
              }
            },
          );
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const requestLocation = async () => {
    setLocationMessage(null);
    setLocationStatus("loading");

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationStatus("denied");
        setLocationMessage(
          "Aktiviere den Standort in den Geräteeinstellungen, um deine Position auf der Karte zu sehen.",
        );
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation(current);
      setLocationStatus("granted");
      centerOnLocation(current);
    } catch {
      setLocationStatus("error");
      setLocationMessage(
        "Dein Standort konnte gerade nicht geladen werden. Prüfe GPS, Berechtigungen oder die Internetverbindung.",
      );
    }
  };

  const markerColor = useMemo(() => theme.accent, [theme.accent]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <MapView
        ref={mapRef}
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
            description={`${place.city}, ${place.country}`}
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

      <View style={styles.topBar}>
        <Button
          icon="map"
          label={
            locationStatus === "loading"
              ? "Standort wird geladen"
              : userLocation
                ? "Neu zentrieren"
                : "Mein Standort"
          }
          variant={userLocation ? "secondary" : "primary"}
          onPress={requestLocation}
        />
      </View>

      {(locationStatus === "denied" || locationStatus === "error") && (
        <View
          style={[styles.permission, { backgroundColor: theme.warningSoft }]}
        >
          <ThemedText type="smallBold">
            {locationStatus === "denied"
              ? "Standortberechtigung abgelehnt"
              : "Standort nicht verfügbar"}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {locationMessage}
          </ThemedText>
        </View>
      )}

      {selectedPlace && (
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              bottom: insets.bottom,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitle}>
              <ThemedText type="heading">{selectedPlace.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {selectedPlace.city}, {selectedPlace.country}
              </ThemedText>
            </View>
          </View>

          <View style={styles.sheetActions}>
            <Button
              icon="info"
              label="Details"
              onPress={() => router.push(placeRoute(selectedPlace.slug))}
              style={styles.sheetActionButton}
            />
            <Button
              icon="map"
              label="Navigieren"
              variant="secondary"
              onPress={() => openNavigation(selectedPlace)}
              style={styles.sheetActionButton}
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
    bottom: 0,
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
  sheetActionButton: {
    flex: 1,
    minWidth: 0,
  },
});
