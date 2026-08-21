## [COMMIT] refactor(architecture): comprehensive architectural refactoring for FormSight

~~~~~act
git_add
.
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(architecture): comprehensive architectural refactoring for FormSight

1. **Geometry & Core Capabilities Sinking**:
   - Extracted point-grid magnetic snapping and distance checks into `src/core/geometry/pointGrid.ts`.
   - Eliminated cross-domain coupling between `negative_space` and `star`.

2. **Domain Autonomy & OCP Compliance**:
   - Removed centralized hardcoded sector and setting schemas from global config.
   - Migrated domain-specific schemas and sector definitions into individual domain manifests (`star`, `color`, etc.).

3. **Unified Repository & Two-Phase Transaction Safety**:
   - Introduced `SystemRepository` to aggregate storage queries.
   - Upgraded `importAllData` with pre-validation (dry-run) and snapshot rollback mechanisms, guaranteeing transaction-level atomicity across IndexedDB and LocalStorage.

4. **Hook Decomposition (God Hook Split)**:
   - Split `useTrainingSession` into `useIdleProtection` (window blur & idle timeout) and `useTrainingKeybindings` (keyboard listeners).

5. **Type Safety Closure (Discriminated Unions)**:
   - Upgraded `TrainingPlugin` and `GenericTrainingView` with robust generics and discriminated union types, completely eliminating `as unknown as ...` double type assertions.
~~~~~
