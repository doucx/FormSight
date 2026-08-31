这是一个非常具有启发性的设计思路。将分形和多尺度噪波的概念引入美术视知觉训练，能够直接打击到画师在处理“细节与整体”、“粗糙与平滑”、“有机与机械”时的痛点。

我将为你实现优先级最高的前三个分形训练原型，并将它们直接写入 `playground/` 目录下，以便你可以立即在“原型中枢”中预览和交互体验。

## [WIP] feat(playground): 添加三个基于分形算法的视知觉训练原型

### 用户需求
基于分形（Fractals）的特性，创建三个全新的视知觉训练单页原型：
1. 分形树主干提取 (2AFC)
2. 分形域扭曲势线 (连续滑块交互)
3. 分形维数粗糙度感知 (连续滑块交互)

### 评论
这些原型运用了生成式算法（L-System、分形布朗运动、中点位移法），使得每一道题目都具有唯一性和无穷的变化。这不仅验证了基于算法动态生成考题的可行性，更将高度抽象的绘画直觉（如“眯眼看大关系”、“找受力线”）转化为了可量化的工程交互。

### 目标
1. 创建 `fractal_lsystem_spine_prototype.html`，实现分形树生成与骨架提取任务。
2. 创建 `fractal_domain_warping_prototype.html`，使用 Three.js Shader 实现流体纹理与受力角度判定。
3. 创建 `fractal_dimension_prototype.html`，实现中点位移算法驱动的粗糙度估测任务。

### 基本原理
- **骨架提取**：通过设定递归深度阈值，从同一随机数种子生成的高维树形中剥离出低维主干。
- **域扭曲**：利用 GLSL 编写 Domain Warping Shader，通过在特定方向进行坐标拉伸（Scale），人为制造出具有明显导向性的“张力褶皱”，让用户通过滑块旋转标尺来贴合该方向。
- **粗糙度**：中点位移算法中，下一次位移量衰减系数由 Hurst 指数（分形维数的变体）直接控制，使其成为滑块可映射的完美数学参数。

### 标签
#intent/build #flow/ready #priority/high #comp/docs #concept/ui #ai/delegate #task/domain/prototype #task/object/fractal-cards #task/action/build #task/state/begin

---

### Script

#### Acts 1: 创建分形树主干提取原型

我们将利用递归算法生成分形树。关键在于统一的随机数生成器（SPLITMIX32），确保在修改分支参数时，整体拓扑结构不会因为随机数序列错位而彻底崩溃。

