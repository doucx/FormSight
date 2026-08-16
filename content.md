好的！我们在检查后发现，数据导出函数 `exportAllData()` 实际上已包含导出的 `settings` 节点，但先前在全局导入/刷新数据（`refreshProfiles`）时，顶层的 React/Preact `settings` 状态未能同步加载并刷新 LocalStorage 中更新的偏好设置，导致导入的偏好设置无法及时更新。

我们将通过在全局数据变更和刷新函数中重新调用 `loadSettings()` 来同步 `settings` 状态，确保导出与导入偏好设置的全面生效。

以下是具体的执行计划。

## [WIP] feat(db): 确保全量数据导出与导入时完整同步用户偏好设置

### 用户需求
确保导出全量备份数据时包含用户的全部偏好设置，并在恢复/导入数据时能够实时同步与生效。

### 评论
在 `exportAllData` 中，系统已经将 `loadSettings()` 获取到的偏好设置数据序列化进 JSON 的 `settings` 属性。但原先在导入数据回调 `onDataChanged`（即 `refreshProfiles`）触发时，顶层组件并未重新拉取 `loadSettings()` 更新 state，导致导入后的偏好设置无法实时生效甚至可能被旧内存状态覆盖。

### 目标
1. 在 `App.tsx` 的 `refreshProfiles` 刷新逻辑中，加入 `setSettings(loadSettings())`，确保导入全量数据后偏好设置即时同步到 UI 和交互应用中。
2. 确保 `importExport.ts` 中偏好设置导出与导入的准确性。

### 基本原理
通过在数据变更（导入全量 JSON 数据或重置清空数据）时联动触发顶层 `settings` State 的重新加载，使得导出的偏好设置无论在导出端还是导入端都能保持100%一致与实时同步。

### 标签
#intent/build #flow/ready #priority/high
#comp/runtime #concept/config #concept/sync #scope/core
#ai/instruct
#task/domain/storage #task/object/user-settings #task/action/export-import-sync
#task/state/begin #task/status/active

---

### Script

#### Acts 1: 在 `App.tsx` 的 `refreshProfiles` 中增加偏好设置同步逻辑

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
  // 刷新用户能力看板与总时间
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const cData = await getAllColorProfiles();
    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    const relMs = await getTrainingTimeMs('relative_color');
    setProfiles(data);
    setColorProfiles(cData);
    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
    setRelativeColorTimeMs(relMs);
  }, []);
~~~~~
~~~~~tsx.new
  // 刷新用户能力看板与总时间
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const cData = await getAllColorProfiles();
    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    const relMs = await getTrainingTimeMs('relative_color');
    setProfiles(data);
    setColorProfiles(cData);
    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
    setRelativeColorTimeMs(relMs);
    setSettings(loadSettings());
  }, []);
~~~~~

### 下一步建议
- 可以在全局设置弹窗中尝试导出 JSON 文件，检查 JSON 根节点中的 `settings` 对象是否完整包含 `global`、`star`、`color` 以及 `relative_color` 的全部配置项。
- 进行一次导入测试，验证导入后各练习模块的偏好设置（如自适应算子模式、网格大小等）是否已即时更新。
