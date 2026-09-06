简要回答
我已经根据 Biome Linter 报错提示（消除所有 `any` 显式声明，并将 `forEach` 替换为高性能的 `for...of` 循环），对代码进行了彻底的重构与静态类型加固。

## [WIP] fix: 清除 spatial_fractal 模块中的所有 Linter 警告 (noExplicitAny & noForEach)

### 错误分析
代码中引入了若干处 `any` 类型和 `forEach` 遍历，触发了项目的 Linter 规则检查。
1. `index.tsx` 中 Manifest 泛型使用了 `any`。
2. `Fractal3DViewport.tsx` 中使用了 `useRef<any>(null)` 以及 `scene.traverse((child: any) => ...)`。
3. 清理几何体和材质时使用了数组的 `.forEach()` 方法。

### 解决方案
1. 引入 `@formsight/card-sdk` 中的 `BaseModuleSettings` 替代 `index.tsx` 中的 `any`。
2. 引入 `three` 官方类型库 (`THREE.Scene`, `OrbitControls`, `THREE.Object3D`) 替代 `any`。
3. 将所有的 `.forEach(...)` 替换为标准、高性能的 `for (const ... of ...)` 循环。

### 标签
#intent/refine #flow/ready #priority/medium #comp/cards #concept/ui #scope/dx #ai/instruct #task/domain/cards #task/object/spatial-fractal #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 重构 index.tsx 消除 Manifest 中的 any

~~~~~act
write_file
src/cards/spatial_fractal/index.tsx
~~~~~
~~~~~tsx
import { Cuboid } from 'lucide-preact';
import { type CardManifest, type BaseModuleSettings } from '@formsight/card-sdk';
import { SpatialFractalView } from './SpatialFractalView';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';
import type { HitResult, QuestionData } from './types';
import { checkHit, generateQuestion } from './utils/generator';

export const spatialFractalCard: CardManifest<QuestionData, HitResult, number, BaseModuleSettings> = {
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

#### Acts 2: 重构 Fractal3DViewport.tsx 消除类型污染与 forEach

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
import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface Fractal3DViewportProps {
  question: QuestionData;
  disabled?: boolean;
}

export function Fractal3DViewport({ question, disabled }: Fractal3DViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { libs, isLoading, error } = useThreeLoader();
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

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
            for (const m of object.material) {
              m.dispose();
            }
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
    const { difficultyLevel: level, seed, planeCenter, uVec, vVec, normal } = question;

    const objectsToRemove: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child.userData.isDynamic) {
        objectsToRemove.push(child);
      }
    });

    for (const obj of objectsToRemove) {
      scene.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          for (const m of obj.material) {
            m.dispose();
          }
        } else {
          obj.material.dispose();
        }
      }
    }

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
        if (Number.isNaN(sdfVal) || !Number.isFinite(sdfVal)) {
          break;
        }
        curR = curR - sdfVal * 0.75;
      }

      if (Number.isNaN(curR) || !Number.isFinite(curR)) {
        curR = 1.15;
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
