# 📸 Snapshot Capture

### 💬 备注:
run

检测到工作区发生变更。

### 📝 变更文件摘要:
```
scripts/migrate-card-manifests.mjs             |   5 +-
 src/cards/abs_gesture_axis/index.tsx           |  32 +++---
 src/cards/abs_notan_threshold/index.tsx        |  32 +++---
 src/cards/abs_palette_clustering/index.tsx     |   6 +-
 src/cards/abs_polygon_decimation/index.tsx     |   6 +-
 src/cards/abs_td_gesture_2afc/index.tsx        |   6 +-
 src/cards/abs_td_hull_2afc/index.tsx           |   6 +-
 src/cards/abs_td_notan_2afc/index.tsx          |   6 +-
 src/cards/abs_td_palette_2afc/index.tsx        |   6 +-
 src/cards/angle_comparison_2afc/index.tsx      |   6 +-
 src/cards/angle_estimation/index.tsx           |  32 +++---
 src/cards/angle_parallel_2afc/index.tsx        |   6 +-
 src/cards/color_all/index.tsx                  |  44 ++++----
 src/cards/color_hue/index.tsx                  | 136 +++++++++++++------------
 src/cards/color_sat/index.tsx                  |  32 +++---
 src/cards/color_val/index.tsx                  |  32 +++---
 src/cards/fractal_edge_roughness/index.tsx     |   6 +-
 src/cards/neg_area_comparison_2afc/index.tsx   |   6 +-
 src/cards/neg_ratio_estimation/index.tsx       |  32 +++---
 src/cards/neg_shape_match_2afc/index.tsx       |   6 +-
 src/cards/neg_vertex_fitting/index.tsx         |   6 +-
 src/cards/persp_gestalt_continuation/index.tsx |   6 +-
 src/cards/persp_prop_division/index.tsx        |   6 +-
 src/cards/persp_prop_migration/index.tsx       |   6 +-
 src/cards/persp_structure_3d/index.tsx         |   6 +-
 src/cards/persp_vp_convergence/index.tsx       |  32 +++---
 src/cards/rel_decontextual_2afc/index.tsx      |   6 +-
 src/cards/rel_hue_induction/index.tsx          |   6 +-
 src/cards/rel_lightness_induction/index.tsx    |  32 +++---
 src/cards/rel_vector_shift/index.tsx           |  32 +++---
 ...
 34 files changed, 564 insertions(+), 493 deletions(-)
```