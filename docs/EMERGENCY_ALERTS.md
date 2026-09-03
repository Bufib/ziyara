# Notfallmeldungen

Die geschützte Route `/emergency` speichert eine Hilfeanfrage zuerst dauerhaft und stößt danach Push an. Der Absender wählt `medical` oder `travel`; die RPC ordnet alle zu diesem Zeitpunkt vorhandenen Profile mit `medical_staff` beziehungsweise `organization_team` als Empfänger zu. Optional werden ein frei beschriebener Ort und nach ausdrücklicher Vordergrundfreigabe eine einzelne Geräteposition gespeichert. Es gibt kein Live- oder Hintergrundtracking.

## Produktiv bereitstellen

1. Migration `20260903000000_add_emergency_requests.sql` auf das Supabase-Projekt anwenden. Vor einem pauschalen `supabase db push` die bereits zuvor ausstehenden Migrationen `20260830010000` und `20260902000000` mitprüfen, weil sie sonst im selben Lauf ebenfalls angewandt werden.
2. Edge Function `dispatch-emergency-alert` bereitstellen. Sie prüft den Bearer-Token selbst; `verify_jwt = false` deaktiviert nur den vorgeschalteten Legacy-Gateway-Check.
3. Eine EAS-Projekt-ID und gültige Expo-Push-Credentials konfigurieren. Bei Push-Security kann zusätzlich das bereits vom Generalalarm verwendete `EXPO_ACCESS_TOKEN` gesetzt werden.
4. Einen neuen nativen Build erstellen. Der iOS-Berechtigungstext und der Android-Benachrichtigungskanal sind Teil des App-Binaries.
5. Mit je einem echten Konto der Rollen `medical_staff` und `organization_team` Push aktivieren und beide Zielwege auf einem echten iOS-/Android-Gerät prüfen.

Push ist bestmöglich: Expo-Ticket-Annahme bedeutet nicht garantierte Anzeige oder Gerätezustellung. Bei fehlender Berechtigung, ausgeschaltetem Gerät, Fokus-/Lautlosmodus, Expo Go, Web oder einem Dispatcherfehler bleibt die Meldung weiterhin im geschützten Postfach abrufbar. Anliegen und genaue Koordinaten werden nicht im Pushtext angezeigt.
