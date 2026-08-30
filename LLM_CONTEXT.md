# Ziyarah – verbindlicher Projektkontext für LLMs

Stand: 30. August 2026

## Zweck und Pflege

Diese Datei ist der feste Einstiegspunkt für jede LLM, die dieses Repository analysiert oder verändert. Sie beschreibt den tatsächlichen Produktzustand, die Architektur, Datenflüsse, Sicherheitsregeln und Arbeitskonventionen.

Bei Änderungen an Architektur, Navigation, Datenmodell, Backend, Umgebungsvariablen, Kernfunktionen oder verbindlichen Regeln muss diese Datei im selben Arbeitsschritt aktualisiert werden. Keine Secrets, echten Zugangsdaten oder personenbezogenen Daten hier eintragen.

Reihenfolge der maßgeblichen Quellen:

1. `AGENTS.md` enthält verbindliche Arbeits- und Inhaltsregeln.
2. Laufzeitcode, `package.json`, `app.json` und Supabase-Migrationen bestimmen das tatsächliche Verhalten.
3. Diese Datei erklärt den aktuellen Gesamtzusammenhang.
4. `docs/IMPLEMENTATION_PLAN.md` ist die ursprüngliche Roadmap. Teile davon sind bereits umgesetzt oder überholt und dürfen nicht ungeprüft als Ist-Zustand behandelt werden.

Wenn Dokumentation und Code voneinander abweichen, den Code prüfen, die richtige Implementierung feststellen und diese Datei korrigieren.

## Produkt in einem Absatz

Ziyarah ist eine produktionsorientierte Expo-App für eine schiitische Ziyarah-Reise in den Irak. Reisende können wichtige Städte und Orte ohne Anmeldung offline aus einem gebündelten Katalog öffnen, Orte auf einer Karte sehen, Inhalte durchsuchen, Einträge merken und religiöse Texte in einem Reader anzeigen. Eine Supabase-Anmeldung wird erst für Konto-, Tagesprogramm-, Bus-, Reisegruppen-, Generalalarm-, Reiseführungs-, Gruppencheck-, Fragerunden- und Adminfunktionen benötigt. Die App bietet Deutsch, Englisch und Arabisch, Light/Dark Mode sowie administrative Gruppenfunktionen: datumsbasierte Tagesprogramme auf Home, live veröffentlichte Programmpunkte und Treffpunkte, Buszuordnung und Boarding mit Erinnerungs-/Eskalationsablauf, Untergruppen mit benanntem Anführer und zustimmungsbasierter einmaliger Standortanfrage, verpflichtende Statusabfragen, eine anonyme Fragerunde und eine Benutzerübersicht. Passwort-Recovery und sichere Eigenkonto-Löschung sind implementiert. Religiöse, historische und ortsbezogene Inhalte bleiben bis zu einer qualifizierten Prüfung sichtbar als `needs_review` markiert.

## Aktueller Funktionsumfang

### Konten und Reisegruppe

- Der lokale Guide einschließlich Home, Karte, Suche, Lesezeichen, Einstellungen, Städten, Orten, Reader, About, Disclaimer und Quellen ist ohne Anmeldung nutzbar.
- Eine Supabase-E-Mail/Passwort-Anmeldung ist für Kontoverwaltung, Buszuordnung und Boarding, Reisegruppen und Standortanfragen, verpflichtende Gruppenabfragen, anonyme Fragerunden und Administration erforderlich.
- Die Registrierung erfasst Anzeigename, Zuordnung als `brother` oder `sister`, Kontoumfang, Kofferanzahl, E-Mail und Passwort.
- Beim Kontoumfang wird ausdrücklich zwischen „nur ich“ und „ich und Familie ohne eigenes Telefon“ gewählt.
- `party_size` zählt den Kontoinhaber mit. Der Wert `1` bedeutet Einzelkonto; bei Familienauswahl beginnt der Wert bei `2`.
- In ein Familienkonto gehören ausschließlich mitreisende Kinder oder Angehörige ohne eigenes Telefon. Erwachsene mit eigenem Telefon, einschließlich Ehepartner, erstellen ein eigenes Konto.
- Bestehende Konten aus der Zeit vor Einführung von `member_type` können dort `null` haben. Die aktuelle Registrierung verlangt die Auswahl.
- Nutzer können später E-Mail, Passwort, `party_size` und die Kofferanzahl auf der über Einstellungen erreichbaren Kontoseite ändern. `luggage_count` zählt alle aufgegebenen Koffer der durch dieses Konto vertretenen Personen, erlaubt `0` bis `50` und startet für ältere Konten mit `0`.
- Admins können eigenständige App-Konten zu benannten Kontofamilien zusammenfassen. Ein Profil gehört höchstens einer Kontofamilie; eine neue Zuordnung verschiebt es atomar aus der bisherigen Familie. Diese Zuordnung ist unabhängig von `party_size`, physischen Teilnehmer-IDs und Reisegruppen.
- „Passwort vergessen“ sendet einen neutral formulierten Recovery-Hinweis und verwendet ausschließlich die dedizierte Route `/reset-password`. Der AuthProvider verarbeitet implizite Recovery-Tokens, PKCE-Codes und `token_hash`-Links; normale Login- oder Signup-Links werden nicht als Passwort-Recovery akzeptiert. Nach erfolgreicher Passwortänderung werden die lokalen Anmeldedaten entfernt und eine erneute Anmeldung verlangt.
- Angemeldete Nutzer können nach einem ausdrücklichen, plattformübergreifenden Bestätigungsdialog nur das eigene Konto unwiderruflich löschen. Der Client übergibt keine Ziel-User-ID. Der lokale Function-Quellcode und die ausdrücklich remote bereitgestellte Edge Function verifizieren den Bearer-Token serverseitig, leiten daraus die Auth-ID ab und halten den Service-Role-Key vollständig aus dem App-Bundle heraus.
- Profile besitzen die Rollen `user`, `medical_staff`, `organization_team` und `admin`.
- Neue Konten starten immer als `user`. Nur ein Admin kann über die abgesicherte RPC die Rollen `user`, `medical_staff`, `organization_team` und `admin` vergeben.
- Bestehende Adminprofile können umgestuft werden, solange mindestens ein Admin erhalten bleibt. Rollenwechsel sind datenbankseitig serialisiert und werden protokolliert, damit auch bei mehreren gleichzeitig arbeitenden Admins nie versehentlich alle Adminrechte entfernt werden.
- `medical_staff` und `organization_team` besitzen derzeit dieselben Navigations- und Funktionsrechte wie `user`. Eigene Berechtigungen müssen später ausdrücklich implementiert werden.

### Reise- und Inhaltsfunktionen

- Startseite mit einer kompakten Vorschau des heutigen Tagesprogramms für angemeldete Nutzer sowie wichtigen Städten und hervorgehobenen Orten; die Vorschau öffnet eine gegliederte Sieben-Tage-Ansicht.
- Stadtseiten mit lokal gefilterten Orten.
- Native Karte mit `react-native-maps`, Markern, optionaler Standortfreigabe und Übergabe an eine externe Navigation.
- Web-Fallback als schematische Irak-Karte plus Ortsliste; Web importiert kein `react-native-maps`.
- Ortssuche, Inhaltssuche und Suche nach empfohlenen Handlungen.
- Ortsdetails mit Bildern, Quellen, Hinweisen, empfohlenen Handlungen und Merkliste.
- Reader mit abschnittsweiser oder zusammenhängender Darstellung, RTL für Arabisch, Schriftgrößensteuerung, Kopieren, Teilen und Merkliste.
- Sprache Deutsch/Englisch/Arabisch und Theme `system`/`light`/`dark` werden lokal gespeichert.

### Gruppenfunktionen

