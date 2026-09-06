import type { HitResult, PlaneConfig, QuestionData, Vec3Data } from '../types';

export function expDecayInterpolate(
  startVal: number,
  endVal: number,
  level: number,
  maxLevel = 35,
) {
  const t = Math.max(0, Math.min(1, (level - 1) / (maxLevel - 1)));
  const decayRate = 3.0;
  const factor = (1 - Math.exp(-decayRate * (1 - t))) / (1 - Math.exp(-decayRate));
  return endVal + (startVal - endVal) * factor;
}

/**
 * 轻量化内置 3D 向量类，避免在生成阶段引入任何 Three.js 依赖
 */
class Vec3 {
  constructor(
    public x: number,
    public y: number,
    public z: number,
  ) {}
  clone() {
    return new Vec3(this.x, this.y, this.z);
  }
  normalize() {
    const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    if (len > 0) {
      this.x /= len;
      this.y /= len;
      this.z /= len;
    }
    return this;
  }
  multiplyScalar(s: number) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }
  add(v: Vec3) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  crossVectors(a: Vec3, b: Vec3) {
    this.x = a.y * b.z - a.z * b.y;
    this.y = a.z * b.x - a.x * b.z;
    this.z = a.x * b.y - a.y * b.x;
    return this;
  }
  applyAxisAngle(axis: Vec3, angle: number) {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const dot = this.x * axis.x + this.y * axis.y + this.z * axis.z;
    const cross = new Vec3(0, 0, 0).crossVectors(axis, this);
    this.x = this.x * cosA + cross.x * sinA + axis.x * dot * (1 - cosA);
    this.y = this.y * cosA + cross.y * sinA + axis.y * dot * (1 - cosA);
    this.z = this.z * cosA + cross.z * sinA + axis.z * dot * (1 - cosA);
    return this;
  }
  toData(): Vec3Data {
    return { x: this.x, y: this.y, z: this.z };
  }
}

export function generateQuestion(level: number): QuestionData {
  const seed = Math.random() * 10000;
  const t = (Math.max(1, Math.min(35, level)) - 1) / 34;

  const tiltMax = 0.15 + t * 0.8;
  const theta = (Math.random() - 0.5) * tiltMax;
  const phi = (Math.random() - 0.5) * tiltMax;

  const normal = new Vec3(Math.sin(theta), Math.cos(theta), Math.sin(phi)).normalize();
  const offset = (Math.random() - 0.5) * (0.35 + t * 0.45);

  const tempUp = Math.abs(normal.y) > 0.9 ? new Vec3(1, 0, 0) : new Vec3(0, 1, 0);
  const uVec = new Vec3(0, 0, 0).crossVectors(normal, tempUp).normalize();
  const vVec = new Vec3(0, 0, 0).crossVectors(normal, uVec).normalize();

  const planeCenter = normal.clone().multiplyScalar(offset);

  const deltaZ = expDecayInterpolate(0.55, 0.12, level);
  const deltaTiltDeg = expDecayInterpolate(50.0, 14.0, level);
  const deltaTiltRad = (deltaTiltDeg * Math.PI) / 180;

  const distOffset = offset + (offset >= 0 ? -deltaZ : deltaZ);
  const centerDistA = normal.clone().multiplyScalar(distOffset);

  const rotNormal = normal.clone().applyAxisAngle(uVec, deltaTiltRad).normalize();
  const rotV = new Vec3(0, 0, 0).crossVectors(rotNormal, uVec).normalize();

  const centerDistC = normal.clone().multiplyScalar(offset + deltaZ * 0.6);
  const rotNormalC = normal
    .clone()
    .applyAxisAngle(vVec, -deltaTiltRad * 0.8)
    .normalize();
  const rotVC = new Vec3(0, 0, 0).crossVectors(rotNormalC, uVec).normalize();

  const configsRaw = [
    { type: 'CORRECT' as const, center: planeCenter, u: uVec, v: vVec, norm: normal },
    { type: 'DIST_DEPTH' as const, center: centerDistA, u: uVec, v: vVec, norm: normal },
    { type: 'DIST_TILT' as const, center: planeCenter, u: uVec, v: rotV, norm: rotNormal },
    { type: 'DIST_COMPLEX' as const, center: centerDistC, u: uVec, v: rotVC, norm: rotNormalC },
  ];

  // 打乱选项
  const indices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  const correctIdx = indices.indexOf(0);

  const configs: PlaneConfig[] = indices.map((i) => ({
    type: configsRaw[i].type,
    center: configsRaw[i].center.toData(),
    u: configsRaw[i].u.toData(),
    v: configsRaw[i].v.toData(),
    norm: configsRaw[i].norm.toData(),
  }));

  return {
    id: `fractal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    difficultyLevel: level,
    seed,
    deltaZ,
    deltaTiltDeg,
    normal: normal.toData(),
    offset,
    planeCenter: planeCenter.toData(),
    uVec: uVec.toData(),
    vVec: vVec.toData(),
    configs,
    correctIdx,
  };
}

export function checkHit(userVal: number, question: QuestionData): HitResult {
  return {
    isHit: userVal === question.correctIdx,
    chosenIdx: userVal,
    correctIdx: question.correctIdx,
  };
}
