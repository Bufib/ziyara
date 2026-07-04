import type { Place, RecommendedAct, ReligiousContent, SourceReference } from '@/domain/types';
import type { Language } from '@/features/i18n/i18n';

type PlaceTranslation = Partial<
  Pick<
    Place,
    | 'accessibilityNotes'
    | 'historicalNotes'
    | 'longDescription'
    | 'name'
    | 'openingInfo'
    | 'shortDescription'
    | 'visitingTips'
  >
> & {
  imageDescriptions?: Record<string, string>;
};

type RecommendedActTranslation = Pick<RecommendedAct, 'shortInstruction' | 'title'>;

type ReligiousContentTranslation = Partial<
  Pick<
    ReligiousContent,
    'arabicText' | 'language' | 'notes' | 'title' | 'translation' | 'transliteration'
  >
>;

type SourceReferenceTranslation = Partial<Pick<SourceReference, 'language' | 'notes' | 'title'>>;

const genericPlaceCopy: Record<Exclude<Language, 'de'>, Required<Pick<
  PlaceTranslation,
  'accessibilityNotes' | 'historicalNotes' | 'longDescription' | 'openingInfo' | 'visitingTips'
>>> = {
  en: {
    accessibilityNotes: 'Accessibility must be checked on site.',
    historicalNotes: 'Verified historical description will be added after source review.',
    longDescription: 'Verified historical description will be added after source review.',
    openingInfo: 'Local verification required before publication.',
    visitingTips: [
      'Check current access, safety, and visiting conditions before traveling.',
      'Keep important information available offline.',
      'Respect local rules in shrines, mosques, and cemeteries.',
    ],
  },
  ar: {
    accessibilityNotes: 'يجب التحقق من إتاحة الوصول في الموقع.',
    historicalNotes: 'سيضاف الوصف التاريخي الموثق بعد مراجعة المصادر.',
    longDescription: 'سيضاف الوصف التاريخي الموثق بعد مراجعة المصادر.',
    openingInfo: 'يلزم التحقق المحلي قبل النشر.',
    visitingTips: [
      'تحقق من شروط الوصول والسلامة والزيارة الحالية قبل السفر.',
      'احتفظ بالمعلومات المهمة متاحة دون اتصال.',
      'احترم التعليمات المحلية في الأضرحة والمساجد والمقابر.',
    ],
  },
};

