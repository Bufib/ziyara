import type { ReligiousContent } from '@/domain/types';

const placeholder =
  'Volltext wird nach Rechte- und Inhaltsprüfung ergänzt. Quelle siehe unten.';

export const religiousContent: ReligiousContent[] = [
  {
    id: 'ziyarah-imam-hussain-placeholder',
    slug: 'ziyarah-imam-hussain-placeholder',
    title: 'Ziyarah Nahiya für Imam Hussain',
    type: 'ziyarah',
    arabicText: placeholder,
    transliteration: placeholder,
    translation: placeholder,
    language: 'Arabisch',
    notes:
      'Quellengebundener Eintrag nach duas.org. Der vollständige Text wird nicht in die App kopiert, bis Rechte- und Inhaltsprüfung abgeschlossen sind.',
    sourceReferences: ['duas-ziyarat-nahiya'],
    verificationStatus: 'needs_review',
    version: '0.1.0',
  },
  {
    id: 'ziyarah-imam-ali-placeholder',
    slug: 'ziyarah-imam-ali-placeholder',
    title: 'Ziyarat Ameenallah für Imam Ali',
    type: 'ziyarah',
    arabicText: placeholder,
    transliteration: placeholder,
    translation: placeholder,
    language: 'Arabisch',
    notes:
      'Quellengebundener Eintrag nach duas.org. Der vollständige Text wird nicht in die App kopiert, bis Rechte- und Inhaltsprüfung abgeschlossen sind.',
    sourceReferences: ['duas-ziyarat-ameenallah'],
    verificationStatus: 'needs_review',
    version: '0.1.0',
  },
  {
    id: 'general-ziyarah-etiquette-placeholder',
    slug: 'general-ziyarah-etiquette-placeholder',
    title: 'Ziyarat Arbaeen',
    type: 'ziyarah',
    arabicText: placeholder,
    transliteration: placeholder,
    translation: placeholder,
    language: 'Deutsch',
    notes:
      'duas.org ordnet diese Ziyarah dem 20. Safar zu. Der vollständige Text wird erst nach Rechte- und Inhaltsprüfung offline ergänzt.',
    sourceReferences: ['duas-ziyarat-arbaeen'],
    verificationStatus: 'needs_review',
    version: '0.1.0',
  },
  {
    id: 'two-rakat-prayer-placeholder',
    slug: 'two-rakat-prayer-placeholder',
    title: 'Dua Safwan / Alqama nach Ziyarat Ashura',
    type: 'dua',
    arabicText: placeholder,
    transliteration: placeholder,
    translation: placeholder,
    language: 'Deutsch',
    notes:
      'duas.org beschreibt diese Dua als nach Ziyarat Ashura rezitiert und als Dua Safwan bekannt. Volltext folgt nach Rechte- und Inhaltsprüfung.',
    sourceReferences: ['duas-dua-alqama-safwan'],
    verificationStatus: 'needs_review',
    version: '0.1.0',
  },
];

export function getReligiousContentBySlug(slug?: string) {
  return religiousContent.find((content) => content.slug === slug || content.id === slug);
}
