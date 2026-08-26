# Shia Ziyarah Iraq

Produktionsorientierte Expo-SDK-57-App für schiitische Ziyarah im Irak.

Der lokal gebündelte Guide mit Startseite, Karte, Suche, Lesezeichen, Einstellungen,
Städten, Orten und Reader ist ohne Anmeldung und ohne Netzwerk nutzbar. Konto-,
Gruppen-, Fragerunden- und Adminfunktionen bleiben durch Supabase-Session, RLS und
serverseitig geprüfte RPCs geschützt. Passwort-Recovery läuft über den dedizierten
App-Link `ziyara:///reset-password`; angemeldete Nutzer können ihr eigenes Konto
über eine serverseitig authentifizierte Edge Function unwiderruflich löschen.

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

Lokale Projektbefehle und CI verwenden die in `.nvmrc` festgelegte Node-Version `22.13.0`. `npm run validate` führt Typprüfung, Lint, die Jest-Suite mit Coverage-Gates und den Expo-Abhängigkeitscheck aus. Die Gates verlangen mindestens 50 % globale Line Coverage sowie jeweils 80 % für Auth-, Gruppencheck- und Fragerunden-Kontext. Die CI ergänzt Expo Doctor, getrennte Web-/iOS-/Android-Exports und einen Critical-Audit-Gate.

Die Datenbankabnahme benötigt Docker und bleibt vollständig lokal:

```bash
npx supabase start
npx supabase db reset --local
npx supabase db lint --local --level warning
npx supabase test db --local
```

`db reset --local` löscht ausschließlich die lokale Supabase-Datenbank und baut sie aus allen Migrationen neu auf. Die CI führt Neuaufbau, DB-Lint und die SQL-Sicherheits-/Parallelitätstests in einem getrennten Datenbank-Job aus. Danach laufen sechs Playwright-Vollstack-Smokes gegen lokale Supabase-, Mailpit- und Expo-Instanzen:

```bash
npm run test:e2e
```

Die Smokes verwenden nur synthetische `example.invalid`-Konten, prüfen Registrierung/Login, Recovery, öffentlichen Offline-Start, Gruppencheck, Fragerunde und Rollenwechsel und entfernen ihre Konten anschließend wieder. Sie dürfen nicht gegen ein Remote-Projekt ausgeführt werden.

## Fehlerbehandlung und Monitoring

`src/features/errors/AppErrorBoundary.tsx` umschließt die gesamte App und zeigt bei unbehandelten React-Renderfehlern einen eigenständigen Fallback mit Retry. Crash-Reporting über `@sentry/react-native` ist ein reines Opt-in und bleibt ohne `EXPO_PUBLIC_SENTRY_DSN` vollständig deaktiviert. Keine DSN in `.env`, Quellcode oder Versionskontrolle eintragen; lokal gehört sie ausschließlich in eine ignorierte `.env.local`, in CI in den Secret Store.

Selbst mit DSN sind Default-PII, Sessions, Tracing, native Frame-Tracking und Breadcrumbs deaktiviert. `beforeSend` verwirft Nutzer-, Request-, Kontext-, Tag-, Extra- und Originalnachricht-Felder und behält nur generische Exception-Daten sowie bereinigte Stackpositionen. E-Mails, Anzeigenamen, Fragetexte, Auth-Tokens und sonstige personenbezogene Inhalte dürfen auch künftig weder über `reportCrash`-Zusatzdaten noch über Sentry-Kontext-APIs ergänzt werden.

Die lokale Konfiguration stellt `delete-account` über die Edge Runtime bereit. Die
Function akzeptiert keine Ziel-User-ID, validiert den übergebenen Nutzer-Token
serverseitig und verwendet den Service-Role-Key ausschließlich in der Function-
Umgebung. Für Hot Reload kann sie zusätzlich lokal gestartet werden:

```bash
npx supabase functions serve --no-verify-jwt
```

`verify_jwt = false` deaktiviert dabei nur die vorgeschaltete Legacy-JWT-Prüfung;
die Function selbst verlangt einen Bearer-Token und prüft ihn über Supabase Auth.
Vor einem späteren Release müssen die neuen Migrationen und die Edge Function
ausdrücklich ausgerollt sowie `ziyara:///reset-password` in der Remote-Redirect-
Allowlist eingetragen werden. Diese Schritte sind nicht Teil der lokalen Entwicklung.
# ziyara
