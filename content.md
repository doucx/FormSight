我们将针对 Biome 语法和类型安全检查报告的 Lint 错误进行修复，消除 `scripts/check-ts-smells.mjs` 中的 `forEach`/表达式内赋值问题，并移除 `src/core/registry.ts` 中的非空断言（`!`）。

## [WIP] fix: 修复 Biome Lint 规则违规与非空断言

### 错误分析
运行 `npm run checkf`（Biome 检查与类型校验）发现了以下 2 处主要 Lint 错误：
1. `scripts/check-ts-smells.mjs`：
   - 违反 `noForEach`：在循环中使用 `forEach` 而非原生的 `for...of`。
   - 违反 `noAssignInExpressions`：在 `while ((match = regex.exec(line)) !== null)` 表达式中直接进行赋值。
2. `src/core/registry.ts`：
   - 违反 `noNonNullAssertion`：在 `qualifySchemas` 与 `qualifyAnalyticsViews` 递归转换函数中使用了非空断言 `!`。

### 用户需求
修复上述代码风格与类型安全问题，使 `npm run checkf` 能够 100% 顺利通过。

### 评论
遵循静态代码分析工具的推荐实践，消除非空断言和表达式隐式副作用，有助于提高代码可读性和类型推导的严谨性。

### 目标
1. 重构 `scripts/check-ts-smells.mjs` 的循环与正则匹配逻辑为标准 `for...of`。
2. 在 `src/core/registry.ts` 中使用空值合并运算符（`??`）替代非空断言 `!`。

### 基本原理
使用 `qualifyCardKey(...) ?? fallback` 在保证类型收窄的同时避免运行时潜在的 `undefined` 强制断言；使用标准的 `for...of` 替代 `forEach` 并显式分步提取 `regex.exec` 结果。

### 标签
#intent/fix #flow/ready #priority/high #comp/build #comp/runtime #scope/dx #scope/core #ai/instruct #task/domain/architecture #task/object/lint-fix #task/action/code-quality #task/state/continue #task/status/active

---

### Script

#### Acts 1: 修复 `scripts/check-ts-smells.mjs` 中的 Biome Lint 问题

~~~~~act
patch_file
scripts/check-ts-smells.mjs
~~~~~
~~~~~javascript.old
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    // 简单跳过单行注释
    if (line.trim().startsWith('//')) return;

    SMELLS.forEach(smell => {
      // 克隆正则以重置 lastIndex
      const regex = new RegExp(smell.regex.source, smell.regex.flags);
      let match;
      while ((match = regex.exec(line)) !== null) {
        fileHasIssue = true;
        totalIssues++;
        fileIssues.push({
          lineNum,
          matchStr: match[0].trim(),
          lineStr: line.trim(),
          smell
        });
      }
    });
  });

  if (fileHasIssue) {
    filesWithIssues++;
    console.log(`\n📄 ${c.cyan}${c.bold}${filepath}${c.reset}`);
    fileIssues.forEach(issue => {
      console.log(`   ${c.gray}Line ${issue.lineNum.toString().padEnd(4)}${c.reset} | [${issue.smell.color}${issue.smell.level}${c.reset}] ${c.bold}${issue.smell.id}${c.reset}`);
      console.log(`             ${c.gray}Code: ${c.reset}${issue.lineStr}`);
      console.log(`             ${c.gray}Hint: ${c.reset}${issue.smell.desc}`);
    });
  }
~~~~~
~~~~~javascript.new
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const lineNum = index + 1;
    // 简单跳过单行注释
    if (line.trim().startsWith('//')) continue;

    for (const smell of SMELLS) {
      // 克隆正则以重置 lastIndex
      const regex = new RegExp(smell.regex.source, smell.regex.flags);
      let match = regex.exec(line);
      while (match !== null) {
        fileHasIssue = true;
        totalIssues++;
        fileIssues.push({
          lineNum,
          matchStr: match[0].trim(),
          lineStr: line.trim(),
          smell,
        });
        match = regex.exec(line);
      }
    }
  }

  if (fileHasIssue) {
    filesWithIssues++;
    console.log(`\n📄 ${c.cyan}${c.bold}${filepath}${c.reset}`);
    for (const issue of fileIssues) {
      console.log(
        `   ${c.gray}Line ${issue.lineNum.toString().padEnd(4)}${c.reset} | [${issue.smell.color}${issue.smell.level}${c.reset}] ${c.bold}${issue.smell.id}${c.reset}`,
      );
      console.log(`             ${c.gray}Code: ${c.reset}${issue.lineStr}`);
      console.log(`             ${c.gray}Hint: ${c.reset}${issue.smell.desc}`);
    }
  }
~~~~~

#### Acts 2: 修复 `src/core/registry.ts` 中的非空断言

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
export function qualifySchemas(
  schemas: SettingFieldSchema[] | undefined,
  cardId: string,
): SettingFieldSchema[] | undefined {
  if (!schemas) return undefined;
  return schemas.map((schema) => {
    const s = { ...schema };
    if (s.title) s.title = qualifyCardKey(s.title, cardId)!;
    if (s.subTitle) s.subTitle = qualifyCardKey(s.subTitle, cardId);
    if (s.type === 'targeting' && Array.isArray(s.sectors)) {
      s.sectors = s.sectors.map((sec) => qualifyCardKey(sec, cardId)!);
    }
    if (s.options) {
      s.options = s.options.map((opt) => ({
        ...opt,
        label: qualifyCardKey(opt.label, cardId)!,
      }));
    }
    return s;
  });
}

export function qualifyAnalyticsViews(
  views: FlatCardAnalyticsView[] | undefined,
  cardId: string,
): FlatCardAnalyticsView[] {
  if (!views) return [];
  return views.map((v) => ({
    ...v,
    tabLabel: qualifyCardKey(v.tabLabel, cardId)!,
    title: qualifyCardKey(v.title, cardId)!,
    subTitle: qualifyCardKey(v.subTitle, cardId)!,
  }));
}
~~~~~
~~~~~typescript.new
export function qualifySchemas(
  schemas: SettingFieldSchema[] | undefined,
  cardId: string,
): SettingFieldSchema[] | undefined {
  if (!schemas) return undefined;
  return schemas.map((schema) => {
    const s = { ...schema };
    if (s.title) s.title = qualifyCardKey(s.title, cardId) ?? s.title;
    if (s.subTitle) s.subTitle = qualifyCardKey(s.subTitle, cardId);
    if (s.type === 'targeting' && Array.isArray(s.sectors)) {
      s.sectors = s.sectors.map((sec) => qualifyCardKey(sec, cardId) ?? sec);
    }
    if (s.options) {
      s.options = s.options.map((opt) => ({
        ...opt,
        label: qualifyCardKey(opt.label, cardId) ?? opt.label,
      }));
    }
    return s;
  });
}

export function qualifyAnalyticsViews(
  views: FlatCardAnalyticsView[] | undefined,
  cardId: string,
): FlatCardAnalyticsView[] {
  if (!views) return [];
  return views.map((v) => ({
    ...v,
    tabLabel: qualifyCardKey(v.tabLabel, cardId) ?? v.tabLabel,
    title: qualifyCardKey(v.title, cardId) ?? v.title,
    subTitle: qualifyCardKey(v.subTitle, cardId) ?? v.subTitle,
  }));
}
~~~~~

### 下一步建议
现在可以再次执行 `npm run checkf` 验证代码规范和 TypeScript 类型编译。检查通过后，即可继续开展**阶段 2: 几何与结构域迁移 (Angle 3 张 & Perspective 5 张)**。