const placeTranslations: Record<string, Partial<Record<Language, PlaceTranslation>>> = {
  'place-imam-hussain': {
    en: {
      name: 'Shrine of Imam Hussain',
      shortDescription: 'Important Ziyarah site in Karbala. Details require editorial review.',
      imageDescriptions: {
        'imam-hussain-shrine': 'Exterior view of the Shrine of Imam Hussain in Karbala.',
      },
    },
    ar: {
      name: 'ضريح الإمام الحسين',
      shortDescription: 'موقع زيارة مهم في كربلاء. تحتاج التفاصيل إلى مراجعة تحريرية.',
      imageDescriptions: {
        'imam-hussain-shrine': 'منظر خارجي لضريح الإمام الحسين في كربلاء.',
      },
    },
  },
  'place-abul-fadhl-abbas': {
    en: {
      name: 'Shrine of Abul Fadhl al-Abbas',
      shortDescription: 'Important shrine in Karbala. Details require editorial review.',
      imageDescriptions: {
        'abu-fadl-shrine': 'Exterior view of the Shrine of Abul Fadhl al-Abbas in Karbala.',
      },
    },
    ar: {
      name: 'ضريح أبي الفضل العباس',
      shortDescription: 'ضريح مهم في كربلاء. تحتاج التفاصيل إلى مراجعة تحريرية.',
      imageDescriptions: {
        'abu-fadl-shrine': 'منظر خارجي لضريح أبي الفضل العباس في كربلاء.',
      },
    },
  },
  'place-bayn-al-haramayn': {
    en: {
      name: 'Bayn al-Haramayn',
      shortDescription: 'Area between the two main shrines in Karbala.',
      imageDescriptions: {
        'bayn-al-haramayn': 'View of Bayn al-Haramayn between the two shrines in Karbala.',
      },
    },
    ar: {
      name: 'بين الحرمين',
      shortDescription: 'المنطقة بين الضريحين الرئيسيين في كربلاء.',
      imageDescriptions: {
        'bayn-al-haramayn': 'منظر لبين الحرمين بين الضريحين في كربلاء.',
      },
    },
  },
  'place-mukhayyam': {
    en: {
      name: 'Al-Mukhayyam / Camp of Imam Hussain',
      shortDescription: 'Historic site in Karbala. Details require editorial review.',
      imageDescriptions: {
        'al-mukhayam': 'View of Al-Mukhayyam, the camp area of Imam Hussain in Karbala.',
      },
    },
    ar: {
      name: 'المخيم / موضع خيام الإمام الحسين',
      shortDescription: 'موقع تاريخي في كربلاء. تحتاج التفاصيل إلى مراجعة تحريرية.',
      imageDescriptions: {
        'al-mukhayam': 'منظر للمخيم، موضع خيام الإمام الحسين في كربلاء.',
      },
    },
  },
  'place-hur': {
    en: {
      name: 'Shrine of Hur ibn Yazid al-Riyahi',
      shortDescription: 'Shrine in the Karbala area. Details require editorial review.',
      imageDescriptions: {
        'hurr-al-riyahi': 'Exterior view of the Shrine of Hur ibn Yazid al-Riyahi near Karbala.',
      },
    },
    ar: {
      name: 'ضريح الحر بن يزيد الرياحي',
      shortDescription: 'ضريح في منطقة كربلاء. تحتاج التفاصيل إلى مراجعة تحريرية.',
      imageDescriptions: {
        'hurr-al-riyahi': 'منظر خارجي لضريح الحر بن يزيد الرياحي في منطقة كربلاء.',
      },
    },
  },
  'place-imam-ali': {
    en: {
      name: 'Shrine of Imam Ali',
      shortDescription: 'Important Ziyarah site in Najaf. Details require editorial review.',
      imageDescriptions: {
        'imam-ali-shrine': 'Exterior view of the Shrine of Imam Ali in Najaf.',
      },
    },
    ar: {
      name: 'ضريح الإمام علي',
      shortDescription: 'موقع زيارة مهم في النجف. تحتاج التفاصيل إلى مراجعة تحريرية.',
      imageDescriptions: {
        'imam-ali-shrine': 'منظر خارجي لضريح الإمام علي في النجف.',
      },
    },
  },
  'place-wadi-salam': {
    en: {
      name: 'Wadi al-Salam Cemetery',
      shortDescription: 'Cemetery in Najaf. Details require editorial review.',
      imageDescriptions: {
        'wadi-as-salam': 'View of Wadi al-Salam Cemetery in Najaf.',
      },
    },
    ar: {
      name: 'مقبرة وادي السلام',
      shortDescription: 'مقبرة في النجف. تحتاج التفاصيل إلى مراجعة تحريرية.',
      imageDescriptions: {
        'wadi-as-salam': 'منظر لمقبرة وادي السلام في النجف.',
      },
    },
  },
  'place-masjid-kufa': {
    en: {
      name: 'Masjid al-Kufa',
      shortDescription: 'Important mosque in Kufa. Details require editorial review.',
      imageDescriptions: {
        'kufa-grand-mosque': 'Exterior view of the Great Mosque of Kufa.',
      },
    },
    ar: {
      name: 'مسجد الكوفة',
      shortDescription: 'مسجد مهم في الكوفة. تحتاج التفاصيل إلى مراجعة تحريرية.',
      imageDescriptions: {
        'kufa-grand-mosque': 'منظر خارجي لمسجد الكوفة الكبير.',
      },
    },
  },
  'place-masjid-sahlah': {
    en: {
      name: 'Masjid al-Sahlah',
      shortDescription: 'Important mosque in Kufa. Details require editorial review.',
      imageDescriptions: {
        'masjid-al-sahlah': 'Exterior view of Masjid al-Sahlah in Kufa.',
      },
    },
    ar: {
      name: 'مسجد السهلة',
      shortDescription: 'مسجد مهم في الكوفة. تحتاج التفاصيل إلى مراجعة تحريرية.',
      imageDescriptions: {
        'masjid-al-sahlah': 'منظر خارجي لمسجد السهلة في الكوفة.',
      },
    },
  },
  'place-muslim-ibn-aqil': {
    en: {
      name: 'Shrine of Muslim ibn Aqil',
      shortDescription: 'Shrine in Kufa. Details require editorial review.',
      imageDescriptions: {
        'muslim-shrine-in-kufa': 'View of the Shrine of Muslim ibn Aqil in Kufa.',
      },
    },
    ar: {
      name: 'ضريح مسلم بن عقيل',
      shortDescription: 'ضريح في الكوفة. تحتاج التفاصيل إلى مراجعة تحريرية.',
      imageDescriptions: {
        'muslim-shrine-in-kufa': 'منظر لضريح مسلم بن عقيل في الكوفة.',
      },
    },
  },
  'place-hani-ibn-urwah': {
    en: {
      name: 'Shrine of Hani ibn Urwah',
      shortDescription: 'Shrine in Kufa. Details require editorial review.',
    },
    ar: {
      name: 'ضريح هاني بن عروة',
      shortDescription: 'ضريح في الكوفة. تحتاج التفاصيل إلى مراجعة تحريرية.',
    },
  },
  'place-maytham': {
    en: {
      name: 'Shrine of Maytham al-Tammar',
      shortDescription: 'Shrine in Kufa. Details require editorial review.',
      imageDescriptions: {
        'maytham-tammar-shrine': 'Exterior view of the Shrine of Maytham al-Tammar in Kufa.',
      },
    },
    ar: {
      name: 'ضريح ميثم التمار',
      shortDescription: 'ضريح في الكوفة. تحتاج التفاصيل إلى مراجعة تحريرية.',
      imageDescriptions: {
        'maytham-tammar-shrine': 'منظر خارجي لضريح ميثم التمار في الكوفة.',
      },
    },
  },
  'place-kadhimayn': {
    en: {
      name: 'Shrine of Imam Musa al-Kadhim and Imam Muhammad al-Jawad',
      shortDescription: 'Important Ziyarah site in Baghdad. Details require editorial review.',
      imageDescriptions: {
        'kadhimayn-shrine': 'Exterior view of the Kadhimayn Shrine in Baghdad.',
      },
    },
    ar: {
      name: 'ضريح الإمامين موسى الكاظم ومحمد الجواد',
      shortDescription: 'موقع زيارة مهم في بغداد. تحتاج التفاصيل إلى مراجعة تحريرية.',
      imageDescriptions: {
        'kadhimayn-shrine': 'منظر خارجي لضريح الكاظمين في بغداد.',
      },
    },
  },
  'place-askari': {
    en: {
      name: 'Shrine of Imam Ali al-Hadi and Imam Hasan al-Askari',
      shortDescription: 'Important Ziyarah site in Samarra. Details require editorial review.',
      imageDescriptions: {
        'imam-hadi-imam-askari': 'Exterior view of the Askariyyayn Shrine in Samarra.',
      },
    },
    ar: {
      name: 'ضريح الإمامين علي الهادي والحسن العسكري',
      shortDescription: 'موقع زيارة مهم في سامراء. تحتاج التفاصيل إلى مراجعة تحريرية.',
      imageDescriptions: {
        'imam-hadi-imam-askari': 'منظر خارجي لضريح العسكريين في سامراء.',
      },
    },
  },
  'place-sardab': {
    en: {
      name: 'Sardab al-Ghaybah',
      shortDescription: 'Ziyarah site in Samarra. Details require editorial review.',
    },
    ar: {
      name: 'سرداب الغيبة',
      shortDescription: 'موقع زيارة في سامراء. تحتاج التفاصيل إلى مراجعة تحريرية.',
    },
  },
};

