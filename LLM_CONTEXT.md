# Ziyarah – verbindlicher Projektkontext für LLMs

Stand: 26. August 2026

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

Ziyarah ist eine produktionsorientierte Expo-App für eine schiitische Ziyarah-Reise in den Irak. Reisende können wichtige Städte und Orte ohne Anmeldung offline aus einem gebündelten Katalog öffnen, Orte auf einer Karte sehen, Inhalte durchsuchen, Einträge merken und religiöse Texte in einem Reader anzeigen. Eine Supabase-Anmeldung wird erst für Konto- und Gruppenfunktionen benötigt. Die App bietet Deutsch, Englisch und Arabisch, Light/Dark Mode sowie administrative Gruppenfunktionen: verpflichtende Statusabfragen, eine anonyme Fragerunde und eine Benutzerübersicht. Religiöse, historische und ortsbezogene Inhalte bleiben bis zu einer qualifizierten Prüfung sichtbar als `needs_review` markiert.

## Aktueller Funktionsumfang

### Konten und Reisegruppe

- Der lokale Guide einschließlich Home, Karte, Suche, Lesezeichen, Einstellungen, Städten, Orten, Reader, About, Disclaimer und Quellen ist ohne Anmeldung nutzbar.
- Eine Supabase-E-Mail/Passwort-Anmeldung ist für Kontoverwaltung, verpflichtende Gruppenabfragen, anonyme Fragerunden und Administration erforderlich.
- Die Registrierung erfasst Anzeigename, Zuordnung als `brother` oder `sister`, Kontoumfang, E-Mail und Passwort.
- Beim Kontoumfang wird ausdrücklich zwischen „nur ich“ und „ich und Familie ohne eigenes Telefon“ gewählt.
- `party_size` zählt den Kontoinhaber mit. Der Wert `1` bedeutet Einzelkonto; bei Familienauswahl beginnt der Wert bei `2`.
- In ein Familienkonto gehören ausschließlich mitreisende Kinder oder Angehörige ohne eigenes Telefon. Erwachsene mit eigenem Telefon, einschließlich Ehepartner, erstellen ein eigenes Konto.
- Bestehende Konten aus der Zeit vor Einführung von `member_type` können dort `null` haben. Die aktuelle Registrierung verlangt die Auswahl.
- Nutzer können später E-Mail, Passwort und `party_size` auf der Kontoseite ändern.
- „Passwort vergessen“ sendet einen neutral formulierten Recovery-Hinweis und verwendet ausschließlich die dedizierte Route `/reset-password`. Der AuthProvider verarbeitet implizite Recovery-Tokens, PKCE-Codes und `token_hash`-Links; normale Login- oder Signup-Links werden nicht als Passwort-Recovery akzeptiert. Nach erfolgreicher Passwortänderung werden die lokalen Anmeldedaten entfernt und eine erneute Anmeldung verlangt.
- Angemeldete Nutzer können nach einem ausdrücklichen, plattformübergreifenden Bestätigungsdialog nur das eigene Konto unwiderruflich löschen. Der Client übergibt keine Ziel-User-ID. Die lokale Edge Function verifiziert den Bearer-Token serverseitig, leitet daraus die Auth-ID ab und hält den Service-Role-Key vollständig aus dem App-Bundle heraus.
- Profile besitzen die Rollen `user`, `medical_staff`, `organization_team` und `admin`.
- Neue Konten starten immer als `user`. Nur ein Admin kann über die abgesicherte RPC die Rollen `user`, `medical_staff`, `organization_team` und `admin` vergeben.
- Bestehende Adminprofile können umgestuft werden, solange mindestens ein Admin erhalten bleibt. Rollenwechsel sind datenbankseitig serialisiert und werden protokolliert, damit auch bei mehreren gleichzeitig arbeitenden Admins nie versehentlich alle Adminrechte entfernt werden.
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
- Jede angemeldete Rolle einschließlich Admin kann während einer offenen Runde bis zu fünf anonyme Fragen absenden. Die Fragentabelle speichert keine Profil- oder User-ID. Eine getrennte, für Clients nicht lesbare Zähltabelle hält während der offenen Runde nur Profil, Runde und Anzahl fest und wird beim Schließen geleert. Nutzer sollten trotzdem keine personenbezogenen Daten in den Freitext schreiben.
- Die Personenübersicht im Adminbereich zeigt nur Name, vertretene Personenzahl und Rolle und kann nach Namen gefiltert werden. Die Vergabe aller Rollen einschließlich `admin` öffnet sich erst über einen Knopf am Personeneintrag; neue Konten besitzen standardmäßig die Rolle `user`.
- Gruppenstatus wird primär über Supabase Realtime und beim App-Fokus aktualisiert. Als gestaffelter Ausfallschutz läuft die Pflichtabfrage etwa alle 60–90 Sekunden und die Fragerunde alle 120–150 Sekunden. Parallele Antworten dürfen ältere Ergebnisse nicht mehr über neuere schreiben.
- Gruppencheck-Refreshes und -Mutationen teilen eine monotone State-Version. Jede Mutation invalidiert ältere Reads, hält nach erfolgreicher RPC-Antwort einen optimistischen Zustand sichtbar und startet anschließend einen autoritativen Refresh. Die Adminauswertung führt alle aktuellen Profile auf und trennt `true`, `false` und `null` ausdrücklich in Ja, Nein und Noch offen; Account-Anzahl und die über `party_size` repräsentierte Personenzahl werden separat ausgewiesen.

