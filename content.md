简要回答
我已经根据架构文档的要求，将原型卡片转化为 FormSight 的标准 3D 分形截面卡片（`spatial_fractal`）。我为你生成了完整的卡片代码实现，并使用了动态 `import()` 来懒加载 Three.js 以保证首屏性能。

## [WIP] feat: 实现 3D 分形截面 (spatial_fractal) 实验性训练卡片

### 用户需求
将提供的 `fractal_section_prototype.html` 原型转化为 FormSight 标准的训练卡片，通过动态 Code Splitting 引入 Three.js，并标注为实验性状态。

### 评论
采用全局单例懒加载 `useThreeLoader` 是一种优雅的解法，它既能支持 3D 渲染，又严格遵守了系统“非 3D 模块零开销”的性能底线。将 SDF 运算剥离并移植到纯数学层，使得 2D 截面的 Canvas 绘制无需依赖 WebGL，极大地提升了选项渲染的轻量级与多实例复用能力。

### 目标
1. 创建 `spatial_fractal` 卡片的完整目录结构与类型定义。
2. 实现 `useThreeLoader` 动态加载 Hook。
3. 将 SDF 与数学工具移植为 `utils/sdf.ts` 和 `utils/generator.ts`。
4. 实现 `Fractal3DViewport` 和 `OptionCanvas` 核心渲染组件。
5. 组装 `SpatialFractalView` 并配置 `index.tsx` 注册卡片。

### 基本原理
- **数学剥离**：将三维向量操作手动实现为轻量的 `Vec3` 类，使 `generator.ts` 完全脱离 Three.js 依赖，保障主线程生成逻辑的轻盈。
- **动态 WebGL**：在 `Fractal3DViewport` 内部调用 `useThreeLoader`，仅当该组件挂载时才拉取 3D 引擎。
- **纯 2D 切片**：`OptionCanvas` 直接复用 SDF 在原生 2D Canvas 上按像素级采样绘制，避免了为每个选项实例化 3D 渲染器的昂贵开销。

### 标签
#intent/build #flow/ready #priority/high #comp/engine #concept/executor #scope/core #ai/delegate #task/domain/cards #task/object/spatial-fractal #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 创建卡片基础目录结构

首先，我们在系统中为这张新卡片创建所需的所有目录。

~~~~~act
run_command
~~~~~
~~~~~bash
mkdir -p src/cards/spatial_fractal/locales src/cards/spatial_fractal/utils src/cards/spatial_fractal/hooks src/cards/spatial_fractal/components
~~~~~

#### Acts 2: 定义卡片数据类型与多语言配置

定义与 3D 空间、切割平面以及选项配置相关的标准接口，并配置中英双语。

~~~~~act
write_file
src/cards/spatial_fractal/types.ts
~~~~~
~~~~~typescript
export interface Vec3Data {
  x: number;
  y: number;
  z: number;
}

export interface PlaneConfig {
  type: 'CORRECT' | 'DIST_DEPTH' | 'DIST_TILT' | 'DIST_COMPLEX';
  center: Vec3Data;
  u: Vec3Data;
  v: Vec3Data;
  norm: Vec3Data;
}

export interface QuestionData {
  id: string;
  difficultyLevel: number;
  seed: number;
  deltaZ: number;
  deltaTiltDeg: number;
  normal: Vec3Data;
  offset: number;
  planeCenter: Vec3Data;
  uVec: Vec3Data;
  vVec: Vec3Data;
  configs: PlaneConfig[];
  correctIdx: number;
}

export interface HitResult {
  isHit: boolean;
  chosenIdx: number;
  correctIdx: number;
}
~~~~~

~~~~~act
write_file
src/cards/spatial_fractal/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "3D分形截面",
  "desc": "观察随难度进化的三维分形形态，并准确识别其截面拓扑",
  "hint": "观察左侧3D模型上的透明切面，选出与之对应的正确2D剖面。",
  "optionsLabel": "选择正确的2D剖面 (4-AFC)",
  "topOrientation": "顶边定向 (V轴+)",
  "leftOrientation": "左边定向 (U轴-)"
}
~~~~~