- Ein Admin kann eine aktive Reise mit benannten Bussen anlegen und einzelne physische Teilnehmer-IDs wie `BER01` einem Bus zuordnen. Eine ID kann optional mit einem App-Profil verknüpft werden; mehrere IDs dürfen demselben Konto gehören. Nicht verknüpfte Teilnehmer bleiben in der Leiterübersicht sichtbar.
- Im getrennten Admin-Punkt `Reisegruppen` stellt ein Admin vorhandene physische Teilnehmer-IDs zu Untergruppen zusammen und bestimmt genau einen Teilnehmer mit verknüpftem App-Konto als Gruppenanführer. Eine physische Teilnehmer-ID gehört höchstens einer Untergruppe; der Anführer ist immer zugleich Mitglied. Gruppen können atomar geändert oder gelöscht werden.
- Jede App-Rolle einschließlich `admin` kann über eine verknüpfte physische Teilnehmer-ID Mitglied oder Anführer sein. Admins sehen auf Home und unter `/group` nur ihre eigenen Gruppenzuordnungen; die vollständige Übersicht und Verwaltung bleibt im Adminbereich.
- Ein Admin kann den Anführer einer Gruppe in der App nach seinem aktuellen Standort fragen. Nur der betroffene Anführer sieht die Anfrage und entscheidet ausdrücklich zwischen einer einmaligen Freigabe und Ablehnung. Erst nach Zustimmung fordert das Gerät die Vordergrund-Standortberechtigung an und ermittelt genau eine Position; es gibt kein Live- oder Hintergrundtracking. Geteilte Koordinaten sind per RLS nur für den Anführer und Admins und nur 15 Minuten lesbar, werden bei einer neuen Anfrage, Gruppenänderung oder Löschung überschrieben beziehungsweise entfernt und erscheinen beim Anführer als Home-Hinweis mit eigener Route `/group`.
- Für jede Abfahrt kann genau ein Boarding pro Reise geöffnet werden. Verknüpfte Konten melden pro eigener Teilnehmer-ID `on_way`, `boarded` oder `problem`; Admins sehen zusätzlich nicht bestätigte IDs und dürfen jeden Status manuell korrigieren. Die Übersicht zählt physische Teilnehmer-IDs und nicht `party_size`, damit Account- und reale Busbelegung nicht vermischt werden.
- Im Adminbereich sind Busmanagement und Generalalarm getrennte Punkte: Das Busmanagement bereitet Reise, Busse und Teilnehmerzuordnungen vor; im eigenen Generalalarm-Punkt legt der Admin Meldung und Abfahrtszeit fest, schaltet den Alarm ausdrücklich ein, überwacht ihn und beendet ihn wieder. Der Akkordeonstatus zeigt `Eingeschaltet` oder `Ausgeschaltet`.
- Der Generalalarm ergänzt das Boarding um die sichtbare Folge `read` → `on_way` → `boarded`. Nach fünf Minuten ohne nächste Stufe wird sie erneut fällig. Native Geräte gleichen dafür begrenzt vorausgeplante lokale Erinnerungen ab; der serverseitige Push-Dispatcher beansprucht zusätzlich je Gerät, Teilnehmer-ID, Stufe und Fünf-Minuten-Fenster höchstens einen Versandversuch.
- Kurz vor der Abfahrt wird der Alarm optisch dringlich. Das Adminpanel zeigt bestätigte und fehlende Teilnehmer, alle ausstehenden physischen IDs sowie je Bus, ob noch Personen fehlen. Ein Admin kann einen ausstehenden Fall ausdrücklich manuell eskalieren; verantwortlicher Anzeigename und Zeitpunkt werden serverseitig erfasst.
- Expo-Push-Tokens sind für Clients nicht lesbar und werden nur über benutzergebundene RPCs registriert oder abgemeldet. Der Dispatcher akzeptiert einen serverseitig verifizierten Admin-Token oder ein Scheduler-Secret; fällige Fenster und Ergebnisse sind ausschließlich für `service_role` zugänglich. Ein erfolgreiches Expo-Ticket wird nicht als garantierte Gerätezustellung bezeichnet.
- Boarding-Reads und -Mutationen verwenden monotone Request-Versionen, optimistische Zustände und einen autoritativen Folge-Refresh. Antwort und Schließen sperren dieselbe Boarding-Zeile, sodass ein paralleler Status entweder vollständig vor dem Schließen gespeichert oder danach abgewiesen wird.
- Im getrennten Admin-Punkt `Tagesprogramm` wählt die Reiseleitung einen Starttag und ein, zwei, drei, fünf oder sieben aufeinanderfolgende Tage, pflegt je Tag eine optionale Überschrift und einen freien organisatorischen Ablauf und speichert alle gewählten Tage atomar. Ein bereits veröffentlichter Tag kann über dasselbe Formular geändert werden. Alle angemeldeten Nutzer sehen auf Home eine auf drei Zeilen begrenzte Vorschau des heutigen Programms. Ein Tipp öffnet `/program` mit heute und den nächsten sechs Tagen in getrennten Tageskarten; Programmzeilen mit vorangestellter Uhrzeit werden als gegliederte Ablaufpunkte dargestellt. Lesen ist für den aktiven Reiseplan freigegeben, Schreiben ausschließlich über die Admin-RPC.
- Ein Admin kann für die aktive Reise im Admin-Punkt `Reiseführung` einen aktuellen Programmpunkt veröffentlichen. Teilnehmer sehen Besuchsort, nächsten Programmpunkt, Abfahrtszeit, Treffpunkt, relevante Tür, einen optionalen Entfernungshinweis, Beschreibung und Handlungen. Im getrennten Dashboard-Punkt `Reiseziele & Navigation` verwaltet der Admin unabhängig davon mehrere benannte Ziele: anlegen, auf einer plattformspezifischen Karte beziehungsweise per aktuellem Gerätestandort setzen, bearbeiten, Navigation prüfen und archivieren. Aktive Ziele erscheinen angemeldeten Reiseteilnehmern per Realtime als rote Marker auf der nativen Karte und als Marker plus Liste im Web; jedes Ziel öffnet die externe Navigation. Der letzte erfolgreiche Reisezielstand wird validiert und an die Benutzer-ID gebunden in AsyncStorage zwischengespeichert, damit er nach einem App-Neustart auch bei einem anfänglichen Lesefehler sichtbar bleibt. Erfolgreiche Supabase-Antworten einschließlich einer leeren Zielliste bleiben autoritativ.
- Die Entfernung zum Treffpunkt wird auf Wunsch aus einer einzelnen Standortabfrage berechnet. Es existiert kein permanentes Standorttracking und keine Speicherung der abgefragten Geräteposition im App- oder Backendzustand.
- Kurzfristige Treffpunktänderungen aktualisieren denselben Programmpunkt und behalten Statusmeldungen. Ein ausdrücklich neu veröffentlichter Programmpunkt schließt den vorherigen und beginnt mit leeren Meldungen. Beide Tabellen werden über Realtime und gestaffelte Fallback-Refreshes synchronisiert.
- Teilnehmer melden je verknüpfter physischer Teilnehmer-ID `on_way`, `almost_there`, `at_meeting_point`, `problem`, `lost` oder `medical_help`. Ein Admin muss einen Problemfall ausdrücklich übernehmen; der Teilnehmer sieht anschließend den dabei erfassten Anzeigenamen der Leitung.
- Bei einem eindeutigen Netzwerkfehler wird eine Statusmeldung benutzerspezifisch in `AsyncStorage` vorgemerkt und später idempotent erneut übertragen. Die UI kennzeichnet den lokalen Status deutlich als noch nicht beim Reiseleiter angekommen. Server-, Berechtigungs- oder geschlossene Programmpunktfehler werden nicht fälschlich als erfolgreiche Offlineübertragung dargestellt.
- Ein Admin kann genau eine verpflichtende Gruppenabfrage mit freiem Fragetext öffnen.
- Während sie aktiv ist, sehen Konten ohne Adminrolle ausschließlich den Check-in und antworten mit Ja oder Nein. Admins bleiben in der App, sehen auf Home einen Hinweis und können die Abfrage ebenfalls beantworten.
- Solange das Auth-Profil und damit die Rolle noch geladen werden, greift die blockierende Navigation nicht; dadurch werden Admin-Routen nicht vorübergehend aus dem Stack entfernt. Nach einer gespeicherten Admin-Antwort bietet der Check-in zusätzlich einen expliziten, per `replace` funktionierenden Rückweg in die App.
- Bei einem Synchronisationsfehler bleibt die App für Konten ohne Adminrolle vorsorglich gesperrt.
- Ein Admin kann eine anonyme Fragerunde öffnen und schließen, Fragen lesen und als erledigt markieren.
- Jede angemeldete Rolle einschließlich Admin kann während einer offenen Runde bis zu fünf anonyme Fragen absenden. Die Fragentabelle speichert keine Profil- oder User-ID. Eine getrennte, für Clients nicht lesbare Zähltabelle hält während der offenen Runde nur Profil, Runde und Anzahl fest und wird beim Schließen geleert. Nutzer sollten trotzdem keine personenbezogenen Daten in den Freitext schreiben.
- Die Personenübersicht im Adminbereich gruppiert zugeordnete Konten als gemeinsames Familienpaket und lässt sich nach Personen- oder Familiennamen filtern. Jede Person zeigt zunächst ausschließlich ihren Namen; vertretene Personenzahl, Kofferanzahl, Kontofamilie und Rolle werden erst über ein Chevron aufgeklappt. Die Vergabe aller Rollen einschließlich `admin` öffnet sich innerhalb dieser Detailansicht; neue Konten besitzen standardmäßig die Rolle `user`. Im getrennten Punkt `Familien` legt ein Admin Kontofamilien an, bearbeitet oder löscht sie und ordnet registrierte Konten atomar zu.
- Gruppenstatus wird primär über Supabase Realtime und beim App-Fokus aktualisiert. Als gestaffelter Ausfallschutz läuft die Pflichtabfrage etwa alle 60–90 Sekunden und die Fragerunde alle 120–150 Sekunden. Parallele Antworten dürfen ältere Ergebnisse nicht mehr über neuere schreiben.
- Gruppencheck-Refreshes und -Mutationen teilen eine monotone State-Version. Jede Mutation invalidiert ältere Reads, hält nach erfolgreicher RPC-Antwort einen optimistischen Zustand sichtbar und startet anschließend einen autoritativen Refresh. Die Adminauswertung führt alle aktuellen Profile auf und trennt `true`, `false` und `null` ausdrücklich in Ja, Nein und Noch offen; Account-Anzahl und die über `party_size` repräsentierte Personenzahl werden separat ausgewiesen.

## Umgesetzte technische Härtung

Die ursprünglich getrennt beauftragten Produktionsphasen sind im aktuellen Worktree wie folgt umgesetzt:

1. **Build-Basis:** Node `22.13.0`, Expo-SDK-57-kompatible Abhängigkeiten, unverändert Expo-gesteuertes React Native sowie CI-Schritte für Expo Doctor und getrennte Web-/iOS-/Android-Exports.
2. **Auth- und Navigation:** initiales Profil-Laden ist von Hintergrundrefreshes getrennt; App-Resume erhält Profil, Navigation und Screen-State. Logout und echte Benutzerwechsel räumen alte Profildaten sofort, Realtime-Rollenänderungen bleiben aktiv.
3. **Öffentlicher Offline-Guide:** der globale Login-Zwang ist entfernt. Nur geschützte Screens und Aktionen verlangen eine Session. Supabase-Reads besitzen definierte Abbruch-Timeouts und unterscheidbare Offline-/Timeout-/Serverzustände.
4. **Race-sicherer Gruppencheck:** Mutation und Refresh teilen eine State-Version; veraltete Ergebnisse werden verworfen, erfolgreiche Antworten optimistisch gehalten und autoritativ bestätigt. Adminergebnisse umfassen auch nicht antwortende Profile sowie getrennte Account- und Personenzahlen.
5. **Datenbankhärtung:** RLS-, RPC-, Limit-, Last-Admin-, Cascade-, Audit- und Parallelitätstests sind als pgTAP/SQL automatisiert. Die sieben zuvor bestehenden Anwendungstabellen und die ausdrücklich zu erhaltenden Legacyfelder bleiben bestehen; der ungenutzte Antwortindex wurde ausschließlich über eine neue Migration entfernt.
6. **Recovery und Eigenkonto-Löschung:** vollständiger Recovery-Deep-Link, neuer Passwortscreen, serverseitig authentifizierte Löschfunktion ohne frei wählbare Ziel-ID, Last-Admin-Schutz, sichere Cascades und anonymisierte Auditbezüge.
7. **Tests und Fehlerbehandlung:** Coverage-Gates, sieben Playwright-Vollstack-Smokes und eine globale Error Boundary sind aktiv. Sentry beziehungsweise externes Crash-Reporting wurden entfernt; es existieren weder Clientabhängigkeit noch DSN-Konfiguration oder Monitoring-Datenübertragung.
8. **Busmanagement:** Reise-, Bus-, Teilnehmer-ID- und Boardingmodell, Adminoberfläche, Teilnehmerstatus, RLS/RPCs, Realtime, monotone Request-Versionen, Parallelitätstests und E2E-Smoke sind implementiert. Der spätere Speicherfix erneuert bei Auth-/Function-Grant-Fehlern die Session und wiederholt den Status-RPC genau einmal für dieselbe User-ID.
9. **Reiseführung und Treffpunkt:** versionierte aktuelle Programmpunkte, kurzfristige Live-Änderungen, sechs Teilnehmerzustände, ausdrückliche Problemübernahme, lokale Offline-Warteschlange und einmalige Distanzberechnung ohne Tracking sind implementiert. RLS bindet Meldungen an physische Teilnehmer-IDs und zeigt normalen Konten ausschließlich eigene Meldungen.
10. **Tagesprogramm:** datumsbasierte Ein- und Mehrtagesplanung, atomare Admin-Upserts, Realtime-/Fokus-/Fallback-Synchronisierung, lokale Datumsberechnung ohne UTC-Tagesverschiebung und die Home-Anzeige für alle angemeldeten Nutzer sind implementiert.
11. **Reisegruppen und Anführerstandort:** Untergruppen aus physischen Teilnehmer-IDs, ein konto-verknüpfter Anführer, Adminverwaltung, Realtime-Synchronisierung und eine zustimmungsbasierte einmalige Standortantwort mit 15-minütiger RLS-Sichtbarkeit sind lokal implementiert und datenbankseitig getestet.
12. **Kontofamilien und Koffer:** Registrierung und Kontoseite verwalten eine begrenzte Kofferanzahl pro Konto; Admins gruppieren eigenständige Benutzerkonten atomar in höchstens eine benannte Kontofamilie. RLS, minimale Admin-RPCs und Lösch-/Verschieberegeln sind lokal implementiert und datenbankseitig getestet.

## Technischer Stack

- Expo SDK `57` (`expo ~57.0.18`)
- React Native `0.86.3`
- React `19.2.3`
- TypeScript `~6.0.3`, Strict Mode
- Expo Router `~57.0.17` mit typed routes
- Native Tabs aus `expo-router/unstable-native-tabs`
- Supabase JS `^2.112.3` für Auth, Postgres, RPC und Realtime
- AsyncStorage `2.2.0` für lokale Einstellungen
- React Native Maps `1.27.2` und Expo Location
- Expo Image, Clipboard und Linking
- Expo Notifications und Expo Device für native Push-Registrierung, Notification-Kanäle und lokale Generalalarm-Erinnerungen
- Jest/Jest Expo für Unit-/Kontexttests, pgTAP für Datenbankregeln und Playwright für lokale Vollstack-Smokes

Für lokale Projektbefehle und CI die in `.nvmrc` festgelegte Node-Version `22.13.0` verwenden; `package.json` bildet zusätzlich die von React Native 0.86 unterstützten Engine-Bereiche ab. Node 23 ist nicht unterstützt. Expo-/React-Native-Pakete mit `npx expo install <paket>` installieren, damit SDK-Versionen ausgerichtet bleiben.

## Projektstart

Der Projektstamm ist das Verzeichnis mit `package.json`.

```bash
nvm use
npm install
cp .env.example .env
npx expo start
```

Erforderliche öffentliche Client-Konfiguration:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Die echte `.env` ist ignoriert und darf nicht ausgegeben oder committed werden. Ohne beide Werte wirft `src/features/auth/supabase.ts` beim App-Start absichtlich einen Fehler.

Nützliche Startbefehle:

```bash
npm run ios
npm run android
npm run web
```

`app.json` konfiguriert Portrait-Modus, das Scheme `ziyara`, automatische Systemdarstellung, Standortberechtigungen, statischen Web-Export, Expo Router und Splash Screen. `eas.json` besitzt interne Preview- und Production-Buildprofile. Änderungen an nativen Abhängigkeiten oder App-Konfiguration können einen neuen Development Build erfordern.

## Architektur und Verzeichnisstruktur

```text
src/app/                    Expo-Router-Routen und Screen-Komposition
src/components/ui/          Wiederverwendbare UI-Primitives
src/components/             App-weite zusammengesetzte Komponenten
src/constants/              Theme-Tokens und Layout-Konstanten
src/data/                   Gebündelte Offline-Daten und Katalogsuche
src/domain/                 App- und Datenbanktypen
src/features/auth/          Supabase-Client, Auth-State, Formulare
src/features/account-families/Adminverwaltung eigenständiger Kontofamilien
src/features/bus-management/Buszuordnung, Boarding-State und Adminoberfläche
src/features/daily-program/  Datumsbasierte Tagesplanung, Admineditor, Home-Vorschau und Wochenansicht
src/features/general-alarm/ Push-Registrierung, lokale Erinnerungsplanung und Benachrichtigungsrouting
src/features/group-check/   Pflichtabfrage für die Reisegruppe
src/features/trip-groups/   Reisegruppen, Anführerzuordnung und einmalige Standortanfrage
src/features/question-round/Anonyme Fragerunden
src/features/trip-guidance/ Live-Programmpunkt, Teilnehmerstatus und Offline-Warteschlange
src/features/i18n/          UI-Wörterbücher und lokalisierte Fachdaten
src/features/map/           Native Karte und Web-Fallback
src/features/network/       Abbruch und Fehlerklassifizierung für Supabase-Lesezugriffe
src/features/places/        Ortsbilder, Stadtkarte, externe Navigation
src/features/reader/        Darstellung religiöser Textsegmente
src/features/storage/       AsyncStorage-Hooks
src/features/theme/         Gespeicherter Theme-Modus
supabase/migrations/        Versioniertes Postgres-Schema, RLS und RPCs
supabase/functions/         Lokaler Function-Quellcode; Remote-Deployments nur nach ausdrücklicher Freigabe
assets/images/places/       Lokal gebündelte Ortsbilder
docs/IMPLEMENTATION_PLAN.md Ursprüngliche Roadmap, nicht alleinige Ist-Quelle
```

Der Alias `@/*` zeigt laut `tsconfig.json` auf `src/*`; `@/assets/*` zeigt auf `assets/*`.

### Provider-Baum und globaler Zustand

`src/app/_layout.tsx` verschachtelt Fehlergrenze und Provider in dieser Reihenfolge:

```text
AppErrorBoundary
└── AppI18nProvider
    └── AppThemeProvider
        └── AuthProvider
            └── BusManagementProvider
                └── TripGroupProvider
                    └── DailyProgramProvider
                        └── GeneralAlarmNotificationsProvider
                            └── TripGuidanceProvider
                                └── GroupCheckProvider
                                    └── QuestionRoundProvider
                                        └── RootNavigation
```