const recommendedActTranslations: Record<
  string,
  Partial<Record<Language, RecommendedActTranslation>>
> = {
  'act-ziyarah-imam-hussain': {
    en: {
      title: 'Review Ziyarah Nahiya via duas.org',
      shortInstruction:
        'Source: duas.org. Add the full text offline only after rights and content review.',
    },
    ar: {
      title: 'مراجعة زيارة الناحية عبر duas.org',
      shortInstruction:
        'المصدر: duas.org. يضاف النص الكامل دون اتصال فقط بعد مراجعة الحقوق والمحتوى.',
    },
  },
  'act-two-rakat-imam-hussain': {
    en: {
      title: 'Review Dua Safwan / Alqama after Ziyarat Ashura',
      shortInstruction: 'duas.org describes this dua as recited after Ziyarat Ashura.',
    },
    ar: {
      title: 'مراجعة دعاء صفوان / علقمة بعد زيارة عاشوراء',
      shortInstruction: 'يصف موقع duas.org هذا الدعاء بأنه يقرأ بعد زيارة عاشوراء.',
    },
  },
  'act-ziyarat-arbaeen-imam-hussain': {
    en: {
      title: 'Review Ziyarat Arbaeen on 20 Safar',
      shortInstruction: 'duas.org assigns Ziyarat Arbaeen to 20 Safar.',
    },
    ar: {
      title: 'مراجعة زيارة الأربعين في 20 صفر',
      shortInstruction: 'ينسب موقع duas.org زيارة الأربعين إلى يوم 20 صفر.',
    },
  },
  'act-ziyarah-imam-ali': {
    en: {
      title: 'Review Ziyarat Ameenallah via duas.org',
      shortInstruction:
        'Source: duas.org. Add the full text offline only after rights and content review.',
    },
    ar: {
      title: 'مراجعة زيارة أمين الله عبر duas.org',
      shortInstruction:
        'المصدر: duas.org. يضاف النص الكامل دون اتصال فقط بعد مراجعة الحقوق والمحتوى.',
    },
  },
  'act-two-rakat-imam-ali': {
    en: {
      title: 'Review the two-rakʿah rite from the Dua Safwan context',
      shortInstruction:
        'duas.org cites two prayer units near the grave of Imam Ali in the background to Dua Safwan.',
    },
    ar: {
      title: 'مراجعة ركعتي الصلاة في سياق دعاء صفوان',
      shortInstruction:
        'يذكر موقع duas.org ركعتي صلاة عند قبر الإمام علي ضمن سياق دعاء صفوان.',
    },
  },
};

