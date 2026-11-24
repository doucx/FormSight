import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('../check-i18n.mjs', import.meta.url));

interface ScanResult {
  status: number | null;
  stdout: string;
}

function writeFixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'formsight-check-i18n-'));
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(dir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return dir;
}

function scan(files: Record<string, string>): ScanResult {
  const dir = writeFixture(files);
  try {
    const result = spawnSync(process.execPath, [scriptPath, `--root=${dir}`], {
      encoding: 'utf-8',
    });
    return { status: result.status, stdout: `${result.stdout}${result.stderr}` };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const GLOBAL_LOCALES = {
  'src/locales/zh-CN.json': '{"common": {"appName": "FormSight"}}',
  'src/locales/en-US.json': '{"common": {"appName": "FormSight"}}',
};

describe('check-i18n 静态键扫描', () => {
  it('两种语言都存在的键退出 0', () => {
    const result = scan({
      ...GLOBAL_LOCALES,
      'src/app.ts': "export const title = t('common.appName');",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('correctly defined');
  });

  it('缺失 en-US 键时退出 1 并指出语言', () => {
    const result = scan({
      ...GLOBAL_LOCALES,
      'src/locales/en-US.json': '{}',
      'src/app.ts': "export const title = t('common.appName');",
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('en-US');
  });

  it('卡片相对 key 解析到 cards.<id> 命名空间', () => {
    const result = scan({
      ...GLOBAL_LOCALES,
      'src/cards/sample/View.tsx': "export const title = t('title');",
      'src/cards/sample/locales/zh-CN.json': '{"title": "标题"}',
      'src/cards/sample/locales/en-US.json': '{"title": "Title"}',
    });

    expect(result.status).toBe(0);
  });

  it('卡片相对 key 缺失时退出 1', () => {
    const result = scan({
      ...GLOBAL_LOCALES,
      'src/cards/sample/View.tsx': "export const title = t('missingKey');",
      'src/cards/sample/locales/zh-CN.json': '{"title": "标题"}',
      'src/cards/sample/locales/en-US.json': '{"title": "Title"}',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('missingKey');
  });

  it('模板插值 key 与动态 key 不误报', () => {
    const result = scan({
      ...GLOBAL_LOCALES,
      'src/app.ts':
        "export const a = t('common.appName', { name: 'x' });\nexport const b = t(`common.${id}`);",
    });

    expect(result.status).toBe(0);
  });
});