Die Reihenfolge ist relevant: Bus-, Reisegruppen-, Tagesprogramm-, Generalalarm-, Reiseführungs-, Gruppen- und Fragerundenfunktionen benötigen den Auth-State; der Reisegruppenprovider benötigt zusätzlich aktive Reise und physische Teilnehmer aus dem Buszustand, der Generalalarm ebenfalls den bereits berechneten Buszustand. Der Splash Screen wartet nur auf die lokal gespeicherten Sprach- und Themezustände; Auth-, Profil-, Bus-, Reisegruppen-, Tagesprogramm-, Generalalarm-, Reiseführungs-, Gruppen- und Fragerundenabfragen dürfen den öffentlichen Guide nicht blockieren. Ohne Session überspringen die privaten Provider Tabellenabfragen und Realtime-Kanäle vollständig und entfernen lokale Generalalarm-Erinnerungen. Bei einer vorhandenen Session blockiert nur das initiale Profil-/Pflichtabfrage-Laden beziehungsweise ein echter Benutzerwechsel die geschützte Navigation. Bus-, Reisegruppen-, Tagesprogramm- und Reiseführungs-Hintergrundrefreshes behalten den letzten Stand sichtbar und melden Offline-, Timeout- oder Serverfehler ohne die Navigation auszuhängen. Ein Profilfehler bleibt als wiederholbarer, nicht blockierender Hinweis sichtbar; Rollen- und Gruppenrechte werden dadurch nicht erweitert.

`AppErrorBoundary` verwendet absichtlich keine Theme-, I18n-, Auth- oder Netzwerkabhängigkeit, damit der Fallback auch bei einem Providerfehler rendern kann. Die Fehlergrenze arbeitet vollständig lokal; externes Crash-Reporting ist nicht Bestandteil der App.

`AuthProvider` trennt das initiale Session-/Profil-Laden und echte Benutzerwechsel von Hintergrundaktualisierungen. Beim App-Resume, einem manuellen Refresh oder einer Realtime-Profiländerung bleiben das vorhandene Profil, die Navigation und der Screen-State erhalten; `isRefreshing` und `profileRefreshError` bilden den nicht-blockierenden Zustand ab. Ein fehlgeschlagener Hintergrundrefresh zeigt global einen wiederholbaren Hinweis. Logout, Wechsel der Auth-User-ID oder eine erfolgreiche Serverantwort ohne Profil entfernen alte Profildaten dagegen sofort. Rollen stammen weiterhin ausschließlich aus dem serverseitigen Profil; RLS und geschützte RPCs bleiben auch bei vorübergehend veraltetem Client-State die Berechtigungsinstanz.

Der gleiche Provider registriert den nativen Linking-Listener für Passwort-Recovery. `detectSessionInUrl` bleibt am Supabase-Client deaktiviert, damit Links nicht pauschal als Login verarbeitet werden. `src/features/auth/password-recovery-link.ts` akzeptiert Recovery-Zugangsdaten nur auf `/reset-password`; der neue Passwort-Screen bleibt außerhalb der normalen Login-Weiterleitung erreichbar, obwohl die Recovery-Session technisch bereits authentifiziert ist.

## Navigation und Zugriffsschutz

| Route | Zugriff | Zweck |
| --- | --- | --- |
| `/login`, `/register` | öffentlich; vorhandene Session wird weitergeleitet | Anmeldung und Registrierung |
| `/forgot-password` | öffentlich | neutral formulierter Versand eines Recovery-Links |
| `/reset-password` | öffentlich; nur mit gültiger Recovery-Session änderbar | neues Passwort setzen und danach lokale Session entfernen |
| `/(tabs)` | öffentlich; für angemeldete Konten keine blockierende Gruppenabfrage | Hauptnavigation |
| Tab `/` | wie Tabs | kompakte Vorschau des heutigen Tagesprogramms, Städte, hervorgehobene Orte sowie aktive Bus-, Status- und Fragerundenhinweise |
| Tab `/map` | wie Tabs | native Karte beziehungsweise Web-Fallback |
| Tab `/search` | wie Tabs | Katalogsuche und Filter |
| Tab `/bookmarks` | wie Tabs | lokal gespeicherte Orte und Reader-Inhalte |
| Tab `/settings` | wie Tabs | Theme, Sprache und Reader; Konto-/Adminaktionen fordern eine Anmeldung an |
| `/city/[city]` | öffentlich | Orte einer Stadt |
| `/place/[slug]` | öffentlich | Ortsdetail |
| `/reader/[slug]` | öffentlich | religiöser Reader |
| `/account` | Session, nicht blockiert | Kontodaten, Personenzahl und Kofferanzahl |
| `/bus` | Session; nur eigene verknüpfte Teilnehmer-IDs | Buszuordnung, Generalalarm, Push-Einrichtung und gestufter Status für ein aktives Boarding |
| `/group` | Session; nur eigene Untergruppen, Standortanfrage nur für den jeweiligen Anführer | Gruppenmitglieder anzeigen und eine einmalige Standortanfrage beantworten oder ablehnen |
| `/guide` | Session; nur eigene verknüpfte Teilnehmer-IDs | aktueller Programmpunkt, Treffpunkt, Navigation und Teilnehmerstatus |
| `/program` | Session | Wochenprogramm von heute bis zu den nächsten sechs Tagen, gegliedert nach Tag und Ablaufpunkt |
| `/about`, `/sources`, `/disclaimer` | öffentlich | Produkt- und Quellenhinweise |
| `/check-in` | Session; Konten ohne Adminrolle sind bei aktiver oder unsicherer Abfrage blockiert | verpflichtende Ja-/Nein-Antwort |
| `/question-round` | jede Session bei offener Runde | anonyme Frage absenden |
| `/admin` | Admin-Session | getrennte Punkte für Busmanagement, Reisegruppen und Anführerstandort, Kontofamilien, Generalalarm, Tagesprogramm, Reiseführung und Mehrziel-Navigation sowie Gruppenabfrage, Fragen und Benutzerübersicht |

Neue Hauptscreens unter `src/app` anlegen. Zentrale dynamische URLs über `src/features/navigation/routes.ts` erzeugen und Routenparameter mit `singleRouteParam` normalisieren. Geschützte Screens werden mit `RequireAuth` innerhalb des Screens abgesichert, damit ein Deep Link ohne Session gezielt `/login` samt geprüftem internem Rücksprungziel öffnet. Die Allowlist verhindert externe oder unbekannte Redirectziele. RLS und die serverseitigen RPC-Prüfungen bleiben unabhängig vom Client-Guard die eigentliche Sicherheitsinstanz.

## Lokale Daten und religiöse Inhalte

Die App bündelt derzeit:

- 15 Orte in `src/data/places.ts`
- 13 empfohlene Handlungen in `src/data/recommendedActs.ts`
- 5 Reader-Einträge in `src/data/religiousContent.ts`
- 6 Quellen-/Redaktionsreferenzen in `src/data/sourceReferences.ts`

Alle Orte, empfohlenen Handlungen und Reader-Einträge sind derzeit `needs_review`. `src/data/ziyaratAshura.ts` enthält einen vollständigen arabischen Text und eine Transliteration für Ziyarat Ashura; auch dieser Eintrag ist ausdrücklich nicht als geprüft freigegeben und besitzt `contentPolicy: pending_rights_review`.

Verbindliche Inhaltsregeln:

- Keine Dua, Ziyarat, arabischen Texte, Transliterationen, Übersetzungen, Hadithe, historischen oder religiösen Aussagen erfinden.
- Ungeprüfte Volltexte nicht hinzufügen. Als deutscher Platzhalter gilt exakt: `Volltext wird nach Rechte- und Inhaltsprüfung ergänzt. Quelle siehe unten.`
- Jeder religiöse Inhalt braucht `sourceReferences` und `verificationStatus`.
- Jede empfohlene Handlung braucht eine Quelle oder `verificationStatus: "needs_review"`.
- Rechteprüfung und fachlich-religiöse Inhaltsprüfung sind getrennte Anforderungen.
- Einen Status nur nach dokumentierter qualifizierter Prüfung auf `verified` setzen.
- Religiöse Inhalte gehören in `src/data`, nicht direkt in UI-Komponenten oder Übersetzungsdateien.
- Disclaimer, Quellenansicht und sichtbare Prüfstatus dürfen nicht entfernt oder verharmlost werden.

`src/data/catalog.ts` durchsucht lokalisierte Orte, Inhalte, Handlungen und deren Quellen. Die Suche normalisiert lateinische Diakritika sowie häufige arabische Zeichenvarianten. Handlungen ohne Reader-Inhalt bleiben sichtbar, sind aber nicht fälschlich mit einem anderen Text verlinkt. IDs und Slugs sind persistente Referenzen; bei den korrigierten Platzhalter-Slugs existieren deshalb Legacy-Aliase und eine Bookmark-Migration.

## Internationalisierung und RTL

- Unterstützte Sprachen: `de`, `en`, `ar`.
- UI-Texte liegen derzeit gemeinsam in `src/features/i18n/i18n.tsx`.
- Übersetzungen der Fachdaten liegen in `src/features/i18n/localizedData.ts`.
- Deutsch ist Fallback-Sprache.
- Arabisch setzt `isRTL`, aber einzelne technische Eingaben wie E-Mail bleiben absichtlich LTR.
- Jeder neue nutzerseitige Text muss in allen drei Wörterbüchern ergänzt werden.
- Dynamische Inhaltsdaten nicht als UI-Übersetzung duplizieren; die vorhandenen `localize*`-Funktionen verwenden.

## Lokale Persistenz

`src/features/storage/persistentState.ts` stellt pro Schlüssel einen gemeinsamen externen Store bereit und serialisiert JSON geordnet über AsyncStorage. Jeder Schlüssel besitzt einen Laufzeitparser; beschädigte oder veraltete Werte fallen sicher auf Standardwerte zurück. Hydration kann keine neuere Bedienaktion überschreiben, mehrere gleichzeitig montierte Screens bleiben synchron und Schreibvorgänge behalten ihre Reihenfolge. Aktuelle Schlüssel:

