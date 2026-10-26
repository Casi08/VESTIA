---
name: Expo FileSystem paths
description: Modern Expo FileSystem cache-path and download API guidance.
---

Use `Paths.cache` and `File.downloadFileAsync` from the modern Expo FileSystem API for temporary native downloads. The package root may not expose legacy path properties such as `cacheDirectory`; import legacy APIs explicitly when they are required.

**Why:** The package entry point can use the class-based API, so assuming legacy root-level paths can fail TypeScript checks.

**How to apply:** Before adding a native file operation, inspect the installed package exports and use `File`/`Paths` consistently; clean up temporary downloads after use.
