import type { VerificationStatus } from '@/domain/types';
import { recommendedActTypeLabels, religiousContentTypeLabels } from '@/data/labels';
import { allPlaces } from '@/data/places';
import { recommendedActs } from '@/data/recommendedActs';
import { religiousContent } from '@/data/religiousContent';
import { getSourceReferencesByIds } from '@/data/sourceReferences';

export type SearchFilter = 'all' | 'places' | 'content' | 'acts';

export type SearchResult = {
  description: string;
  id: string;
  kind: 'place' | 'content' | 'act';
  slug: string;
  subtitle: string;
  title: string;
  verificationStatus: VerificationStatus;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function matches(query: string, fields: string[]) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;
  return fields.some((field) => normalize(field).includes(normalizedQuery));
}

function sourceSearchFields(sourceIds: string[]) {
  return getSourceReferencesByIds(sourceIds).flatMap((source) => [
    source.title,
    source.bookOrWebsite ?? '',
    source.url ?? '',
    source.quotedExcerpt ?? '',
    source.notes,
  ]);
}

export function searchCatalog(query: string, filter: SearchFilter): SearchResult[] {
  const placeResults =
    filter === 'all' || filter === 'places'
      ? allPlaces
          .filter((place) =>
            matches(query, [
              place.name,
              place.city,
              place.province,
              place.category,
              ...place.alternativeNames,
              ...sourceSearchFields(place.sourceReferences),
            ]),
          )
          .map((place) => ({
            description: place.shortDescription,
            id: place.id,
            kind: 'place' as const,
            slug: place.slug,
            subtitle: `${place.city}, ${place.province}`,
            title: place.name,
            verificationStatus: place.verificationStatus,
          }))
      : [];

  const contentResults =
    filter === 'all' || filter === 'content'
      ? religiousContent
          .filter((content) =>
            matches(query, [
              content.title,
              content.type,
              content.arabicText,
              content.transliteration,
              content.translation,
              ...sourceSearchFields(content.sourceReferences),
            ]),
          )
          .map((content) => ({
            description: content.notes,
            id: content.id,
            kind: 'content' as const,
            slug: content.slug,
            subtitle: religiousContentTypeLabels[content.type],
            title: content.title,
            verificationStatus: content.verificationStatus,
          }))
      : [];

  const actResults =
    filter === 'all' || filter === 'acts'
      ? recommendedActs
          .filter((act) =>
            matches(query, [
              act.title,
              act.type,
              act.shortInstruction,
              ...sourceSearchFields(act.sourceReferences),
            ]),
          )
          .map((act) => ({
            description: act.shortInstruction,
            id: act.id,
            kind: 'act' as const,
            slug: act.contentId ?? 'general-ziyarah-etiquette-placeholder',
            subtitle: recommendedActTypeLabels[act.type],
            title: act.title,
            verificationStatus: act.verificationStatus,
          }))
      : [];

  return [...placeResults, ...contentResults, ...actResults];
}
