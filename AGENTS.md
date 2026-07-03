# Shia Ziyarah Iraq Agent Instructions

This repository is a production-oriented Expo SDK 57 app for Shia ziyarah in Iraq.

Before writing code, read:

- `docs/IMPLEMENTATION_PLAN.md`
- The exact Expo SDK docs for this project: https://docs.expo.dev/versions/v57.0.0/

## Project conventions

- Use Expo SDK 57-compatible APIs and dependencies.
- Install Expo/RN dependencies with `npx expo install <package>` so versions match SDK 57.
- Keep TypeScript strict. Do not silence type errors with `any` unless there is a documented reason.
- Use Expo Router routes under `src/app`.
- Use Expo Router native tabs from `expo-router/unstable-native-tabs` for the primary bottom-tab navigation on iOS and Android.
- Keep web support working where possible; at minimum, `npx expo export --platform web` must pass after navigation changes.
- Keep user-facing app UI in German unless a product term or proper name should intentionally remain transliterated.
- Keep domain types in `src/domain`.
- Keep bundled/offline seed data in `src/data`.
- Keep feature logic in `src/features`.
- Keep reusable UI primitives in `src/components/ui`.
- Prefer platform files such as `.web.tsx` for native/web differences.
- Use calm, accessible UI with large tap targets, light/dark support, and no marketing-style landing page as the primary experience.

## Religious content rules

- Do not invent or paste unverified duas, ziyarat, Arabic text, transliteration, translation, hadith, devotional instructions, or religious claims.
- Use the German source-backed placeholder text: `Volltext wird nach Rechte- und Inhaltsprüfung ergänzt. Quelle siehe unten.`
- Every religious content item needs `sourceReferences` and `verificationStatus`.
- Every recommended act needs a source reference or `verificationStatus: "needs_review"`.
- Keep religious content separate from UI code.
- Conditional places that require verification must not be presented as verified without sources.
- Preserve the visible content disclaimer and source policy.

## Test commands

Run these before handing off meaningful code changes:

- `npx tsc --noEmit`
- `npm run lint`
- `npx expo install --check`
- `npx expo export --platform web`
- `npx expo-doctor@latest`

When native dependencies or app config change, also run a development build or clearly state that it is required.

## Review rules

- Check that SDK 57 versions remain aligned in `package.json` and `package-lock.json`.
- Check that routes do not conflict between route groups and root files.
- Check that web does not import native-only modules such as `react-native-maps`.
- Check that offline seed data remains available without network access.
- Check that placeholders are still used anywhere content has not been verified.
- Check that app-store-facing copy does not overstate religious verification.

## Done means

- The requested phase or task is implemented according to `docs/IMPLEMENTATION_PLAN.md`.
- TypeScript and lint pass, or failures are documented with exact reasons.
- SDK 57 dependency alignment is preserved.
- No unverified religious content was added.
- New UI is reachable through navigation and has empty, loading, denied-permission, or error states where relevant.
- Persistence changes survive an app restart where applicable.
- Native/app-config changes include a note that a new development build is required.
- The final handoff summarizes changed files, checks run, and known risks.