| Schlüssel | Inhalt |
| --- | --- |
| `ziyara.language` | `de`, `en` oder `ar` |
| `ziyara.theme-mode` | `system`, `light` oder `dark` |
| `ziyara.bookmarks` | Keys wie `place:<slug>` und `content:<slug>` |
| `ziyara.reader.preferences` | arabische Schriftgröße und Zeilenansicht |
| `ziyara.reader.positions` | Scrolloffset je Reader-Slug |
| `ziyara.trip-guidance.outbox` | benutzerspezifische, noch nicht übertragene Treffpunktmeldungen |
| `ziyara.general-alarm.expo-push-token` | zuletzt serverseitig registrierter Expo-Push-Token des Geräts für eine bestmögliche Abmeldung |

Der Reader speichert und restauriert Positionen beim erneuten Öffnen. Nichtkritische lokale Speicherfehler fallen auf den In-Memory-Zustand zurück; serverseitige Auth-, Profil- und Pflichtabfragefehler besitzen sichtbare beziehungsweise fail-closed Zustände.

Alle Datenbank-/Read-RPC-Lesezugriffe laufen über `src/features/network/supabase-read.ts`. Der Wrapper setzt mit der vom installierten Supabase-SDK unterstützten `abortSignal`-Methode einen Timeout von 10 Sekunden und klassifiziert Fehlschläge als `offline`, `timeout` oder `server`. Die UI zeigt diese Zustände getrennt von laufendem Laden an. Schreib-RPCs bleiben davon getrennt, damit ein lokaler Timeout nicht fälschlich behauptet, eine möglicherweise serverseitig ausgeführte Mutation sei abgebrochen worden.

## Supabase-Datenmodell und Sicherheit

`src/domain/database.ts` ist die manuell gepflegte TypeScript-Abbildung des Schemas. Jede Schemaänderung benötigt eine neue vorwärtsgerichtete Migration und die parallele Aktualisierung dieser Typen.

Aktuelle Tabellen:

- `profiles`: App-ID (`int8`), Auth-UUID, Anzeigename, `member_type`, `party_size`, `luggage_count`, optionale Kontofamilie, Rolle und Zeitstempel.
- `account_families`: vom Admin benannte Gruppierung eigenständiger App-Konten, unabhängig von Reisegruppen und Personenzahl.
- `group_checks`: freie Frage, Admin-Profil und Öffnungs-/Schließzeit.
- `group_check_responses`: genau eine änderbare Ja-/Nein-Antwort pro Profil und Abfrage.
- `question_rounds`: Öffnungs-/Schließzeit einer anonymen Runde.
- `anonymous_questions`: Fragetext und Bearbeitungsstatus ohne Profil-/User-Fremdschlüssel.
- `question_submission_limits`: temporäre, clientseitig nicht lesbare Anzahl je Profil und offener Runde; ohne Fragetext, Frage-ID oder Zeitstempel.
- `role_assignment_audit`: clientseitig nicht lesbare Nachvollziehbarkeit tatsächlicher Rollenänderungen durch mehrere Admins.
- `trips`: aktive oder archivierte Reise; durch einen Partial-Unique-Index höchstens eine aktive Reise.
- `trip_buses`: benannte Busse und deren Sortierung innerhalb einer Reise.
- `trip_participants`: physische Teilnehmer-ID, Anzeigename, Bus und optionale Profilverknüpfung.
- `bus_boardings`: Abfahrt mit geplantem Zeitpunkt und Öffnungs-/Schließzeit; höchstens ein offenes Boarding je Reise.
- `bus_boarding_responses`: letzter Status je Boarding und physischer Teilnehmer-ID.
- `bus_boarding_escalations`: letzte ausdrückliche manuelle Eskalation je Boarding und physischer Teilnehmer-ID.
- `push_notification_devices`: private, profilgebundene Expo-Push-Tokens mit Plattform und Sprache; keine Client-Leserechte.
- `general_alarm_notification_attempts`: privates Idempotenz- und Expo-Annahmeprotokoll je Gerät, Teilnehmer, Stufe und Erinnerungsfenster.
- `trip_guidance_updates`: versionierter aktueller Programmpunkt mit Ort, Abfahrt, Treffpunkt, Koordinaten und organisatorischen Hinweisen.
- `trip_guidance_responses`: letzter Treffpunktstatus je Programmpunkt und physischer Teilnehmer-ID einschließlich ausdrücklicher Problemübernahme.
- `trip_navigation_destinations`: mehrere aktive, benannte Karten- und Navigationsziele je Reise mit optionalem Orientierungshinweis und archivierter Entfernung.
- `trip_daily_programs`: genau ein veröffentlichter organisatorischer Ablauf je Reise und Kalenderdatum mit optionaler Überschrift.
- `trip_groups`: benannte Untergruppen der aktiven Reise mit genau einer physischen Teilnehmer-ID als konto-verknüpftem Anführer.
- `trip_group_members`: atomare Zuordnung physischer Teilnehmer-IDs zu höchstens einer Untergruppe.
- `trip_group_location_requests`: genau eine aktuelle, zustimmungsbasierte Standortanfrage je Untergruppe mit `pending`, `shared` oder `declined` und kurzzeitig lesbaren Koordinaten.

Mit der lokal angewandten Kontofamilien- und Koffermigration existieren dreiundzwanzig Anwendungstabellen im `public`-Schema. Die zweiundzwanzig zuvor bestehenden Tabellen bleiben vollständig erhalten; ebenso `profiles.id`, `profiles.user_id`, `group_check_responses.id` und `member_type`.

Wichtige RPCs:

- `is_admin`
- `admin_list_users`
- `admin_list_account_families`, `admin_upsert_account_family`, `admin_delete_account_family`
- `admin_set_user_role`
- `can_delete_account` (nur `service_role`; enger Vorabcheck für die Edge Function)
- `start_group_check`, `close_group_check`, `respond_to_group_check`
- `admin_group_check_results`
- `open_question_round`, `close_question_round`
- `submit_anonymous_question`, `set_anonymous_question_checked`
- `admin_create_trip`, `admin_archive_trip`, `admin_create_trip_bus`
- `admin_upsert_trip_participant`, `admin_start_bus_boarding`, `admin_close_bus_boarding`
- `respond_to_bus_boarding`, `admin_set_bus_boarding_status`
- `register_push_notification_device`, `unregister_push_notification_device`
- `admin_escalate_bus_boarding_participant`
- `can_dispatch_general_alarm`, `claim_due_general_alarm_notifications`, `complete_general_alarm_notification_attempts` (nur `service_role`)
- `admin_publish_trip_guidance`, `admin_update_trip_guidance`
- `respond_to_trip_guidance`, `admin_acknowledge_trip_guidance_problem`
- `can_read_current_trip_daily_program`, `admin_upsert_trip_daily_programs`
- `is_trip_group_member`, `is_trip_group_leader`, `get_trip_group_member_summaries`
- `admin_upsert_trip_group`, `admin_delete_trip_group`, `admin_request_trip_group_location`, `respond_to_trip_group_location`

RLS ist aktiviert. Privilegierte Aktionen laufen über `security definer`-Funktionen, die Admin- beziehungsweise Session-Berechtigungen selbst prüfen. Neue Funktionen müssen einen festen `search_path`, minimale Grants und explizite Auth-Prüfungen besitzen.

Die Migration `20260816000000_add_profile_member_type.sql` ergänzt die Bruder-/Schwester-Zuordnung. Sie übernimmt `member_type` aus validierten Auth-Metadaten und lässt das Feld für ältere Konten `null`, statt eine falsche Zuordnung zu erfinden.

Die Migrationen `20260816010000_add_staff_role_values.sql` und `20260816020000_add_admin_role_assignment.sql` ergänzen medizinisches Personal und Organisationsteam-Mitglieder sowie die serverseitig geschützte Rollenvergabe. Die Enum-Erweiterung und die RPC liegen absichtlich in getrennten Migrationen, damit neue PostgreSQL-Enumwerte erst nach einem Commit verwendet werden.

Die Migration `20260816030000_allow_all_roles_participate.sql` öffnet die Antwort-RPCs für alle angemeldeten Profile. Admins können dadurch an Statusabfragen und anonymen Fragerunden teilnehmen, ohne dass ihre privilegierten App-Bereiche blockiert werden.

Die Migration `20260816040000_minimize_admin_user_list.sql` reduziert `admin_list_users` auf Name, vertretene Personenzahl und Rolle. Nur die für eine Rollenänderung notwendige interne Auth-UUID wird zusätzlich übertragen; E-Mail-Adresse, Profil-ID, Zuordnung und Anmeldedaten werden nicht mehr ausgeliefert.

Die Migration `20260816050000_harden_multi_admin_and_questions.sql` serialisiert konkurrierende Rollenwechsel und protokolliert echte Änderungen, sperrt Antworten transaktionssicher gegen das gleichzeitige Schließen einer Runde und begrenzt anonyme Einsendungen auf fünf pro Profil und Runde. Die temporären Zähler werden beim Schließen gelöscht.

