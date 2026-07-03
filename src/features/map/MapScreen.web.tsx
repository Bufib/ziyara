import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { allPlaces } from '@/data/places';
import { placeRoute } from '@/features/navigation/routes';
import { openNavigation } from '@/features/places/openNavigation';
import { useTheme } from '@/hooks/use-theme';

const bounds = {
  maxLat: 37.5,
  maxLon: 48.8,
  minLat: 29.0,
  minLon: 38.8,
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'error';

function positionFor({ latitude, longitude }: Coordinates) {
  const x = ((longitude - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 100;
  const y = ((bounds.maxLat - latitude) / (bounds.maxLat - bounds.minLat)) * 100;
  return {
    left: `${Math.max(4, Math.min(96, x))}%` as `${number}%`,
    top: `${Math.max(4, Math.min(96, y))}%` as `${number}%`,
  };
}

export function MapExperience() {
  const theme = useTheme();
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);

  const requestLocation = () => {
    const geolocation = globalThis.navigator?.geolocation;
    setLocationStatus('loading');
    setLocationMessage(null);

    if (!geolocation) {
      setLocationStatus('error');
      setLocationMessage('Dieser Browser unterstützt keine Standortfreigabe.');
      return;
    }

    geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus('granted');
      },
      () => {
        setLocationStatus('denied');
        setLocationMessage(
          'Standortfreigabe wurde abgelehnt oder ist im Browser nicht verfügbar.',
        );
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 12_000 },
    );
  };

  return (
    <Screen>
      <Section title="Ziyarah-Karte Irak">
        <ThemedText themeColor="textSecondary">
          Im Web wird eine schematische Offline-Karte angezeigt. Auf iOS und Android nutzt die App
          React Native Maps mit Markern und optionalem Standort.
        </ThemedText>
        <Button
          icon="map"
          label={
            locationStatus === 'loading'
              ? 'Standort wird geladen'
              : userLocation
                ? 'Standort aktualisieren'
                : 'Mein Standort'
          }
          onPress={requestLocation}
          variant={userLocation ? 'secondary' : 'primary'}
        />
        {locationMessage ? (
          <View style={[styles.locationNotice, { backgroundColor: theme.warningSoft }]}>
            <ThemedText type="smallBold">
              {locationStatus === 'denied'
                ? 'Standortberechtigung abgelehnt'
                : 'Standort nicht verfügbar'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {locationMessage}
            </ThemedText>
          </View>
        ) : null}
        <View style={[styles.map, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}>
          <ThemedText type="eyebrow" themeColor="accent" style={styles.mapLabel}>
            Iraq
          </ThemedText>
          {allPlaces.map((place) => (
            <Pressable
              accessibilityLabel={`${place.name}, ${place.city}`}
              accessibilityRole="button"
              key={place.id}
              onPress={() => router.push(placeRoute(place.slug))}
              style={({ pressed }) => [
                styles.marker,
                positionFor(place),
                { backgroundColor: theme.accent, borderColor: theme.surface },
                pressed && styles.pressed,
              ]}>
              <ThemedText style={styles.markerText}> </ThemedText>
            </Pressable>
          ))}
          {userLocation ? (
            <View
              accessibilityLabel="Dein aktueller Standort"
              style={[
                styles.userMarker,
                positionFor(userLocation),
                { backgroundColor: theme.warning, borderColor: theme.surface },
              ]}>
              <ThemedText style={styles.markerText}> </ThemedText>
            </View>
          ) : null}
        </View>
      </Section>

      <Section title="Orte">
        <View style={styles.list}>
          {allPlaces.map((place) => (
            <View
              key={place.id}
              style={[styles.placeRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.placeText}>
                <ThemedText type="heading">{place.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {place.city}, {place.province}
                </ThemedText>
              </View>
              <Badge status={place.verificationStatus} />
              <View style={styles.actions}>
                <Button
                  icon="info"
                  label="Details"
                  onPress={() => router.push(placeRoute(place.slug))}
                />
                <Button
                  icon="map"
                  label="Navigieren"
                  variant="secondary"
                  onPress={() => openNavigation(place)}
                />
              </View>
            </View>
          ))}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: {
    aspectRatio: 0.84,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  mapLabel: {
    left: Spacing.three,
    position: 'absolute',
    top: Spacing.three,
  },
  marker: {
    borderRadius: 999,
    borderWidth: 2,
    height: 18,
    position: 'absolute',
    width: 18,
  },
  markerText: {
    fontSize: 1,
  },
  userMarker: {
    borderRadius: 999,
    borderWidth: 3,
    height: 22,
    position: 'absolute',
    width: 22,
  },
  list: {
    gap: Spacing.three,
  },
  locationNotice: {
    borderRadius: 8,
    gap: Spacing.half,
    padding: Spacing.three,
  },
  placeRow: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  placeText: {
    gap: Spacing.half,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.74,
  },
});
