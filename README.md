# Shia Ziyarah Iraq

Produktionsorientierte Expo-SDK-57-App für schiitische Ziyarah im Irak.

Der lokal gebündelte Guide mit Startseite, Karte, Suche, Lesezeichen, Einstellungen,
Städten, Orten und Reader ist ohne Anmeldung und ohne Netzwerk nutzbar. Konto-,
Gruppen-, Fragerunden- und Adminfunktionen bleiben durch Supabase-Session, RLS und
serverseitig geprüfte RPCs geschützt.

## Dokumentation

- [`LLM_CONTEXT.md`](./LLM_CONTEXT.md): verbindlicher Gesamtüberblick für LLMs und neue Mitwirkende
- [`AGENTS.md`](./AGENTS.md): Arbeits-, Qualitäts- und Inhaltsregeln
- [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md): ursprüngliche Roadmap

## Stack

- Expo SDK 57
- React Native 0.86
- React 19.2.3
- Expo Router with TypeScript
- React Native Maps, Expo Location, AsyncStorage, Expo Clipboard

## Inhaltsregel

Keine arabischen Duas, Ziyarat, Transliterationen, Übersetzungen, Hadithe oder religiösen Aussagen ohne Quellenangaben und qualifizierte Inhaltsprüfung hinzufügen. Bis geprüfte Inhalte vorliegen, den vorhandenen Platzhaltertext im Katalog verwenden.

## Entwicklung

```bash
nvm use
npm install
npx expo start
```

Lokale Projektbefehle und CI verwenden die in `.nvmrc` festgelegte Node-Version `22.13.0`. `npm run validate` führt Typprüfung, Lint, Tests und den Expo-Abhängigkeitscheck aus. Die CI ergänzt Expo Doctor, getrennte Web-/iOS-/Android-Exports und einen Critical-Audit-Gate.
# ziyara