Die Migration `20260817000000_allow_admin_role_assignment.sql` erlaubt Admins, auch die Rolle `admin` zu vergeben und bestehende Admins umzustufen. Eine transaktionsweite Advisory-Sperre und eine erneute Berechtigungsprüfung schützen konkurrierende Änderungen; der letzte Admin kann nicht herabgestuft werden. Profiländerungen werden über Realtime veröffentlicht, damit Rollen in bereits geöffneten Sitzungen aktualisiert werden; beim App-Fokus wird das eigene Profil zusätzlich neu geladen.

Die Migration `20260826000000_expand_group_check_results.sql` paart den Shared Row Lock einer Antwort mit einem expliziten exklusiven Row Lock beim Schließen. Dadurch wird eine parallele Antwort entweder vollständig vor dem Schließen gespeichert oder sieht anschließend den geschlossenen Check und schlägt fehl. `admin_group_check_results` liefert über einen `LEFT JOIN` jedes aktuelle Profil mit `display_name`, `party_size` und einer nullable Antwort; `null` bedeutet ausdrücklich noch nicht geantwortet.

Die Migration `20260826010000_drop_unused_group_check_answer_index.sql` entfernt ausschließlich `group_check_responses_check_answer_idx`. Keine produktive Abfrage filtert oder aggregiert nach `answer`: Eigene Antworten werden über `check_id` und `profile_id` gelesen, die Admin-RPC verbindet dieselben Spalten und die Ja-/Nein-/Offen-Gruppierung erfolgt anschließend im Client. Der Unique-Constraint auf `(check_id, profile_id)` stellt den dafür passenden Index bereits bereit. Alle sieben Tabellen sowie `profiles.id`, `profiles.user_id`, `group_check_responses.id` und `member_type` bleiben unverändert erhalten.

Die Migration `20260826020000_protect_account_deletion.sql` schützt Löschungen auf `auth.users` mit derselben transaktionsweiten Advisory-Sperre wie Rollenänderungen. Der letzte Administrator kann deshalb auch bei paralleler Löschung oder gleichzeitiger Umstufung nicht entfernt werden. Das Profil, Gruppenantworten und temporäre Fragenlimits werden über bestehende Cascades gelöscht; erhaltene Gruppenchecks verlieren den Erstellerbezug. Rollen-Auditereignisse bleiben als nicht identifizierende Historie erhalten: `target_user_id` wird vor dem Löschen auf `null` gesetzt und `changed_by_profile_id` wird über den bestehenden Fremdschlüssel ebenfalls anonymisiert.

Die Migration `20260826021000_add_account_deletion_precheck.sql` ergänzt den ausschließlich für `service_role` ausführbaren Vorabcheck `can_delete_account`. Er liefert der Edge Function eine verständliche Last-Admin-Ablehnung; der Trigger auf `auth.users` bleibt wegen möglicher Parallelität die endgültige transaktionale Sicherheitsinstanz. `supabase/functions/delete-account` akzeptiert nur `POST` mit leerem Body, prüft den Access Token über `auth.getUser(accessToken)` und ruft `auth.admin.deleteUser` ausschließlich mit der verifizierten ID auf. Privilegierte Schlüssel werden nur aus der Edge-Function-Umgebung gelesen. `verify_jwt = false` betrifft nur den vorgeschalteten Legacy-Gateway-Check; die Function-eigene Bearer-Token-Prüfung bleibt zwingend.

Die additive Migration `20260827000000_add_bus_management.sql` ergänzt Reise, Busse, physische Teilnehmer-IDs, Boardings und Statusantworten. Direkte Client-Schreibrechte sind entzogen; Admin- und Teilnehmermutationen laufen ausschließlich über serverseitig authentifizierte RPCs. RLS zeigt normalen Konten nur eigene verknüpfte IDs und Antworten, während Admins die gesamte Reise sehen. Antwort und Schließen verwenden kompatible Row Locks für transaktionale Parallelität. Eine Kontolöschung setzt die optionale Profilverknüpfung auf `null`, lässt die physische Teilnehmerhistorie aber bestehen. Bei einem Auth-/Function-Grant-Fehler erneuert der Bus-Client die Supabase-Session und wiederholt die Statusmutation genau einmal, sofern dieselbe User-ID angemeldet bleibt; ein endgültiger Fehler löst einen autoritativen Refresh aus und wird ohne sensible Serverdetails als Auth-, geschlossenes Boarding-, Zuordnungs-, Offline- oder Serverzustand angezeigt.

Die additive Migration `20260827120000_add_trip_guidance.sql` ergänzt versionierte Programmpunkte und Teilnehmermeldungen. Neue Veröffentlichungen schließen den vorherigen Programmpunkt transaktionssicher über eine Sperre der aktiven Reise; Treffpunktkorrekturen aktualisieren dagegen denselben Datensatz. Teilnehmerantworten sperren den offenen Programmpunkt kompatibel gegen einen gleichzeitigen Wechsel. Direkte Client-Schreibrechte sind entzogen, RLS zeigt Konten nur eigene Statusmeldungen und Admins die Gesamtübersicht. Nur ein aktueller `problem`-Status kann über die Admin-RPC ausdrücklich übernommen werden; eine spätere Teilnehmeränderung entfernt die alte Übernahme. Die Migration ist lokal und remote angewandt und mit 24 zusätzlichen pgTAP-Assertions geprüft.

Die additive, lokal und remote angewandte Migration `20260828120000_add_trip_navigation_destinations.sql` ergänzt mehrere Navigationseinträge je aktiver Reise. Direkte Client-Schreibrechte bleiben entzogen; RLS zeigt aktive Ziele ausschließlich Admins und Mitgliedern der zugehörigen Reise. Admin-RPCs legen Ziele an beziehungsweise ändern sie und archivieren sie nach ausdrücklicher Bestätigung. Ein vorhandener offener Programmtreffpunkt mit Koordinaten wird bei der Migration als erstes Ziel übernommen. Die Tabelle wird in Realtime aufgenommen.

Die additive, lokal und remote angewandte Migration `20260828130000_add_daily_program.sql` ergänzt genau ein Tagesprogramm je Reise und Kalenderdatum. Alle angemeldeten Konten dürfen die Programme der aktiven Reise lesen, auch wenn noch keine physische Teilnehmer-ID verknüpft ist. Batch-Upserts sind auf vierzehn unterschiedliche Tage begrenzt, sperren die aktive Reise und dürfen nur von Admins ausgeführt werden. Direkte Client-Schreibrechte bleiben entzogen; die Tabelle wird in Realtime aufgenommen.

Die additive, lokal und remote angewandte Migration `20260830000000_add_trip_groups_and_location_requests.sql` ergänzt Untergruppen, eindeutige physische Mitgliedschaften und genau eine aktuelle Standortanfrage je Gruppe. Nur Admin-RPCs dürfen Gruppen bilden, ändern, löschen und Anführer anfragen; nur der aktuell verknüpfte Anführer darf eine offene Anfrage teilen oder ablehnen. Jede App-Rolle einschließlich `admin` darf über eine verknüpfte physische Teilnehmer-ID Gruppenmitglied oder Anführer sein. Normale Gruppenmitglieder sehen die Gruppenzusammensetzung, aber niemals die Standortanfrage oder Koordinaten. Geteilte Koordinaten sind per zeitabhängiger RLS höchstens 15 Minuten lesbar und werden bei erneuter Anfrage, Gruppenänderung oder Löschung entfernt. Die drei Tabellen sind in Realtime aufgenommen; 35 neue pgTAP-Assertions prüfen Grants, Rollen, Adminmitgliedschaft, Member-Summary-RPC, Freigabe, zeitlichen RLS-Ablauf, Überschreiben und Löschung.

Die additive, derzeit nur lokal angewandte Migration `20260830010000_add_account_families_and_luggage.sql` ergänzt `profiles.luggage_count` mit einem Bereich von `0` bis `50`, übernimmt die Kofferanzahl bei neuen Registrierungen aus validierten Auth-Metadaten und lässt ältere Konten bei `0`. Nutzer dürfen nur die eigene Kofferanzahl ändern. `account_families` gruppiert eigenständige App-Konten; `profiles.family_id` erzwingt höchstens eine Familie pro Konto. Nur authentifizierte Admin-RPCs legen Familien an, ändern oder löschen sie und verschieben ausgewählte Konten atomar. Mitglieder dürfen den Namen ihrer eigenen Familie lesen, nicht jedoch fremde Familien oder deren Konten. 32 neue pgTAP-Assertions prüfen Metadaten, Grants, RLS, minimale Adminlisten, Verschieben und Löschen.

Die additive Migration `20260827130000_add_bus_boarding_read_status.sql` ergänzt den Enumwert `read` in einer eigenen Transaktion, damit PostgreSQL ihn erst nach dem Enum-Commit verwendet. `20260827140000_add_general_alarm.sql` ergänzt Fünf-Minuten-/Dringlichkeitsparameter, private Push-Geräte und Versandfenster sowie manuelle Boarding-Eskalationen. `20260827150000_enforce_general_alarm_status_order.sql` erzwingt `read` → `on_way` → `boarded` auch im Teilnehmer-RPC, serialisiert parallele Antworten je physischer ID und lässt administrative Korrekturen weiter zu. Direkte Token- und Versandprotokoll-Leserechte sind entzogen; normale Nutzer registrieren ausschließlich das eigene Gerät, Admins sehen nur Eskalationen, und nur `service_role` beansprucht beziehungsweise vervollständigt Push-Fenster. Der lokale Edge-Function-Quellcode `dispatch-general-alarm` prüft Admin- oder Scheduler-Autorisierung und sendet gruppierte, lokalisierte Nachrichten an den Expo Push Service. Alle drei Migrationen sind lokal und remote angewandt; Function-Deployment, Push-Secrets und Scheduler sind noch nicht erfolgt.

