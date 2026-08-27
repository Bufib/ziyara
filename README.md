# Shia Ziyarah Iraq

Produktionsorientierte Expo-SDK-57-App für eine schiitische Ziyarah-Reise im Irak. Stand dieser Dokumentation: 27. August 2026.

Der Guide ist mit seinen Orts-, Stadt-, Karten-, Such-, Lesezeichen-, Reader-, Einstellungs-, About-, Disclaimer- und Quelleninhalten lokal gebündelt und startet ohne Anmeldung sowie ohne Supabase-Verbindung. Konto-, Bus-, Gruppencheck-, Fragerunden- und Administrationsfunktionen bleiben durch Supabase Auth, Row Level Security und serverseitig geprüfte RPCs geschützt.

## Dokumentation

- [`LLM_CONTEXT.md`](./LLM_CONTEXT.md): verbindlicher Ist-Zustand für LLMs und neue Mitwirkende
- [`AGENTS.md`](./AGENTS.md): Arbeits-, Sicherheits-, Qualitäts- und Inhaltsregeln
- [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md): ursprüngliche Roadmap; nicht ungeprüft als Ist-Zustand verwenden

## Aktuell umgesetzt

### Öffentlicher Offline-Guide

- Start/Guide, native Karte beziehungsweise Web-Fallback, Suche, Lesezeichen, Einstellungen, Städte, Orte, Reader, About, Disclaimer und Quellen funktionieren ohne Session.
- Orts-, Quellen- und Readerdaten sowie Bilder sind im App-Bundle enthalten. Bookmarks, Sprache, Theme, Reader-Einstellungen und Lesepositionen werden über einen race-sicheren AsyncStorage-Store lokal gespeichert.
- Supabase-Lesezugriffe besitzen einen 10-Sekunden-Timeout mit `AbortController`/`abortSignal`. Lade-, Offline-, Timeout- und Serverzustände werden getrennt behandelt.
- Geschützte Screens verwenden gezielte Route Guards und leiten ohne Session zum Login mit geprüftem internem Rücksprungziel weiter.

### Authentifizierung und Konten

- Der AuthContext trennt initiales Session-/Profil-Laden von Hintergrundrefreshes. App-Resume und Realtime-Rollenänderungen erhalten bestehendes Profil, Navigation und Screen-State; Logout oder ein echter Benutzerwechsel entfernt alte Profildaten sofort.
- Registrierung, Login und Kontoverwaltung unterstützen Anzeigename, `member_type`, `party_size`, E-Mail und Passwort. Profile können die Rollen `user`, `medical_staff`, `organization_team` und `admin` besitzen.
- „Passwort vergessen“ und der vollständige Recovery-Deep-Link laufen ausschließlich über `/reset-password` beziehungsweise `ziyara:///reset-password`. Normale Login-/Signup-Links werden nicht als Recovery-Link behandelt; nach erfolgreicher Passwortänderung wird die lokale Session entfernt.
- Nutzer können ausschließlich das eigene Konto über `supabase/functions/delete-account` löschen. Die Function nimmt keine Ziel-User-ID an, prüft den Bearer-Token selbst, schützt den letzten Admin und hält Service-Role-Zugangsdaten vollständig aus dem Client.

### Gruppencheck und anonyme Fragerunde

- Gruppencheck-Antworten und Refreshes verwenden eine gemeinsame monotone State-Version, ignorieren veraltete Requests, zeigen erfolgreiche Mutationen optimistisch und laden danach den autoritativen Stand.
- Die Adminauswertung zeigt alle relevanten Profile als Ja, Nein oder Noch offen. Account-Anzahl und über `party_size` repräsentierte Personenzahl werden getrennt ausgewiesen.
- Rollenänderungen, Gruppencheck-Antwort gegen Schließen, das Fünf-Fragen-Limit und Account-Löschungen sind auch bei parallelen Transaktionen datenbankseitig abgesichert.
- Anonyme Fragen speichern keine User-/Profil-ID am Fragetext. Temporäre, für Clients nicht lesbare Limit-Zähler werden beim Schließen der Runde gelöscht.

### Busmanagement

