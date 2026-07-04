import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from "react";

import { usePersistentState } from "@/features/storage/persistentState";

export type Language = "de" | "en" | "ar";

type TranslationParams = Record<string, number | string>;

type I18nContextValue = {
  isRTL: boolean;
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: TranslationParams) => string;
};

export const languageOptions: {
  label: string;
  nativeLabel: string;
  value: Language;
}[] = [
  { label: "Deutsch", nativeLabel: "Deutsch", value: "de" },
  { label: "English", nativeLabel: "English", value: "en" },
  { label: "Arabic", nativeLabel: "العربية", value: "ar" },
];

const dictionaries: Record<Language, Record<string, string>> = {
  de: {
    "about.build":
      "Der aktuelle Build nutzt Expo SDK 57, Expo Router, TypeScript, React Native Maps, Expo Location, SQLite-Vorbereitung und lokal gespeicherte Einstellungen.",
    "about.editorialBody":
      "Religiöse Texte, Übersetzungen, Transliterationen und Aussagen dürfen nur mit Quellenangaben und qualifizierter Prüfung ergänzt werden. Platzhalter bleiben sichtbar, bis diese Prüfung abgeschlossen ist.",
    "about.editorialTitle": "Redaktionelles Prinzip",
    "about.intro":
      "Shia Ziyarah Iraq ist als Offline-First-Begleiter für Pilgerinnen und Pilger aufgebaut, die wichtige schiitische Ziyarah-Orte im Irak besuchen.",
    "about.title": "Über Shia Ziyarah Iraq",
    "bookmarks.clear": "Leeren",
    "bookmarks.emptyBody":
      "Speichere Orte oder Leseeinträge, um sie offline schnell wiederzufinden.",
    "bookmarks.emptyTitle": "Noch keine Einträge",
    "bookmarks.readingEntries": "{count} Leseeinträge",
    "bookmarks.showPlaces": "{count} Orte ansehen",
    "bookmarks.title": "Merkliste",
    "city.emptyBody":
      "Der lokale Katalog enthält dafür noch keinen geprüften Platzhalter.",
    "city.emptyTitle": "Noch keine Orte für diese Stadt",
    "city.offlineBody":
      "Offline verfügbare Orte in dieser Stadt. Religiöse und historische Details bleiben als zu prüfen markiert, bis die Quellenprüfung abgeschlossen ist.",
    "city.placeCount.many": "{count} Orte",
    "city.placeCount.one": "{count} Ort",
    "city.titleFallback": "Stadt",
    "common.aboutApp": "Über die App",
    "common.currentLocation": "Dein aktueller Standort",
    "common.details": "Details",
    "common.disclaimer": "Inhaltlicher Hinweis",
    "common.navigate": "Navigieren",
    "common.openMap": "Karte öffnen",
    "common.openSource": "Quelle öffnen",
    "common.save": "Speichern",
    "common.saved": "Gespeichert",
    "common.search": "Suchen",
    "common.sourcePrefix": "Quelle: {source}",
    "common.sources": "Quellen",
    "common.toMap": "Zur Karte",
    "disclaimer.body1":
      "Diese App ist ein Software-Begleiter und Inhaltscontainer. Sie ist keine religiöse Autorität.",
    "disclaimer.body2":
      "Duas, Ziyarat, Übersetzungen, historische Hinweise, empfohlene Handlungen und Ortsdaten sollten von qualifizierten Gelehrten oder Redakteuren geprüft werden, bevor sie als verifiziert gelten.",
    "disclaimer.body3":
      "Platzhaltertext wird verwendet, solange geprüftes Arabisch, Transliteration, Übersetzung oder Quellenangaben noch nicht vorliegen.",
    "disclaimer.body4":
      "Verlinkte duas.org-Seiten dienen als externe Quelle. Volltexte werden erst nach Rechteklärung und fachlicher Inhaltsprüfung offline gespeichert.",
    "disclaimer.title": "Inhaltlicher Hinweis",
    "home.featuredPlaces": "Ausgewählte Orte",
    "home.heroBody":
      "Ortsdaten, Informationen, Gebete und vieles mehr offline verfügbar.",
    "home.heroTitle": "Alles für deine Ziyārah an einem Ort",
    "home.importantCities": "Städte (5)",
    "home.recommendedActs.many": "{count} empfohlene Handlungen",
    "home.recommendedActs.one": "{count} empfohlene Handlung",
    "labels.actType.dua": "Dua",
    "labels.actType.etiquette": "Etikette",
    "labels.actType.instruction": "Anleitung",
    "labels.actType.prayer": "Gebet",
    "labels.actType.recitation": "Rezitation",
    "labels.actType.ziyarah": "Ziyarah",
    "labels.contentType.dua": "Dua",
    "labels.contentType.instruction": "Anleitung",
    "labels.contentType.salawat": "Salawat",
    "labels.contentType.surah": "Sure",
    "labels.contentType.ziyarah": "Ziyarah",
    "labels.searchFilter.acts": "Handlungen",
    "labels.searchFilter.all": "Alle",
    "labels.searchFilter.content": "Inhalte",
    "labels.searchFilter.places": "Orte",
    "labels.sourcePolicy.approved_for_offline": "Offline-Volltext freigegeben",
    "labels.sourcePolicy.linked_not_copied": "Volltext extern verlinkt",
    "labels.sourcePolicy.pending_rights_review": "Rechteprüfung ausstehend",
    "labels.status.draft": "Entwurf",
    "labels.status.needs_review": "Zu prüfen",
    "labels.status.rejected": "Abgelehnt",
    "labels.status.verified": "Geprüft",
    "map.browserDenied":
      "Standortfreigabe wurde abgelehnt oder ist im Browser nicht verfügbar.",
    "map.browserUnsupported":
      "Dieser Browser unterstützt keine Standortfreigabe.",
    "map.description":
      "Im Web wird eine schematische Offline-Karte angezeigt. Auf iOS und Android nutzt die App React Native Maps mit Markern und optionalem Standort.",
    "map.locationDenied": "Standortberechtigung abgelehnt",
    "map.locationDeniedBody":
      "Aktiviere den Standort in den Geräteeinstellungen, um deine Position auf der Karte zu sehen.",
    "map.locationErrorBody":
      "Dein Standort konnte gerade nicht geladen werden. Prüfe GPS, Berechtigungen oder die Internetverbindung.",
    "map.locationLoading": "Standort wird geladen",
    "map.locationUnavailable": "Standort nicht verfügbar",
    "map.myLocation": "Mein Standort",
    "map.places": "Orte",
    "map.recenter": "Neu zentrieren",
    "map.refreshLocation": "Standort aktualisieren",
    "map.title": "Ziyarah-Karte Irak",
    "nav.about": "Über die App",
    "nav.city": "Stadt",
    "nav.disclaimer": "Inhaltlicher Hinweis",
    "nav.home": "Home",
    "nav.map": "Karte",
    "nav.bookmarks": "Merkliste",
    "nav.search": "Suche",
    "nav.settings": "Einstellungen",
    "nav.placeDetails": "Ortsdetails",
    "nav.reader": "Lesemodus",
    "nav.sources": "Quellen",
    "place.about": "Über diesen Ort",
    "place.accessibilityPrefix": "Barrierefreiheit: {value}",
    "place.closeImage": "Bild schließen",
    "place.imageOpenLabel": "{description} groß anzeigen",
    "place.notFound": "Ort nicht gefunden",
    "place.openingPrefix": "Öffnungszeiten: {value}",
    "place.recommendedActs": "Empfohlene Handlungen",
    "place.reviewSources": "Quellen und Prüfung",
    "place.sourceRule": "Quellenregel ansehen",
    "place.sourcesEmpty": "Redaktionelle Prüfung ausstehend.",
    "place.startNavigation": "Navigation starten",
    "place.visitTips": "Hinweise für den Besuch",
    "reader.arabic": "Arabisch",
    "reader.copy": "Kopieren",
    "reader.duasFullText": "Volltext von duas.org",
    "reader.duasOpen": "duas.org öffnen",
    "reader.duasText":
      "Der Volltext ist aktuell über die Originalquelle verlinkt und wird erst nach Rechte- und Inhaltsprüfung offline in die App übernommen.",
    "reader.findContent": "Inhalte suchen",
    "reader.notFound": "Leseeintrag nicht gefunden",
    "reader.notes": "Notizen",
    "reader.pendingReview": "Prüfung ausstehend",
    "reader.reviewedLine": "Version {version}. Geprüft von: {reviewer}.",
    "reader.share": "Teilen",
    "reader.sources": "Quellenangaben",
    "reader.sourcesShareTitle": "Quellen:",
    "reader.text": "Text",
    "reader.translation": "Übersetzung",
    "reader.transliteration": "Transliteration",
    "search.emptyBody":
      "Probiere eine Stadt, einen Ortsnamen, eine Transliteration oder einen Inhaltstyp. Weitere geprüfte Inhalte können später im lokalen Datenkatalog ergänzt werden.",
    "search.emptyTitle": "Keine passenden Offline-Inhalte",
    "search.placeholder": "Karbala, Ziyarah, Najaf suchen...",
    "search.resultCount.many": "{count} Ergebnisse",
    "search.resultCount.one": "{count} Ergebnis",
    "search.searchA11y": "Orte, Städte, Duas, Ziyarat und Handlungen suchen",
    "search.title": "Suche",
    "settings.activeMode": "Aktiver Modus: {mode}.",
    "settings.appPrep": "App-Vorbereitung",
    "settings.arabicFontBody":
      "Gilt für Platzhalter und geprüfte arabische Inhalte.",
    "settings.arabicFontTitle": "Arabische Schriftgröße",
    "settings.appearance": "Darstellung",
    "settings.darkBlue": "Dunkelblau",
    "settings.languageBody":
      "Wähle die Sprache der App-Oberfläche und der lokalen Platzhaltertexte.",
    "settings.languageTitle": "Sprache",
    "settings.light": "Hell",
    "settings.lineByLineBody":
      "Gruppiert Arabisch, Transliteration und Übersetzung.",
    "settings.lineByLineTitle": "Zeilenweise Ansicht",
    "settings.reader": "Lesemodus",
    "settings.theme.dark": "Dunkel",
    "settings.theme.light": "Hell",
    "settings.theme.system": "System",
    "settings.themeBody":
      "Der Dunkelmodus nutzt ein ruhiges Dunkelblau statt reinem Schwarz.",
    "settings.themeTitle": "Farbmodus",
    "sources.current": "Aktuelle Quellen",
    "sources.empty":
      "Quellenangaben werden während der fachlichen Inhaltsprüfung ergänzt.",
    "sources.excerptPrefix": "Kurzzitat: “{excerpt}”",
    "sources.lastChecked": "Quelle geprüft am: {date}",
    "sources.policyPrefix": "Status: {status}",
    "sources.ruleBody":
      "Jeder geprüfte religiöse Eintrag muss eine Quelle nennen. Empfohlene Handlungen ohne Quelle bleiben als „zu prüfen“ markiert.",
    "sources.ruleTitle": "Quellenregel",
  },
  en: {
    "about.build":
      "This build uses Expo SDK 57, Expo Router, TypeScript, React Native Maps, Expo Location, SQLite preparation, and locally stored settings.",
    "about.editorialBody":
      "Religious texts, translations, transliterations, and claims should only be added with source references and qualified review. Placeholders remain visible until that review is complete.",
    "about.editorialTitle": "Editorial Principle",
    "about.intro":
      "Shia Ziyarah Iraq is built as an offline-first companion for pilgrims visiting important Shia Ziyarah sites in Iraq.",
    "about.title": "About Shia Ziyarah Iraq",
    "bookmarks.clear": "Clear",
    "bookmarks.emptyBody":
      "Save places or reading entries so you can quickly find them offline.",
    "bookmarks.emptyTitle": "No entries yet",
    "bookmarks.readingEntries": "{count} reading entries",
    "bookmarks.showPlaces": "View {count} places",
    "bookmarks.title": "Bookmarks",
    "city.emptyBody":
      "The local catalog does not contain a reviewed placeholder for this yet.",
    "city.emptyTitle": "No places for this city yet",
    "city.offlineBody":
      "Offline places available in this city. Religious and historical details remain marked for review until source checking is complete.",
    "city.placeCount.many": "{count} places",
    "city.placeCount.one": "{count} place",
    "city.titleFallback": "City",
    "common.aboutApp": "About the App",
    "common.currentLocation": "Your current location",
    "common.details": "Details",
    "common.disclaimer": "Content Notice",
    "common.navigate": "Navigate",
    "common.openMap": "Open Map",
    "common.openSource": "Open source",
    "common.save": "Save",
    "common.saved": "Saved",
    "common.search": "Search",
    "common.sourcePrefix": "Source: {source}",
    "common.sources": "Sources",
    "common.toMap": "To Map",
    "disclaimer.body1":
      "This app is a software companion and content container. It is not a religious authority.",
    "disclaimer.body2":
      "Duas, Ziyarat, translations, historical notes, recommended acts, and place data should be reviewed by qualified scholars or editors before being treated as verified.",
    "disclaimer.body3":
      "Placeholder text is used while reviewed Arabic, transliteration, translation, or source references are not yet available.",
    "disclaimer.body4":
      "Linked duas.org pages serve as external sources. Full texts are stored offline only after rights clearance and specialist content review.",
    "disclaimer.title": "Content Notice",
    "home.featuredPlaces": "Featured Places",
    "home.heroBody":
      "Location data, information, prayers, and much more available offline.",
    "home.heroTitle": "Everything for your Ziyārah in one place",
    "home.importantCities": "Cities (5)",
    "home.recommendedActs.many": "{count} recommended acts",
    "home.recommendedActs.one": "{count} recommended act",
    "labels.actType.dua": "Dua",
    "labels.actType.etiquette": "Etiquette",
    "labels.actType.instruction": "Instruction",
    "labels.actType.prayer": "Prayer",
    "labels.actType.recitation": "Recitation",
    "labels.actType.ziyarah": "Ziyarah",
    "labels.contentType.dua": "Dua",
    "labels.contentType.instruction": "Instruction",
    "labels.contentType.salawat": "Salawat",
    "labels.contentType.surah": "Surah",
    "labels.contentType.ziyarah": "Ziyarah",
    "labels.searchFilter.acts": "Acts",
    "labels.searchFilter.all": "All",
    "labels.searchFilter.content": "Content",
    "labels.searchFilter.places": "Places",
    "labels.sourcePolicy.approved_for_offline": "Offline full text approved",
    "labels.sourcePolicy.linked_not_copied": "Full text linked externally",
    "labels.sourcePolicy.pending_rights_review": "Rights review pending",
    "labels.status.draft": "Draft",
    "labels.status.needs_review": "Needs review",
    "labels.status.rejected": "Rejected",
    "labels.status.verified": "Verified",
    "map.browserDenied":
      "Location access was denied or is not available in the browser.",
    "map.browserUnsupported": "This browser does not support location sharing.",
    "map.description":
      "On the web, a schematic offline map is shown. On iOS and Android, the app uses React Native Maps with markers and optional location.",
    "map.locationDenied": "Location permission denied",
    "map.locationDeniedBody":
      "Enable location in device settings to see your position on the map.",
    "map.locationErrorBody":
      "Your location could not be loaded right now. Check GPS, permissions, or the internet connection.",
    "map.locationLoading": "Loading location",
    "map.locationUnavailable": "Location unavailable",
    "map.myLocation": "My Location",
    "map.places": "Places",
    "map.recenter": "Recenter",
    "map.refreshLocation": "Refresh location",
    "map.title": "Ziyarah Map Iraq",
    "nav.about": "About the App",
    "nav.city": "City",
    "nav.disclaimer": "Content Notice",
    "nav.home": "Home",
    "nav.map": "Map",
    "nav.bookmarks": "Bookmarks",
    "nav.search": "Search",
    "nav.settings": "Settings",
    "nav.placeDetails": "Place Details",
    "nav.reader": "Reader",
    "nav.sources": "Sources",
    "place.about": "About This Place",
    "place.accessibilityPrefix": "Accessibility: {value}",
    "place.closeImage": "Close image",
    "place.imageOpenLabel": "Open {description} large",
    "place.notFound": "Place not found",
    "place.openingPrefix": "Opening hours: {value}",
    "place.recommendedActs": "Recommended Acts",
    "place.reviewSources": "Sources and Review",
    "place.sourceRule": "View source rule",
    "place.sourcesEmpty": "Editorial review pending.",
    "place.startNavigation": "Start navigation",
    "place.visitTips": "Visiting Tips",
    "reader.arabic": "Arabic",
    "reader.copy": "Copy",
    "reader.duasFullText": "Full text from duas.org",
    "reader.duasOpen": "Open duas.org",
    "reader.duasText":
      "The full text is currently linked through the original source and will only be added offline after rights and content review.",
    "reader.findContent": "Search content",
    "reader.notFound": "Reading entry not found",
    "reader.notes": "Notes",
    "reader.pendingReview": "Review pending",
    "reader.reviewedLine": "Version {version}. Reviewed by: {reviewer}.",
    "reader.share": "Share",
    "reader.sources": "Source References",
    "reader.sourcesShareTitle": "Sources:",
    "reader.text": "Text",
    "reader.translation": "Translation",
    "reader.transliteration": "Transliteration",
    "search.emptyBody":
      "Try a city, place name, transliteration, or content type. More reviewed content can be added later to the local catalog.",
    "search.emptyTitle": "No matching offline content",
    "search.placeholder": "Search Karbala, Ziyarah, Najaf...",
    "search.resultCount.many": "{count} results",
    "search.resultCount.one": "{count} result",
    "search.searchA11y": "Search places, cities, duas, Ziyarat, and acts",
    "search.title": "Search",
    "settings.activeMode": "Active mode: {mode}.",
    "settings.appPrep": "App Preparation",
    "settings.arabicFontBody":
      "Applies to placeholders and reviewed Arabic content.",
    "settings.arabicFontTitle": "Arabic font size",
    "settings.appearance": "Appearance",
    "settings.darkBlue": "Dark blue",
    "settings.languageBody":
      "Choose the language for the app interface and local placeholder text.",
    "settings.languageTitle": "Language",
    "settings.light": "Light",
    "settings.lineByLineBody":
      "Groups Arabic, transliteration, and translation.",
    "settings.lineByLineTitle": "Line-by-line view",
    "settings.reader": "Reader",
    "settings.theme.dark": "Dark",
    "settings.theme.light": "Light",
    "settings.theme.system": "System",
    "settings.themeBody":
      "Dark mode uses a calm dark blue instead of pure black.",
    "settings.themeTitle": "Color mode",
    "sources.current": "Current Sources",
    "sources.empty":
      "Source references will be added during specialist content review.",
    "sources.excerptPrefix": "Short quote: “{excerpt}”",
    "sources.lastChecked": "Source checked on: {date}",
    "sources.policyPrefix": "Status: {status}",
    "sources.ruleBody":
      "Every reviewed religious entry must name a source. Recommended acts without a source remain marked as needs review.",
    "sources.ruleTitle": "Source Rule",
  },
  ar: {
    "about.build":
      "يعتمد هذا الإصدار على Expo SDK 57 و Expo Router و TypeScript و React Native Maps و Expo Location مع إعداد SQLite وحفظ الإعدادات محليا.",
    "about.editorialBody":
      "لا تضاف النصوص الدينية والترجمات والنقول إلا مع المصادر والمراجعة المؤهلة. تبقى النصوص المؤقتة ظاهرة حتى تكتمل المراجعة.",
    "about.editorialTitle": "المبدأ التحريري",
    "about.intro":
      "تطبيق Shia Ziyarah Iraq رفيق يعمل أولا دون اتصال للحجاج والزائرين إلى أهم مواقع الزيارة الشيعية في العراق.",
    "about.title": "حول Shia Ziyarah Iraq",
    "bookmarks.clear": "مسح",
    "bookmarks.emptyBody":
      "احفظ الأماكن أو نصوص القراءة لتجدها بسرعة دون اتصال.",
    "bookmarks.emptyTitle": "لا توجد عناصر بعد",
    "bookmarks.readingEntries": "{count} نصوص قراءة",
    "bookmarks.showPlaces": "عرض {count} أماكن",
    "bookmarks.title": "المحفوظات",
    "city.emptyBody": "لا يحتوي الفهرس المحلي بعد على عنصر مراجع لهذا الموضع.",
    "city.emptyTitle": "لا توجد أماكن لهذه المدينة بعد",
    "city.offlineBody":
      "أماكن متاحة دون اتصال في هذه المدينة. تبقى التفاصيل الدينية والتاريخية بعلامة المراجعة حتى تكتمل مراجعة المصادر.",
    "city.placeCount.many": "{count} أماكن",
    "city.placeCount.one": "مكان واحد",
    "city.titleFallback": "مدينة",
    "common.aboutApp": "حول التطبيق",
    "common.currentLocation": "موقعك الحالي",
    "common.details": "التفاصيل",
    "common.disclaimer": "تنبيه المحتوى",
    "common.navigate": "الملاحة",
    "common.openMap": "فتح الخريطة",
    "common.openSource": "فتح المصدر",
    "common.save": "حفظ",
    "common.saved": "محفوظ",
    "common.search": "بحث",
    "common.sourcePrefix": "المصدر: {source}",
    "common.sources": "المصادر",
    "common.toMap": "إلى الخريطة",
    "disclaimer.body1":
      "هذا التطبيق رفيق برمجي وحاوية محتوى، وليس مرجعية دينية.",
    "disclaimer.body2":
      "ينبغي أن تراجع الأدعية والزيارات والترجمات والملاحظات التاريخية والأعمال الموصى بها وبيانات الأماكن من أهل الاختصاص قبل اعتبارها موثقة.",
    "disclaimer.body3":
      "تستخدم النصوص المؤقتة ما دام النص العربي أو النقل الصوتي أو الترجمة أو المصادر غير متوفرة بعد.",
    "disclaimer.body4":
      "روابط duas.org تعد مصادر خارجية. لا تحفظ النصوص الكاملة دون اتصال إلا بعد مراجعة الحقوق والمحتوى.",
    "disclaimer.title": "تنبيه المحتوى",
    "home.featuredPlaces": "أماكن مختارة",
    "home.heroBody":
      "بيانات الموقع، والمعلومات، والأدعية، والكثير غيرها متاحة دون الحاجة إلى اتصال بالإنترنت.",
    "home.heroTitle": "كل ما تحتاجه لزيارتك في مكان واحد",
    "home.importantCities": "مدن (5)",
    "home.recommendedActs.many": "{count} أعمال موصى بها",
    "home.recommendedActs.one": "عمل واحد موصى به",
    "labels.actType.dua": "دعاء",
    "labels.actType.etiquette": "آداب",
    "labels.actType.instruction": "إرشاد",
    "labels.actType.prayer": "صلاة",
    "labels.actType.recitation": "تلاوة",
    "labels.actType.ziyarah": "زيارة",
    "labels.contentType.dua": "دعاء",
    "labels.contentType.instruction": "إرشاد",
    "labels.contentType.salawat": "صلوات",
    "labels.contentType.surah": "سورة",
    "labels.contentType.ziyarah": "زيارة",
    "labels.searchFilter.acts": "الأعمال",
    "labels.searchFilter.all": "الكل",
    "labels.searchFilter.content": "المحتوى",
    "labels.searchFilter.places": "الأماكن",
    "labels.sourcePolicy.approved_for_offline": "النص الكامل متاح دون اتصال",
    "labels.sourcePolicy.linked_not_copied": "النص الكامل مرتبط خارجيا",
    "labels.sourcePolicy.pending_rights_review": "مراجعة الحقوق قيد الانتظار",
    "labels.status.draft": "مسودة",
    "labels.status.needs_review": "بحاجة إلى مراجعة",
    "labels.status.rejected": "مرفوض",
    "labels.status.verified": "موثق",
    "map.browserDenied": "تم رفض مشاركة الموقع أو أنها غير متاحة في المتصفح.",
    "map.browserUnsupported": "هذا المتصفح لا يدعم مشاركة الموقع.",
    "map.description":
      "في الويب تظهر خريطة تخطيطية دون اتصال. على iOS و Android يستخدم التطبيق React Native Maps مع العلامات والموقع الاختياري.",
    "map.locationDenied": "تم رفض إذن الموقع",
    "map.locationDeniedBody":
      "فعّل الموقع في إعدادات الجهاز لرؤية موضعك على الخريطة.",
    "map.locationErrorBody":
      "تعذر تحميل موقعك الآن. تحقق من GPS أو الأذونات أو اتصال الإنترنت.",
    "map.locationLoading": "جار تحميل الموقع",
    "map.locationUnavailable": "الموقع غير متاح",
    "map.myLocation": "موقعي",
    "map.places": "الأماكن",
    "map.recenter": "إعادة التوسيط",
    "map.refreshLocation": "تحديث الموقع",
    "map.title": "خريطة الزيارة في العراق",
    "nav.about": "حول التطبيق",
    "nav.city": "المدينة",
    "nav.disclaimer": "تنبيه المحتوى",
    "nav.home": "الرئيسية",
    "nav.map": "الخريطة",
    "nav.bookmarks": "المحفوظات",
    "nav.search": "بحث",
    "nav.settings": "الإعدادات",
    "nav.placeDetails": "تفاصيل المكان",
    "nav.reader": "وضع القراءة",
    "nav.sources": "المصادر",
    "place.about": "عن هذا المكان",
    "place.accessibilityPrefix": "إتاحة الوصول: {value}",
    "place.closeImage": "إغلاق الصورة",
    "place.imageOpenLabel": "فتح {description} بحجم كبير",
    "place.notFound": "لم يتم العثور على المكان",
    "place.openingPrefix": "أوقات الفتح: {value}",
    "place.recommendedActs": "الأعمال الموصى بها",
    "place.reviewSources": "المصادر والمراجعة",
    "place.sourceRule": "عرض قاعدة المصادر",
    "place.sourcesEmpty": "المراجعة التحريرية قيد الانتظار.",
    "place.startNavigation": "بدء الملاحة",
    "place.visitTips": "إرشادات الزيارة",
    "reader.arabic": "العربية",
    "reader.copy": "نسخ",
    "reader.duasFullText": "النص الكامل من duas.org",
    "reader.duasOpen": "فتح duas.org",
    "reader.duasText":
      "النص الكامل مرتبط حاليا بالمصدر الأصلي، ولن يضاف دون اتصال إلا بعد مراجعة الحقوق والمحتوى.",
    "reader.findContent": "البحث في المحتوى",
    "reader.notFound": "لم يتم العثور على نص القراءة",
    "reader.notes": "ملاحظات",
    "reader.pendingReview": "المراجعة قيد الانتظار",
    "reader.reviewedLine":
      "الإصدار {version}. تمت المراجعة بواسطة: {reviewer}.",
    "reader.share": "مشاركة",
    "reader.sources": "بيانات المصادر",
    "reader.sourcesShareTitle": "المصادر:",
    "reader.text": "النص",
    "reader.translation": "الترجمة",
    "reader.transliteration": "النقل الصوتي",
    "search.emptyBody":
      "جرّب مدينة أو اسم مكان أو نقلا صوتيا أو نوع محتوى. يمكن إضافة مزيد من المحتوى المراجع لاحقا إلى الفهرس المحلي.",
    "search.emptyTitle": "لا توجد نتائج دون اتصال",
    "search.placeholder": "ابحث عن كربلاء أو زيارة أو النجف...",
    "search.resultCount.many": "{count} نتائج",
    "search.resultCount.one": "نتيجة واحدة",
    "search.searchA11y": "البحث عن الأماكن والمدن والأدعية والزيارات والأعمال",
    "search.title": "بحث",
    "settings.activeMode": "الوضع النشط: {mode}.",
    "settings.appPrep": "إعداد التطبيق",
    "settings.arabicFontBody":
      "ينطبق على النصوص المؤقتة والمحتوى العربي المراجع.",
    "settings.arabicFontTitle": "حجم الخط العربي",
    "settings.appearance": "المظهر",
    "settings.darkBlue": "أزرق داكن",
    "settings.languageBody": "اختر لغة واجهة التطبيق والنصوص المحلية المؤقتة.",
    "settings.languageTitle": "اللغة",
    "settings.light": "فاتح",
    "settings.lineByLineBody": "يجمع العربية والنقل الصوتي والترجمة.",
    "settings.lineByLineTitle": "عرض سطر بسطر",
    "settings.reader": "وضع القراءة",
    "settings.theme.dark": "داكن",
    "settings.theme.light": "فاتح",
    "settings.theme.system": "النظام",
    "settings.themeBody":
      "يستخدم الوضع الداكن أزرق داكنا هادئا بدلا من الأسود الخالص.",
    "settings.themeTitle": "وضع الألوان",
    "sources.current": "المصادر الحالية",
    "sources.empty": "ستضاف بيانات المصادر أثناء المراجعة المتخصصة للمحتوى.",
    "sources.excerptPrefix": "اقتباس قصير: “{excerpt}”",
    "sources.lastChecked": "تم فحص المصدر في: {date}",
    "sources.policyPrefix": "الحالة: {status}",
    "sources.ruleBody":
      "كل إدخال ديني مراجع يجب أن يذكر مصدرا. تبقى الأعمال الموصى بها بلا مصدر بعلامة الحاجة إلى المراجعة.",
    "sources.ruleTitle": "قاعدة المصادر",
  },
};

const defaultContext: I18nContextValue = {
  isRTL: false,
  language: "de",
  setLanguage: () => undefined,
  t: (key, params) => translate("de", key, params),
};

const I18nContext = createContext<I18nContextValue>(defaultContext);

export function translate(
  language: Language,
  key: string,
  params?: TranslationParams,
) {
  const template = dictionaries[language][key] ?? dictionaries.de[key] ?? key;

  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (text, [paramKey, value]) =>
      text.replaceAll(`{${paramKey}}`, String(value)),
    template,
  );
}

export function AppI18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = usePersistentState<Language>(
    "ziyara.language",
    "de",
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      isRTL: language === "ar",
      language,
      setLanguage,
      t: (key, params) => translate(language, key, params),
    }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
