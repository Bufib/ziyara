import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';
import { religiousContentTypeLabels } from '@/data/labels';
import { allPlaces, getPlaceBySlug } from '@/data/places';
import { religiousContent, getReligiousContentBySlug } from '@/data/religiousContent';
import { placeRoute, readerRoute } from '@/features/navigation/routes';
import { useBookmarks } from '@/features/storage/useBookmarks';
import { Spacing } from '@/constants/theme';

type BookmarkItem = {
  key: string;
  route: Href;
  subtitle: string;
  title: string;
};

function isBookmarkItem(item: BookmarkItem | null): item is BookmarkItem {
  return item !== null;
}

export default function BookmarksScreen() {
  const { bookmarks, clearBookmarks } = useBookmarks();
  const items: BookmarkItem[] = bookmarks
    .map<BookmarkItem | null>((bookmark) => {
      const [kind, slug] = bookmark.split(':');
      if (kind === 'place') {
        const place = getPlaceBySlug(slug);
        return place
          ? {
              key: bookmark,
              title: place.name,
              subtitle: `${place.city}, ${place.province}`,
              route: placeRoute(place.slug),
            }
          : null;
      }
      const content = getReligiousContentBySlug(slug);
      return content
        ? {
            key: bookmark,
            title: content.title,
            subtitle: religiousContentTypeLabels[content.type],
            route: readerRoute(content.slug),
          }
        : null;
    })
    .filter(isBookmarkItem);

  return (
    <Screen>
      <Section
        title="Merkliste"
        actionLabel={items.length > 0 ? 'Leeren' : undefined}
        onAction={items.length > 0 ? clearBookmarks : undefined}>
        <View style={styles.list}>
          {items.map((item) => (
            <Card key={item.key} onPress={() => router.push(item.route)}>
              <ThemedText type="heading">{item.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.subtitle}
              </ThemedText>
            </Card>
          ))}

          {items.length === 0 && (
            <View style={styles.empty}>
              <ThemedText type="heading">Noch keine Einträge</ThemedText>
              <ThemedText themeColor="textSecondary">
                Speichere Orte oder Leseeinträge, um sie offline schnell wiederzufinden.
              </ThemedText>
              <View style={styles.actions}>
                <Button
                  icon="map"
                  label={`${allPlaces.length} Orte ansehen`}
                  onPress={() => router.push('/map')}
                />
                <Button
                  icon="book"
                  label={`${religiousContent.length} Leseeinträge`}
                  variant="secondary"
                  onPress={() => router.push('/search')}
                />
              </View>
            </View>
          )}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  empty: {
    gap: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
