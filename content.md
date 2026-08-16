好的，我将生成一个计划，为“全局数据统计”弹窗（`GlobalStatsModal.tsx`）补全相对色感（Relative Color）的练习记录聚合与多维度筛选支持。

## [WIP] feat: 全局数据统计中添加相对色感模块支持

### 用户需求

在全局数据统计弹窗（`GlobalStatsModal`）中包含相对色感（`relative_color`）模块的答题轨迹与统计指标，并允许用户在下拉菜单中筛选“相对色感 (全部)”及“色彩矢量迁移 (VECTOR_SHIFT)”。

### 评论

这是全站数据统计完整性的重要一环。将相对色感与寻星练习、绝对色感记录一同按时间轴统一聚合，能够使用户在全局统计面板中获得完整的全站训练趋势图与打卡热力图。

### 目标

1. 更新 `UnifiedRecord` 接口，允许 `module: 'relative_color'`。
2. 扩充 `FilterOption` 类型和 `FILTER_LABELS` 映射表，加入 `relative_color_all` 和 `relative_color_VECTOR_SHIFT`。
3. 在数据加载时调用 `getTrialRecords('relative_color')` 拉取相对色感历史记录并合并排序。
4. 在筛选过滤条件和下拉 Select 列表中增加相对色感选项组。

### 基本原理

全局统计组件通过 IndexedDB 查询各模块的答题日志，统一转换为 `UnifiedRecord`（包含 `timestamp`、`isHit`、`level`、`module` 和 `subMode`）。补全对 `relative_color` 的拉取和筛选之后，全站三大训练板块的数据将实现 100% 的统计覆盖。

### 标签

#intent/build #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/global-stats-relative-color #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 修改 `src/components/GlobalStatsModal.tsx` 整合相对色感统计项

我们将修改 `GlobalStatsModal.tsx` 文件，导入 `getTrialRecords` 函数，扩展类型与标签，拉取 `relative_color` 数据并更新筛选器。

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
import { renderTrendChartCanvas } from '../utils/canvas/drawTrendChart';
import { getAllColorTrialRecords, getAllTrialRecords } from '../utils/db';

interface GlobalStatsModalProps {
~~~~~
~~~~~typescript.new
import { renderTrendChartCanvas } from '../utils/canvas/drawTrendChart';
import { getAllColorTrialRecords, getAllTrialRecords, getTrialRecords } from '../utils/db';

interface GlobalStatsModalProps {
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
interface UnifiedRecord {
  timestamp: number;
  isHit: boolean;
  level: number;
  module: 'star' | 'color';
  subMode: string;
}

type FilterOption =
  | 'all'
  | 'star_all'
  | 'star_single'
  | 'star_double_h'
  | 'star_double_r'
  | 'color_all'
  | 'color_H'
  | 'color_V'
  | 'color_S'
  | 'color_ALL';

const FILTER_LABELS: Record<FilterOption, string> = {
  all: '全部练习项目',
  star_all: '寻星练习 (全部模式)',
  star_single: '寻星 • 单锚点',
  star_double_h: '寻星 • 水平双锚点',
  star_double_r: '寻星 • 旋转双锚点',
  color_all: '色感训练 (全部模式)',
  color_H: '色感 • 色相 (Hue)',
  color_V: '色感 • 明度 (Value)',
  color_S: '色感 • 饱和度 (Sat)',
  color_ALL: '色感 • 综合拾色 (Match)',
};
~~~~~
~~~~~typescript.new
interface UnifiedRecord {
  timestamp: number;
  isHit: boolean;
  level: number;
  module: 'star' | 'color' | 'relative_color';
  subMode: string;
}

type FilterOption =
  | 'all'
  | 'star_all'
  | 'star_single'
  | 'star_double_h'
  | 'star_double_r'
  | 'color_all'
  | 'color_H'
  | 'color_V'
  | 'color_S'
  | 'color_ALL'
  | 'relative_color_all'
  | 'relative_color_VECTOR_SHIFT';

const FILTER_LABELS: Record<FilterOption, string> = {
  all: '全部练习项目',
  star_all: '寻星练习 (全部模式)',
  star_single: '寻星 • 单锚点',
  star_double_h: '寻星 • 水平双锚点',
  star_double_r: '寻星 • 旋转双锚点',
  color_all: '色感训练 (全部模式)',
  color_H: '色感 • 色相 (Hue)',
  color_V: '色感 • 明度 (Value)',
  color_S: '色感 • 饱和度 (Sat)',
  color_ALL: '色感 • 综合拾色 (Match)',
  relative_color_all: '相对色感 (全部模式)',
  relative_color_VECTOR_SHIFT: '相对色感 • 色彩矢量迁移',
};
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
  // === 1. 数据加载与聚合 ===
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const starData = await getAllTrialRecords();
      const colorData = await getAllColorTrialRecords();

