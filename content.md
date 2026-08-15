好的，我们来将导出的 JSON 文件名中的日期格式从 `YYYY-MM-DD` 升级为精确到秒的时间戳 `YYYY-MM-DD_HH-mm-ss`，从而彻底避免在同一天内多次导出时出现文件名重复的问题。

下面为您生成实施计划：

## [WIP] refactor(settings): 优化全局 JSON 备份文件名，精确到秒以防重复

### 用户需求
在 `GlobalSettingsModal.tsx` 中，导出全量 JSON 时生成的文件名原先只精确到日期（`formsight_data_YYYY-MM-DD.json`），现需修改为精确到秒（形如 `formsight_data_YYYY-MM-DD_HH-mm-ss.json`），避免一天内多次备份导致文件名冲突。

### 评论
这是一个提升开发者体验（DX）和小细节健壮性的实用改进。通过引入带有完整时分秒的时间戳后缀，用户在进行频繁备份或管理离线数据档案时将更加安全和清晰。

### 目标
1. 修改 `src/components/GlobalSettingsModal.tsx` 中的 `handleExport` 逻辑。
2. 构造符合 `formsight_data_YYYY-MM-DD_HH-mm-ss.json` 格式的时间戳字符串。

### 标签
#intent/refine #flow/ready #priority/low #comp/cli #concept/config #scope/dx #ai/instruct #task/domain/settings #task/object/json-export-filename #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 更新 GlobalSettingsModal 导出文件名逻辑

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript.old
  const handleExport = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formsight_data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
~~~~~
~~~~~typescript.new
  const handleExport = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    a.download = `formsight_data_${dateStr}_${timeStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
~~~~~

### 下一步建议
- **执行构建与校验**: 运行 `npm run check` 及 `npm run build` 确保一切正常。