const placeholderTranslations: Record<Language, string> = {
  ar: 'سيضاف النص الكامل بعد مراجعة الحقوق والمحتوى. انظر المصدر أدناه.',
  de: 'Volltext wird nach Rechte- und Inhaltsprüfung ergänzt. Quelle siehe unten.',
  en: 'Full text will be added after rights and content review. See the source below.',
};

const religiousContentTranslations: Record<
  string,
  Partial<Record<Language, ReligiousContentTranslation>>
> = {
  'ziyarah-imam-hussain-placeholder': {
    en: {
      arabicText: placeholderTranslations.en,
      language: 'Arabic',
      notes:
        'Source-bound entry based on duas.org. The full text is not copied into the app until rights and content review are complete.',
      title: 'Ziyarah Nahiya for Imam Hussain',
      translation: placeholderTranslations.en,
      transliteration: placeholderTranslations.en,
    },
    ar: {
      arabicText: placeholderTranslations.ar,
      language: 'العربية',
      notes:
        'إدخال مرتبط بالمصدر اعتمادا على duas.org. لا ينسخ النص الكامل إلى التطبيق حتى تكتمل مراجعة الحقوق والمحتوى.',
      title: 'زيارة الناحية للإمام الحسين',
      translation: placeholderTranslations.ar,
      transliteration: placeholderTranslations.ar,
    },
  },
  'ziyarah-imam-ali-placeholder': {
    en: {
      arabicText: placeholderTranslations.en,
      language: 'Arabic',
      notes:
        'Source-bound entry based on duas.org. The full text is not copied into the app until rights and content review are complete.',
      title: 'Ziyarat Ameenallah for Imam Ali',
      translation: placeholderTranslations.en,
      transliteration: placeholderTranslations.en,
    },
    ar: {
      arabicText: placeholderTranslations.ar,
      language: 'العربية',
      notes:
        'إدخال مرتبط بالمصدر اعتمادا على duas.org. لا ينسخ النص الكامل إلى التطبيق حتى تكتمل مراجعة الحقوق والمحتوى.',
      title: 'زيارة أمين الله للإمام علي',
      translation: placeholderTranslations.ar,
      transliteration: placeholderTranslations.ar,
    },
  },
  'general-ziyarah-etiquette-placeholder': {
    en: {
      arabicText: placeholderTranslations.en,
      language: 'English',
      notes:
        'duas.org assigns this Ziyarah to 20 Safar. The full text will be added offline only after rights and content review.',
      title: 'Ziyarat Arbaeen',
      translation: placeholderTranslations.en,
      transliteration: placeholderTranslations.en,
    },
    ar: {
      arabicText: placeholderTranslations.ar,
      language: 'العربية',
      notes:
        'ينسب موقع duas.org هذه الزيارة إلى يوم 20 صفر. سيضاف النص الكامل دون اتصال فقط بعد مراجعة الحقوق والمحتوى.',
      title: 'زيارة الأربعين',
      translation: placeholderTranslations.ar,
      transliteration: placeholderTranslations.ar,
    },
  },
  'two-rakat-prayer-placeholder': {
    en: {
      arabicText: placeholderTranslations.en,
      language: 'English',
      notes:
        'duas.org describes this dua as recited after Ziyarat Ashura and known as Dua Safwan. Full text follows after rights and content review.',
      title: 'Dua Safwan / Alqama after Ziyarat Ashura',
      translation: placeholderTranslations.en,
      transliteration: placeholderTranslations.en,
    },
    ar: {
      arabicText: placeholderTranslations.ar,
      language: 'العربية',
      notes:
        'يصف موقع duas.org هذا الدعاء بأنه يقرأ بعد زيارة عاشوراء ويعرف بدعاء صفوان. يتبع النص الكامل بعد مراجعة الحقوق والمحتوى.',
      title: 'دعاء صفوان / علقمة بعد زيارة عاشوراء',
      translation: placeholderTranslations.ar,
      transliteration: placeholderTranslations.ar,
    },
  },
};