- Admins legen eine aktive Reise, benannte Busse und physische Teilnehmer-IDs an. IDs können optional mit App-Konten verknüpft werden; mehrere IDs dürfen demselben Konto gehören.
- Während eines Boardings melden verknüpfte Konten pro eigener ID `Unterwegs`, `Im Bus` oder `Problem`. Nicht verknüpfte und noch nicht bestätigte Personen bleiben in der Leiterübersicht sichtbar und können dort manuell gesetzt werden.
- Realtime, App-Fokus und ein gestaffelter Fallback-Refresh halten die Übersicht aktuell. Monotone Request-Versionen verhindern, dass ältere Reads einen gespeicherten Status zurücksetzen. Antwort und Schließen sperren dieselbe Boarding-Zeile und bleiben dadurch transaktional geordnet.
- Bei einer abgelaufenen oder fehlenden Auth-Session erneuert der Client die Sitzung und wiederholt eine Teilnehmer- oder Admin-Statusmutation genau einmal für dieselbe User-ID. Endgültige Fehler laden den autoritativen Stand und unterscheiden Auth-, geschlossenes Boarding-, geänderte Zuordnungs-, Offline- und Serverzustände.

### Fehlerbehandlung und Monitoring

- Eine globale `AppErrorBoundary` zeigt bei unbehandelten React-Renderfehlern einen verständlichen lokalen Fallback mit Retry.
- Sentry und sonstiges externes Crash-Reporting wurden vollständig entfernt. Es gibt keine Sentry-Abhängigkeit, keine DSN-Konfiguration und keine Übertragung von Namen, E-Mails, Fragetexten, Tokens oder anderen personenbezogenen Daten an einen Monitoringdienst.

## Stack

- Node `22.13.0` aus `.nvmrc`
- Expo SDK `57` (`expo ~57.0.17`)
- React Native `0.86.3`, React `19.2.3`, TypeScript `~6.0.3` im Strict Mode
- Expo Router mit typed routes und nativen Tabs
- Supabase JS `^2.112.3` für Auth, Postgres, RPC und Realtime
- AsyncStorage, React Native Maps, Expo Location, Image, Clipboard und Linking
- Jest/Jest Expo, pgTAP und Playwright

Expo-/React-Native-Abhängigkeiten nur mit `npx expo install` auf SDK-57-kompatible Versionen bringen. React Native nicht isoliert aktualisieren und kein `npm audit fix --force` verwenden.

## Lokale Entwicklung

```bash
nvm use
npm install
cp .env.example .env
npx expo start
```

Die `.env` benötigt ausschließlich öffentliche Clientkonfiguration und bleibt ignoriert:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Keine Service-Role-Keys, Secrets, personenbezogenen Daten oder Monitoring-DSNs in Appcode, Dokumentation oder Git aufnehmen.

## Prüfungen

```bash
npm run validate
npx expo-doctor@latest
npx expo export --platform web
npx expo export --platform ios
npx expo export --platform android
npm audit
```

`npm run validate` umfasst TypeScript, Lint, Jest mit Coverage-Gates und den Expo-Abhängigkeitscheck. Die Gates verlangen mindestens 50 % globale Line Coverage sowie jeweils 80 % für Auth-, Busmanagement-, Gruppencheck- und Fragerunden-Kontext.

Letzter vollständig ausgeführter Stand vom 27. August 2026:

- `npm run validate`: bestanden; 97 Jest-Tests in 17 Suites
- Line Coverage: global 87,21 %, AuthContext 90,82 %, BusManagementContext 92,70 %, GroupCheckContext 94,53 %, QuestionRoundContext 95,65 %
- Expo Doctor: 21/21 Checks bestanden
- Web-, iOS- und Android-JavaScript-Export: bestanden
- Supabase DB-Lint: keine Schemafehler
- pgTAP: 90 Assertions in sechs SQL-Testdateien bestanden
- Playwright: sieben lokale Vollstack-Smokes bestanden, einschließlich Recovery, Offline-Start und Busmanagement
- `npm audit`: 0 Critical, 4 High, 11 Moderate

Die High-/Moderate-Auditmeldungen liegen in transitiven Expo-/Metro-Buildabhängigkeiten, insbesondere `image-size`, `metro`, Expo Config und `xcode`/`uuid`. Die von npm angebotenen vollständigen Fixes würden auf inkompatible Expo-Versionen wechseln. Auf SDK-kompatible Upstream-Patches warten.

