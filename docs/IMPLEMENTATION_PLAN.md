# Shia Ziyarah Iraq Implementation Plan

This app is a production-ready mobile guide for Shia ziyarah in Iraq, built with Expo SDK 57, React Native, Expo Router, and TypeScript.

Religious-content rule: do not write unverified duas, ziyarat, Arabic text, transliteration, translation, hadith, devotional instructions, or religious claims. Use placeholders, source fields, and `needs_review` status until qualified review is complete.

## Phase 1: Architecture and project setup

Files to create or modify:

- `package.json`
- `package-lock.json`
- `app.json`
- `tsconfig.json`
- `AGENTS.md`
- `README.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `src/app/_layout.tsx`
- `src/constants/theme.ts`

Risks:

- SDK/package drift if dependencies are manually pinned instead of installed with `npx expo install`.
- Expo SDK 57 requires a supported Node engine range. Node `23.x` can trigger engine warnings even when commands run.
- App config changes for location and maps may require a new development build.

Acceptance criteria:

- Project uses Expo SDK 57-compatible packages.
- App name and config reflect `Shia Ziyarah Iraq`.
- Expo Router, TypeScript strict mode, and path aliases work.
- Repo instructions define conventions, review rules, test commands, and done criteria.

Tests/checks:

- `node -v`
- `npm install`
- `npx expo install --check`
- `npx tsc --noEmit`
- `npm run lint`
- `npx expo-doctor@latest`

## Phase 2: Data models and seed content structure

Files to create or modify:

- `src/domain/types.ts`
- `src/data/places.ts`
- `src/data/recommendedActs.ts`
- `src/data/religiousContent.ts`
- `src/data/sourceReferences.ts`
- `src/data/catalog.ts`
- Future: `src/data/contentReview.ts`
- Future: `src/data/candidatePlaces.ts`

Risks:

- Accidentally presenting unverified religious content as authoritative.
- Mixing UI copy with religious content, making review and replacement difficult.
- Coordinates, opening hours, accessibility notes, and historical notes may be inaccurate without source review.
- Conditional places, such as sites listed only if verified, should not be seeded as verified without sources.

Acceptance criteria:

- Strong TypeScript models exist for `Place`, `RecommendedAct`, `ReligiousContent`, `SourceReference`, and `VerificationStatus`.
- Seed content is local and offline-available.
- Religious content uses placeholder text and source/reference fields until reviewed.
- Every recommended act is either sourced or marked `needs_review`.
- Conditional places are omitted or clearly marked as candidates until verified.

Tests/checks:

- `npx tsc --noEmit`
- Unit tests for catalog lookup and search once test tooling is added.
- Manual audit: no fabricated Arabic, transliteration, translation, hadith, or devotional claims.
- Manual audit: each content item has `verificationStatus` and `sourceReferences`.

## Phase 3: Navigation and base UI

Files to create or modify:

- `src/app/_layout.tsx`
- `src/app/(tabs)/_layout.tsx`
- `src/app/(tabs)/index.tsx`
- `src/app/(tabs)/map.tsx`
- `src/app/(tabs)/search.tsx`
- `src/app/(tabs)/bookmarks.tsx`
- `src/app/(tabs)/settings.tsx`
- `src/app/about.tsx`
- `src/app/sources.tsx`
- `src/app/disclaimer.tsx`
- `src/components/ui/*`
- `src/components/themed-text.tsx`
- `src/constants/theme.ts`

Risks:

- Tab and stack route conflicts if both root and grouped routes map to the same path.
- UI can become marketing-like instead of a usable app surface.
- Text may overflow in compact buttons, cards, or RTL contexts.
- Palette can become too one-note or fail contrast requirements.

Acceptance criteria:

- Main tabs exist: Home, Map, Search, Bookmarks, Settings.
- Stack screens exist: Place Detail, Reader, About, Sources, Disclaimer.
- Base UI includes accessible buttons, cards, sections, status badges, and light/dark themes.
- First screen is useful app functionality, not a landing page.
- Disclaimer is reachable from the UI.

Tests/checks:

- `npx tsc --noEmit`
- `npm run lint`
- Manual navigation through every route on iOS/Android/web.
- Screenshot review for mobile and desktop web widths.
- Accessibility checks for tap targets, labels, contrast, and dynamic text sizes.

## Phase 4: Map and place detail experience

Files to create or modify:

- `src/features/map/MapScreen.tsx`
- `src/features/map/MapScreen.web.tsx`
- `src/app/place/[slug].tsx`
- `src/features/places/openNavigation.ts`
- `app.json`
- `src/data/places.ts`
- `src/data/recommendedActs.ts`

Risks:

- `react-native-maps` does not provide the same experience on web, so a platform-specific fallback is needed.
- Location permission denial must not block place markers.
- Map tile availability can fail offline even though place data is offline.
- Native map/location changes require a development build, not just Expo Go in all cases.
- Navigation URLs vary by platform.

Acceptance criteria:

- Native map shows Iraq-centered markers for seeded places.
- Web shows a functional fallback map/list without importing native-only map modules.
- Users can request location, see denied-permission messaging, and still browse places.
- Tapping markers opens a preview with place name, city, description, details, navigation, and acts actions.
- Place detail shows metadata, recommended acts, visiting notes, accessibility notes, and review status.

Tests/checks:

- `npx tsc --noEmit`
- `npm run lint`
- Manual test: permission granted.
- Manual test: permission denied.
- Manual test: airplane/offline mode still shows local place data.
- Manual test: navigation URL opens correctly on iOS, Android, and web.

## Phase 5: Dua/Ziyarah reader

Files to create or modify:

- `src/app/reader/[slug].tsx`
- `src/data/religiousContent.ts`
- `src/features/storage/useReaderPreferences.ts`
- `src/features/storage/useReadingPosition.ts`
- `src/components/ui/button.tsx`
- `src/constants/theme.ts`

Risks:

- Unverified religious text could accidentally be introduced.
- Arabic text layout may be wrong without RTL and typography checks.
- Copy/share can expose placeholder content without enough context.
- Reading-position saves can be too frequent and hurt performance.

Acceptance criteria:

- Reader shows title, type, review status, Arabic block, transliteration, translation, notes, and sources.
- Placeholder text is visibly used where verified content is unavailable.
- Arabic block uses RTL writing direction and adjustable font size.
- Bookmark, copy, share, and reading-position persistence are implemented.
- Source references are shown or clearly marked pending review.

Tests/checks:

- `npx tsc --noEmit`
- `npm run lint`
- Manual test: font size increase/decrease.
- Manual test: copy and share actions.
- Manual test: bookmark reader entry.
- Manual audit: no unverified religious content beyond approved placeholders.

## Phase 6: Search and bookmarks

Files to create or modify:

- `src/app/(tabs)/search.tsx`
- `src/app/(tabs)/bookmarks.tsx`
- `src/data/catalog.ts`
- `src/features/storage/useBookmarks.ts`
- Future: `src/features/search/searchIndex.ts`

Risks:

- Search may not normalize Arabic, English, and transliteration well enough.
- Bookmarks can become stale if slugs change.
- Search results for recommended acts need a route target even when content is pending.

Acceptance criteria:

- Search covers places, cities, content, and recommended acts.
- Search supports filters for all, places, content, and acts.
- Results include verification status.
- Bookmarks persist locally for places and content.
- Empty states are clear and useful.

Tests/checks:

- `npx tsc --noEmit`
- Unit tests for `searchCatalog` once test tooling is added.
- Manual test: search by city, alternative name, content type, and act type.
- Manual test: add, revisit, and clear bookmarks.

## Phase 7: Offline persistence

Files to create or modify:

- `src/features/storage/persistentState.ts`
- `src/features/storage/useBookmarks.ts`
- `src/features/storage/useReaderPreferences.ts`
- `src/features/storage/useReadingPosition.ts`
- Future: `src/features/storage/sqliteContentStore.ts`
- Future: `src/features/storage/contentMigrations.ts`
- `app.json`

Risks:

- AsyncStorage is enough for preferences/bookmarks, but larger reviewed content may need SQLite migrations.
- Persisted schema changes can break older installs.
- Offline map tiles are not guaranteed unless a tile strategy is added.

Acceptance criteria:

- Seeded places and placeholder religious content are bundled locally.
- Bookmarks, reader preferences, and reading positions persist locally.
- SQLite should only be added once structured content has a concrete schema and migration need.
- Offline UI states explain what is available without internet.

Tests/checks:

- `npx tsc --noEmit`
- Manual test: restart app and verify bookmarks/preferences remain.
- Manual test: offline mode with bundled data.
- Future migration tests for SQLite schema changes.

## Phase 8: i18n and RTL support

Files to create or modify:

- Future: `src/i18n/index.ts`
- Future: `src/i18n/locales/en.ts`
- Future: `src/i18n/locales/ar.ts`
- Future: `src/features/reader/ReaderTextBlock.tsx`
- `src/app/reader/[slug].tsx`
- `src/components/themed-text.tsx`
- `src/constants/theme.ts`

Risks:

- Arabic and English layout can conflict in mixed-direction text.
- Transliteration search needs normalization beyond simple lowercase matching.
- Font fallback may render Arabic poorly on some devices.
- App-wide RTL requires careful layout testing.

Acceptance criteria:

- Reader supports RTL Arabic text blocks.
- UI strings are ready to move out of components into locale files.
- Search strategy accounts for Arabic, English, and transliteration fields.
- Typography choices work for Arabic readability.

Tests/checks:

- Manual Arabic rendering review on iOS and Android.
- Manual dynamic type checks.
- Manual RTL layout pass once app-level locale switching is introduced.
- Future unit tests for search normalization.

## Phase 9: Testing and QA

Files to create or modify:

- `package.json` with the Expo-supported Jest preset
- `src/data/catalog.test.ts`
- `e2e/phase7-smoke.spec.ts`
- `playwright.config.ts`
- `src/features/errors/AppErrorBoundary.tsx`
- `.github/workflows/ci.yml`
- Existing app/data files as test coverage grows

Risks:

- Production behavior can regress without automated coverage.
- Native map/location behavior is hard to test only with unit tests.
- Religious content review needs human workflow checks in addition to automated checks.

Acceptance criteria:

- TypeScript and lint pass.
- Jest covers catalog logic, AuthContext, BusManagementContext, GroupCheckContext, QuestionRoundContext, persistent state, rendered route guards, offline provider startup and the global Error Boundary.
- Coverage gates require at least 50% global line coverage and 80% per auth/bus-management/group-check/question-round context.
- Seven local Playwright full-stack smokes cover registration/login, password recovery, the public offline guide, group check, question round, bus management and role changes.
- Unhandled React render errors show a local fallback without an external monitoring dependency.
- Manual QA checklist covers navigation, map, permissions, reader, search, bookmarks, offline behavior, dark mode, and accessibility.
- CI runs required checks before merging.

Tests/checks:

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `npm run test:coverage`
- `npm run test:e2e` with local Supabase and Chrome.
- Manual device QA on iOS and Android.

## Phase 10: App-store readiness

Files to create or modify:

- `app.json`
- `assets/images/*`
- `eas.json`
- Future: `store/metadata/*`
- Future: `privacy-policy.md`
- Future: `support.md`
- Future: `src/app/privacy.tsx`

Risks:

- Current starter assets are not final brand assets.
- Location permission copy must be accurate and minimal.
- Privacy disclosures must match real data collection.
- App-store screenshots must not imply verified religious content that is still pending review.
- Native dependency changes require development and production rebuilds.

Acceptance criteria:

- Final app icon, adaptive icon, splash screen, and brand assets are in place.
- iOS and Android bundle identifiers are configured.
- Privacy policy, support URL, content disclaimer, and source policy are ready.
- EAS Build profiles exist for development, preview, and production.
- Store metadata accurately describes placeholder/review status where relevant.

Tests/checks:

- `npx expo-doctor@latest`
- `eas build --profile preview --platform ios`
- `eas build --profile preview --platform android`
- Manual app-store metadata review.
- Manual TestFlight/internal testing pass.

## Phase 11: Bus management

Files to create or modify:

- `src/app/bus.tsx`
- `src/features/bus-management/*`
- `src/app/admin.tsx`
- `src/domain/database.ts`
- `supabase/migrations/20260827000000_add_bus_management.sql`
- `supabase/tests/database/phase8_bus_management*.test.sql`
- `e2e/phase7-smoke.spec.ts`

Acceptance criteria:

- Admins create one active trip, named buses, physical participant IDs and account links.
- One account may control multiple physical participant IDs; unlinked IDs remain visible to trip admins.
- Participants report `on_way`, `boarded` or `problem` only for their linked IDs.
- Admins see not-confirmed participants and may set any participant status manually.
- Realtime, focus and fallback refreshes retain the latest optimistic state and ignore stale reads.
- An expired authenticated session is refreshed once before retrying a participant or admin status mutation; final errors refresh the authoritative state and remain actionable in the UI.
- Concurrent response and close operations produce a fully ordered result without post-close writes.
- The public offline guide remains independent from Supabase and the bus route remains session-protected.

Tests/checks:

- Jest context/state and protected-route tests.
- Fresh local migration rebuild, DB lint and pgTAP RLS/RPC/concurrency tests.
- Playwright full-stack smoke from trip creation through boarding confirmation and close.
- Web, iOS and Android JavaScript exports.