const sourceReferenceTranslations: Record<
  string,
  Partial<Record<Language, SourceReferenceTranslation>>
> = {
  'duas-ziyarat-nahiya': {
    en: {
      language: 'Arabic / English',
      notes:
        'duas.org describes this Ziyarah as a salutation for Imam Hussain and refers in the introduction to al-Mazar al-Kabir and Bihar al-Anwar.',
    },
    ar: {
      language: 'العربية / الإنجليزية',
      notes:
        'يصف موقع duas.org هذه الزيارة بأنها سلام على الإمام الحسين ويشير في المقدمة إلى المزار الكبير وبحار الأنوار.',
    },
  },
  'duas-ziyarat-arbaeen': {
    en: {
      language: 'Arabic / English',
      notes:
        'duas.org assigns Ziyarat Arbaeen to 20 Safar and mentions transmission notes about Shaykh al-Tusi on the page.',
    },
    ar: {
      language: 'العربية / الإنجليزية',
      notes:
        'ينسب موقع duas.org زيارة الأربعين إلى 20 صفر ويذكر في الصفحة إشارات نقل عن الشيخ الطوسي.',
    },
  },
  'duas-dua-alqama-safwan': {
    en: {
      language: 'Arabic / English',
      notes:
        'duas.org explains that this dua is recited after Ziyarat Ashura and is also known as Dua Safwan.',
    },
    ar: {
      language: 'العربية / الإنجليزية',
      notes:
        'يوضح موقع duas.org أن هذا الدعاء يقرأ بعد زيارة عاشوراء ويعرف أيضا بدعاء صفوان.',
    },
  },
  'duas-ziyarat-ameenallah': {
    en: {
      language: 'Arabic / English',
      notes:
        'duas.org provides a dedicated page for Ziyarat Ameenallah. The entry remains marked as needs review until specialist review is complete.',
    },
    ar: {
      language: 'العربية / الإنجليزية',
      notes:
        'يوفر موقع duas.org صفحة خاصة بزيارة أمين الله. يبقى الإدخال بعلامة الحاجة إلى المراجعة حتى تكتمل المراجعة المتخصصة.',
    },
  },
  'editorial-review-required': {
    en: {
      notes:
        'Internal note: Content without a reviewed primary source or rights review must not be shown as verified.',
      title: 'Editorial review required',
    },
    ar: {
      notes:
        'ملاحظة داخلية: لا يجوز عرض المحتوى بلا مصدر أولي مراجع أو مراجعة حقوق على أنه موثق.',
      title: 'المراجعة التحريرية مطلوبة',
    },
  },
};