      const combined: UnifiedRecord[] = [
        ...starData.map((r) => ({
          timestamp: r.timestamp,
          isHit: r.isHit,
          level: r.difficultyLevel,
          module: 'star' as const,
          subMode: r.mode,
        })),
        ...colorData.map((r) => ({
          timestamp: r.timestamp,
          isHit: r.isHit,
          level: r.difficultyLevel,
          module: 'color' as const,
          subMode: r.mode,
        })),
      ];
      combined.sort((a, b) => a.timestamp - b.timestamp);
~~~~~
~~~~~typescript.new
  // === 1. 数据加载与聚合 ===
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const starData = await getAllTrialRecords();
      const colorData = await getAllColorTrialRecords();
      const relData = await getTrialRecords('relative_color');

      const combined: UnifiedRecord[] = [
        ...starData.map((r) => ({
          timestamp: r.timestamp,
          isHit: r.isHit,
          level: r.difficultyLevel,
          module: 'star' as const,
          subMode: r.mode,
        })),
        ...colorData.map((r) => ({
          timestamp: r.timestamp,
          isHit: r.isHit,
          level: r.difficultyLevel,
          module: 'color' as const,
          subMode: r.mode,
        })),
        ...relData.map((r) => ({
          timestamp: r.timestamp,
          isHit: r.isHit,
          level: r.difficultyLevel,
          module: 'relative_color' as const,
          subMode: r.mode,
        })),
      ];
      combined.sort((a, b) => a.timestamp - b.timestamp);
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
  // === 2. 筛选过滤处理 ===
  const filteredRecords = records.filter((r) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'star_all') return r.module === 'star';
    if (selectedFilter === 'color_all') return r.module === 'color';
    if (selectedFilter.startsWith('star_')) {
      return r.module === 'star' && r.subMode === selectedFilter.replace('star_', '');
    }
    if (selectedFilter.startsWith('color_')) {
      return r.module === 'color' && r.subMode === selectedFilter.replace('color_', '');
    }
    return true;
  });
~~~~~
~~~~~typescript.new
  // === 2. 筛选过滤处理 ===
  const filteredRecords = records.filter((r) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'star_all') return r.module === 'star';
    if (selectedFilter === 'color_all') return r.module === 'color';
    if (selectedFilter === 'relative_color_all') return r.module === 'relative_color';
    if (selectedFilter.startsWith('star_')) {
      return r.module === 'star' && r.subMode === selectedFilter.replace('star_', '');
    }
    if (selectedFilter.startsWith('color_')) {
      return r.module === 'color' && r.subMode === selectedFilter.replace('color_', '');
    }
    if (selectedFilter.startsWith('relative_color_')) {
      return r.module === 'relative_color' && r.subMode === selectedFilter.replace('relative_color_', '');
    }
    return true;
  });
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
                <optgroup label="色感训练">
                  <option value="color_all">色感训练 (全部)</option>
                  <option value="color_H">色相 (Hue)</option>
                  <option value="color_V">明度 (Value)</option>
                  <option value="color_S">饱和度 (Saturation)</option>
                  <option value="color_ALL">综合拾色 (Match)</option>
                </optgroup>
              </select>
~~~~~
~~~~~typescript.new
                <optgroup label="色感训练">
                  <option value="color_all">色感训练 (全部)</option>
                  <option value="color_H">色相 (Hue)</option>
                  <option value="color_V">明度 (Value)</option>
                  <option value="color_S">饱和度 (Saturation)</option>
                  <option value="color_ALL">综合拾色 (Match)</option>
                </optgroup>
                <optgroup label="相对色感">
                  <option value="relative_color_all">相对色感 (全部)</option>
                  <option value="relative_color_VECTOR_SHIFT">色彩矢量迁移</option>
                </optgroup>
              </select>
~~~~~

### 下一步建议

1. **功能验证**：可在主页打开“统计”弹窗，检查下拉筛选菜单中是否出现“相对色感”组，并确认练习数据是否能正确过滤与绘制折线图。
2. **测试运行**：运行 `npm test` 确保数据层与逻辑层所有自动化测试顺利通过。
