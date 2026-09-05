现在开始执行第一步：对所有包含废弃 `instruction` 键的卡片词典进行批量清理，确保各模块词典完全向 `hint` 收敛。

## [WIP] refactor(cards): 清理卡片词典中的废弃 instruction 字段

### 用户需求
清除全量卡片私有词典（`src/cards/*/locales/*.json`）中残留的废弃 `instruction` 字段，落实“全面废弃无上下文意义同义词，统一归口为 `hint`”的规范细则，消除冗余死代码。

### 评论
当前组件视图均已统一切换为消费 `hint`，且测试用例尚未对 `instruction` 设防。本计划通过精准移除所有 29 张卡片中英词典里的 `instruction` 键，消除死代码并确保中英对称性，为后续加固测试门禁扫清阻碍。

### 目标
1. 遍历所有含 `instruction` 的卡片目录下的 `en-US.json` 和 `zh-CN.json`。
2. 逐一移除 `instruction` 键值行，保持其余属性和缩进格式完全不变。
3. 确保中英词典顶层键集合持续严格对称。

### 基本原理
根据文件修改决策策略，虽然涉及文件较多，但每个文件仅在特定且唯一的上下文位置删除单行 `instruction`，修改比例远低于 40%。采用高确定性锚点的 `patch_file` 指令能够实现原子化、无污染的精确移除。

### 标签
#intent/refine #flow/ready #priority/high #comp/docs #scope/dx #ai/instruct #task/domain/testing #task/object/locales-schema #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 清理 abs_gesture_axis 语言包

~~~~~act
patch_file
src/cards/abs_gesture_axis/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Extract the primary PCA gesture axis angle from flowing particle fields.",
  "instruction": "Rotate the primary axis to align with the main particle flow (0°~180°).",
  "badge": "Gesture Axis",
~~~~~
~~~~~json
  "desc": "Extract the primary PCA gesture axis angle from flowing particle fields.",
  "badge": "Gesture Axis",
~~~~~

~~~~~act
patch_file
src/cards/abs_gesture_axis/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "从离散散点流向中提取第一主成分 PCA 势线角度，建立画面主导动势感知力。",
  "instruction": "旋转调节主轴，对齐粒子群的主动态流向 (0°~180°)",
  "badge": "动态势线提取",
~~~~~
~~~~~json
  "desc": "从离散散点流向中提取第一主成分 PCA 势线角度，建立画面主导动势感知力。",
  "badge": "动态势线提取",
~~~~~

#### Acts 2: 清理 abs_notan_threshold 语言包

~~~~~act
patch_file
src/cards/abs_notan_threshold/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Modulate the binarization cutoff threshold to extract solid Notan value groupings.",
  "instruction": "Adjust the threshold slider to find the most balanced Notan state.",
  "badge": "Notan Threshold",
~~~~~
~~~~~json
  "desc": "Modulate the binarization cutoff threshold to extract solid Notan value groupings.",
  "badge": "Notan Threshold",
~~~~~

~~~~~act
patch_file
src/cards/abs_notan_threshold/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。",
  "instruction": "调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态",
  "badge": "黑白素描归组",
~~~~~
~~~~~json
  "desc": "调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。",
  "badge": "黑白素描归组",
~~~~~

#### Acts 3: 清理 abs_palette_clustering 语言包

~~~~~act
patch_file
src/cards/abs_palette_clustering/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Pierce mosaic noise to identify the area-weighted dominant centroid color (4AFC).",
  "instruction": "Select the dominant color that represents the overall scene palette.",
  "badge": "Color Clustering",
~~~~~
~~~~~json
  "desc": "Pierce mosaic noise to identify the area-weighted dominant centroid color (4AFC).",
  "badge": "Color Clustering",
~~~~~

~~~~~act
patch_file
src/cards/abs_palette_clustering/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "穿透多色拼贴马赛克的混色噪点，四选一提炼出面积加权下的加权质心主色。",
  "instruction": "在下方 4 个候选项中，选出代表画面全局主调的加权主色",
  "badge": "主调色群提炼",
