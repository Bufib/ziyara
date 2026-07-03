import { StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CityLocationMapProps = {
  city: string;
  placeCount: number;
  region: Region;
};

export function CityLocationMap({ city, placeCount, region }: CityLocationMapProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.mapFrame, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <MapView
          accessibilityLabel={`Karte von ${city}`}
          initialRegion={region}
          maxZoomLevel={20}
          minZoomLevel={12}
          pitchEnabled={false}
          rotateEnabled={false}
          scrollEnabled
          style={styles.map}
          toolbarEnabled={false}
          zoomEnabled>
          <Marker
            coordinate={{
              latitude: region.latitude,
              longitude: region.longitude,
            }}
            pinColor={theme.accent}
            title={city}
          />
        </MapView>
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
  map: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  mapFrame: {
    aspectRatio: 1.85,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    width: '100%',
  },
});
