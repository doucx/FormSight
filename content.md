## [COMMIT] refactor: Architecture consolidation and codebase reduction

~~~~~act
git_add
src/
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor: Architecture consolidation and codebase reduction

- Introduced GenericTrainingView + TrainingPlugin registry pattern, removing 4 redundant domain-specific training views.
- Consolidated WeaknessAnalyticsModal into a unified component supporting both star and color domains.
- Implemented Schema-driven dynamic domain settings form (DynamicDomainSettings), removing 4 specific settings form components.
- Cleaned up deprecated legacy DB query wrappers and standardized on generic `getTrialRecords(domain, mode?)` and `getTrainingTimeMs(domain?)` APIs.
- Significantly reduced codebase volume and improved maintainability.
~~~~~
