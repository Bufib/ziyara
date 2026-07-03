import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { searchCatalog, type SearchFilter, type SearchResult } from '@/data/catalog';
import { searchFilterLabels } from '@/data/labels';
import { placeRoute, readerRoute, singleRouteParam } from '@/features/navigation/routes';
import { useTheme } from '@/hooks/use-theme';

const filters: SearchFilter[] = ['all', 'places', 'content', 'acts'];

export default function SearchScreen() {
  const params = useLocalSearchParams<{ city?: string | string[] }>();
  const [query, setQuery] = useState(singleRouteParam(params.city) ?? '');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const theme = useTheme();

  const results = useMemo(() => searchCatalog(query, filter), [filter, query]);

  return (
    <Screen>
      <Section title="Suche">
        <TextInput
          accessibilityLabel="Orte, Städte, Duas, Ziyarat und Handlungen suchen"
          autoCapitalize="none"
          onChangeText={setQuery}
          placeholder="Karbala, Ziyarah, Najaf suchen..."
          placeholderTextColor={theme.textSecondary}
          returnKeyType="search"
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          value={query}
        />
        <View style={styles.filters}>
          {filters.map((item) => {
            const selected = item === filter;
            return (
              <Pressable
                accessibilityRole="button"
                key={item}
                onPress={() => setFilter(item)}
                style={({ pressed }) => [
                  styles.filter,
                  {
                    backgroundColor: selected ? theme.accent : theme.backgroundElement,
                    borderColor: selected ? theme.accent : theme.border,
                  },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={selected && { color: theme.background }}>
                  {searchFilterLabels[item]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title={`${results.length} Ergebnis${results.length === 1 ? '' : 'se'}`}>
        <View style={styles.results}>
          {results.map((result) => (
            <SearchResultCard key={`${result.kind}-${result.id}`} result={result} />
          ))}
          {results.length === 0 && (
            <View style={[styles.empty, { borderColor: theme.border }]}>
              <ThemedText type="smallBold">Keine passenden Offline-Inhalte</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Probiere eine Stadt, einen Ortsnamen, eine Transliteration oder einen Inhaltstyp.
                Weitere geprüfte Inhalte können später im lokalen Datenkatalog ergänzt werden.
              </ThemedText>
            </View>
          )}
        </View>
      </Section>
    </Screen>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const route = result.kind === 'place' ? placeRoute(result.slug) : readerRoute(result.slug);

  return (
    <Card onPress={() => router.push(route)}>
      <View style={styles.resultHeader}>
        <View style={styles.resultTitle}>
          <ThemedText type="heading">{result.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {result.subtitle}
          </ThemedText>
        </View>
        <Badge status={result.verificationStatus} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {result.description}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filter: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  results: {
    gap: Spacing.three,
  },
  resultHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  resultTitle: {
    flex: 1,
    gap: Spacing.half,
  },
  empty: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  pressed: {
    opacity: 0.72,
  },
});
