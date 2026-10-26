---
name: Expo Router focus hooks
description: Navigation context guidance for migrating this app to newer Expo Router versions.
---

Use `useFocusEffect` from `expo-router` in route screens instead of importing it directly from `@react-navigation/native`.

**Why:** During the Expo SDK 57 migration, the direct React Navigation import failed to find the navigation context when screens rendered through Expo Router.

**How to apply:** Keep screen focus hooks aligned with the router package, especially after changing Expo Router or React Navigation versions.
