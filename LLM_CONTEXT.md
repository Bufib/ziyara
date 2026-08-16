# Ziyarah – verbindlicher Projektkontext für LLMs

Stand: 16. August 2026

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

Ziyarah ist eine produktionsorientierte Expo-App für eine schiitische Ziyarah-Reise in den Irak. Angemeldete Reisende können wichtige Städte und Orte offline aus einem gebündelten Katalog öffnen, Orte auf einer Karte sehen, Inhalte durchsuchen, Einträge merken und religiöse Texte in einem Reader anzeigen. Die App bietet Deutsch, Englisch und Arabisch, Light/Dark Mode sowie administrative Gruppenfunktionen: verpflichtende Statusabfragen, eine anonyme Fragerunde und eine Benutzerübersicht. Religiöse, historische und ortsbezogene Inhalte bleiben bis zu einer qualifizierten Prüfung sichtbar als `needs_review` markiert.

## Aktueller Funktionsumfang

### Konten und Reisegruppe

- Die App ist grundsätzlich nur nach einer Supabase-E-Mail/Passwort-Anmeldung nutzbar.
- Die Registrierung erfasst Anzeigename, Zuordnung als `brother` oder `sister`, Kontoumfang, E-Mail und Passwort.
- Beim Kontoumfang wird ausdrücklich zwischen „nur ich“ und „ich und Familie ohne eigenes Telefon“ gewählt.
- `party_size` zählt den Kontoinhaber mit. Der Wert `1` bedeutet Einzelkonto; bei Familienauswahl beginnt der Wert bei `2`.
- In ein Familienkonto gehören ausschließlich mitreisende Kinder oder Angehörige ohne eigenes Telefon. Erwachsene mit eigenem Telefon, einschließlich Ehepartner, erstellen ein eigenes Konto.
- Bestehende Konten aus der Zeit vor Einführung von `member_type` können dort `null` haben. Die aktuelle Registrierung verlangt die Auswahl.
- Nutzer können später E-Mail, Passwort und `party_size` auf der Kontoseite ändern.
- Profile besitzen die Rollen `user`, `medical_staff`, `organization_team` und `admin`.
- Neue Konten starten immer als `user`. Nur ein Admin kann über die abgesicherte RPC normale Nutzer zu medizinischem Personal oder Organisationsteam-Mitgliedern machen beziehungsweise wieder auf `user` setzen.
- Adminrollen bleiben geschützt: Sie werden nicht über die App vergeben und bestehende Adminprofile können dort nicht umgestuft werden.
- `medical_staff` und `organization_team` besitzen derzeit dieselben Navigations- und Funktionsrechte wie `user`. Eigene Berechtigungen müssen später ausdrücklich implementiert werden.

### Reise- und Inhaltsfunktionen

- Startseite mit wichtigen Städten und hervorgehobenen Orten.
- Stadtseiten mit lokal gefilterten Orten.
- Native Karte mit `react-native-maps`, Markern, optionaler Standortfreigabe und Übergabe an eine externe Navigation.
- Web-Fallback als schematische Irak-Karte plus Ortsliste; Web importiert kein `react-native-maps`.
- Ortssuche, Inhaltssuche und Suche nach empfohlenen Handlungen.
- Ortsdetails mit Bildern, Quellen, Hinweisen, empfohlenen Handlungen und Merkliste.
- Reader mit abschnittsweiser oder zusammenhängender Darstellung, RTL für Arabisch, Schriftgrößensteuerung, Kopieren, Teilen und Merkliste.
- Sprache Deutsch/Englisch/Arabisch und Theme `system`/`light`/`dark` werden lokal gespeichert.

### Gruppenfunktionen

- Ein Admin kann genau eine verpflichtende Gruppenabfrage mit freiem Fragetext öffnen.
- Während sie aktiv ist, sehen Konten ohne Adminrolle ausschließlich den Check-in und antworten mit Ja oder Nein. Admins bleiben in der App, sehen auf Home einen Hinweis und können die Abfrage ebenfalls beantworten.
- Bei einem Synchronisationsfehler bleibt die App für Konten ohne Adminrolle vorsorglich gesperrt.
- Ein Admin kann eine anonyme Fragerunde öffnen und schließen, Fragen lesen und als erledigt markieren.
- Jede angemeldete Rolle einschließlich Admin kann während einer offenen Runde eine anonyme Frage absenden. Die Tabelle speichert keine Profil- oder User-ID. Nutzer sollten trotzdem keine personenbezogenen Daten in den Freitext schreiben.
- Die Personenübersicht im Adminbereich zeigt nur Name, vertretene Personenzahl und Rolle und kann nach Namen gefiltert werden. Die geschützte Vergabe von Nicht-Admin-Rollen öffnet sich erst über einen Knopf am Personeneintrag; neue Konten besitzen standardmäßig die Rolle `user`.
- Gruppenstatus wird über Supabase Realtime, App-Fokus und zusätzlich alle 15 Sekunden aktualisiert.