~~~~~act
write_file
src/cards/spatial_fractal/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Fractal Cross-Section",
  "desc": "Observe evolving 3D morphologies and identify their cross-sectional topology.",
  "hint": "Observe the transparent cutting plane on the 3D model, and select the matching 2D cross-section.",
  "optionsLabel": "Select Correct 2D Section (4-AFC)",
  "topOrientation": "Top Orientation (V+)",
  "leftOrientation": "Left Orientation (U-)"
}
~~~~~

#### Acts 3: 移植纯数学计算层 (无 Three.js 依赖)

将原型中的 SDF 逻辑与出题算法抽离为纯函数，使得引擎的 `generateQuestion` 无需拉取任何 WebGL 库。

~~~~~act
write_file
src/cards/spatial_fractal/utils/sdf.ts
~~~~~
~~~~~typescript
export function hash3D(x: number, y: number, z: number, seed: number) {
  let n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed) * 43758.5453123;
  return n - Math.floor(n);
}

export function smoothNoise3D(x: number, y: number, z: number, seed: number) {
  let i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  let fx = x - i, fy = y - j, fz = z - k;
  
  let u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  let v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  let w = fz * fz * fz * (fz * (fz * 6 - 15) + 10);

  let x00 = (1-u)*hash3D(i, j, k, seed) + u*hash3D(i+1, j, k, seed);
  let x01 = (1-u)*hash3D(i, j, k+1, seed) + u*hash3D(i+1, j, k+1, seed);
  let x10 = (1-u)*hash3D(i, j+1, k, seed) + u*hash3D(i+1, j+1, k, seed);
  let x11 = (1-u)*hash3D(i, j+1, k+1, seed) + u*hash3D(i+1, j+1, k+1, seed);

  let y0 = (1-v)*x00 + v*x10;
  let y1 = (1-v)*x01 + v*x11;

  return (1-w)*y0 + w*y1;
}

export function fbm3D(x: number, y: number, z: number, octaves: number, seed: number) {
  let val = 0;
  let amp = 0.55;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    val += amp * smoothNoise3D(x * freq, y * freq, z * freq, seed);
    freq *= 2.05;
    amp *= 0.48;
  }
  return val;
}

export function evaluateSDF(x: number, y: number, z: number, level: number, seed: number) {
  let r = Math.sqrt(x*x + y*y + z*z);

  let macroNoise = (smoothNoise3D(x * 0.85 + 1.2, y * 0.85 + 1.2, z * 0.85 + 1.2, seed) - 0.5) * 0.65;
  let dist = (r - 1.15) - macroNoise;

  if (level <= 8) return dist;

  let facetWeight = Math.min(1.0, (level - 8) / 10);
  let facetNoise = Math.abs(smoothNoise3D(x * 1.6 + 3.0, y * 1.6 + 3.0, z * 1.6 + 3.0, seed) - 0.5) * 0.85;
  dist = dist - facetWeight * facetNoise;

  if (level <= 18) return dist;

  let chaosWeight = Math.min(1.0, (level - 18) / 17);
  let fineNoise = (fbm3D(x * 3.0, y * 3.0, z * 3.0, 3, seed) - 0.5) * 0.65 * chaosWeight;
  dist = dist - fineNoise;

  return dist;
}
~~~~~

~~~~~act
write_file
src/cards/spatial_fractal/utils/generator.ts
~~~~~
~~~~~typescript
import type { QuestionData, PlaneConfig, Vec3Data, HitResult } from '../types';

export function expDecayInterpolate(startVal: number, endVal: number, level: number, maxLevel = 35) {
  const t = Math.max(0, Math.min(1, (level - 1) / (maxLevel - 1)));
  const decayRate = 3.0;
  const factor = (1 - Math.exp(-decayRate * (1 - t))) / (1 - Math.exp(-decayRate));
  return endVal + (startVal - endVal) * factor;
}

