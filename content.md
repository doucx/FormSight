## [COMMIT] feat(perspective): Add Perspective & Spatial Perception training pack

~~~~~act
git_add
src/app.tsx
src/components/discovery/FilterEngine.tsx
src/config/trainingPlugins.tsx
src/hooks/useHashRoute.ts
src/hooks/useTodayStats.ts
src/packs/perspective/
src/types/card.ts
src/views/Home.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(perspective): Add Perspective & Spatial Perception training pack

Introduces the comprehensive "Perspective & Spatial Perception" (透视空间感知) training pack, featuring 5 core modules:
- VP Convergence (透视灭点汇聚感)
- Proportion Division (平面比例与黄金分割盲切)
- Proportion Migration (空间比例角度迁移)
- Gestalt Continuation 2AFC (断线完形连续性辨识)
- 3D Structure Projection (3D 结构空间翻转)

Also includes key underlying updates:
- Enhanced hash routing with query parameter serialization/deserialization for card discovery states.
- Refactored `useTodayStats` with an exposed `refreshTodayStats` method.
- Updated `FilterEngine` and `Home` to fully sync route and filter states.
~~~~~