~~~~~
~~~~~json
  "desc": "穿透多色拼贴马赛克的混色噪点，四选一提炼出面积加权下的加权质心主色。",
  "badge": "主调色群提炼",
~~~~~

#### Acts 4: 清理 abs_polygon_decimation 语言包

~~~~~act
patch_file
src/cards/abs_polygon_decimation/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Filter high-frequency noise from intricate silhouettes to identify the optimal low-poly hull.",
  "instruction": "Select the simplified polygon that best preserves key structural vertices.",
  "badge": "Polygon Hull",
~~~~~
~~~~~json
  "desc": "Filter high-frequency noise from intricate silhouettes to identify the optimal low-poly hull.",
  "badge": "Polygon Hull",
~~~~~

~~~~~act
patch_file
src/cards/abs_polygon_decimation/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "从细碎繁复轮廓中穿透高频噪波，识别出其底层的最优关键折线大形框架。",
  "instruction": "观察左侧细碎多边形，选择右侧保留了关键折线大形的概括项",
  "badge": "折线低模大形",
~~~~~
~~~~~json
  "desc": "从细碎繁复轮廓中穿透高频噪波，识别出其底层的最优关键折线大形框架。",
  "badge": "折线低模大形",
~~~~~

#### Acts 5: 清理 abs_td_gesture_2afc 语言包

~~~~~act
patch_file
src/cards/abs_td_gesture_2afc/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Given an abstract spine, identify which complex particle field follows that dynamic.",
  "instruction": "Identify which particle field conforms to the prompt spine (Keys 1 / 2).",
  "badge": "Top-Down Gesture",
~~~~~
~~~~~json
  "desc": "Given an abstract spine, identify which complex particle field follows that dynamic.",
  "badge": "Top-Down Gesture",
~~~~~

~~~~~act
patch_file
src/cards/abs_td_gesture_2afc/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。",
  "instruction": "观察上方提炼的势线骨架，判别哪侧复杂点阵符合该动势",
  "badge": "动态势线寻源",
~~~~~
~~~~~json
  "desc": "给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。",
  "badge": "动态势线寻源",
~~~~~

#### Acts 6: 清理 abs_td_hull_2afc 语言包

~~~~~act
patch_file
src/cards/abs_td_hull_2afc/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Given a minimalist convex hull, match its detailed organic silhouette.",
  "instruction": "Identify which detailed silhouette conforms to the prompt hull (Keys 1 / 2).",
  "badge": "Top-Down Hull",
~~~~~
~~~~~json
  "desc": "Given a minimalist convex hull, match its detailed organic silhouette.",
  "badge": "Top-Down Hull",
~~~~~

~~~~~act
patch_file
src/cards/abs_td_hull_2afc/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。",
  "instruction": "观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形",
  "badge": "几何大模寻形",
~~~~~
~~~~~json
  "desc": "给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。",
  "badge": "几何大模寻形",
~~~~~

#### Acts 7: 清理 abs_td_notan_2afc 语言包

~~~~~act
patch_file
src/cards/abs_td_notan_2afc/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Given a binary Notan silhouette, match the grayscale scene with that value foundation.",
  "instruction": "Identify which grayscale scene shares this Notan foundation (Keys 1 / 2).",
  "badge": "Top-Down Notan",
~~~~~
~~~~~json
  "desc": "Given a binary Notan silhouette, match the grayscale scene with that value foundation.",
  "badge": "Top-Down Notan",
~~~~~

~~~~~act
patch_file
src/cards/abs_td_notan_2afc/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。",
  "instruction": "观察上方 Notan 剪影，判别哪侧复杂画面拥有该黑白大结构",
  "badge": "黑白素描骨架",
~~~~~
~~~~~json
  "desc": "给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。",
  "badge": "黑白素描骨架",
~~~~~

#### Acts 8: 清理 abs_td_palette_2afc 语言包