/** 
 * 轻量化内置 3D 向量类，避免在生成阶段引入任何 Three.js 依赖 
 */
class Vec3 {
  constructor(public x: number, public y: number, public z: number) {}
  clone() { return new Vec3(this.x, this.y, this.z); }
  normalize() {
    const len = Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
    if (len > 0) { this.x /= len; this.y /= len; this.z /= len; }
    return this;
  }
  multiplyScalar(s: number) {
    this.x *= s; this.y *= s; this.z *= s;
    return this;
  }
  add(v: Vec3) {
    this.x += v.x; this.y += v.y; this.z += v.z;
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
    const cross = new Vec3(0,0,0).crossVectors(axis, this);
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
  const uVec = new Vec3(0,0,0).crossVectors(normal, tempUp).normalize();
  const vVec = new Vec3(0,0,0).crossVectors(normal, uVec).normalize();
  
  const planeCenter = normal.clone().multiplyScalar(offset);

  const deltaZ = expDecayInterpolate(0.55, 0.12, level);
  const deltaTiltDeg = expDecayInterpolate(50.0, 14.0, level);
  const deltaTiltRad = (deltaTiltDeg * Math.PI) / 180;

  const distOffset = offset + (offset >= 0 ? -deltaZ : deltaZ);
  const centerDistA = normal.clone().multiplyScalar(distOffset);

  const rotNormal = normal.clone().applyAxisAngle(uVec, deltaTiltRad).normalize();
  const rotV = new Vec3(0,0,0).crossVectors(rotNormal, uVec).normalize();

  const centerDistC = normal.clone().multiplyScalar(offset + deltaZ * 0.6);
  const rotNormalC = normal.clone().applyAxisAngle(vVec, -deltaTiltRad * 0.8).normalize();
  const rotVC = new Vec3(0,0,0).crossVectors(rotNormalC, uVec).normalize();

  const configsRaw = [
    { type: 'CORRECT' as const, center: planeCenter, u: uVec, v: vVec, norm: normal },
    { type: 'DIST_DEPTH' as const, center: centerDistA, u: uVec, v: vVec, norm: normal },
    { type: 'DIST_TILT' as const, center: planeCenter, u: uVec, v: rotV, norm: rotNormal },
    { type: 'DIST_COMPLEX' as const, center: centerDistC, u: uVec, v: rotVC, norm: rotNormalC }
  ];

  // 打乱选项
  const indices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  const correctIdx = indices.indexOf(0);
  
  const configs: PlaneConfig[] = indices.map(i => ({
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
    correctIdx
  };
}

export function checkHit(userVal: number, question: QuestionData): HitResult {
  return {
    isHit: userVal === question.correctIdx,
    chosenIdx: userVal,
    correctIdx: question.correctIdx
  };
}
~~~~~

#### Acts 4: 实现按需加载 Hook 与 3D/2D 渲染组件

实现全局唯一的 `useThreeLoader` 以保证性能，并完成 WebGL 视口与原生 2D 切片的 Canvas 渲染层。

~~~~~act
write_file
src/cards/spatial_fractal/hooks/useThreeLoader.ts
~~~~~
~~~~~typescript
import { useEffect, useState } from 'preact/hooks';
import type * as THREE_TYPE from 'three';
import type { OrbitControls as OrbitControls_TYPE } from 'three/examples/jsm/controls/OrbitControls.js';

export interface ThreeLibs {
  THREE: typeof THREE_TYPE;
  OrbitControls: typeof OrbitControls_TYPE;
}

// 全局 Promise 缓存，保障整个生命周期只请求一次
let threePromiseCache: Promise<ThreeLibs> | null = null;

export function useThreeLoader() {
  const [libs, setLibs] = useState<ThreeLibs | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!threePromiseCache) {
      threePromiseCache = Promise.all([
        import('three'),
        import('three/examples/jsm/controls/OrbitControls.js'),
      ]).then(([threeModule, controlsModule]) => ({
        THREE: threeModule,
        OrbitControls: controlsModule.OrbitControls,
      }));
    }

    threePromiseCache
      .then((loadedLibs) => {
        if (isMounted) setLibs(loadedLibs);
      })
      .catch((err) => {
        if (isMounted) setError(err);
        threePromiseCache = null; 
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { 
    libs, 
    isLoading: !libs && !error, 
    error 
  };
}
~~~~~

~~~~~act
write_file
src/cards/spatial_fractal/components/Fractal3DViewport.tsx
~~~~~
~~~~~tsx
import { useEffect, useRef } from 'preact/hooks';
import { Loader2 } from 'lucide-preact';
import { useThreeLoader } from '../hooks/useThreeLoader';
import { evaluateSDF } from '../utils/sdf';
import { CANVAS_THEME } from '@formsight/card-sdk';
import type { QuestionData } from '../types';

export interface Fractal3DViewportProps {
  question: QuestionData;
  disabled?: boolean;
}

export function Fractal3DViewport({ question, disabled }: Fractal3DViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { libs, isLoading, error } = useThreeLoader();
  const sceneRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!libs || !containerRef.current) return;

    const { THREE, OrbitControls } = libs;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || width;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(2.4, 1.8, 2.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0x818cf8, 1.2);
    dirLight.position.set(4, 5, 3);
    scene.add(dirLight);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || w;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((m: any) => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [libs]);

  // Sync disabled state
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = !disabled;
    }
  }, [disabled]);