## Technischer Stack

- Expo SDK `57` (`expo ~57.0.13`)
- React Native `0.86.2`
- React `19.2.3`
- TypeScript `~6.0.3`, Strict Mode
- Expo Router `~57.0.13` mit typed routes
- Native Tabs aus `expo-router/unstable-native-tabs`
- Supabase JS `^2.112.3` für Auth, Postgres, RPC und Realtime
- AsyncStorage `2.2.0` für lokale Einstellungen
- React Native Maps `1.27.2` und Expo Location
- Expo Image, Clipboard, Linking, Web Browser und SQLite
- SQLite ist installiert und als Expo-Plugin konfiguriert, besitzt aber noch keinen produktiven Content Store.

Node `22.13.x` beziehungsweise eine von React Native 0.86 unterstützte Node-22-Version verwenden. Expo-/React-Native-Pakete mit `npx expo install <paket>` installieren, damit SDK-Versionen ausgerichtet bleiben.

## Projektstart

Der Projektstamm ist das Verzeichnis mit `package.json`.

```bash
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

`app.json` konfiguriert Portrait-Modus, das Scheme `ziyara`, automatische Systemdarstellung, Standortberechtigungen, statischen Web-Export, Expo Router, Splash Screen und SQLite. Änderungen an nativen Abhängigkeiten oder App-Konfiguration können einen neuen Development Build erfordern.

## Architektur und Verzeichnisstruktur

```text
src/app/                    Expo-Router-Routen und Screen-Komposition
src/components/ui/          Wiederverwendbare UI-Primitives
src/components/             App-weite zusammengesetzte Komponenten
src/constants/              Theme-Tokens und Layout-Konstanten
src/data/                   Gebündelte Offline-Daten und Katalogsuche
src/domain/                 App- und Datenbanktypen
src/features/auth/          Supabase-Client, Auth-State, Formulare
src/features/group-check/   Pflichtabfrage für die Reisegruppe
src/features/question-round/Anonyme Fragerunden
src/features/i18n/          UI-Wörterbücher und lokalisierte Fachdaten
src/features/map/           Native Karte und Web-Fallback
src/features/places/        Ortsbilder, Stadtkarte, externe Navigation
src/features/reader/        Darstellung religiöser Textsegmente
src/features/storage/       AsyncStorage-Hooks
src/features/theme/         Gespeicherter Theme-Modus
supabase/migrations/        Versioniertes Postgres-Schema, RLS und RPCs
assets/images/places/       Lokal gebündelte Ortsbilder
docs/IMPLEMENTATION_PLAN.md Ursprüngliche Roadmap, nicht alleinige Ist-Quelle
```

Der Alias `@/*` zeigt laut `tsconfig.json` auf `src/*`; `@/assets/*` zeigt auf `assets/*`.

### Provider-Baum und globaler Zustand

`src/app/_layout.tsx` verschachtelt die Provider in dieser Reihenfolge:

```text
AppI18nProvider
└── AppThemeProvider
    └── AuthProvider
        └── GroupCheckProvider
            └── QuestionRoundProvider
                └── RootNavigation
```

Die Reihenfolge ist relevant: Gruppen- und Fragerunden benötigen den Auth-State; Navigation benötigt alle Zustände. Der Splash Screen wird erst ausgeblendet, wenn Auth und Gruppenabfrage initial geladen wurden.

## Navigation und Zugriffsschutz

| Route | Zugriff | Zweck |
| --- | --- | --- |
| `/login`, `/register` | ohne Session | Anmeldung und Registrierung |
| `/(tabs)` | Session, keine blockierende Gruppenabfrage | Hauptnavigation |
| Tab `/` | wie Tabs | Home, Städte, hervorgehobene Orte, aktive Statusabfrage und Fragerunde |
| Tab `/map` | wie Tabs | native Karte beziehungsweise Web-Fallback |
| Tab `/search` | wie Tabs | Katalogsuche und Filter |
| Tab `/bookmarks` | wie Tabs | lokal gespeicherte Orte und Reader-Inhalte |
| Tab `/settings` | wie Tabs | Theme, Sprache, Reader, Konto, Adminlinks |
| `/city/[city]` | Session, nicht blockiert | Orte einer Stadt |
| `/place/[slug]` | Session, nicht blockiert | Ortsdetail |
| `/reader/[slug]` | Session, nicht blockiert | religiöser Reader |
| `/account` | Session, nicht blockiert | Kontodaten und Personenzahl |
| `/about`, `/sources`, `/disclaimer` | Session, nicht blockiert | Produkt- und Quellenhinweise |
| `/check-in` | jede Session bei aktiver Abfrage; Konten ohne Adminrolle sind blockiert | verpflichtende Ja-/Nein-Antwort |
| `/question-round` | jede Session bei offener Runde | anonyme Frage absenden |
| `/admin` | Admin-Session | Gruppenabfrage, Fragen, Benutzerübersicht |

Neue Hauptscreens unter `src/app` anlegen. Zentrale dynamische URLs über `src/features/navigation/routes.ts` erzeugen und Routenparameter mit `singleRouteParam` normalisieren.

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

`src/data/catalog.ts` durchsucht lokalisierte Orte, Inhalte, Handlungen und deren Quellen. IDs und Slugs sind persistente Referenzen; Änderungen können Bookmarks und Deep Links ungültig machen.

## Internationalisierung und RTL

- Unterstützte Sprachen: `de`, `en`, `ar`.
- UI-Texte liegen derzeit gemeinsam in `src/features/i18n/i18n.tsx`.
- Übersetzungen der Fachdaten liegen in `src/features/i18n/localizedData.ts`.
- Deutsch ist Fallback-Sprache.
- Arabisch setzt `isRTL`, aber einzelne technische Eingaben wie E-Mail bleiben absichtlich LTR.
- Jeder neue nutzerseitige Text muss in allen drei Wörterbüchern ergänzt werden.
- Dynamische Inhaltsdaten nicht als UI-Übersetzung duplizieren; die vorhandenen `localize*`-Funktionen verwenden.

## Lokale Persistenz

`src/features/storage/persistentState.ts` serialisiert JSON über AsyncStorage. Aktuelle Schlüssel:

| Schlüssel | Inhalt |
| --- | --- |
| `ziyara.language` | `de`, `en` oder `ar` |
| `ziyara.theme-mode` | `system`, `light` oder `dark` |
| `ziyara.bookmarks` | Keys wie `place:<slug>` und `content:<slug>` |
| `ziyara.reader.preferences` | arabische Schriftgröße und Zeilenansicht |
| `ziyara.reader.positions` | Scrolloffset je Reader-Slug |

Der Reader speichert Positionen derzeit, stellt sie beim erneuten Öffnen aber noch nicht wieder her. Persistenzfehler werden absichtlich still abgefangen; bei kritischem Zustand ist ein sichtbarer Fehlerzustand erforderlich.

## Supabase-Datenmodell und Sicherheit

`src/domain/database.ts` ist die manuell gepflegte TypeScript-Abbildung des Schemas. Jede Schemaänderung benötigt eine neue vorwärtsgerichtete Migration und die parallele Aktualisierung dieser Typen.

Aktuelle Tabellen:

- `profiles`: App-ID (`int8`), Auth-UUID, Anzeigename, `member_type`, `party_size`, Rolle und Zeitstempel.
- `group_checks`: freie Frage, Admin-Profil und Öffnungs-/Schließzeit.
- `group_check_responses`: genau eine änderbare Ja-/Nein-Antwort pro Profil und Abfrage.
- `question_rounds`: Öffnungs-/Schließzeit einer anonymen Runde.
- `anonymous_questions`: Fragetext und Bearbeitungsstatus ohne Profil-/User-Fremdschlüssel.

Wichtige RPCs:

- `is_admin`
- `admin_list_users`
- `admin_set_user_role`
- `start_group_check`, `close_group_check`, `respond_to_group_check`
- `admin_group_check_results`
- `open_question_round`, `close_question_round`
- `submit_anonymous_question`, `set_anonymous_question_checked`

RLS ist aktiviert. Privilegierte Aktionen laufen über `security definer`-Funktionen, die Admin- beziehungsweise Session-Berechtigungen selbst prüfen. Neue Funktionen müssen einen festen `search_path`, minimale Grants und explizite Auth-Prüfungen besitzen.

Die Migration `20260816000000_add_profile_member_type.sql` ergänzt die Bruder-/Schwester-Zuordnung. Sie übernimmt `member_type` aus validierten Auth-Metadaten und lässt das Feld für ältere Konten `null`, statt eine falsche Zuordnung zu erfinden.

Die Migrationen `20260816010000_add_staff_role_values.sql` und `20260816020000_add_admin_role_assignment.sql` ergänzen medizinisches Personal und Organisationsteam-Mitglieder sowie die serverseitig geschützte Rollenvergabe. Die Enum-Erweiterung und die RPC liegen absichtlich in getrennten Migrationen, damit neue PostgreSQL-Enumwerte erst nach einem Commit verwendet werden.

Die Migration `20260816030000_allow_all_roles_participate.sql` öffnet die Antwort-RPCs für alle angemeldeten Profile. Admins können dadurch an Statusabfragen und anonymen Fragerunden teilnehmen, ohne dass ihre privilegierten App-Bereiche blockiert werden.

Die Migration `20260816040000_minimize_admin_user_list.sql` reduziert `admin_list_users` auf Name, vertretene Personenzahl und Rolle. Nur die für eine Rollenänderung notwendige interne Auth-UUID wird zusätzlich übertragen; E-Mail-Adresse, Profil-ID, Zuordnung und Anmeldedaten werden nicht mehr ausgeliefert.

Der Status des verbundenen Remote-Projekts ist nicht aus dem Repository ableitbar. Vor Annahmen über ausgerollte Migrationen `npx supabase migration list` prüfen. Migrationen nur nach ausdrücklichem Arbeitsauftrag pushen.

## Plattformunterschiede

- Native Karte: `src/features/map/MapScreen.tsx` mit `react-native-maps` und Expo Location.
- Webkarte: `src/features/map/MapScreen.web.tsx` mit schematischer Karte, Browser-Geolocation und Liste.
- Stadtkarte besitzt ebenfalls native und `.web.tsx`-Varianten.
- Platform-spezifische Implementierungen bevorzugen, wenn ein natives Modul Web-Exporte brechen würde.
- Gebündelte Katalogdaten und Bilder sind offline verfügbar. Supabase-Funktionen und Kartenkacheln sind nicht vollständig offlinefähig.

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
npx tsc --noEmit
npm run lint
npx expo install --check
npx expo export --platform web
npx expo-doctor@latest
```

Für Datenbankänderungen zusätzlich:

```bash
npx supabase db lint
npx supabase migration list
```

Es existiert derzeit kein Jest-/E2E-Testsetup und kein `npm test`-Script. Registrierung, Auth-Guards, Adminrechte, Gruppenblockade, Fragerunde, Kartenberechtigung, Offlinekatalog, Persistenz, alle Sprachen und beide Themes müssen deshalb proportional zur Änderung manuell geprüft werden.

## Bekannte Lücken und Risiken

- Sämtliche kuratierten Orts- und religiösen Inhalte benötigen weiterhin qualifizierte Prüfung.
- Ziyarat Ashura enthält bereits Volltext, steht aber noch auf `needs_review` und `pending_rights_review`.
- SQLite ist vorbereitet, aber nicht als Datenspeicher implementiert.
- Gespeicherte Reader-Positionen werden noch nicht wiederhergestellt.
- Native Kartenkacheln sind offline nicht garantiert.
- Es fehlen automatisierte Tests, CI, `eas.json`, finale Store-Metadaten und veröffentlichungsfertige Datenschutz-/Supportseiten.
- `supabase/config.toml` verweist auf `supabase/seed.sql`; diese Datei ist derzeit nicht vorhanden. Einen lokalen `db reset` deshalb nicht ungeprüft voraussetzen.
- Bundle-Identifier und finale Store-/Build-Konfiguration sind in `app.json` noch nicht vollständig.
- Ob lokale Migrationen bereits remote ausgerollt sind, muss gegen das verbundene Supabase-Projekt geprüft werden.

## Definition of Done

Eine Aufgabe ist erst abgeschlossen, wenn die gewünschte Funktion erreichbar ist, TypeScript und Lint bestanden haben oder konkrete Fehler dokumentiert sind, SDK-57-Kompatibilität erhalten bleibt, Backendtypen und Migrationen synchron sind, alle drei Sprachen berücksichtigt wurden, keine ungeprüften religiösen Aussagen hinzugefügt wurden und relevante Plattform-/Zustandsvarianten geprüft sind. Bei Architektur- oder Produktänderungen gehört eine Aktualisierung dieser Datei zum Abschluss.