~~~~~act
write_file
playground/fractal_lsystem_spine_prototype.html
~~~~~
~~~~~html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>分形树主干骨架提取 - FormSight Prototype</title>

  <meta name="prototype:id" content="fractal_lsystem_spine" />
  <meta name="prototype:title" content="分形树主干提取 (L-System Spine)" />
  <meta name="prototype:category" content="概括感知" />
  <meta name="prototype:target-pack" content="abstraction" />
  <meta name="prototype:status" content="evaluating" />
  <meta name="prototype:desc" content="从高频繁杂的末梢树枝中，剥离并识别出代表其动势的前两代主干力流骨架。" />
  <meta name="prototype:tags" content="Fractal,L-System,Skeleton,2AFC" />
  <meta name="prototype:author" content="FormSight Prototype Engine" />

  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex flex-col items-center p-4 sm:p-8 select-none">
  <header class="w-full max-w-4xl flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
    <div class="flex items-center gap-3">
      <a href="./index.html" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-xs font-mono">← 中枢</a>
      <div class="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg">🌳</div>
      <div>
        <h1 class="text-lg font-bold text-white">分形树主干骨架提取</h1>
        <p class="text-xs text-slate-400">过滤高频噪波，提取核心受力线 (1~2 Octaves)</p>
      </div>
    </div>
    <button id="btn-regen" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-xl shadow-lg transition">
      生成下一题 (Space)
    </button>
  </header>

  <main class="w-full max-w-4xl mt-4 flex flex-col gap-6">
    <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
      <div class="md:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 p-4 flex flex-col items-center shadow-2xl relative">
        <span class="absolute top-4 left-4 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">Target Object (Max Depth: 6)</span>
        <canvas id="main-canvas" width="400" height="400" class="w-full aspect-square"></canvas>
      </div>

      <div class="md:col-span-5 flex flex-col justify-between bg-slate-800/40 rounded-2xl border border-slate-800 p-6">
        <div class="space-y-4">
          <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span>TASK INSTRUCTION</span>
          </div>
          <h2 class="text-base font-bold text-white leading-snug">
            观察左侧的复杂分形树，剥离其细枝末节，判断下方哪一个骨架图提取了其真实的“主干动势”？
          </h2>
          <p class="text-xs text-slate-400 leading-relaxed">
            训练你“以大带小”的概括能力。干扰项的主枝干角度发生了轻微扭曲。
          </p>
        </div>
        <div id="result-badge" class="mt-4 hidden p-3 rounded-xl text-center font-bold text-xs transition-all"></div>
      </div>
    </div>

    <!-- 2AFC Options -->
    <div class="bg-slate-950 rounded-2xl border border-slate-800 p-6 shadow-xl">
      <h3 class="text-sm font-bold text-slate-200 uppercase font-mono mb-4">选择正确的提取骨架 (Depth 1-2)</h3>
      <div class="grid grid-cols-2 gap-6" id="options-grid">
        <div class="opt-card cursor-pointer group rounded-xl border-2 border-slate-800 hover:border-emerald-500 bg-slate-900 p-4" onclick="handleAnswer(0)">
          <span class="text-xs font-mono text-slate-400 group-hover:text-emerald-400 block mb-2">[1] 骨架 A</span>
          <canvas id="opt-canvas-0" width="200" height="200" class="w-full aspect-square bg-slate-950 rounded-lg"></canvas>
        </div>
        <div class="opt-card cursor-pointer group rounded-xl border-2 border-slate-800 hover:border-emerald-500 bg-slate-900 p-4" onclick="handleAnswer(1)">
          <span class="text-xs font-mono text-slate-400 group-hover:text-emerald-400 block mb-2">[2] 骨架 B</span>
          <canvas id="opt-canvas-1" width="200" height="200" class="w-full aspect-square bg-slate-950 rounded-lg"></canvas>
        </div>
      </div>
    </div>
  </main>

  <script>
    // 伪随机数生成器 (保证种子不变时序列一致)
    function splitmix32(a) {
      return function() {
        a |= 0; a = a + 0x9e3779b9 | 0;
        let t = a ^ a >>> 16; t = Math.imul(t, 0x21f0aaad);
        t = t ^ t >>> 15; t = Math.imul(t, 0x735a2d97);
        return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
      }
    }

    let correctIdx = 0;
    let answered = false;

    // 递归生成树
    function buildTree(seed, maxDepth, tweakAngle = 0) {
      const rnd = splitmix32(seed);
      const lines = [];
      
      function branch(x, y, angle, length, currentDepth) {
        if (currentDepth > maxDepth) return;
        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;
        
        lines.push({ x, y, endX, endY, depth: currentDepth, length });
        
        const numBranches = 2 + Math.floor(rnd() * 1.99); // 2 or 3
        for (let i = 0; i < numBranches; i++) {
          let angleOffset = (rnd() - 0.5) * 1.2;
          
          // 对错误选项的主干进行干扰
          if (currentDepth === 1) {
            angleOffset += tweakAngle * (i === 0 ? 1 : -1.2);
          }
          
          const nextAngle = angle + angleOffset;
          const nextLength = length * (0.65 + rnd() * 0.15);
          branch(endX, endY, nextAngle, nextLength, currentDepth + 1);
        }
      }
      
      branch(0, 0, -Math.PI / 2, 90, 1);
      return lines;
    }

    function drawLines(canvasId, lines, strokeStyleFunc, lineWidthFunc) {
      const canvas = document.getElementById(canvasId);
      const ctx = canvas.getContext('2d');
      const cx = canvas.width / 2;
      const cy = canvas.height - 20;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      lines.forEach(l => {
        ctx.beginPath();
        ctx.moveTo(cx + l.x, cy + l.y);
        ctx.lineTo(cx + l.endX, cy + l.endY);
        ctx.strokeStyle = strokeStyleFunc(l.depth);
        ctx.lineWidth = lineWidthFunc(l.depth);
        ctx.stroke();
      });
    }

    function setupQuestion() {
      answered = false;
      const seed = Math.floor(Math.random() * 100000);
      correctIdx = Math.random() > 0.5 ? 1 : 0;
      
      // 生成完整大树 (Depth 6)
      const fullTree = buildTree(seed, 6, 0);
      drawLines('main-canvas', fullTree, 
        d => `rgba(16, 185, 129, ${1 - d/8})`, // Emerald color fading out
        d => Math.max(1, 8 - d)
      );

      // 生成提取骨架 (Depth 2)
      const correctSkeleton = fullTree.filter(l => l.depth <= 2);
      const wrongSkeleton = buildTree(seed, 6, 0.45).filter(l => l.depth <= 2);

      [0, 1].forEach(idx => {
        const isCorrect = idx === correctIdx;
        const skel = isCorrect ? correctSkeleton : wrongSkeleton;
        drawLines(`opt-canvas-${idx}`, skel,
          d => d === 1 ? '#ef4444' : '#f59e0b', // Red root, Amber branches
          d => d === 1 ? 6 : 4
        );
        
        // 重置样式
        const card = document.querySelectorAll('.opt-card')[idx];
        card.className = 'opt-card cursor-pointer group rounded-xl border-2 border-slate-800 hover:border-emerald-500 bg-slate-900 p-4 transition-all';
      });

      document.getElementById('result-badge').classList.add('hidden');
    }

    function handleAnswer(idx) {
      if (answered) return;
      answered = true;
      const isCorrect = idx === correctIdx;
      
      const badge = document.getElementById('result-badge');
      badge.classList.remove('hidden');
      if (isCorrect) {
        badge.className = 'mt-4 p-3 rounded-xl text-center font-bold text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400';
        badge.textContent = `🎉 正确！你敏锐地抓住了主要生长动势。`;
      } else {
        badge.className = 'mt-4 p-3 rounded-xl text-center font-bold text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400';
        badge.textContent = `❌ 错误。仔细观察主干分叉处的倾斜角度是否贴合原图。`;
      }

      document.querySelectorAll('.opt-card').forEach((card, i) => {
        if (i === correctIdx) {
          card.classList.add('border-emerald-500', 'bg-emerald-950/20');
        } else if (i === idx) {
          card.classList.add('border-rose-500', 'bg-rose-950/20');
        } else {
          card.classList.add('opacity-40');
        }
      });
    }

    document.addEventListener('DOMContentLoaded', () => {
      setupQuestion();
      document.getElementById('btn-regen').onclick = setupQuestion;
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); setupQuestion(); }
        else if (e.code === 'Digit1') handleAnswer(0);
        else if (e.code === 'Digit2') handleAnswer(1);
      });
    });
  </script>
