import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('../audit-card-i18n.mjs', import.meta.url));

interface ScanResult {
  status: number | null;
  stdout: string;
}

function writeFixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'formsight-audit-i18n-'));
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(dir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return dir;
}

function scan(files: Record<string, string>, args: string[] = []): ScanResult {
  const dir = writeFixture(files);
  try {
    const result = spawnSync(process.execPath, [scriptPath, `--root=${dir}`, ...args], {
      encoding: 'utf-8',
    });
    return { status: result.status, stdout: result.stdout };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const LOCALES = { 'zh-CN.json': '{"title": "标题"}', 'en-US.json': '{"title": "Title"}' };

describe('audit-card-i18n crash regression', () => {
  it('卡片缺少 locales 目录时不再抛 localeIssues is not iterable', () => {
    const result = scan({
      'src/cards/no_locales/index.tsx': 'export default {};',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('未发现任何卡片 i18n 规范偏差');
    expect(result.stdout).not.toContain('TypeError');
  });

  it('空仓库（无 cards 目录）退出 0', () => {
    const result = scan({ 'package.json': '{}' });

    expect(result.status).toBe(0);
  });
});

describe('audit-card-i18n 规则', () => {
  it('命中嵌套 views 层级', () => {
    const result = scan({
      'src/cards/sample/index.tsx': 'export default {};',
      'src/cards/sample/locales/zh-CN.json': '{"views": {"bias": "偏差"}}',
      'src/cards/sample/locales/en-US.json': '{"views": {"bias": "Bias"}}',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('嵌套');
  });

  it('命中视图中的绝对命名空间调用', () => {
    const result = scan({
      'src/cards/sample/index.tsx': 'export default {};',
      'src/cards/sample/SampleView.tsx':
        "export function SampleView() { const { t } = useCardTranslation('sample'); return t('cards.sample.title'); }",
      'src/cards/sample/locales/zh-CN.json': '{"title": "标题"}',
      'src/cards/sample/locales/en-US.json': '{"title": "Title"}',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('绝对命名空间');
  });

  it('--fix 移除绝对命名空间前缀并退出 0', () => {
    const dir = writeFixture({
      'src/cards/sample/index.tsx': 'export default {};',
      'src/cards/sample/SampleView.tsx':
        "export function SampleView() { const { t } = useCardTranslation('sample'); return t('cards.sample.title'); }",
      'src/cards/sample/locales/zh-CN.json': '{"title": "标题"}',
      'src/cards/sample/locales/en-US.json': '{"title": "Title"}',
    });
    try {
      const result = spawnSync(process.execPath, [scriptPath, `--root=${dir}`, '--fix'], {
        encoding: 'utf-8',
      });

      expect(result.status).toBe(0);
      const fixed = fs.readFileSync(path.join(dir, 'src/cards/sample/SampleView.tsx'), 'utf-8');
      expect(fixed).toContain("t('title')");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('命中设置层 split(.).slice(2) 垫片', () => {
    const result = scan({
      'src/components/settings/SettingsModal.tsx':
        "const key = path.split('.').slice(2).join('.');",
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("split('.').slice(2)");
  });

  it('命中 Canvas 绘图中的硬编码中文', () => {
    const result = scan({
      'src/core/canvas/charts/drawProbe.ts':
        "export function draw(ctx) { ctx.fillText('硬编码中文', 0, 0); }",
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('硬编码中文');
  });

  it('同一 fixture 连续两次运行结果一致（无正则状态污染）', () => {
    const files = {
      'src/cards/sample/index.tsx': 'export default {};',
      'src/cards/sample/SampleView.tsx':
        "export function SampleView() { const { t } = useCardTranslation('sample'); return t('cards.sample.title'); }",
      'src/cards/sample/locales/zh-CN.json': '{"title": "标题"}',
      'src/cards/sample/locales/en-US.json': '{"title": "Title"}',
    };

    expect(scan(files).status).toBe(scan(files).status);
  });
});
