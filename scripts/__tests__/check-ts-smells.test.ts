import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('../check-ts-smells.mjs', import.meta.url));

interface ScanResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function writeFixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'formsight-ts-smells-'));
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
    const result = spawnSync(process.execPath, [scriptPath, dir, ...args], {
      encoding: 'utf-8',
    });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function parseJson(result: ScanResult) {
  return JSON.parse(result.stdout) as {
    blocking: Array<{ file: string; line: number; reason: string }>;
    advisory: Array<{ file: string; line: number; reason: string }>;
    summary: { blocking: number; advisory: number; total: number };
    passed: boolean;
  };
}

const ADVISORY_ONLY = [
  'export interface Payload {',
  '  [key: string]: unknown;',
  '}',
  "export type Mode = 'a' | 'b' | 'c' | 'd';",
].join('\n');

const DOUBLE_ASSERTION = [
  'export function read(value: unknown): number {',
  '  return value as unknown as number;',
  '}',
].join('\n');

describe('check-ts-smells split', () => {
  it('exits 0 when only advisory findings exist', () => {
    const result = scan({ 'src/advisory.ts': ADVISORY_ONLY });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('阻断子集为空');
    expect(result.stdout).toContain('2 处');
  });

  it('exits 1 when a production double assertion exists', () => {
    const result = scan({ 'src/production.ts': DOUBLE_ASSERTION });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('阻断:');
  });

  it('keeps test-code double assertions advisory so the gate never edits tests', () => {
    const result = scan({ 'src/__tests__/sample.test.ts': DOUBLE_ASSERTION }, ['--json']);
    const payload = parseJson(result);

    expect(result.status).toBe(0);
    expect(payload.blocking).toHaveLength(0);
    expect(payload.advisory).toHaveLength(1);
    expect(payload.advisory[0].reason).toBe('test-code');
  });

  it('reports blocking and advisory as separate JSON subsets', () => {
    const result = scan(
      {
        'src/production.ts': DOUBLE_ASSERTION,
        'src/advisory.ts': ADVISORY_ONLY,
      },
      ['--json'],
    );
    const payload = parseJson(result);

    expect(result.status).toBe(1);
    expect(payload.passed).toBe(false);
    expect(payload.summary.blocking).toBe(1);
    expect(payload.summary.advisory).toBe(2);
    expect(payload.blocking[0].file).toContain('production.ts');
    expect(payload.advisory.every((item) => item.reason === 'warning')).toBe(true);
  });

  it('promotes advisory findings under --strict', () => {
    const result = scan({ 'src/advisory.ts': ADVISORY_ONLY }, ['--strict']);
    expect(result.status).toBe(1);
  });
});
