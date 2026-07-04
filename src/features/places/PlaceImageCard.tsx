import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Place, PlaceImage } from '@/domain/types';
import { useI18n } from '@/features/i18n/i18n';
import { placeRoute } from '@/features/navigation/routes';

function getPlaceImageSource(image: PlaceImage) {
  return image.asset ?? { uri: image.uri ?? '' };
}

export function PlaceImageCard({ place }: { place: Place }) {
  const { t } = useI18n();
  const coverImage = place.images[0];

  if (!coverImage) {
    return (
      <Card onPress={() => router.push(placeRoute(place.slug))} style={styles.fallbackCard}>
        <ThemedText style={styles.fallbackTitle}>{place.name}</ThemedText>
      </Card>
    );
  }

  return (
    <Pressable
      accessibilityLabel={`${place.name} ${t('common.details')}`}
      accessibilityRole="button"
      onPress={() => router.push(placeRoute(place.slug))}
      style={({ pressed }) => [styles.placeImageCard, pressed && styles.pressed]}>
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
        <ThemedText style={styles.placeImageTitle}>{place.name}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fallbackCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 156,
  },
  fallbackTitle: {
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 30,
    textAlign: 'center',
  },
  placeImageCard: {
    borderRadius: 8,
    minHeight: 156,
    overflow: 'hidden',
  },
  placeImageContent: {
    justifyContent: 'center',
    minHeight: 156,
    padding: Spacing.three,
  },
  placeImageOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  placeImageTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.56)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 4,
  },
  pressed: {
    opacity: 0.76,
  },
});
