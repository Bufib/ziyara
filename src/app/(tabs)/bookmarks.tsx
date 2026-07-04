import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';
import { allPlaces, getPlaceBySlug } from '@/data/places';
import { religiousContent, getReligiousContentBySlug } from '@/data/religiousContent';
import type { Place } from '@/domain/types';
import { useI18n } from '@/features/i18n/i18n';
import {
  localizePlace,
  localizeReligiousContent,
} from '@/features/i18n/localizedData';
import { readerRoute } from '@/features/navigation/routes';
import { PlaceImageCard } from '@/features/places/PlaceImageCard';
import { useBookmarks } from '@/features/storage/useBookmarks';
import { Spacing } from '@/constants/theme';

type PlaceBookmarkItem = {
  key: string;
  kind: 'place';
  place: Place;
};

type ContentBookmarkItem = {
  key: string;
  kind: 'content';
  route: Href;
  subtitle: string;
  title: string;
};

type BookmarkItem = PlaceBookmarkItem | ContentBookmarkItem;

function isBookmarkItem(item: BookmarkItem | null): item is BookmarkItem {
  return item !== null;
}

export default function BookmarksScreen() {
  const { bookmarks, clearBookmarks } = useBookmarks();
  const { language, t } = useI18n();
  const items: BookmarkItem[] = bookmarks
    .map<BookmarkItem | null>((bookmark) => {
      const [kind, slug] = bookmark.split(':');
      if (kind === 'place') {
        const rawPlace = getPlaceBySlug(slug);
        const place = rawPlace ? localizePlace(rawPlace, language) : undefined;
        return place
          ? {
              key: bookmark,
              kind: 'place',
              place,
            }
          : null;
      }
      const rawContent = getReligiousContentBySlug(slug);
      const content = rawContent ? localizeReligiousContent(rawContent, language) : undefined;
      return content
        ? {
            key: bookmark,
            kind: 'content',
            title: content.title,
            subtitle: t(`labels.contentType.${content.type}`),
            route: readerRoute(content.slug),
          }
        : null;
    })
    .filter(isBookmarkItem);

  return (
    <Screen>
      <Section
        title={t('bookmarks.title')}
        actionLabel={items.length > 0 ? t('bookmarks.clear') : undefined}
        onAction={items.length > 0 ? clearBookmarks : undefined}>
        <View style={styles.list}>
          {items.map((item) =>
            item.kind === 'place' ? (
              <PlaceImageCard key={item.key} place={item.place} />
            ) : (
              <Card key={item.key} onPress={() => router.push(item.route)}>
                <ThemedText type="heading">{item.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.subtitle}
                </ThemedText>
              </Card>
            ),
          )}

          {items.length === 0 && (
            <View style={styles.empty}>
              <ThemedText type="heading">{t('bookmarks.emptyTitle')}</ThemedText>
              <ThemedText themeColor="textSecondary">
                {t('bookmarks.emptyBody')}
              </ThemedText>
              <View style={styles.actions}>
                <Button
                  icon="map"
                  label={t('bookmarks.showPlaces', { count: allPlaces.length })}
                  onPress={() => router.push('/map')}
                />
                <Button
                  icon="book"
                  label={t('bookmarks.readingEntries', { count: religiousContent.length })}
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