Am 27. August 2026 wurden die Migrationen `20260826000000_expand_group_check_results.sql`, `20260826010000_drop_unused_group_check_answer_index.sql`, `20260826020000_protect_account_deletion.sql`, `20260826021000_add_account_deletion_precheck.sql` und `20260827000000_add_bus_management.sql` nach ausdrücklicher Freigabe auf das verknüpfte Remote-Projekt ausgerollt. Am 28. August 2026 folgten die Reiseführungs- und Generalalarm-Migrationen `20260827120000` bis `20260827150000`. Die Mehrzielmigration `20260828120000_add_trip_navigation_destinations.sql` war bei der Remote-Prüfung am 30. August 2026 bereits angewandt; am selben Tag wurden die zuvor fehlende Migration `20260828130000_add_daily_program.sql` und anschließend `20260830000000_add_trip_groups_and_location_requests.sql` ausdrücklich ausgerollt. Bis zu diesem Stand waren lokal und remote synchron. Die anschließend ergänzte Migration `20260830010000_add_account_families_and_luggage.sql` ist nur lokal angewandt und wurde nicht remote ausgerollt. Keine bestehende Migration wurde verändert, gelöscht oder zusammengefasst. Die Edge Function `delete-account` ist remote als aktive Version 1 mit `verify_jwt = false` bereitgestellt; ein anonymer POST erreichte die interne Auth-Prüfung und wurde erwartungsgemäß mit HTTP 401 abgelehnt. Es wurde kein reales Konto testweise gelöscht und die Remote-Redirect-Allowlist wurde nicht verändert.

Der anschließend ergänzte Busstatus-Session-Retry ist Clientcode im lokalen Worktree. Dafür war keine weitere Schemaänderung notwendig. Die Reiseführungs- und Generalalarm-Migrationen sind remote angewandt; der Generalalarm benötigt für produktiven Push zusätzlich die Edge Function, Secrets, einen minutenweisen Server-Scheduler, EAS-Projekt-ID/Push-Credentials und einen neuen nativen Build. Bereits installierte Apps erhalten die Clientänderungen erst über einen neuen Build beziehungsweise ein App-Update; ein solcher Build wurde nicht deployed, committed oder gepusht. Remote-Zustand kann sich unabhängig vom Repository ändern: vor späteren Annahmen mit autorisiertem Zugriff `npx supabase migration list --linked` und `npx supabase functions list` prüfen. Migrationen, Functions, Secrets, Scheduler und Auth-Redirects nur innerhalb eines ausdrücklich beauftragten Implementierungs- oder Deployment-Schritts remote ändern.

## Kapazität für die Reisegruppe

- Zielgröße sind ungefähr 100 Konten zuzüglich mehrerer Admin-/Mitarbeitergeräte.
- Der Supabase-Client teilt mehrere Realtime-Kanäle über eine Verbindung. Aktuelle Tarifgrenzen trotzdem vor der Reise im Dashboard gegen die erwarteten gleichzeitig aktiven Geräte prüfen.
- Durch die gestaffelten Fallback-Intervalle entstehen bei 100 dauerhaft aktiven Clients mit Bus-, Reisegruppen-, Tagesprogramm- und Reiseführungsprovider grob 590 Fallback-Leseabfragen pro Minute ohne aktive Pflichtabfrage und etwa 670 pro Minute mit aktiver Pflichtabfrage. Die Schätzung zählt die drei parallelen Reisegruppen-Reads pro Refresh einzeln. Realtime und App-Fokus sind der Primärweg; die Offline-Warteschlange versucht nicht in einer engen Schleife erneut zu senden.
- Der produktive Generalalarm-Scheduler soll den Dispatcher einmal pro Minute aufrufen. Die Datenbank beansprucht je Gerät/Teilnehmer/Stufe/Fünf-Minuten-Slot höchstens einen Versuch; ein parallel geöffnetes Adminpanel kann deshalb keine doppelten Nachrichten für denselben Slot erzeugen.
- Antwortwellen werden in den Adminpanels 250 ms gebündelt. Die Benutzer-RPC wird in 200er-Seiten geladen, die Fragenansicht zeigt maximal 50 weitere Einträge pro Schritt.
- Ein realer Lasttest mit dem gewählten Supabase-Tarif, Reise-WLAN/Mobilfunk und den Zielgeräten bleibt vor Freigabe erforderlich.

## Plattformunterschiede

- Native Karte: `src/features/map/MapScreen.tsx` mit `react-native-maps` und Expo Location.
- Webkarte: `src/features/map/MapScreen.web.tsx` mit schematischer Karte, Browser-Geolocation und Liste.
- Stadtkarte besitzt ebenfalls native und `.web.tsx`-Varianten.
- Die administrative Treffpunktauswahl besitzt ebenfalls native und `.web.tsx`-Varianten: Native Geräte zeigen eine interaktive Karte mit verschiebbarem Marker, Web eine klickbare Irak-Koordinatenfläche. Beide können nach ausdrücklicher Standortfreigabe einmalig den aktuellen Gerätestandort übernehmen.
- Platform-spezifische Implementierungen bevorzugen, wenn ein natives Modul Web-Exporte brechen würde.
- Gebündelte Katalogdaten und Bilder sind offline verfügbar. Supabase-Funktionen und Kartenkacheln sind nicht vollständig offlinefähig.
- Generalalarm-Push und lokale Benachrichtigungen sind nativ; die Webversion zeigt den Statusfluss ohne Push. Remote-Push erfordert einen nativen Development-/Produktionsbuild und ist auf Android nicht vollständig in Expo Go verfügbar. Kein Plattformpfad behauptet, Lautlosmodus, Fokus, ausgeschaltete Geräte oder deaktivierte Benachrichtigungen zuverlässig umgehen zu können.

## UI-Konventionen

- Nutzerseitige UI bleibt in allen unterstützten Sprachen vollständig übersetzt.
- Ruhige, funktionale Oberfläche statt Marketing-Landingpage.
- Theme-Tokens aus `src/constants/theme.ts` und `useTheme()` verwenden; keine verstreuten Farbwerte.
- Wiederverwendbare Elemente in `src/components/ui` ablegen.
- Große Tap-Ziele, Accessibility-Rollen/-Labels, verständliche Lade-, Leer-, Fehler- und Permission-Zustände bereitstellen.
- `Screen` für normale scrollbare Seiten verwenden. Lange virtuelle Listen wie im Adminscreen bleiben `FlatList`-basiert.
- Light/Dark, kleine Mobilbreiten, Web/Desktop, dynamische Schrift und arabische Darstellung mitprüfen.

## Verbindlicher Arbeitsablauf für eine LLM

1. `AGENTS.md` und diese Datei vollständig lesen.
2. `git status --short` prüfen und fremde Änderungen erhalten.
3. Relevante Laufzeitdateien und Migrationen lesen; nicht nur dem alten Plan folgen.
4. Änderungen möglichst klein und typensicher halten; kein `any` zum Kaschieren von Fehlern.
5. Bei neuen Profil-/Backendfeldern Migration, `src/domain/database.ts`, Select-Listen, Auth-Metadaten, UI und Adminanzeige gemeinsam prüfen.
6. Bei neuen UI-Texten Deutsch, Englisch und Arabisch ergänzen.
7. Bei Navigationsänderungen Auth-, Admin- und Blockade-Guards sowie Web-Export prüfen.
8. Keine religiösen Inhalte ohne Quellen- und Prüfworkflow ergänzen.
9. Relevante Fehler-, Lade-, Leer- und Offlinezustände umsetzen.
10. Diese Datei aktualisieren, wenn sich der hier dokumentierte Gesamtzustand ändert.
11. Prüfungen ausführen und im Handoff exakte Ergebnisse, geänderte Dateien, Migrationsbedarf und bekannte Risiken nennen.

## Qualitätsprüfungen

Für bedeutsame Änderungen:

```bash
npm run validate
npx expo-doctor@latest
npx expo export --platform web
npx expo export --platform ios
npx expo export --platform android
npm audit
```

Für Datenbankänderungen zusätzlich:

```bash
npx supabase start
npx supabase db reset --local
npx supabase db lint --local --level warning
npx supabase test db --local
```

`npm test` führt derzeit 145 Jest-Tests in 28 Suites aus. Abgedeckt sind unter anderem die Familiengruppierung der Admin-Benutzerliste, AuthContext einschließlich Kofferregistrierung und -änderung, BusManagementContext einschließlich Session-Refresh-Retry und Fehlerklassifizierung, DailyProgramContext, lokale Kalenderdatumslogik und die Zerlegung mehrzeiliger Ablaufpunkte, Generalalarm-Stufen/Erinnerungsplanung und Dispatcher-Autorisierung, TripGuidanceContext einschließlich Offline-Vormerkung, Wiederholung, Problemübernahme und benutzergebundenem Neustart-Cache für Reiseziele, Reisegruppen-Zustandsaufbau, Standortablauf und Fehlerklassifizierung, GroupCheckContext einschließlich des Rollenlade-Timings, QuestionRoundContext, die Navigationsübergabe an Karten-Apps, Kofferzahlvalidierung, Persistenz-Races und Speicherfehler, der gerenderte `RequireAuth`-Guard, der öffentliche Providerstart einschließlich Reisegruppen ohne Supabase-Zugriff, Recovery-/Account-Löschverträge sowie die globale Error Boundary. `npm run test:coverage` beziehungsweise `npm run validate` erzwingt mindestens 50 % globale Line Coverage und jeweils 80 % für die fünf Kernkontexte. Der vollständig ausgeführte lokale Stand vom 30. August 2026 liegt bei 85,29 % global, 91,21 % AuthContext, 92,90 % BusManagementContext, 89,87 % DailyProgramContext, 87,86 % TripGuidanceContext, 95,31 % GroupCheckContext und 95,65 % QuestionRoundContext.

