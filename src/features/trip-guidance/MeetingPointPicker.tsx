import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/features/i18n/i18n';
import { nativeMapProvider } from '@/features/map/native-map-provider';
import type {
  MeetingPointCoordinate,
  MeetingPointPickerProps,
} from '@/features/trip-guidance/meeting-point-picker-types';
import { useTheme } from '@/hooks/use-theme';

const iraqRegion: Region = {
  latitude: 33.1,
  latitudeDelta: 7.5,
  longitude: 43.9,
  longitudeDelta: 7.5,
};

type LocationStatus = 'denied' | 'error' | 'idle' | 'loading';

function regionFor(coordinate: MeetingPointCoordinate): Region {
  return {
    ...coordinate,
    latitudeDelta: 0.025,
    longitudeDelta: 0.025,
  };
}

export function MeetingPointPicker({
  coordinate,
  fallbackCoordinate,
  onChange,
}: MeetingPointPickerProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const mapRef = useRef<MapView>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const center = coordinate ?? fallbackCoordinate;
  const centerLatitude = center?.latitude;
  const centerLongitude = center?.longitude;

  useEffect(() => {
    if (centerLatitude === undefined || centerLongitude === undefined) return;
    mapRef.current?.animateToRegion(
      regionFor({ latitude: centerLatitude, longitude: centerLongitude }),
      400,
    );
  }, [centerLatitude, centerLongitude]);

  const chooseCoordinate = (nextCoordinate: MeetingPointCoordinate) => {
    onChange(nextCoordinate);
    mapRef.current?.animateToRegion(regionFor(nextCoordinate), 300);
  };

  const handleMapPress = (event: MapPressEvent) => {
    chooseCoordinate(event.nativeEvent.coordinate);
  };

  const requestCurrentLocation = async () => {
    if (locationStatus === 'loading') return;
    setLocationStatus('loading');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationStatus('denied');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      chooseCoordinate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setLocationStatus('idle');
    } catch {
      setLocationStatus('error');
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{t('guide.admin.mapPickerTitle')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('guide.admin.mapPickerBody')}
      </ThemedText>
      <View style={[styles.mapFrame, { borderColor: theme.border }]}>
        <MapView
          accessibilityLabel={t('guide.admin.mapPickerAccessibilityLabel')}
          initialRegion={center ? regionFor(center) : iraqRegion}
          onPress={handleMapPress}
          provider={nativeMapProvider}
          ref={mapRef}
          style={styles.map}>
          {coordinate ? (
            <Marker
              accessibilityLabel={t('guide.admin.mapPickerMarkerLabel')}
              coordinate={coordinate}
              draggable
              onDragEnd={(event) => chooseCoordinate(event.nativeEvent.coordinate)}
              pinColor={theme.danger}
              title={t('guide.admin.mapPickerMarkerLabel')}
            />
          ) : null}
        </MapView>
      </View>
      <View style={styles.actions}>
        <Button
          disabled={locationStatus === 'loading'}
          icon="map"
          label={
            locationStatus === 'loading'
              ? t('guide.admin.mapPickerLocating')
              : t('guide.admin.mapPickerUseCurrent')
          }
          onPress={() => void requestCurrentLocation()}
          style={styles.action}
          variant="secondary"
        />
        {coordinate ? (
          <Button
            icon="close"
            label={t('guide.admin.mapPickerClear')}
            onPress={() => onChange(null)}
            style={styles.action}
            variant="ghost"
          />
        ) : null}
      </View>
      {locationStatus === 'denied' ? (
        <ThemedText accessibilityLiveRegion="polite" type="small" themeColor="warning">
          {t('guide.admin.mapPickerDenied')}
        </ThemedText>
      ) : locationStatus === 'error' ? (
        <ThemedText accessibilityLiveRegion="polite" type="small" themeColor="danger">
          {t('guide.admin.mapPickerError')}
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor={coordinate ? 'accent' : 'textSecondary'}>
        {coordinate
          ? t('guide.admin.mapPickerSelected', {
              latitude: coordinate.latitude.toFixed(6),
              longitude: coordinate.longitude.toFixed(6),
            })
          : t('guide.admin.mapPickerEmpty')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    flexGrow: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  container: {
    gap: Spacing.two,
  },
  map: {
    flex: 1,
  },
  mapFrame: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    height: 320,
    overflow: 'hidden',
  },
});
