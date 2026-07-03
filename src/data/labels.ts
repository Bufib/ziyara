import type {
  RecommendedActType,
  ReligiousContentType,
  SourceContentPolicy,
  VerificationStatus,
} from '@/domain/types';
import type { SearchFilter } from '@/data/catalog';

export const verificationStatusLabels: Record<VerificationStatus, string> = {
  draft: 'Entwurf',
  needs_review: 'Zu prüfen',
  verified: 'Geprüft',
  rejected: 'Abgelehnt',
};

export const searchFilterLabels: Record<SearchFilter, string> = {
  all: 'Alle',
  places: 'Orte',
  content: 'Inhalte',
  acts: 'Handlungen',
};

export const religiousContentTypeLabels: Record<ReligiousContentType, string> = {
  dua: 'Dua',
  instruction: 'Anleitung',
  salawat: 'Salawat',
  surah: 'Sure',
  ziyarah: 'Ziyarah',
};

export const sourceContentPolicyLabels: Record<SourceContentPolicy, string> = {
  approved_for_offline: 'Offline-Volltext freigegeben',
  linked_not_copied: 'Volltext extern verlinkt',
  pending_rights_review: 'Rechteprüfung ausstehend',
};

export const recommendedActTypeLabels: Record<RecommendedActType, string> = {
  dua: 'Dua',
  etiquette: 'Etikette',
  instruction: 'Anleitung',
  prayer: 'Gebet',
  recitation: 'Rezitation',
  ziyarah: 'Ziyarah',
};