Unter `supabase/tests/database` prüfen zusätzlich 224 pgTAP-Assertions in elf SQL-Testdateien die RLS-/RPC-/Parallelitätsregeln sowie Cascades, Audit-Anonymisierung, Function-Grants, Kontofamilien, Kofferregistrierung und -änderung, konkurrierende Account-Löschungen, beide Reihenfolgen von Boarding-Antwort gegen Schließung, die serverseitige Generalalarm-Stufenfolge, Token/Versandfenster/Eskalationen, den vollständigen Reiseführungs-Lebenszyklus, das atomare Tagesprogramm-Batch und die Reisegruppen-/Anführerstandortgrenzen einschließlich Adminmitgliedschaft und 15-Minuten-Ablauf. `npm run test:e2e` führt neun serielle Playwright-Smokes mit synthetischen Konten gegen die lokale Expo-/Supabase-/Mailpit-Umgebung aus: Registrierung/Login, Recovery-Link, öffentlicher Guide bei abgebrochenen Supabase-Requests, Gruppencheck, anonyme Fragerunde, Busmanagement einschließlich der gestuften Generalalarm-Bestätigung, Mehrtagesprogramm von der kompakten Home-Vorschau bis zur Wochenansicht, Reiseführung mit Realtime-Treffpunktänderung und Problemübernahme sowie Rollenänderung. Der E2E-Start liest lokale Schlüssel bei neueren Supabase-CLI-Versionen über `supabase status -o env`, falls `start-secrets/docker.env` nicht erzeugt wird. `.github/workflows/ci.yml` führt bei Pushes und Pull Requests App-Validierung samt Coverage, Expo Doctor, getrennte Web-/iOS-/Android-Exports und einen Critical-Audit-Gate aus; der Datenbank-Job startet das lokale Schema aus Migrationen, prüft die 401-Auth-Gates beider Edge Functions, führt DB-Lint und SQL-Tests sowie danach die Playwright-Smokes aus.

Der aktuelle Prüfstand vom 30. August 2026: `npm run validate` mit 145/145 Jest-Tests bestanden, Expo Doctor 21/21 sowie Web-Export mit 30 statischen Routen bestanden; iOS-Export und Android-Export waren im unmittelbar vorherigen Stand ebenfalls erfolgreich. Der zuvor ausgeführte lokale DB-Lint hatte keine Anwendungsschemafehler und 224/224 pgTAP-Assertions waren bestanden. Die neun vorhandenen Playwright-Smokes wurden mit der neuen Home-/Wochenprogramm-Navigation erfolgreich geprüft. Die SDK-57-Patchstände blieben auf `expo ~57.0.18`, `expo-constants ~57.0.16` und `expo-font ~57.0.2` ausgerichtet. Native Gerätetests wurden für diesen Änderungssatz nicht erneut ausgeführt; insbesondere Tagesprogramm und Wochenansicht auf kleiner Breite, Arabisch/RTL, beide Themes und dynamische Schrift müssen proportional zur Änderung manuell geprüft werden.

## Bekannte Lücken und Risiken

- Die App ist noch nicht vollständig store-releasefähig. Die folgenden Punkte sind konkrete Release-Blocker beziehungsweise notwendige Vorabnahmen, nicht bloß optionale Verbesserungen.
- Sämtliche kuratierten Orts- und religiösen Inhalte benötigen weiterhin qualifizierte Prüfung.
- Ziyarat Ashura enthält bereits Volltext, steht aber noch auf `needs_review` und `pending_rights_review`.
- Native Kartenkacheln sind offline nicht garantiert.
- Finale Store-Metadaten und veröffentlichungsfertige Datenschutz-/Supportseiten fehlen. Externes Crash-Reporting ist nicht integriert.
- App-Icon und Splash-Grafik sind noch Expo-Startergrafiken und müssen vor einem Store-Release durch freigegebene Markenassets ersetzt werden.
- Bundle-Identifier und finale Store-/Build-Konfiguration sind in `app.json` noch nicht vollständig.
- Die Recovery- und Account-Löschpfade sind lokal vollständig implementiert; Migrationen und Löschfunktion sind remote ausgerollt. Vor einem Release fehlen noch die Remote-Auth-Redirect-Allowlist sowie Recovery- und Löschtests auf einem signierten nativen Build mit einem ausdrücklich freigegebenen Testkonto.
- Kontofamilien und Kofferanzahl sind im lokalen Client und in der lokalen Datenbank implementiert. Die Migration `20260830010000_add_account_families_and_luggage.sql` ist noch nicht remote ausgerollt; bis dahin darf der neue Client nicht gegen das Remote-Projekt veröffentlicht werden. Danach fehlen reale Tests von Registrierung, nachträglicher Kofferänderung und Familienverschiebung mit mehreren Konten auf kleinen iOS-, Android- und Weboberflächen.
- Das Busmanagement-Schema ist remote ausgerollt und der gesamte Flow lokal getestet. Der neueste Session-Retry liegt nur im lokalen Clientcode und benötigt einen neuen App-Build. Vor der Nutzung mit der ganzen Reisegruppe bleibt außerdem ein realer Last-/Mobilfunktest erforderlich.
- Die Reisegruppen- und Anführerstandortfunktion ist im lokalen Client implementiert und die Migration `20260830000000_add_trip_groups_and_location_requests.sql` ist lokal und remote angewandt. Admins können über ihre physische Teilnehmer-ID Mitglied oder Anführer sein; diese Clientdarstellung liegt noch im lokalen Worktree. Die iOS-Berechtigungsbeschreibung in `app.json` nennt nun auch die ausdrückliche einmalige Freigabe an die Reiseleitung; diese App-Konfigurationsänderung erfordert einen neuen nativen Development-/Produktionsbuild. Vor produktiver Nutzung fehlen reale Tests von Adminmitgliedschaft, Realtime, Vordergrund-Standortberechtigung, Ablehnung, 15-Minuten-Ablauf und schwacher Verbindung auf iOS, Android und Web.
- Das Reiseführungsschema ist lokal und remote migriert sowie lokal vollständig getestet. Vor produktiver Nutzung sind ein neuer Client-Build sowie reale Tests von Realtime, einmaliger Standortfreigabe und Offline-Warteschlange erforderlich.
- Die Tagesprogramm- und Mehrzielmigrationen sind lokal und remote angewandt sowie lokal vollständig automatisiert getestet. Bereits installierte Apps benötigen weiterhin den aktualisierten Client; vor breiter produktiver Nutzung braucht das Tagesprogramm zusätzlich eine reale Prüfung von Realtime, Zeitzone und kleiner Mobilbreite.
- Das Generalalarm-Schema ist lokal und remote migriert; die Dispatcher-Function ist lokal implementiert und getestet, aber noch nicht remote bereitgestellt. Vor produktiver Push-Nutzung fehlen EAS-Projekt-ID und Push-Credentials, Function-Deployment, `GENERAL_ALARM_CRON_SECRET`, optional `EXPO_ACCESS_TOKEN`, ein minutenweiser Server-Scheduler, ein neuer nativer Build sowie reale Geräte-/Mobilfunktests. Details stehen in `docs/GENERAL_ALARM.md`.
- Arabisch richtet Texte aus, schaltet aber die gesamte native Layoutreihenfolge noch nicht über `I18nManager` auf RTL um.
- Der vollständige npm-Audit meldete am 27. August 2026 keine Critical-, aber 4 High- und 11 Moderate-Einträge. Die High-Einträge hängen an der Expo-/Metro-Buildkette und deren `image-size`-Parsern; der vollständige Moderate-Fix würde Expo beziehungsweise `expo-splash-screen` inkompatibel herabstufen. Auf kompatible Expo-/Metro-Patches warten und keinen `npm audit fix --force` ausführen.
- Es fehlen weiterhin native Store-Builds und der reale Last-/Netzwerktest mit etwa 100 Geräten; die vorhandenen Playwright-Smokes ersetzen keine signierten iOS-/Android-Gerätetests.

## Definition of Done

Eine Aufgabe ist erst abgeschlossen, wenn die gewünschte Funktion erreichbar ist, TypeScript und Lint bestanden haben oder konkrete Fehler dokumentiert sind, SDK-57-Kompatibilität erhalten bleibt, Backendtypen und Migrationen synchron sind, alle drei Sprachen berücksichtigt wurden, keine ungeprüften religiösen Aussagen hinzugefügt wurden und relevante Plattform-/Zustandsvarianten geprüft sind. Bei Architektur- oder Produktänderungen gehört eine Aktualisierung dieser Datei zum Abschluss.
