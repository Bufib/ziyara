import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Zoomable } from '@likashefqet/react-native-image-zoom';

import { SourceReferenceList } from '@/components/source-reference-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { SymbolIcon } from '@/components/ui/symbol-icon';
import { ThemedText } from '@/components/themed-text';
import { recommendedActTypeLabels } from '@/data/labels';
import { getPlaceBySlug } from '@/data/places';
import { getRecommendedActsForPlace } from '@/data/recommendedActs';
import { getSourceReferencesByIds } from '@/data/sourceReferences';
import type { PlaceImage } from '@/domain/types';
import { readerRoute, singleRouteParam } from '@/features/navigation/routes';
import { useBookmarks } from '@/features/storage/useBookmarks';
import { openNavigation } from '@/features/places/openNavigation';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PlaceImageCarouselProps = {
  images: PlaceImage[];
};

type PlaceImageViewerProps = {
  image: PlaceImage | null;
  onClose: () => void;
};

function ViewerCloseButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel="Bild schließen"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.viewerIconButton,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <SymbolIcon color={theme.text} name="close" size={20} />
    </Pressable>
  );
}

function PlaceImageViewer({ image, onClose }: PlaceImageViewerProps) {
  const { height, width } = useWindowDimensions();
  const viewerImageWidth = Math.max(248, width - Spacing.three * 2);
  const viewerImageHeight = Math.max(280, height - Spacing.six * 2);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={Boolean(image)}>
      <GestureHandlerRootView style={styles.viewerGestureRoot}>
        <View style={styles.viewerBackdrop}>
          <View style={styles.viewerToolbar}>
            <ViewerCloseButton onPress={onClose} />
          </View>

          {image ? (
            <Zoomable
              key={image.id}
              doubleTapScale={2.5}
              isDoubleTapEnabled
              isPanEnabled
              isPinchEnabled
              maxScale={5}
              style={styles.viewerZoom}>
              <Image
                accessibilityLabel={image.description}
                contentFit="contain"
                source={{ uri: image.uri }}
                style={[
                  styles.viewerImage,
                  {
                    height: viewerImageHeight,
                    width: viewerImageWidth,
                  },
                ]}
                transition={160}
              />
            </Zoomable>
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function PlaceImageCarousel({ images }: PlaceImageCarouselProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [selectedImage, setSelectedImage] = useState<PlaceImage | null>(null);
  const imageCardWidth = Math.min(320, Math.max(248, width - Spacing.four * 2));

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.imageCarousel}>
        {images.map((image) => (
          <View
            key={image.id}
            style={[
              styles.imageCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                width: imageCardWidth,
              },
            ]}>
            <Pressable
              accessibilityLabel={`${image.description} groß anzeigen`}
              accessibilityRole="imagebutton"
              onPress={() => {
                setSelectedImage(image);
              }}
              style={({ pressed }) => [pressed && styles.pressed]}>
              <Image
                accessibilityLabel={image.description}
                contentFit="cover"
                source={{ uri: image.uri }}
                style={styles.placeImage}
                transition={160}
              />
            </Pressable>
            <View style={styles.imageCaption}>
              <ThemedText type="small">{image.description}</ThemedText>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => {
                  void Linking.openURL(image.source.url);
                }}
                style={styles.sourceLink}>
                <ThemedText type="smallBold" themeColor="accent">
                  Quelle: {image.source.title}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      <PlaceImageViewer
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
}

export default function PlaceDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = singleRouteParam(params.slug);
  const place = getPlaceBySlug(slug);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  if (!place) {
    return (
      <Screen>
        <ThemedText type="heading">Ort nicht gefunden</ThemedText>
        <Button icon="map" label="Zur Karte" onPress={() => router.push('/map')} />
      </Screen>
    );
  }

  const acts = getRecommendedActsForPlace(place.id);
  const bookmarkKey = `place:${place.slug}`;
  const sources = getSourceReferencesByIds(place.sourceReferences);

  return (
    <Screen contentStyle={styles.screenContent} safeAreaEdges={['right', 'bottom', 'left']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="eyebrow" themeColor="accent">
            {place.city}, {place.country}
          </ThemedText>
          <ThemedText type="title">{place.name}</ThemedText>
          <ThemedText themeColor="textSecondary">{place.shortDescription}</ThemedText>
        </View>
        <Badge status={place.verificationStatus} />
      </View>

      <View style={styles.actions}>
        <Button icon="map" label="Navigation starten" onPress={() => openNavigation(place)} />
        <Button
          icon="bookmark"
          label={isBookmarked(bookmarkKey) ? 'Gespeichert' : 'Speichern'}
          variant="secondary"
          onPress={() => toggleBookmark(bookmarkKey)}
        />
      </View>

      <Section title="Über diesen Ort">
        <ThemedText>{place.longDescription}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {place.historicalNotes}
        </ThemedText>
        <PlaceImageCarousel images={place.images} />
      </Section>

      <Section title="Empfohlene Handlungen">
        <View style={styles.list}>
          {acts.map((act) => (
            <Card
              key={act.id}
              onPress={() => {
                if (act.contentId) {
                  router.push(readerRoute(act.contentId));
                }
              }}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitle}>
                  <ThemedText type="heading">{act.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {recommendedActTypeLabels[act.type]}
                  </ThemedText>
                </View>
                <Badge status={act.verificationStatus} />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {act.shortInstruction}
              </ThemedText>
            </Card>
          ))}
        </View>
      </Section>

      <Section title="Hinweise für den Besuch">
        <View style={styles.notes}>
          {place.visitingTips.map((tip) => (
            <ThemedText key={tip} type="small">
              - {tip}
            </ThemedText>
          ))}
          <ThemedText type="small" themeColor="textSecondary">
            Öffnungszeiten: {place.openingInfo}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Barrierefreiheit: {place.accessibilityNotes}
          </ThemedText>
        </View>
      </Section>

      <Section title="Quellen und Prüfung">
        <SourceReferenceList
          emptyMessage="Redaktionelle Prüfung ausstehend."
          openButtonVariant="ghost"
          showExcerpt={false}
          showLastChecked={false}
          showOpenButton
          showUrl={false}
          sources={sources}
        />
        <Button
          icon="book"
          label="Quellenregel ansehen"
          variant="ghost"
          onPress={() => router.push('/sources')}
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.three,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
    gap: Spacing.half,
  },
  notes: {
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
  imageCarousel: {
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  imageCard: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  placeImage: {
    aspectRatio: 4 / 3,
    width: '100%',
  },
  imageCaption: {
    gap: Spacing.one,
    padding: Spacing.three,
  },
  sourceLink: {
    alignSelf: 'flex-start',
  },
  viewerGestureRoot: {
    flex: 1,
  },
  viewerBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    flex: 1,
    padding: Spacing.three,
  },
  viewerToolbar: {
    position: 'absolute',
    right: Spacing.three,
    top: Spacing.three,
    zIndex: 10,
  },
  viewerIconButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  viewerZoom: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  viewerImage: {
    borderRadius: 8,
  },
  screenContent: {
    paddingTop: Spacing.two,
  },
});