## Lokale Supabase-Abnahme

Docker muss laufen. Diese Befehle dürfen nur gegen die lokale Instanz verwendet werden:

```bash
npx supabase start
npx supabase db reset --local
npx supabase db lint --local --level warning
npx supabase test db --local
npm run test:e2e
```

`db reset --local` löscht ausschließlich die lokale Supabase-Datenbank und baut das Schema vollständig aus unveränderten, vorwärtsgerichteten Migrationen neu auf. Die E2E-Smokes verwenden synthetische `example.invalid`-Konten und dürfen nicht gegen das Remote-Projekt ausgeführt werden.

## Remote-Backend-Stand

Nach ausdrücklicher Freigabe wurden am 27. August 2026 die Migrationen `20260826000000` bis `20260826021000` sowie `20260827000000_add_bus_management.sql` auf das verknüpfte Supabase-Projekt ausgerollt. Lokal und remote waren anschließend alle Migrationen bis `20260827000000` synchron; Remote-DB-Lint meldete keine Schemafehler. Keine bestehende Migration wurde verändert, gelöscht oder zusammengefasst.

Die Edge Function `delete-account` ist remote als aktive Version 1 mit `verify_jwt = false` bereitgestellt. Das schaltet nur die vorgeschaltete Legacy-JWT-Prüfung aus; die Function verlangt weiterhin einen Bearer-Token und validiert ihn über Supabase Auth. Ein anonymer Remote-Aufruf wurde erwartungsgemäß mit HTTP 401 abgewiesen. Es wurde kein reales Konto testweise gelöscht.

Die Remote-Auth-Redirect-Allowlist wurde nicht verändert. Der zuletzt ergänzte Busstatus-Session-Retry befindet sich im lokalen Clientcode und benötigt für bereits installierte Apps einen neuen Build beziehungsweise ein App-Update; es wurde kein Client-Build deployed, committed oder gepusht.

## CI

`.github/workflows/ci.yml` verwendet `.nvmrc`, installiert reproduzierbar mit `npm ci` und führt App-Validierung, Expo Doctor, Web-/iOS-/Android-Exports sowie einen Critical-Audit-Gate aus. Ein getrennter Datenbankjob startet Supabase lokal, prüft den 401-Auth-Gate der Löschfunktion, führt DB-Lint und SQL-Tests sowie danach die Playwright-Smokes aus.

## Release-Status

Die Kernarchitektur und die automatisierten lokalen Prüfungen sind stabil, die App ist aber noch nicht vollständig store-releasefähig. Verbleibende Release-Blocker:

- `ziyara:///reset-password` in der Remote-Supabase-Redirect-Allowlist freigeben und Recovery auf signierten iOS-/Android-Builds testen
- Account-Löschung auf einem signierten Build mit einem freigegebenen Testkonto end-to-end prüfen
- finale Bundle-Identifier, Store-/EAS-Konfiguration, App-Icon, Splash- und Markenassets bereitstellen
- veröffentlichungsfertige Datenschutz-, Support- und Store-Metadaten erstellen
- religiöse, historische und ortsbezogene Inhalte fachlich und rechtlich freigeben
- native Karte, RTL, dynamische Schrift und alle drei Sprachen auf Zielgeräten prüfen
- realen Last-/Mobilfunktest für Bus-, Realtime- und Gruppenfunktionen mit der erwarteten Reisegruppengröße durchführen
- SDK-kompatible Fixes für die verbleibenden High-/Moderate-Auditmeldungen übernehmen, sobald Expo/Metro sie bereitstellt

## Inhaltsregel

Keine Duas, Ziyarat, arabischen Texte, Transliterationen, Übersetzungen, Hadithe, historischen oder religiösen Aussagen ohne Quellenangaben und qualifizierte Inhaltsprüfung hinzufügen. Bis Inhalte fachlich und rechtlich freigegeben sind, den vorhandenen Prüfstatus und den Platzhalter `Volltext wird nach Rechte- und Inhaltsprüfung ergänzt. Quelle siehe unten.` beibehalten.
