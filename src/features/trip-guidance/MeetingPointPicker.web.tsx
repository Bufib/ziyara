import { useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/features/i18n/i18n';
import type {
  MeetingPointCoordinate,
  MeetingPointPickerProps,
} from '@/features/trip-guidance/meeting-point-picker-types';
import { useTheme } from '@/hooks/use-theme';

const bounds = {
  maxLat: 37.5,
  maxLon: 48.8,
  minLat: 29,
  minLon: 38.8,
};

type LocationStatus = 'denied' | 'error' | 'idle' | 'loading';

function positionFor({ latitude, longitude }: MeetingPointCoordinate) {
  const x = ((longitude - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 100;
  const y = ((bounds.maxLat - latitude) / (bounds.maxLat - bounds.minLat)) * 100;
  return {
    left: `${Math.max(1, Math.min(99, x))}%` as `${number}%`,
    top: `${Math.max(1, Math.min(99, y))}%` as `${number}%`,
  };
}

export function MeetingPointPicker({ coordinate, onChange }: MeetingPointPickerProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [mapSize, setMapSize] = useState({ height: 0, width: 0 });
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setMapSize({ height, width });
  };

  const chooseFromMap = (event: GestureResponderEvent) => {
    if (mapSize.width <= 0 || mapSize.height <= 0) return;
    const longitude =
      bounds.minLon +
      (event.nativeEvent.locationX / mapSize.width) * (bounds.maxLon - bounds.minLon);
    const latitude =
      bounds.maxLat -
      (event.nativeEvent.locationY / mapSize.height) * (bounds.maxLat - bounds.minLat);
    onChange({ latitude, longitude });
  };

  const requestCurrentLocation = () => {
    const geolocation = globalThis.navigator?.geolocation;
    setLocationStatus('loading');
    if (!geolocation) {
      setLocationStatus('error');
      return;
    }
    geolocation.getCurrentPosition(
      (position) => {
        onChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus('idle');
      },
      (error) => {
        setLocationStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 12_000 },
    );
  };

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{t('guide.admin.mapPickerTitle')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('guide.admin.mapPickerWebBody')}
      </ThemedText>
      <Pressable
        accessibilityLabel={t('guide.admin.mapPickerAccessibilityLabel')}
        accessibilityRole="button"
        onLayout={handleLayout}
        onPress={chooseFromMap}
        style={({ pressed }) => [
          styles.map,
          { backgroundColor: theme.accentSoft, borderColor: theme.border },
          pressed && styles.pressed,
        ]}>
        <View
          style={[styles.horizontalLine, styles.horizontalLineOne, { borderColor: theme.border }]}
        />
        <View
          style={[styles.horizontalLine, styles.horizontalLineTwo, { borderColor: theme.border }]}
        />
        <View style={[styles.verticalLine, styles.verticalLineOne, { borderColor: theme.border }]} />
        <View style={[styles.verticalLine, styles.verticalLineTwo, { borderColor: theme.border }]} />
        <ThemedText type="eyebrow" themeColor="accent" style={styles.mapLabel}>
          {t('guide.admin.mapPickerIraqLabel')}
        </ThemedText>
        {coordinate ? (
          <View
            accessibilityLabel={t('guide.admin.mapPickerMarkerLabel')}
            style={[
              styles.marker,
              positionFor(coordinate),
              { backgroundColor: theme.danger, borderColor: theme.surface },
            ]}
          />
        ) : null}
      </Pressable>
      <View style={styles.actions}>
        <Button
          disabled={locationStatus === 'loading'}
          icon="map"
          label={
            locationStatus === 'loading'
              ? t('guide.admin.mapPickerLocating')
              : t('guide.admin.mapPickerUseCurrent')
          }
          onPress={requestCurrentLocation}
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
  horizontalLine: {
    borderTopWidth: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  horizontalLineOne: {
    top: '33%',
  },
  horizontalLineTwo: {
    top: '66%',
  },
  map: {
    aspectRatio: 1.6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 260,
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
    borderWidth: 3,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    position: 'absolute',
    width: 24,
  },
  pressed: {
    opacity: 0.82,
  },
  verticalLine: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    position: 'absolute',
    top: 0,
  },
  verticalLineOne: {
    left: '33%',
  },
  verticalLineTwo: {
    left: '66%',
  },
});
