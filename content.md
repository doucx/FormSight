## [COMMIT] refactor(architecture): Implement TrainingShell & DashboardShell to solve DRY and add idle protection

~~~~~act
git_add
src/components/common/IdlePauseOverlay.tsx
src/components/training/TrainingShell.tsx
src/hooks/useTodayStats.ts
src/components/dashboard/ModeCard.tsx
src/components/dashboard/DashboardShell.tsx
src/views/TrainingView.tsx
src/views/ColorTrainingView.tsx
src/views/RelativeColorTrainingView.tsx
src/views/Dashboard.tsx
src/views/ColorDashboard.tsx
src/views/RelativeColorDashboard.tsx
src/hooks/useTrainingSession.ts
src/components/GlobalSettingsModal.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(architecture): Implement TrainingShell & DashboardShell to solve DRY and add idle protection

- **Idle & Blur Protection**: Added `idleTimeout` protection, page visibility detection (`visibilitychange`), and window blur handling (`blur`) in `useTrainingSession` with automatic time compensation.
- **Visual Blur Mask**: Created `<IdlePauseOverlay>` component providing a Backdrop Blur mask when training pauses due to inactivity or window switching.
- **Global Settings Integration**: Added idle timeout duration selector in `GlobalSettingsModal`.
- **DRY Architecture Refactoring**:
  - Extracted `<TrainingShell>` to consolidate headers, idle overlay, manual navigation bars, and summary modals across all training views.
  - Extracted `<DashboardShell>`, `<ModeCard>`, and `useTodayStats` hook to cleanly eliminate duplicate card layouts and date-aggregation logic across all module dashboards.
- **Clean Code & Modularity**: Significantly reduced boilerplate code across `TrainingView`, `ColorTrainingView`, `RelativeColorTrainingView`, and their respective dashboards.
~~~~~
