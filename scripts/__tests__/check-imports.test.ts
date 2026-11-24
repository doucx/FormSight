import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('../check_imports.py', import.meta.url));
const python = process.env.PYTHON ?? 'python3';

interface ScanResult {
  status: number | null;
  stdout: string;
}

function writeFixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'formsight-check-imports-'));
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
    const result = spawnSync(python, [scriptPath, '--root', dir, ...args], { encoding: 'utf-8' });
    return { status: result.status, stdout: `${result.stdout}${result.stderr}` };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('check_imports resolve-only split', () => {
  it('相对导入可解析时退出 0', () => {
    const result = scan({
      'src/a.ts': "import { b } from './b';",
      'src/b.ts': 'export const b = 1;',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('resolved successfully');
  });

  it('相对导入不可解析时退出 1', () => {
    const result = scan({ 'src/a.ts': "import { b } from './missing';" });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('unresolved import');
  });

  it('卡片越界导入在 --resolve-only 下只告警', () => {
    const result = scan(
      {
        'src/cards/sample/index.ts': "import { core } from '../../core/core';",
        'src/core/core.ts': 'export const core = 1;',
      },
      ['--resolve-only'],
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('WARN');
    expect(result.stdout).toContain('escape src/cards');
  });

  it('卡片越界导入在完整模式下阻断', () => {
    const result = scan({
      'src/cards/sample/index.ts': "import { core } from '../../core/core';",
      'src/core/core.ts': 'export const core = 1;',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('FAIL');
  });

  it('卡片通过 @formsight/card-sdk 引用宿主不告警', () => {
    const result = scan({
      'src/cards/sample/index.ts': "import { cn } from '@formsight/card-sdk';",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('escape src/cards');
  });

  it('卡片使用 @/ 深路径别名视为越界', () => {
    const result = scan({ 'src/cards/sample/index.ts': "import { core } from '@/core/core';" }, [
      '--resolve-only',
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('@/core/core');
  });
});