~~~~~act
patch_file
src/cards/abs_td_palette_2afc/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Given a prompt dominant color, match the mosaic pattern sharing that tonality.",
  "instruction": "Select the mosaic pattern with the matching dominant color base (Keys 1-4).",
  "badge": "Top-Down Palette",
~~~~~
~~~~~json
  "desc": "Given a prompt dominant color, match the mosaic pattern sharing that tonality.",
  "badge": "Top-Down Palette",
~~~~~

~~~~~act
patch_file
src/cards/abs_td_palette_2afc/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。",
  "instruction": "观察上方基准主调色，选出以此为色彩基底的拼贴画面",
  "badge": "调性基底归位",
~~~~~
~~~~~json
  "desc": "给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。",
  "badge": "调性基底归位",
~~~~~

#### Acts 9: 清理 angle_comparison_2afc 语言包

~~~~~act
patch_file
src/cards/angle_comparison_2afc/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Quickly identify which side has a larger angle under non-orthogonal orientations (2AFC).",
  "instruction": "Identify which angle is larger (Keys 1 / 2).",
  "hint": "Identify which side contains a larger angle (Keys 1 / 2)",
~~~~~
~~~~~json
  "desc": "Quickly identify which side has a larger angle under non-orthogonal orientations (2AFC).",
  "hint": "Identify which side contains a larger angle (Keys 1 / 2)",
~~~~~

~~~~~act
patch_file
src/cards/angle_comparison_2afc/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "在消除空间正交基准干扰下，二选一快速判别哪一侧的两射线夹角更大 (2AFC)。",
  "instruction": "二选一快速判别哪一侧夹角更大 (键 1 / 2)",
  "hint": "二选一辨识哪一侧的两射线夹角更大 (键 1 / 2)",
~~~~~
~~~~~json
  "desc": "在消除空间正交基准干扰下，二选一快速判别哪一侧的两射线夹角更大 (2AFC)。",
  "hint": "二选一辨识哪一侧的两射线夹角更大 (键 1 / 2)",
~~~~~

#### Acts 10: 清理 angle_estimation 语言包