## Technischer Stack

- Expo SDK `57` (`expo ~57.0.17`)
- React Native `0.86.3`
- React `19.2.3`
- TypeScript `~6.0.3`, Strict Mode
- Expo Router `~57.0.17` mit typed routes
- Native Tabs aus `expo-router/unstable-native-tabs`
- Supabase JS `^2.112.3` für Auth, Postgres, RPC und Realtime
- AsyncStorage `2.2.0` für lokale Einstellungen
- React Native Maps `1.27.2` und Expo Location
- Expo Image, Clipboard und Linking
- Jest/Jest Expo für Katalog- und Integritätstests

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
src/features/group-check/   Pflichtabfrage für die Reisegruppe
src/features/question-round/Anonyme Fragerunden
src/features/i18n/          UI-Wörterbücher und lokalisierte Fachdaten
src/features/map/           Native Karte und Web-Fallback
src/features/network/       Abbruch und Fehlerklassifizierung für Supabase-Lesezugriffe
src/features/places/        Ortsbilder, Stadtkarte, externe Navigation
src/features/reader/        Darstellung religiöser Textsegmente
src/features/storage/       AsyncStorage-Hooks
src/features/theme/         Gespeicherter Theme-Modus
supabase/migrations/        Versioniertes Postgres-Schema, RLS und RPCs
supabase/functions/         Lokal implementierte, nicht automatisch deployte Edge Functions
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
            └── GroupCheckProvider
                └── QuestionRoundProvider
                    └── RootNavigation