const cityTranslations: Record<string, Partial<Record<Language, string>>> = {
  Bagdad: { en: 'Baghdad', ar: 'بغداد' },
  Kadhimayn: { en: 'Kadhimayn', ar: 'الكاظمية' },
  Karbala: { en: 'Karbala', ar: 'كربلاء' },
  Kufa: { en: 'Kufa', ar: 'الكوفة' },
  Najaf: { en: 'Najaf', ar: 'النجف' },
  Samarra: { en: 'Samarra', ar: 'سامراء' },
};

const provinceTranslations: Record<string, Partial<Record<Language, string>>> = {
  Bagdad: { en: 'Baghdad', ar: 'بغداد' },
  Karbala: { en: 'Karbala', ar: 'كربلاء' },
  Najaf: { en: 'Najaf', ar: 'النجف' },
  'Salah al-Din': { en: 'Salah al-Din', ar: 'صلاح الدين' },
};

export function localizeCityName(city: string, language: Language) {
  return cityTranslations[city]?.[language] ?? city;
}

export function localizeProvinceName(province: string, language: Language) {
  return provinceTranslations[province]?.[language] ?? province;
}

export function localizeCountryName(country: Place['country'], language: Language) {
  if (language === 'ar') {
    return 'العراق';
  }

  return country;
}

export function formatPlaceLocation(place: Place, language: Language, includeCountry = false) {
  const location = `${localizeCityName(place.city, language)}, ${localizeProvinceName(
    place.province,
    language,
  )}`;

  return includeCountry ? `${location}, ${localizeCountryName(place.country, language)}` : location;
}

export function localizePlace(place: Place, language: Language): Place {
  if (language === 'de') {
    return place;
  }

  const patch = placeTranslations[place.id]?.[language];
  const generic = genericPlaceCopy[language];

  return {
    ...place,
    ...generic,
    ...patch,
    images: place.images.map((image) => ({
      ...image,
      description: patch?.imageDescriptions?.[image.id] ?? image.description,
    })),
  };
}

export function localizePlaces(places: Place[], language: Language) {
  return places.map((place) => localizePlace(place, language));
}

export function localizeRecommendedAct(act: RecommendedAct, language: Language): RecommendedAct {
  return {
    ...act,
    ...recommendedActTranslations[act.id]?.[language],
  };
}

export function localizeRecommendedActs(acts: RecommendedAct[], language: Language) {
  return acts.map((act) => localizeRecommendedAct(act, language));
}

export function localizeReligiousContent(
  content: ReligiousContent,
  language: Language,
): ReligiousContent {
  return {
    ...content,
    ...religiousContentTranslations[content.id]?.[language],
  };
}

export function localizeReligiousContentList(
  content: ReligiousContent[],
  language: Language,
) {
  return content.map((item) => localizeReligiousContent(item, language));
}

export function localizeSourceReference(
  source: SourceReference,
  language: Language,
): SourceReference {
  return {
    ...source,
    ...sourceReferenceTranslations[source.id]?.[language],
  };
}

export function localizeSourceReferences(sources: SourceReference[], language: Language) {
  return sources.map((source) => localizeSourceReference(source, language));
}
