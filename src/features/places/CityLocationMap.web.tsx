import { createElement, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Region } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CityLocationMapProps = {
  city: string;
  placeCount: number;
  region: Region;
};

function osmEmbedUrl(region: Region) {
  const latitudeDelta = Math.max(0.006, region.latitudeDelta);
  const longitudeDelta = Math.max(0.006, region.longitudeDelta);
  const west = region.longitude - longitudeDelta / 2;
  const east = region.longitude + longitudeDelta / 2;
  const south = region.latitude - latitudeDelta / 2;
  const north = region.latitude + latitudeDelta / 2;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${west},${south},${east},${north}&layer=mapnik&marker=${region.latitude},${region.longitude}`;
}

export function CityLocationMap({ city, placeCount, region }: CityLocationMapProps) {
  const theme = useTheme();
  const mapUrl = useMemo(() => osmEmbedUrl(region), [region]);

  return (
    <View style={styles.container}>
      <View
        accessibilityLabel={`Karte von ${city}`}
        style={[styles.mapFrame, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {createElement('iframe', {
          loading: 'lazy',
          referrerPolicy: 'no-referrer-when-downgrade',
          src: mapUrl,
          style: styles.iframe,
          title: `Karte von ${city}`,
        })}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {city}, Iraq · {placeCount} Ort{placeCount === 1 ? '' : 'e'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  mapFrame: {
    aspectRatio: 1.85,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  iframe: {
    borderWidth: 0,
    height: '100%',
    width: '100%',
  },
});