</body>
</html>
~~~~~

#### Acts 2: 创建分形域扭曲主势线原型

这个原型需要使用 GLSL 编写 Shader 来生成流畅的域扭曲（Domain Warping）噪波。

~~~~~act
write_file
playground/fractal_domain_warping_prototype.html
~~~~~
~~~~~html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>分形域扭曲主势线感知 - FormSight Prototype</title>
  
  <meta name="prototype:id" content="fractal_domain_warping" />
  <meta name="prototype:title" content="分形域扭曲势线 (Domain Warping)" />
  <meta name="prototype:category" content="细化感知" />
  <meta name="prototype:target-pack" content="concretization" />
  <meta name="prototype:status" content="evaluating" />
  <meta name="prototype:desc" content="通过拖拽旋转标尺，找出流动褶皱中被拉伸挤压的“主张力脊线走向”。" />
  <meta name="prototype:tags" content="WebGL,Shader,DomainWarping,Flow" />
  
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex flex-col items-center p-4 sm:p-8 select-none">
  <header class="w-full max-w-4xl flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
    <div class="flex items-center gap-3">
      <a href="./index.html" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-xs font-mono">← 中枢</a>
      <div class="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-white shadow-lg">🌊</div>
      <div>
        <h1 class="text-lg font-bold text-white">分形域扭曲主势线提取</h1>
        <p class="text-xs text-slate-400">穿透细碎褶皱，直击流体或布料的主受力方向</p>
      </div>
    </div>
    <button id="btn-regen" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white rounded-xl shadow-lg transition">
      生成新流场 (Space)
    </button>
  </header>

  <main class="w-full max-w-4xl mt-6 flex flex-col gap-6">
    <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
      <div class="md:col-span-8 bg-slate-950 rounded-2xl border border-slate-800 p-2 relative shadow-2xl overflow-hidden aspect-video flex items-center justify-center">
        <!-- Three.js Canvas Container -->
        <div id="gl-container" class="w-full h-full rounded-xl overflow-hidden absolute inset-2"></div>
        
        <!-- UI Overlay Guide Line -->
        <div id="guide-line-container" class="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div id="guide-line" class="w-[80%] h-1 bg-rose-500/80 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.8)] relative transition-transform duration-75">
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded font-mono font-bold">YOUR GUESS</div>
          </div>
        </div>

        <div id="correct-line" class="absolute inset-0 pointer-events-none flex items-center justify-center z-0 hidden">
           <div class="w-[80%] h-1 bg-emerald-400/90 rounded-full shadow-[0_0_15px_rgba(52,211,153,1)]"></div>
        </div>
      </div>

      <div class="md:col-span-4 flex flex-col justify-between bg-slate-800/40 rounded-2xl border border-slate-800 p-6">
        <div class="space-y-4">
          <h2 class="text-sm font-bold text-white">旋转标尺，对齐主张力线</h2>
          <p class="text-xs text-slate-400">
            底层生成的分形噪波在某个特定角度被强烈拉伸，形成了类似布料折痕或大理石纹理的主流向。请旋转红色标尺对齐它。
          </p>
          
          <div class="pt-4">
            <input type="range" id="angle-slider" min="0" max="180" value="90" class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
            <div class="flex justify-between text-[10px] text-slate-500 font-mono mt-2">
              <span>0°</span><span id="current-angle">90°</span><span>180°</span>
            </div>
          </div>
        </div>

        <button id="btn-submit" class="w-full py-3 mt-6 bg-slate-700 hover:bg-purple-600 text-white font-bold text-xs rounded-xl transition">
          锁定并验证判定
        </button>
        <div id="result-badge" class="mt-4 hidden p-3 rounded-xl text-center font-bold text-xs transition-all"></div>
      </div>
    </div>
  </main>

  <script>
    const shaderSrc = {
      vert: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      frag: `
        uniform float uTime;
        uniform float uAngle; // Stretch direction
        varying vec2 vUv;

        float random (in vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        float noise (in vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        float fbm (in vec2 st) {
            float v = 0.0;
            float a = 0.5;
            for (int i = 0; i < 5; ++i) {
                v += a * noise(st);
                st = st * 2.0;
                a *= 0.5;
            }
            return v;
        }

        void main() {
            vec2 p = vUv * 6.0;
            
            // Apply stretch rotation
            float c = cos(uAngle);
            float s = sin(uAngle);
            mat2 rot = mat2(c, -s, s, c);
            
            p = rot * p;
            p.y *= 0.15; // Strong stretch to create creases
            p = mat2(c, s, -s, c) * p;

            vec2 q = vec2(0.);
            q.x = fbm( p + 0.00*uTime);
            q.y = fbm( p + vec2(1.0));

            vec2 r = vec2(0.);
            r.x = fbm( p + 4.0*q + vec2(1.7,9.2)+ 0.15*uTime );
            r.y = fbm( p + 4.0*q + vec2(8.3,2.8)+ 0.126*uTime);

            float f = fbm(p+4.0*r);
            
            // Dramatic color mapping
            vec3 col = mix(vec3(0.05, 0.05, 0.1), vec3(0.4, 0.2, 0.6), f);
            col = mix(col, vec3(0.8, 0.7, 0.9), dot(q, r) * 0.5 + 0.5);
            col = mix(col, vec3(1.0), f*f*f*f);

            gl_FragColor = vec4(col, 1.0);
        }
      `
    };

    let scene, camera, renderer, material;
    let targetAngle = 0;
    let answered = false;

    function initGL() {
      const container = document.getElementById('gl-container');
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      material = new THREE.ShaderMaterial({
        vertexShader: shaderSrc.vert,
        fragmentShader: shaderSrc.frag,
        uniforms: {
          uTime: { value: 0.0 },
          uAngle: { value: 0.0 }
        }
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      scene.add(plane);

      function animate(time) {
        requestAnimationFrame(animate);
        material.uniforms.uTime.value = time * 0.0005;
        renderer.render(scene, camera);
      }
      animate(0);
      
      window.addEventListener('resize', () => {
        renderer.setSize(container.clientWidth, container.clientHeight);
      });
    }

    function setupQuestion() {
      answered = false;
      targetAngle = Math.random() * 180;
      // Convert to radians for shader (stretch aligns along rotated X axis, so creases form along X)
      material.uniforms.uAngle.value = (targetAngle * Math.PI) / 180;
      
      document.getElementById('angle-slider').value = 90;
      updateUI();
      
      document.getElementById('correct-line').classList.add('hidden');
      document.getElementById('result-badge').classList.add('hidden');
      document.getElementById('btn-submit').classList.remove('hidden');
    }

    function updateUI() {
      const val = document.getElementById('angle-slider').value;
      document.getElementById('current-angle').textContent = `${val}°`;
      // UI angle maps directly
      document.getElementById('guide-line').style.transform = `rotate(${-val}deg)`;
    }

    function submitAnswer() {
      if(answered) return;
      answered = true;
      
      const guess = parseInt(document.getElementById('angle-slider').value);
      // Angle distance modulo 180 (since lines are symmetric)
      let diff = Math.abs(guess - targetAngle) % 180;
      if (diff > 90) diff = 180 - diff;
      
      const badge = document.getElementById('result-badge');
      badge.classList.remove('hidden');
      document.getElementById('btn-submit').classList.add('hidden');
      
      // Show correct line
      const correctLineNode = document.getElementById('correct-line');
      correctLineNode.classList.remove('hidden');
      correctLineNode.firstElementChild.style.transform = `rotate(${-targetAngle}deg)`;

      if (diff <= 10) {
        badge.className = 'mt-4 p-3 rounded-xl text-center font-bold text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400';
        badge.textContent = `🎯 精确！误差仅 ${diff.toFixed(1)}°`;
      } else {
        badge.className = 'mt-4 p-3 rounded-xl text-center font-bold text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400';
        badge.textContent = `误差 ${diff.toFixed(1)}°。绿色为真实受力脊线。`;
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      initGL();
      setupQuestion();
      document.getElementById('angle-slider').oninput = updateUI;
      document.getElementById('btn-regen').onclick = setupQuestion;
      document.getElementById('btn-submit').onclick = submitAnswer;
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); setupQuestion(); }
      });
    });
  </script>
