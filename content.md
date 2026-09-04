# [COMMIT] refactor(cards): implement schema-backed private record narrowing across analytics

~~~~~act
git_add
src/cards/color_hue/analytics.tsx
src/cards/star_single/analytics.tsx
src/cards/star_double_h/analytics.tsx
src/cards/star_double_r/analytics.tsx
src/cards/neg_ratio_estimation/analytics.tsx
src/cards/fractal_edge_roughness/types.ts
src/cards/fractal_edge_roughness/analytics.tsx
src/cards/fractal_edge_roughness/utils/charts.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(cards): implement schema-backed private record narrowing across analytics

Successfully implemented Schema B (trusted card-private lightweight record narrowing) across all card analytics modules (color_hue, star_single, star_double_h, star_double_r, neg_ratio_estimation, and fractal_edge_roughness).

- Added strict, non-optional `XxxTrialRecord` extension interfaces mirroring each card's `extractRecordDetails` contract.
- Replaced loose record mapping and inline type castings with clean, single-point entry narrowing (`rawRecords as XxxTrialRecord[]`).
- Removed defensive runtime fallbacks (e.g. `|| [0, 0]`, `?? 0`), ensuring clean, transparent, and fully type-safe data access and auto-completion.
~~~~~
