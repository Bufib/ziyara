import type { RecommendedAct } from '@/domain/types';

export const recommendedActs: RecommendedAct[] = [
  {
    id: 'act-ziyarah-imam-hussain',
    title: 'Ziyarah Nahiya über duas.org prüfen',
    type: 'ziyarah',
    shortInstruction: 'Quelle: duas.org. Volltext erst nach Rechte- und Inhaltsprüfung offline ergänzen.',
    contentId: 'ziyarah-imam-hussain-placeholder',
    recommendedAtPlaceId: 'place-imam-hussain',
    priority: 1,
    sourceReferences: ['duas-ziyarat-nahiya'],
    verificationStatus: 'needs_review',
  },
  {
    id: 'act-two-rakat-imam-hussain',
    title: 'Dua Safwan / Alqama nach Ziyarat Ashura prüfen',
    type: 'dua',
    shortInstruction: 'duas.org beschreibt diese Dua als nach Ziyarat Ashura rezitiert.',
    contentId: 'two-rakat-prayer-placeholder',
    recommendedAtPlaceId: 'place-imam-hussain',
    priority: 2,
    sourceReferences: ['duas-dua-alqama-safwan'],
    verificationStatus: 'needs_review',
  },
  {
    id: 'act-ziyarat-arbaeen-imam-hussain',
    title: 'Ziyarat Arbaeen am 20. Safar prüfen',
    type: 'ziyarah',
    shortInstruction: 'duas.org ordnet Ziyarat Arbaeen dem 20. Safar zu.',
    contentId: 'general-ziyarah-etiquette-placeholder',
    recommendedAtPlaceId: 'place-imam-hussain',
    priority: 3,
    sourceReferences: ['duas-ziyarat-arbaeen'],
    verificationStatus: 'needs_review',
  },
  {
    id: 'act-ziyarah-imam-ali',
    title: 'Ziyarat Ameenallah über duas.org prüfen',
    type: 'ziyarah',
    shortInstruction: 'Quelle: duas.org. Volltext erst nach Rechte- und Inhaltsprüfung offline ergänzen.',
    contentId: 'ziyarah-imam-ali-placeholder',
    recommendedAtPlaceId: 'place-imam-ali',
    priority: 1,
    sourceReferences: ['duas-ziyarat-ameenallah'],
    verificationStatus: 'needs_review',
  },
  {
    id: 'act-two-rakat-imam-ali',
    title: 'Zwei-Rakʿa-Ritus aus dem Dua-Safwan-Kontext prüfen',
    type: 'prayer',
    shortInstruction: 'duas.org zitiert im Hintergrund zu Dua Safwan zwei Gebetseinheiten am Grab von Imam Ali.',
    contentId: 'two-rakat-prayer-placeholder',
    recommendedAtPlaceId: 'place-imam-ali',
    priority: 2,
    sourceReferences: ['duas-dua-alqama-safwan'],
    verificationStatus: 'needs_review',
  },
];

export function getRecommendedActsForPlace(placeId: string) {
  return recommendedActs
    .filter((act) => act.recommendedAtPlaceId === placeId)
    .sort((a, b) => a.priority - b.priority);
}