  // Re-generate meshes on question change
  useEffect(() => {
    if (!libs || !sceneRef.current) return;
    const scene = sceneRef.current;
    const { THREE } = libs;
    const { level, seed, planeCenter, uVec, vVec, normal } = question;

    const objectsToRemove: any[] = [];
    scene.traverse((child: any) => {
      if (child.userData.isDynamic) objectsToRemove.push(child);
    });
    objectsToRemove.forEach((obj) => {
      scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
        else obj.material.dispose();
      }
    });

    const detail = level <= 8 ? 4 : (level <= 18 ? 5 : (level <= 28 ? 6 : 7));
    const geom = new THREE.IcosahedronGeometry(1.2, detail);
    const pos = geom.attributes.position;
    
    for (let i = 0; i < pos.count; i++) {
      let vx = pos.getX(i);
      let vy = pos.getY(i);
      let vz = pos.getZ(i);
      
      let r = Math.sqrt(vx*vx + vy*vy + vz*vz);
      let normX = vx / r;
      let normY = vy / r;
      let normZ = vz / r;

      let curR = 1.15;
      for (let step = 0; step < 7; step++) {
        let testX = normX * curR;
        let testY = normY * curR;
        let testZ = normZ * curR;
        let sdfVal = evaluateSDF(testX, testY, testZ, level, seed);
        curR = curR - sdfVal * 0.75;
      }

      pos.setXYZ(i, normX * curR, normY * curR, normZ * curR);
    }
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      roughness: 0.35,
      metalness: 0.15,
      flatShading: level > 8
    });

    const fractalMesh = new THREE.Mesh(geom, mat);
    fractalMesh.userData.isDynamic = true;
    scene.add(fractalMesh);

    const planeSize = 3.1;
    const halfSize = planeSize / 2;
    const planeGeom = new THREE.PlaneGeometry(planeSize, planeSize);
    
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const planeHelper = new THREE.Mesh(planeGeom, planeMat);
    planeHelper.userData.isDynamic = true;
    planeHelper.position.set(planeCenter.x, planeCenter.y, planeCenter.z);
    
    const tvU = new THREE.Vector3(uVec.x, uVec.y, uVec.z);
    const tvV = new THREE.Vector3(vVec.x, vVec.y, vVec.z);
    const tvN = new THREE.Vector3(normal.x, normal.y, normal.z);
    
    const orientMatrix = new THREE.Matrix4().makeBasis(tvU, tvV, tvN);
    planeHelper.quaternion.setFromRotationMatrix(orientMatrix);

    const edges = new THREE.EdgesGeometry(planeGeom);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 }));
    planeHelper.add(line);

    const topEdgeGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfSize, halfSize, 0.002),
      new THREE.Vector3(halfSize, halfSize, 0.002)
    ]);
    const topEdgeLine = new THREE.Line(topEdgeGeom, new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 4 }));
    planeHelper.add(topEdgeLine);

    const leftEdgeGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfSize, -halfSize, 0.002),
      new THREE.Vector3(-halfSize, halfSize, 0.002)
    ]);
    const leftEdgeLine = new THREE.Line(leftEdgeGeom, new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 4 }));
    planeHelper.add(leftEdgeLine);

    scene.add(planeHelper);

  }, [libs, question]);

  if (error) {
    return (
      <div className="w-full aspect-square rounded-2xl bg-card border border-rose-500/30 flex items-center justify-center text-xs text-rose-500 shadow-inner">
        3D 引擎加载失败
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square rounded-2xl border border-border shadow-inner overflow-hidden flex items-center justify-center bg-card cursor-grab active:cursor-grabbing"
      style={{ backgroundColor: CANVAS_THEME.bg.secondary }}
    >
      {isLoading && (
        <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs font-mono animate-in fade-in">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>初始化 3D 渲染内核...</span>
        </div>
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/cards/spatial_fractal/components/OptionCanvas.tsx
~~~~~
~~~~~tsx
import { useEffect, useRef } from 'preact/hooks';
import { setupHiDpiCanvas } from '@formsight/card-sdk';
import { evaluateSDF } from '../utils/sdf';
import type { PlaneConfig } from '../types';

interface OptionCanvasProps {
  config: PlaneConfig;
  level: number;
  seed: number;
}

export function OptionCanvas({ config, level, seed }: OptionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 使用固定的 140x140 分辨率进行离线绘制，保证主线程不会出现卡顿
    const size = 140; 
    
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = size;
    rawCanvas.height = size;
    const ctx = rawCanvas.getContext('2d');
    if (!ctx) return;

    const span = 1.55;
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let py = 0; py < size; py++) {
      let vFrac = -(py / size - 0.5) * 2 * span;
      for (let px = 0; px < size; px++) {
        let uFrac = (px / size - 0.5) * 2 * span;
        
        let worldX = config.center.x + config.u.x * uFrac + config.v.x * vFrac;
        let worldY = config.center.y + config.u.y * uFrac + config.v.y * vFrac;
        let worldZ = config.center.z + config.u.z * uFrac + config.v.z * vFrac;
        
        let val = evaluateSDF(worldX, worldY, worldZ, level, seed);
        let pIdx = (py * size + px) * 4;

        if (val <= 0) {
          let edgeDist = Math.min(1.0, -val * 3.2);
          data[pIdx] = Math.round(99 + edgeDist * 45);
          data[pIdx + 1] = Math.round(102 + edgeDist * 65);
          data[pIdx + 2] = Math.round(241 + edgeDist * 14);
          data[pIdx + 3] = 255;
        } else if (val < 0.035) {
          data[pIdx] = 52;
          data[pIdx + 1] = 211;
          data[pIdx + 2] = 153;
          data[pIdx + 3] = 255;
        } else {
          // 契合夜间模式的主题色板 (slate-950)
          data[pIdx] = 2;
          data[pIdx + 1] = 6;
          data[pIdx + 2] = 23;
          data[pIdx + 3] = 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size/2, 0); ctx.lineTo(size/2, size);
    ctx.moveTo(0, size/2); ctx.lineTo(size, size/2);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, 0, size, 4);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 0, 4, size);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, size, size);

    // 将渲染好的纹理通过 HiDPI 上下文投射，保障边缘锐利度
    const displayCtx = setupHiDpiCanvas(canvas, size, size);
    if (displayCtx) {
      displayCtx.drawImage(rawCanvas, 0, 0, size, size);
    }
  }, [config, level, seed]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full aspect-square rounded-lg border border-border shadow-inner"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
~~~~~

#### Acts 5: 组装与卡片注册出口

整合上述组件与配置，通过 Manifest 将其正式挂载到系统 `registry` 体系中。

~~~~~act
write_file
src/cards/spatial_fractal/SpatialFractalView.tsx
~~~~~
~~~~~tsx
import { Cuboid } from 'lucide-preact';
import {
  QuestionCardShell,
  useCardTranslation,
  ChoiceCard,
  getChoiceCardState,
  useChoiceShortcuts
} from '@formsight/card-sdk';
import { Fractal3DViewport } from './components/Fractal3DViewport';
import { OptionCanvas } from './components/OptionCanvas';
import type { HitResult, QuestionData } from './types';

export interface SpatialFractalViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: number) => void;
  disabled?: boolean;
}

