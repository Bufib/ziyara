# Notfallmeldungen

Die geschützte Route `/emergency` speichert eine Hilfeanfrage zuerst dauerhaft und stößt danach Push an. Der Absender wählt `medical` oder `travel` und muss seinen Aufenthaltsort als verständlichen Text angeben. Nach ausdrücklicher Vordergrundfreigabe kann zusätzlich freiwillig eine einzelne Geräteposition gespeichert werden; es gibt kein Live- oder Hintergrundtracking. Sind für das passende Team Personen im Notfalldienst eingeteilt, erhalten nur diese Personen die dauerhafte Meldung und den Push-Versuch. Ohne Diensteinteilung wird als Sicherheitsfallback das gesamte passende Team benachrichtigt.

Das rollenbasierte `/emergency-dashboard` ist über die Einstellungen erreichbar:

- Admins sehen alle Notfallmeldungen.
- `medical_staff` sieht ausschließlich medizinische Notfälle.
- `organization_team` sieht die sonstigen Hilfeanfragen an das Organisationsteam.
- Admins können in der Benutzerverwaltung Teammitglieder zum Dienst einteilen oder den Dienst beenden. Eine neue Einteilung wird dauerhaft im persönlichen Dashboard gespeichert und zusätzlich per Push versucht.

Die Sichtbereiche und Diensteinteilungen werden durch Datenbank-RPCs und RLS geschützt; die UI-Anzeige allein ist keine Berechtigungsgrenze. Ein Rollenwechsel beendet eine bestehende Diensteinteilung automatisch.

## Produktiv bereitstellen

1. Migrationen `20260903000000_add_emergency_requests.sql`, `20260904000000_add_emergency_dashboard_and_duty.sql` und `20260904010000_require_emergency_location_label.sql` auf das Supabase-Projekt anwenden. Vor einem pauschalen `supabase db push` mit `npx supabase migration list --linked` und `npx supabase db push --linked --dry-run` prüfen, welche Migrationen im selben Lauf angewandt würden.
2. Edge Functions `dispatch-emergency-alert` und `dispatch-emergency-duty` bereitstellen. Beide prüfen den Bearer-Token selbst; `verify_jwt = false` deaktiviert nur den vorgeschalteten Legacy-Gateway-Check.
3. Eine EAS-Projekt-ID und gültige Expo-Push-Credentials konfigurieren. Bei Push-Security kann zusätzlich das bereits vom Generalalarm verwendete `EXPO_ACCESS_TOKEN` gesetzt werden.
4. Einen neuen nativen Build erstellen. Der iOS-Berechtigungstext und der Android-Benachrichtigungskanal sind Teil des App-Binaries.
5. Mit je einem echten Konto der Rollen `medical_staff` und `organization_team` Push aktivieren, den Dienst durch einen Admin zuweisen und beide Zielwege auf einem echten iOS-/Android-Gerät prüfen.

Die eigentliche Bereitstellung erfolgt aus dem verknüpften Projekt mit:

```bash
npx supabase migration list --linked
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase functions deploy dispatch-emergency-alert --no-verify-jwt
npx supabase functions deploy dispatch-emergency-duty --no-verify-jwt
```

Push ist bestmöglich: Expo-Ticket-Annahme bedeutet nicht garantierte Anzeige oder Gerätezustellung. Bei fehlender Berechtigung, ausgeschaltetem Gerät, Fokus-/Lautlosmodus, Expo Go, Web oder einem Dispatcherfehler bleibt die Meldung weiterhin im geschützten Postfach abrufbar. Anliegen und genaue Koordinaten werden nicht im Pushtext angezeigt.