</body>
</html>
~~~~~

#### Acts 3: 创建分形维数粗糙度感知原型

最后，使用中点位移算法，将边缘粗糙度通过滑块参数暴露给用户进行匹配。

~~~~~act
write_file
playground/fractal_dimension_prototype.html
~~~~~
~~~~~html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>分形维数粗糙度感知 - FormSight Prototype</title>
  
  <meta name="prototype:id" content="fractal_dimension" />
  <meta name="prototype:title" content="分形维数与边缘粗糙度 (Fractal Dimension)" />
  <meta name="prototype:category" content="概括感知" />
  <meta name="prototype:target-pack" content="abstraction" />
  <meta name="prototype:status" content="evaluating" />
  <meta name="prototype:desc" content="通过拖拽滑块调整下方线条，使其粗糙度/高频噪波感（分形维数 D）与上方目标线完全一致。" />
  <meta name="prototype:tags" content="Fractal,MidpointDisplacement,Roughness" />
  
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex flex-col items-center p-4 sm:p-8 select-none">
  <header class="w-full max-w-4xl flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
    <div class="flex items-center gap-3">
      <a href="./index.html" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-xs font-mono">← 中枢</a>
      <div class="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center font-bold text-white shadow-lg">⚡</div>
      <div>
        <h1 class="text-lg font-bold text-white">分形维数边缘粗糙度匹配</h1>
        <p class="text-xs text-slate-400">建立你对轮廓边缘复杂度的量化直觉</p>
      </div>
    </div>
    <button id="btn-regen" class="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white rounded-xl shadow-lg transition">
      生成新波形 (Space)
    </button>
  </header>

  <main class="w-full max-w-4xl mt-6 grid grid-cols-1 md:grid-cols-12 gap-6">
    <div class="md:col-span-8 flex flex-col gap-4">
      <!-- Target Canvas -->
      <div class="bg-slate-950 rounded-2xl border border-slate-800 p-4 relative shadow-lg">
        <span class="absolute top-2 left-4 text-[10px] font-mono text-slate-400 uppercase tracking-widest">Target Edge</span>
        <canvas id="target-canvas" width="600" height="120" class="w-full h-32"></canvas>
      </div>
      
      <!-- User Canvas -->
      <div class="bg-slate-900 rounded-2xl border-2 border-orange-500/50 p-4 relative shadow-[0_0_20px_rgba(249,115,22,0.1)]">
        <span class="absolute top-2 left-4 text-[10px] font-mono text-orange-400 uppercase tracking-widest">Your Edge Adjustment</span>
        <canvas id="user-canvas" width="600" height="120" class="w-full h-32"></canvas>
      </div>
    </div>

    <div class="md:col-span-4 flex flex-col justify-between bg-slate-800/40 rounded-2xl border border-slate-800 p-6">
      <div class="space-y-4">
        <h2 class="text-sm font-bold text-white">调整边缘高频噪波</h2>
        <p class="text-[11px] text-slate-400">
          通过滑块调节 Hurst 指数 (决定分形维数 D)。数值越小，高频碎裂感越强；数值越大，线条越平滑。匹配上方目标线条的质感。
        </p>
        
        <div class="pt-6">
          <input type="range" id="h-slider" min="0.1" max="1.0" step="0.01" value="0.5" class="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
          <div class="flex justify-between text-[10px] text-slate-500 font-mono mt-2">
            <span>极度粗糙 (H=0.1)</span><span>平滑 (H=1.0)</span>
          </div>
        </div>
      </div>

      <div class="mt-8 space-y-3">
        <button id="btn-submit" class="w-full py-3 bg-slate-700 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition">
          提交匹配
        </button>
        <div id="result-badge" class="hidden p-3 rounded-xl text-center font-bold text-xs transition-all"></div>
      </div>
    </div>
  </main>

  <script>
    // PRNG
    function splitmix32(a) {
      return function() {
        a |= 0; a = a + 0x9e3779b9 | 0;
        let t = a ^ a >>> 16; t = Math.imul(t, 0x21f0aaad);
        t = t ^ t >>> 15; t = Math.imul(t, 0x735a2d97);
        return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
      }
    }

    function displace(p1, p2, depth, displaceAmount, rnd, H) {
      if (depth === 0) return [];
      
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      
      // 仅 Y 轴垂直位移，简化线条
      const offset = (rnd() - 0.5) * 2 * displaceAmount;
      const newPoint = {x: midX, y: midY + offset};
      
      // 衰减由 Hurst 指数控制 (2^-H)
      const nextAmount = displaceAmount * Math.pow(2, -H);
      
      return [
        ...displace(p1, newPoint, depth - 1, nextAmount, rnd, H),
        newPoint,
        ...displace(newPoint, p2, depth - 1, nextAmount, rnd, H)
      ];
    }

    function generateLine(H, seed) {
      const rnd = splitmix32(seed);
      const start = {x: 20, y: 60};
      const end = {x: 580, y: 60};
      const maxDepth = 8;
      
      const midPoints = displace(start, end, maxDepth, 50, rnd, H);
      return [start, ...midPoints, end];
    }

    function drawPoints(canvasId, points, color) {
      const canvas = document.getElementById(canvasId);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for(let i=1; i<points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    let targetH = 0.5;
    let targetSeed = 0;
    let userSeed = 0; // 给用户不同的种子，防止通过大形状作弊，必须靠质感判断
    let answered = false;

    function setupQuestion() {
      answered = false;
      targetH = 0.2 + Math.random() * 0.7; // [0.2, 0.9]
      targetSeed = Math.floor(Math.random() * 10000);
      userSeed = targetSeed + 1; // 形状不同，但 H 可以相同
      
      document.getElementById('h-slider').value = 0.5;
      
      drawPoints('target-canvas', generateLine(targetH, targetSeed), '#94a3b8');
      updateUserLine();
      
      document.getElementById('result-badge').classList.add('hidden');
      document.getElementById('btn-submit').classList.remove('hidden');
    }

    function updateUserLine() {
      const h = parseFloat(document.getElementById('h-slider').value);
      drawPoints('user-canvas', generateLine(h, userSeed), '#f97316');
    }

    function submitAnswer() {
      if(answered) return;
      answered = true;
      
      const userH = parseFloat(document.getElementById('h-slider').value);
      const diff = Math.abs(userH - targetH);
      
      const badge = document.getElementById('result-badge');
      badge.classList.remove('hidden');
      document.getElementById('btn-submit').classList.add('hidden');

      if (diff <= 0.08) {
        badge.className = 'p-3 rounded-xl text-center font-bold text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400';
        badge.textContent = `🎯 完美！目标 H=${targetH.toFixed(2)}, 你的 H=${userH.toFixed(2)}`;
      } else {
        badge.className = 'p-3 rounded-xl text-center font-bold text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400';
        badge.textContent = `存在偏差。目标 H=${targetH.toFixed(2)}, 你的 H=${userH.toFixed(2)}`;
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      setupQuestion();
      document.getElementById('h-slider').oninput = updateUserLine;
      document.getElementById('btn-regen').onclick = setupQuestion;
      document.getElementById('btn-submit').onclick = submitAnswer;
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); setupQuestion(); }
      });
    });
  </script>
</body>
</html>
~~~~~

### 下一步建议
这三个原型现已生成并遵循了标准的 FormSight 元数据契约。
1. 你可以在浏览器中打开 `playground/index.html`，它们会被自动检索和索引，点击卡片即可进入体验。
2. 可以评估这些核心算法带来的体感是否符合预期，后续我们可以将这些原型正式重构为 `React / Vue` 组件并打入生产环境的 `packs` 体系中。