~~~~~act
patch_file
src/cards/angle_estimation/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Observe the angle formed by two rays and estimate its degree using a slider (0°~180°).",
  "instruction": "Observe the two rays and adjust the slider to match the true angle (0°~180°).",
  "settings": {
~~~~~
~~~~~json
  "desc": "Observe the angle formed by two rays and estimate its degree using a slider (0°~180°).",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。",
  "instruction": "观察极简两条射线夹角，调制滑块逼近精准度数 (0°~180°)",
  "settings": {
~~~~~
~~~~~json
  "desc": "观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。",
  "settings": {
~~~~~

#### Acts 11: 清理 angle_parallel_2afc 语言包

~~~~~act
patch_file
src/cards/angle_parallel_2afc/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Observe the prompt orientation and identify the strictly parallel line below (2AFC).",
  "instruction": "Find the line that is strictly parallel to the prompt line (Keys 1 / 2).",
  "hint": "Observe the prompt line and select the parallel one below (Keys 1 / 2)",
~~~~~
~~~~~json
  "desc": "Observe the prompt orientation and identify the strictly parallel line below (2AFC).",
  "hint": "Observe the prompt line and select the parallel one below (Keys 1 / 2)",
~~~~~

~~~~~act
patch_file
src/cards/angle_parallel_2afc/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。",
  "instruction": "观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)",
  "hint": "观察上方基准线，选出下方与它严格平行的线 (键 1 / 2)",
~~~~~
~~~~~json
  "desc": "观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。",
  "hint": "观察上方基准线，选出下方与它严格平行的线 (键 1 / 2)",
~~~~~

#### Acts 12: 清理 color_all 语言包

~~~~~act
patch_file
src/cards/color_all/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Simultaneously adjust Hue, Saturation, and Value to match the target color.",
  "instruction": "Modulate H, S, and V tracks to match the target color on the left.",
  "hint": "Modulate H, S, and V tracks to match the target color on the left.",
~~~~~
~~~~~json
  "desc": "Simultaneously adjust Hue, Saturation, and Value to match the target color.",
  "hint": "Modulate H, S, and V tracks to match the target color on the left.",
~~~~~

~~~~~act
patch_file
src/cards/color_all/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "同时调整色相、饱和度与明度，逼近真理色彩",
  "instruction": "同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色",
  "hint": "同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色",
~~~~~
~~~~~json
  "desc": "同时调整色相、饱和度与明度，逼近真理色彩",
  "hint": "同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色",
~~~~~

#### Acts 13: 清理 color_hue 语言包

~~~~~act
patch_file
src/cards/color_hue/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Identify the exact angle of a color on the 360° color wheel.",
  "instruction": "Locate the exact degree of the color on the 360° color wheel.",
  "hint": "Locate the exact degree of the color on the 360° color wheel.",
~~~~~
~~~~~json
  "desc": "Identify the exact angle of a color on the 360° color wheel.",
  "hint": "Locate the exact degree of the color on the 360° color wheel.",
~~~~~

~~~~~act
patch_file
src/cards/color_hue/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "识别颜色在色相环上的具体角度 (0°~360°)",
  "instruction": "定位上方色块在 360° 色相环上的精准角度",
  "hint": "定位上方色块在 360° 色相环上的精准角度",
~~~~~
~~~~~json
  "desc": "识别颜色在色相环上的具体角度 (0°~360°)",
  "hint": "定位上方色块在 360° 色相环上的精准角度",
~~~~~

#### Acts 14: 清理 color_sat 语言包

~~~~~act
patch_file
src/cards/color_sat/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Given hue and value, estimate the purity and saturation (0%~100%).",
  "instruction": "Estimate the saturation purity percentage of the color (0%~100%).",
  "hint": "Estimate the saturation purity percentage of the color (0%~100%).",
~~~~~
~~~~~json
  "desc": "Given hue and value, estimate the purity and saturation (0%~100%).",
  "hint": "Estimate the saturation purity percentage of the color (0%~100%).",
~~~~~

~~~~~act
patch_file
src/cards/color_sat/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)",
  "instruction": "评估上方色块的鲜艳纯度比例 (0%~100%)",
  "hint": "评估上方色块的鲜艳纯度比例 (0%~100%)",
~~~~~
~~~~~json
  "desc": "已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)",
  "hint": "评估上方色块的鲜艳纯度比例 (0%~100%)",
~~~~~

#### Acts 15: 清理 color_val 语言包

~~~~~act
patch_file
src/cards/color_val/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Given hue, estimate the lightness/darkness value (0%~100%).",
  "instruction": "Estimate the value/brightness percentage of the color (0%~100%).",
  "hint": "Estimate the value/brightness percentage of the color (0%~100%).",
~~~~~
~~~~~json
  "desc": "Given hue, estimate the lightness/darkness value (0%~100%).",
  "hint": "Estimate the value/brightness percentage of the color (0%~100%).",
~~~~~

~~~~~act
patch_file
src/cards/color_val/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "已知色相，评估颜色的素描明暗程度 (0%~100%)",
  "instruction": "评估上方色块的素描明度深浅比例 (0%~100%)",
  "hint": "评估上方色块的素描明度深浅比例 (0%~100%)",
~~~~~
~~~~~json
  "desc": "已知色相，评估颜色的素描明暗程度 (0%~100%)",
  "hint": "评估上方色块的素描明度深浅比例 (0%~100%)",
~~~~~

#### Acts 16: 清理 neg_area_comparison_2afc 语言包

~~~~~act
patch_file
src/cards/neg_area_comparison_2afc/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Compare two silhouettes and identify which one has greater negative space area.",
  "instruction": "Identify which side contains more negative white space (Keys 1 / 2).",
  "hint": "Identify which side contains larger negative white space area (Keys 1 / 2)",
~~~~~
~~~~~json
  "desc": "Compare two silhouettes and identify which one has greater negative space area.",
  "hint": "Identify which side contains larger negative white space area (Keys 1 / 2)",
~~~~~

~~~~~act
patch_file
src/cards/neg_area_comparison_2afc/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。",
  "instruction": "二选一判别哪一侧画面的白色留白（负形）面积更大",
  "hint": "判别哪一侧的白色留白 (负形) 面积更大 (键 1 / 2)",
~~~~~
~~~~~json
  "desc": "快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。",
  "hint": "判别哪一侧的白色留白 (负形) 面积更大 (键 1 / 2)",
~~~~~

#### Acts 17: 清理 neg_ratio_estimation 语言包

~~~~~act
patch_file
src/cards/neg_ratio_estimation/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Estimate the area percentage of negative space outside the irregular polygon.",
  "instruction": "Estimate the percentage of white negative space relative to the whole canvas.",
  "settings": {
~~~~~
~~~~~json
  "desc": "Estimate the area percentage of negative space outside the irregular polygon.",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/neg_ratio_estimation/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。",
  "instruction": "估计黑色主体周围的白色留白（负形）占画面总面积的百分比",
  "settings": {
~~~~~
~~~~~json
  "desc": "估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。",
  "settings": {
~~~~~

#### Acts 18: 清理 neg_shape_match_2afc 语言包

~~~~~act
patch_file
src/cards/neg_shape_match_2afc/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Memorize negative space contours and match the identical silhouette (2AFC).",
  "instruction": "Memorize the shape and select the identical one (Keys 1 / 2).",
  "hint_stimulus": "Memorize the negative space contour ({{ms}}ms)",
~~~~~
~~~~~json
  "desc": "Memorize negative space contours and match the identical silhouette (2AFC).",
  "hint_stimulus": "Memorize the negative space contour ({{ms}}ms)",
~~~~~

~~~~~act
patch_file
src/cards/neg_shape_match_2afc/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。",
  "instruction": "瞬时记忆负形空隙轮廓特征，在候选区二选一选出完全相同的形状",
  "hint_stimulus": "瞬时记忆负形轮廓特征 ({{ms}}ms)",
~~~~~
~~~~~json
  "desc": "瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。",
  "hint_stimulus": "瞬时记忆负形轮廓特征 ({{ms}}ms)",
~~~~~

#### Acts 19: 清理 neg_vertex_fitting 语言包

~~~~~act
patch_file
src/cards/neg_vertex_fitting/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Observe the negative space contours and locate the truncated vertex on the grid.",
  "instruction": "Click to locate the truncated vertex based on negative space contours.",
  "hint": "Compare negative space and click to locate the truncated vertex on the right"
~~~~~
~~~~~json
  "desc": "Observe the negative space contours and locate the truncated vertex on the grid.",
  "hint": "Compare negative space and click to locate the truncated vertex on the right"
~~~~~

~~~~~act
patch_file
src/cards/neg_vertex_fitting/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。",
  "instruction": "观察左侧完整参考的负形挤压轮廓，在右侧点阵中点击定位被截断的正形顶点",
  "hint": "对比左侧负形空间，在右侧点阵中点击定位被截断的顶点"
~~~~~
~~~~~json
  "desc": "观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。",
  "hint": "对比左侧负形空间，在右侧点阵中点击定位被截断的顶点"
~~~~~

#### Acts 20: 清理 persp_gestalt_continuation 语言包

~~~~~act
patch_file
src/cards/persp_gestalt_continuation/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Identify the true collinear continuation penetrating an obstacle (2AFC).",
  "instruction": "Select the line that maintains true collinear continuation (Keys 1 / 2).",
  "hint": "Observe incoming line and identify the true collinear continuation penetrating the obstacle (Keys 1 / 2)",
~~~~~
~~~~~json
  "desc": "Identify the true collinear continuation penetrating an obstacle (2AFC).",
  "hint": "Observe incoming line and identify the true collinear continuation penetrating the obstacle (Keys 1 / 2)",
~~~~~

~~~~~act
patch_file
src/cards/persp_gestalt_continuation/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "基于格式塔完形心理学，二选一快速辨识穿透中间障碍物的真实延续线段 (2AFC)。",
  "instruction": "二选一选出保持绝对连续贯穿的延伸线 (键 1 / 2)",
  "hint": "观察穿入线段，二选一辨识哪一侧保持了绝对真实的贯穿延伸 (键 1 / 2)",
~~~~~
~~~~~json
  "desc": "基于格式塔完形心理学，二选一快速辨识穿透中间障碍物的真实延续线段 (2AFC)。",
  "hint": "观察穿入线段，二选一辨识哪一侧保持了绝对真实的贯穿延伸 (键 1 / 2)",
~~~~~

#### Acts 21: 清理 persp_prop_division 语言包

~~~~~act
patch_file
src/cards/persp_prop_division/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Blindly cut lines at 1/2, 1/3, 1/4, or golden ratio (0.618).",
  "instruction": "Click at the designated target proportion along the tilted line.",
  "hint": "Slide along the tilted segment and release to confirm proportional division (or click directly)",
~~~~~
~~~~~json
  "desc": "Blindly cut lines at 1/2, 1/3, 1/4, or golden ratio (0.618).",
  "hint": "Slide along the tilted segment and release to confirm proportional division (or click directly)",
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_division/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "观察倾斜线段，单次点击盲切估测 1/2、1/3、1/4 或黄金分割点 (0.618)。",
  "instruction": "观察线段并在指定比例位置单次点击",
  "hint": "在倾斜线段上滑动试探，松手确认比例位置（也可直接点击）",
~~~~~
~~~~~json
  "desc": "观察倾斜线段，单次点击盲切估测 1/2、1/3、1/4 或黄金分割点 (0.618)。",
  "hint": "在倾斜线段上滑动试探，松手确认比例位置（也可直接点击）",
~~~~~

#### Acts 22: 清理 persp_prop_migration 语言包

~~~~~act
patch_file
src/cards/persp_prop_migration/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Migrate proportional divisions from horizontal references onto randomly tilted lines.",
  "instruction": "Observe the target point above and mark the identical proportion below.",
  "hint": "Observe the horizontal reference above and confirm the corresponding proportion on the tilted segment below",
~~~~~
~~~~~json
  "desc": "Migrate proportional divisions from horizontal references onto randomly tilted lines.",
  "hint": "Observe the horizontal reference above and confirm the corresponding proportion on the tilted segment below",
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_migration/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "观察上方水平基准线上的任意比例目标点，在下方随机倾斜角度的线段上准确标出相同比例位置。",
  "instruction": "观察上方基准线目标点，在下方倾斜线段上点选相同比例位置",
  "hint": "观察上方基准线目标点，在下方倾斜线段滑动试探并松手确认",
~~~~~
~~~~~json
  "desc": "观察上方水平基准线上的任意比例目标点，在下方随机倾斜角度的线段上准确标出相同比例位置。",
  "hint": "观察上方基准线目标点，在下方倾斜线段滑动试探并松手确认",
~~~~~

#### Acts 23: 清理 persp_structure_3d 语言包

~~~~~act
patch_file
src/cards/persp_structure_3d/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Translate orthographic tri-views into 3D isometric cube grid coordinates.",
  "instruction": "Locate the 3D point in the axonometric cube grid based on the 3 views.",
  "hint": "Observe the tri-view coordinates and select the corresponding 3D vertex inside the isometric grid"
~~~~~
~~~~~json
  "desc": "Translate orthographic tri-views into 3D isometric cube grid coordinates.",
  "hint": "Observe the tri-view coordinates and select the corresponding 3D vertex inside the isometric grid"
~~~~~

~~~~~act
patch_file
src/cards/persp_structure_3d/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "观察正交三视图标点，在 3D 透视立方体点阵中定位对应的三维空间坐标点。",
  "instruction": "结合三视图坐标，在 3D 立方体点阵中点选对应点",
  "hint": "观察左侧正交三视图标点，在右侧 3D 立方体透视点阵中选出对应空间坐标点"
~~~~~
~~~~~json
  "desc": "观察正交三视图标点，在 3D 透视立方体点阵中定位对应的三维空间坐标点。",
  "hint": "观察左侧正交三视图标点，在右侧 3D 立方体透视点阵中选出对应空间坐标点"
~~~~~

#### Acts 24: 清理 persp_vp_convergence 语言包

~~~~~act
patch_file
src/cards/persp_vp_convergence/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Modulate the ray angle to make it converge at the exact same vanishing point.",
  "instruction": "Adjust the ray angle using the slider so all lines meet at the vanishing point.",
  "settings": {
~~~~~
~~~~~json
  "desc": "Modulate the ray angle to make it converge at the exact same vanishing point.",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/persp_vp_convergence/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "观察已有倾角透视线，通过滑块调制第三条线段倾斜度，使其精准延长交汇于同一灭点 (VP)。",
  "instruction": "观察已有透视线，调制滑块旋转第三条线使其交汇于同一灭点",
  "settings": {
~~~~~
~~~~~json
  "desc": "观察已有倾角透视线，通过滑块调制第三条线段倾斜度，使其精准延长交汇于同一灭点 (VP)。",
  "settings": {
~~~~~

#### Acts 25: 清理 rel_decontextual_2afc 语言包

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Pierce through simultaneous contrast illusions to identify the objectively brighter color.",
  "instruction": "Identify which center square is physically brighter (Keys 1 / 2).",
  "hint": "Pierce background illusion and identify the objectively brighter center square",
~~~~~
~~~~~json
  "desc": "Pierce through simultaneous contrast illusions to identify the objectively brighter color.",
  "hint": "Pierce background illusion and identify the objectively brighter center square",
~~~~~

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理",
  "instruction": "穿透背景视错觉干扰，二选一判别哪一侧中心色块「客观物理明度更高」",
  "hint": "穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」",
~~~~~
~~~~~json
  "desc": "穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理",
  "hint": "穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」",
~~~~~

#### Acts 26: 清理 rel_hue_induction 语言包

~~~~~act
patch_file
src/cards/rel_hue_induction/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Select the compensated target color to counteract chromatic induction (4AFC).",
  "instruction": "Select the hue that compensates for the colored background (Keys 1-4).",
  "hint": "Observe reference and preview candidate compensations below (Keys 1-4, Space)",
~~~~~
~~~~~json
  "desc": "Select the compensated target color to counteract chromatic induction (4AFC).",
  "hint": "Observe reference and preview candidate compensations below (Keys 1-4, Space)",
~~~~~

~~~~~act
patch_file
src/cards/rel_hue_induction/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "在强色相与饱和度背景下，四选一选出逆向补偿后的目标色，训练环境光色感知调和力",
  "instruction": "观察左侧强色相背景下的基准色，选出右侧达成感知一致的补偿色 (键 1-4)",
  "hint": "观察左侧基准，在下方切换选项预览并确认提交 (键 1-4 切换，Space 提交)",
~~~~~
~~~~~json
  "desc": "在强色相与饱和度背景下，四选一选出逆向补偿后的目标色，训练环境光色感知调和力",
  "hint": "观察左侧基准，在下方切换选项预览并确认提交 (键 1-4 切换，Space 提交)",
~~~~~

#### Acts 27: 清理 rel_lightness_induction 语言包

~~~~~act
patch_file
src/cards/rel_lightness_induction/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Compensate for background illusion to achieve perceived lightness constancy.",
  "instruction": "Adjust right center value so both center squares appear perceptually identical.",
  "settings": {
~~~~~
~~~~~json
  "desc": "Compensate for background illusion to achieve perceived lightness constancy.",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/rel_lightness_induction/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致",
  "instruction": "调节右侧中心色块明度，使左右两块在不同背景下「视觉感知看起来完全一致」",
  "settings": {
~~~~~
~~~~~json
  "desc": "在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致",
  "settings": {
~~~~~

#### Acts 28: 清理 rel_vector_shift 语言包

~~~~~act
patch_file
src/cards/rel_vector_shift/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Observe color vector shift A->B and select matching parallel shift C->D.",
  "instruction": "Observe vector A->B and find matching vector C->D below.",
  "settings": {
~~~~~
~~~~~json
  "desc": "Observe color vector shift A->B and select matching parallel shift C->D.",
  "settings": {
~~~~~

~~~~~act
patch_file
src/cards/rel_vector_shift/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉",
  "instruction": "观察上方 A➔B 色彩推移，在下方候选项中找出符合 C➔D 的同向推移色",
  "settings": {
~~~~~
~~~~~json
  "desc": "保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉",
  "settings": {
~~~~~

#### Acts 29: 清理 star_double_h 语言包

~~~~~act
patch_file
src/cards/star_double_h/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Horizontal dual anchors to train proportion and orthogonal projection intuition.",
  "instruction": "Observe the relationship between horizontal dual anchors on the left, then locate the target on the right.",
  "hint": "Observe the relationship between horizontal dual anchors on the left, then locate the target on the right.",
~~~~~
~~~~~json
  "desc": "Horizontal dual anchors to train proportion and orthogonal projection intuition.",
  "hint": "Observe the relationship between horizontal dual anchors on the left, then locate the target on the right.",
~~~~~

~~~~~act
patch_file
src/cards/star_double_h/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "水平线段两端锚点，评估两点比例与正交投影判定力",
  "instruction": "观察左侧水平双锚点几何关系，在右侧点阵中盲打定位",
  "hint": "观察左侧水平双锚点几何关系，在右侧点阵中盲打定位",
~~~~~
~~~~~json
  "desc": "水平线段两端锚点，评估两点比例与正交投影判定力",
  "hint": "观察左侧水平双锚点几何关系，在右侧点阵中盲打定位",
~~~~~

#### Acts 30: 清理 star_double_r 语言包

~~~~~act
patch_file
src/cards/star_double_r/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Tilted dual anchors to master complex rotated coordinate mapping.",
  "instruction": "Observe the rotated dual anchors on the left, then locate the target on the right.",
  "hint": "Observe the rotated dual anchors on the left, then locate the target on the right.",
~~~~~
~~~~~json
  "desc": "Tilted dual anchors to master complex rotated coordinate mapping.",
  "hint": "Observe the rotated dual anchors on the left, then locate the target on the right.",
~~~~~

~~~~~act
patch_file
src/cards/star_double_r/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力",
  "instruction": "观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位",
  "hint": "观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位",
~~~~~
~~~~~json
  "desc": "带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力",
  "hint": "观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位",
~~~~~

#### Acts 31: 清理 star_single 语言包

~~~~~act
patch_file
src/cards/star_single/locales/en-US.json
~~~~~
~~~~~json
  "desc": "Single central anchor to evaluate polar angle and distance estimation.",
  "instruction": "Observe the target relative to the central anchor on the left, then locate it in the grid on the right.",
  "hint": "Observe the target relative to the central anchor on the left, then locate it in the grid on the right.",
~~~~~
~~~~~json
  "desc": "Single central anchor to evaluate polar angle and distance estimation.",
  "hint": "Observe the target relative to the central anchor on the left, then locate it in the grid on the right.",
~~~~~

~~~~~act
patch_file
src/cards/star_single/locales/zh-CN.json
~~~~~
~~~~~json
  "desc": "单一中心锚点，评估基本极坐标方位与距离感知力",
  "instruction": "观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位",
  "hint": "观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位",
~~~~~
~~~~~json
  "desc": "单一中心锚点，评估基本极坐标方位与距离感知力",
  "hint": "观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位",
~~~~~

### 下一步建议
全量卡片词典中的 `instruction` 键已成功清理完毕。接下来建议执行**第二步（测试门禁加固）**：
1. 更新 `src/cards/__tests__/locales-schema.test.ts`，将 `'instruction'` 与 `'taskHint'` 补入 `FORBIDDEN_ALIAS_KEYS` 黑名单。
2. 运行 `vitest run src/cards/__tests__/locales-schema.test.ts` 验证测试是否全绿通过。
