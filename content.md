## [COMMIT] feat(analytics & targeting): Add error heatmap, 8-sector weakness compass, and targeted reinforcement training

~~~~~act
git_add
src/utils/settings.ts
src/utils/geometry.ts
src/components/SettingsModal.tsx
src/components/AnalyticsModal.tsx
src/views/TrainingView.tsx
src/utils/db.ts
src/views/Dashboard.tsx
src/app.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(analytics & targeting): Add error heatmap, 8-sector weakness compass, and targeted reinforcement training

- Implemented Option 1 (Residual Bias Heatmap): Visualizes user relative clicking offset against the true target B (dx, dy) with concentric error rings and systematic bias calculation.
- Implemented Option 3 (8-Sector Weakness Compass): Divides 0-360° into 8 sectors, calculates accuracy and average pixel error per sector, and highlights weakest visual angles.
- Added Targeted Reinforcement Training Mode: Supports 'auto' (intelligent weak-angle detection) and 'manual' (user-locked sector) training modes with a 70% weighted sampling distribution.
- Added one-click targeting activation directly from the analytics weakness panel and integration in settings & training session views.
~~~~~
