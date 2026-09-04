# [COMMIT] fix(i18n): Fix language persistence and IDB state synchronization

~~~~~act
git_add
src/core/i18n.ts
src/storage/settings.ts
src/stores/settingsStore.ts
src/main.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
fix(i18n): Fix language persistence and IDB state synchronization

- Removed obsolete and failing localStorage checks from getSavedLocale in i18n.ts.
- Cleaned up redundant locale-related localStorage bypass caching from settings.ts.
- Synchronized i18n.setLocale inside initSettingsStore and updateGlobalSettings within settingsStore.ts.
- Updated bootstrap routine in main.tsx to load settings from IndexedDB and apply the saved locale to the i18n instance before mounting the Preact application.
~~~~~