```

Die Reihenfolge ist relevant: Gruppen- und Fragerunden benötigen den Auth-State. Der Splash Screen wartet nur auf die lokal gespeicherten Sprach- und Themezustände; Auth-, Profil-, Gruppen- und Fragerundenabfragen dürfen den öffentlichen Guide nicht blockieren. Ohne Session überspringen die privaten Provider Tabellenabfragen und Realtime-Kanäle vollständig. Bei einer vorhandenen Session blockiert nur das initiale Profil-/Pflichtabfrage-Laden beziehungsweise ein echter Benutzerwechsel die geschützte Navigation. Ein Profilfehler bleibt als wiederholbarer, nicht blockierender Hinweis sichtbar; Rollen- und Gruppenrechte werden dadurch nicht erweitert.

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
| Tab `/` | wie Tabs | Home, Städte, hervorgehobene Orte, aktive Statusabfrage und Fragerunde |
| Tab `/map` | wie Tabs | native Karte beziehungsweise Web-Fallback |
| Tab `/search` | wie Tabs | Katalogsuche und Filter |
| Tab `/bookmarks` | wie Tabs | lokal gespeicherte Orte und Reader-Inhalte |
| Tab `/settings` | wie Tabs | Theme, Sprache und Reader; Konto-/Adminaktionen fordern eine Anmeldung an |
| `/city/[city]` | öffentlich | Orte einer Stadt |
| `/place/[slug]` | öffentlich | Ortsdetail |
| `/reader/[slug]` | öffentlich | religiöser Reader |
| `/account` | Session, nicht blockiert | Kontodaten und Personenzahl |
| `/about`, `/sources`, `/disclaimer` | öffentlich | Produkt- und Quellenhinweise |
| `/check-in` | Session; Konten ohne Adminrolle sind bei aktiver oder unsicherer Abfrage blockiert | verpflichtende Ja-/Nein-Antwort |
| `/question-round` | jede Session bei offener Runde | anonyme Frage absenden |
| `/admin` | Admin-Session | Gruppenabfrage, Fragen, Benutzerübersicht |

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

Der Reader speichert und restauriert Positionen beim erneuten Öffnen. Nichtkritische lokale Speicherfehler fallen auf den In-Memory-Zustand zurück; serverseitige Auth-, Profil- und Pflichtabfragefehler besitzen sichtbare beziehungsweise fail-closed Zustände.

Alle Datenbank-/Read-RPC-Lesezugriffe laufen über `src/features/network/supabase-read.ts`. Der Wrapper setzt mit der vom installierten Supabase-SDK unterstützten `abortSignal`-Methode einen Timeout von 10 Sekunden und klassifiziert Fehlschläge als `offline`, `timeout` oder `server`. Die UI zeigt diese Zustände getrennt von laufendem Laden an. Schreib-RPCs bleiben davon getrennt, damit ein lokaler Timeout nicht fälschlich behauptet, eine möglicherweise serverseitig ausgeführte Mutation sei abgebrochen worden.

## Supabase-Datenmodell und Sicherheit

`src/domain/database.ts` ist die manuell gepflegte TypeScript-Abbildung des Schemas. Jede Schemaänderung benötigt eine neue vorwärtsgerichtete Migration und die parallele Aktualisierung dieser Typen.

Aktuelle Tabellen:

- `profiles`: App-ID (`int8`), Auth-UUID, Anzeigename, `member_type`, `party_size`, Rolle und Zeitstempel.
- `group_checks`: freie Frage, Admin-Profil und Öffnungs-/Schließzeit.
- `group_check_responses`: genau eine änderbare Ja-/Nein-Antwort pro Profil und Abfrage.
- `question_rounds`: Öffnungs-/Schließzeit einer anonymen Runde.
- `anonymous_questions`: Fragetext und Bearbeitungsstatus ohne Profil-/User-Fremdschlüssel.
- `question_submission_limits`: temporäre, clientseitig nicht lesbare Anzahl je Profil und offener Runde; ohne Fragetext, Frage-ID oder Zeitstempel.
- `role_assignment_audit`: clientseitig nicht lesbare Nachvollziehbarkeit tatsächlicher Rollenänderungen durch mehrere Admins.

Wichtige RPCs:

- `is_admin`
- `admin_list_users`
- `admin_set_user_role`
- `can_delete_account` (nur `service_role`; enger Vorabcheck für die Edge Function)
- `start_group_check`, `close_group_check`, `respond_to_group_check`
- `admin_group_check_results`
- `open_question_round`, `close_question_round`
- `submit_anonymous_question`, `set_anonymous_question_checked`

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

Die Migration `20260826021000_add_account_deletion_precheck.sql` ergänzt den ausschließlich für `service_role` ausführbaren Vorabcheck `can_delete_account`. Er liefert der Edge Function eine verständliche Last-Admin-Ablehnung; der Trigger auf `auth.users` bleibt wegen möglicher Parallelität die endgültige transaktionale Sicherheitsinstanz. `supabase/functions/delete-account` akzeptiert nur `POST` mit leerem Body, prüft den Access Token über `auth.getUser(accessToken)` und ruft `auth.admin.deleteUser` ausschließlich mit der verifizierten ID auf. Privilegierte Schlüssel werden nur aus der Edge-Function-Umgebung gelesen.

Am 17. August 2026 waren die damaligen Migrationen bis `20260817000000` im verknüpften Remote-Projekt ausgerollt; `db lint --linked --level warning` meldete danach keine Schemafehler. Die lokalen Migrationen `20260826000000_expand_group_check_results.sql`, `20260826010000_drop_unused_group_check_answer_index.sql`, `20260826020000_protect_account_deletion.sql` und `20260826021000_add_account_deletion_precheck.sql` wurden nicht remote ausgerollt; auch `delete-account` wurde nicht deployt und die Remote-Redirect-Allowlist wurde nicht verändert. Am 26. August 2026 war die Projektverknüpfung lokal vorhanden, aber kein autorisierter Supabase-CLI-Zugriffstoken; deshalb wurde der Remote-Migrationsstand nicht erneut abgefragt. Dieser Zustand kann sich ändern; vor späteren Annahmen mit autorisiertem Zugriff `npx supabase migration list --linked` prüfen. Migrationen, Functions und Auth-Redirects nur innerhalb eines ausdrücklich beauftragten Implementierungs- oder Deployment-Schritts remote ändern.

## Kapazität für die Reisegruppe

- Zielgröße sind ungefähr 100 Konten zuzüglich mehrerer Admin-/Mitarbeitergeräte.
- Der Supabase-Client teilt mehrere Realtime-Kanäle über eine Verbindung. Aktuelle Tarifgrenzen trotzdem vor der Reise im Dashboard gegen die erwarteten gleichzeitig aktiven Geräte prüfen.
- Durch die gestaffelten Fallback-Intervalle entstehen bei 100 dauerhaft aktiven Clients grob 120 Fallback-Leseabfragen pro Minute ohne aktive Pflichtabfrage und etwa 200 pro Minute mit aktiver Pflichtabfrage; Realtime und App-Fokus sind der Primärweg.
- Antwortwellen werden in den Adminpanels 250 ms gebündelt. Die Benutzer-RPC wird in 200er-Seiten geladen, die Fragenansicht zeigt maximal 50 weitere Einträge pro Schritt.
- Ein realer Lasttest mit dem gewählten Supabase-Tarif, Reise-WLAN/Mobilfunk und den Zielgeräten bleibt vor Freigabe erforderlich.

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

`npm test` führt derzeit 80 Jest-Tests in 15 Suites aus. Abgedeckt sind unter anderem AuthContext, GroupCheckContext, QuestionRoundContext, Persistenz-Races und Speicherfehler, der gerenderte `RequireAuth`-Guard, der öffentliche Providerstart ohne Supabase-Zugriff, Recovery-/Account-Löschverträge sowie die globale Error Boundary. `npm run test:coverage` beziehungsweise `npm run validate` erzwingt mindestens 50 % globale Line Coverage und jeweils 80 % für die drei Kernkontexte. Der lokale Stand vom 26. August 2026 liegt bei 85,69 % global, 90,82 % AuthContext, 94,53 % GroupCheckContext und 95,65 % QuestionRoundContext.

Unter `supabase/tests/database` prüfen zusätzlich 60 pgTAP-Assertions die RLS-/RPC-/Parallelitätsregeln sowie Cascades, Audit-Anonymisierung, Function-Grants und konkurrierende Account-Löschungen. `npm run test:e2e` führt sechs serielle Playwright-Smokes mit synthetischen Konten gegen die lokale Expo-/Supabase-/Mailpit-Umgebung aus: Registrierung/Login, Recovery-Link, öffentlicher Guide bei abgebrochenen Supabase-Requests, Gruppencheck, anonyme Fragerunde und Rollenänderung. `.github/workflows/ci.yml` führt bei Pushes und Pull Requests App-Validierung samt Coverage, Expo Doctor, getrennte Web-/iOS-/Android-Exports und einen Critical-Audit-Gate aus; der Datenbank-Job startet das lokale Schema aus Migrationen, prüft den 401-Auth-Gate der Edge Function, führt DB-Lint und SQL-Tests sowie danach die Playwright-Smokes aus. Native Gerätetests fehlen weiterhin; Kartenberechtigung, reale Deep Links in signierten Builds, alle Sprachen, beide Themes und dynamische Schrift müssen proportional zur Änderung manuell geprüft werden.

## Bekannte Lücken und Risiken

- Sämtliche kuratierten Orts- und religiösen Inhalte benötigen weiterhin qualifizierte Prüfung.
- Ziyarat Ashura enthält bereits Volltext, steht aber noch auf `needs_review` und `pending_rights_review`.
- Native Kartenkacheln sind offline nicht garantiert.
- Finale Store-Metadaten und veröffentlichungsfertige Datenschutz-/Supportseiten fehlen. Externes Crash-Reporting ist nicht integriert.
- App-Icon und Splash-Grafik sind noch Expo-Startergrafiken und müssen vor einem Store-Release durch freigegebene Markenassets ersetzt werden.
- Bundle-Identifier und finale Store-/Build-Konfiguration sind in `app.json` noch nicht vollständig.
- Die Recovery- und Account-Löschpfade sind lokal vollständig implementiert und getestet, benötigen vor einem Release aber noch die ausdrücklich freizugebende Remote-Migration, Function-Bereitstellung und Auth-Redirect-Allowlist sowie einen Test auf einem signierten nativen Build.
- Arabisch richtet Texte aus, schaltet aber die gesamte native Layoutreihenfolge noch nicht über `I18nManager` auf RTL um.
- Der vollständige npm-Audit meldete am 26. August 2026 keine Critical-, aber 4 High- und 11 Moderate-Einträge. Die High-Einträge hängen an der Expo-/Metro-Buildkette und deren `image-size`-Parsern; der vollständige Moderate-Fix würde Expo beziehungsweise `expo-splash-screen` inkompatibel herabstufen. Auf kompatible Expo-/Metro-Patches warten und keinen `npm audit fix --force` ausführen.
- Es fehlen weiterhin native Store-Builds und der reale Last-/Netzwerktest mit etwa 100 Geräten; die vorhandenen Playwright-Smokes ersetzen keine signierten iOS-/Android-Gerätetests.

## Definition of Done

Eine Aufgabe ist erst abgeschlossen, wenn die gewünschte Funktion erreichbar ist, TypeScript und Lint bestanden haben oder konkrete Fehler dokumentiert sind, SDK-57-Kompatibilität erhalten bleibt, Backendtypen und Migrationen synchron sind, alle drei Sprachen berücksichtigt wurden, keine ungeprüften religiösen Aussagen hinzugefügt wurden und relevante Plattform-/Zustandsvarianten geprüft sind. Bei Architektur- oder Produktänderungen gehört eine Aktualisierung dieser Datei zum Abschluss.