export function SpatialFractalView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: SpatialFractalViewProps) {
  const { t } = useCardTranslation('spatial_fractal');

  // 支持键盘数字键 1-4 直接做答
  useChoiceShortcuts({
    optionsCount: 4,
    disabled: disabled || showAnswer,
    onSelect: (idx) => onAnswer(idx),
  });

  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Cuboid}
      showCanvasHints={true}
      maxWidth="max-w-4xl"
      className="gap-6"
    >
      <div className="w-full flex flex-col md:flex-row gap-6">
        {/* 左侧：3D 动态 WebGL 视口 */}
        <div className="w-full md:w-1/2 flex items-center justify-center">
          <Fractal3DViewport question={question} disabled={disabled} />
        </div>

        {/* 右侧：4-AFC 截面选项区 */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span className="font-bold uppercase tracking-wider">{t('optionsLabel')}</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block"></span> {t('topOrientation')}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span> {t('leftOrientation')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {question.configs.map((config, idx) => {
              const isTarget = idx === question.correctIdx;
              const isSelected = userAnswer?.chosenIdx === idx;
              const state = getChoiceCardState({ showAnswer, isTarget, isSelected });

              return (
                <ChoiceCard
                  key={`${question.id}-${idx}`}
                  state={state}
                  size="sm"
                  disabled={disabled || showAnswer}
                  onClick={() => onAnswer(idx)}
                >
                  <div className="flex flex-col gap-2 w-full">
                    <span className="text-xs font-bold font-mono text-muted-foreground">[{idx + 1}]</span>
                    <OptionCanvas config={config} level={question.difficultyLevel} seed={question.seed} />
                  </div>
                </ChoiceCard>
              );
            })}
          </div>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/cards/spatial_fractal/index.tsx
~~~~~
~~~~~tsx
import { Cuboid } from 'lucide-preact';
import { type CardManifest } from '@formsight/card-sdk';
import { SpatialFractalView } from './SpatialFractalView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const spatialFractalCard: CardManifest<QuestionData, HitResult, number, any> = {
  id: 'spatial_fractal',
  domain: 'spatial_structure',
  tags: {
    domain: ['spatial_structure'],
    path: ['extraction'],
    interaction: ['multi_choice'],
    status: 'experimental',
  },
  locales: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  defaultSettings: {
    showCanvasHints: true,
  },
  engine: {
    generateQuestion: (level) => generateQuestion(level),
    evaluateAnswer: (userVal, q) => checkHit(userVal, q),
    isHit: (res) => res.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
  },
  ui: {
    icon: Cuboid,
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <SpatialFractalView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
  },
};

export default spatialFractalCard;
~~~~~

#### Acts 6: 获取构建配置文件

我需要检查工程的 `vite.config.ts` 以准备在下一个计划中对其进行 `manualChunks` 的打包优化。

~~~~~act
read_file
vite.config.ts
~~~~~

### 下一步建议
通过上述步骤我们已经完整实现了卡片的业务逻辑。我们已经发起了对 `vite.config.ts` 的读取，在获取到其内容后，我将为你生成一个 `patch_file` 操作，将其配置动态分离策略，保证 `Three.js` 依赖不会污染主 Bundle。
