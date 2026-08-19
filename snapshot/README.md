# FormSight

<p align="center">
  <strong>基于视知觉心理学、OKLab 感知色彩空间与几何拓扑建模的自适应视觉与手眼协调强化训练系统</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Framework-Preact_10-673ab7?style=flat-square&logo=preact" alt="Preact">
  <img src="https://img.shields.io/badge/Language-TypeScript_5-3178c6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Styling-Tailwind_CSS_3-06b6d4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Color_Space-OKLab_/_OKLCH-f59e0b?style=flat-square" alt="OKLab">
  <img src="https://img.shields.io/badge/Build_Tool-Vite_5-646cff?style=flat-square&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Storage-IndexedDB_(Offline--First)-success?style=flat-square" alt="IndexedDB">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

---

## 📖 项目简介

**FormSight** 是一套面向数字艺术家、设计师及视觉观察者的硬核自适应训练系统。它将现代视知觉认知心理学、心理物理学阶梯测试、均匀感知色彩空间（OKLab）以及二维拓扑几何算法深度融合。

系统通过实时记录每次作答的**微米/像素级偏差、感知色差 ($\Delta E$)、角度误差及响应时延**，驱动**自适应阶梯与轮次评估算法**，帮助训练者打破具象认知偏见，系统化建立敏锐的色彩推移直觉、空间比例感知力及微小视觉差异辨识力。

---

## 🧩 四大核心训练维度

### 1. 寻星练习 (Star-Hopping)
基于极坐标与双极透视网格，通过视线搜寻与盲打定位，训练空间方位、线段比例及心智旋转 (Mental Rotation) 构图直觉。
- **单锚点模式 (Single Anchor)**：单一中心锚点，评估基本极坐标方位与距离感知力。
- **水平双锚点 (Horizontal Dual)**：水平线段两端锚点，评估两点比例与正交投影判定力。
- **旋转双锚点 (Rotated Dual)**：带有倾斜角度的双锚点（15°~150°），评估复杂旋转视角下的几何构图力。

### 2. 绝对色感 (Color Recognition)
拆解 HSV 色彩空间，结合 OKLab 视觉可观测量与感知难度对齐，分级递进识别单维度及复合色彩。
- **色相 (Hue, H)**：在 360° 色相环上精准判定色相角度。
- **明度 (Value, V)**：在固定色相下评估素描明暗阶梯 (0%~100%)。
- **饱和度 (Saturation, S)**：在固定色相与明度下评估色彩纯度鲜艳度 (0%~100%)。
- **综合拾色 (Match, ALL)**：三轨联动微调，全面逼近真理色彩。

### 3. 相对色感 (Relative Color Perception)
基于 OKLab 空间推移矢量 ($\vec{v}_{AB}$) 与阿尔伯斯 (Josef Albers) 相互作用理论，训练光影与环境对比下的相对色彩感知力。
- **色彩矢量迁移 (Vector Shift)**：保持固有色推移矢量在全场施加统一推移，建立光影相对偏转直觉。
- **明度反差补偿 (Lightness Induction)**：在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致。
- **补色残像调和 (Hue Induction)**：在强饱和度色相背景下，逆向补偿色彩推移，训练环境光色感知调和力。
- **环境穿透判别 (Decontextual 2AFC)**：穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理。

### 4. 正负形感知 (Negative Space)
切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破主体偏见，培养专业起形与比例感知力。
- **负形占比滑块评估 (Ratio Estimation)**：估计不规则几何多边形外部留白占整幅画面的面积百分比。
- **负形面积二分判别 (Area Comparison 2AFC)**：快速对比两个形态各异的多边形留白，二选一判别哪侧留白面积更大。
- **负形边界反切定点 (Negative Vertex Fitting)**：观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。

---

## 📐 核心算法与技术原理

### 1. OKLab 均匀色彩感知空间 (`oklchUtils.ts`)
为了解决传统 sRGB / HSV 在人眼感知上的非均匀性（如黄色与蓝色在相同饱和度下的明暗感知不对称），系统将色彩映射至 OKLab 空间计算欧氏色差：
$$\Delta E_{\text{OK}} = \sqrt{(\Delta L)^2 + (\Delta a)^2 + (\Delta b)^2}$$
- **自适应容错**：根据当前难度 Level ($1 \sim 35$) 对数平滑插值容错区间：
  $$\Delta E_{\text{target}}(\text{level}) = \Delta E_{\max} \cdot \left(\frac{\Delta E_{\min}}{\Delta E_{\max}}\right)^{\frac{\text{level} - 1}{34}}$$
- **动态容错带指示**：实时在滑块上投射基于 $\Delta E$ 的动态容错边界。

### 2. 双模心理物理学自适应引擎 (`adaptiveEngine.ts`)
- **轮次胜率评估算子 (Block Master - 推荐)**：以 10/15/20 题为一个评估轮次，胜率达到目标阈值（如 80%）通关晋级，低于 50% 自动回调降级。
- **经典 3U1D 阶梯算子 (Staircase)**：连续 3 题正确升 1 级，1 题错误降 1 级。
- **步幅精细度**：支持标准阶梯（3 级大步幅）与精细阶梯（1 级逐级微调）。

### 3. 多边形负形拓扑与鞋带公式 (`negativeSpaceUtils.ts`)
利用鞋带公式 (Shoelace Formula) 计算任意不规则非自交多边形面积 $A_{\text{positive}}$，进而得到精确负形面积比例：
$$A = \frac{1}{2} \left| \sum_{i=0}^{n-1} (x_i y_{i+1} - x_{i+1} y_i) \right|, \quad R_{\text{negative}} = \frac{A_{\text{canvas}} - A_{\text{positive}}}{A_{\text{canvas}}} \times 100\%$$

---

## 📊 数据洞察与离线分析

### 1. 客户端实时统计看板
- **弱点罗盘 (Compass)**：8 方向空间方位命中率分布。
- **色相环盲区诊断 (Hue Ring)**：12 扇区 ($30^\circ$) 色相对比准确率与平均绝对误差诊断。
- **中心偏置热力图 (Heatmap)**：分析手眼协调与视觉系统的系统性位置偏置 ($\Delta X, \Delta Y$)。
- **全景数据大盘**：近 12 周练习热力图打卡记录与每日能力峰值演进折线。

### 2. Python 离线分析与 AI 归因工具集 (`analysis/`)
系统支持一键导出全量 JSON 数据，配合离线分析脚本：
```bash
# 安装离线分析依赖
pip install -r analysis/requirements.txt

# 运行多维度统计与随机森林归因分析
python analysis/analyze_color.py
```
- 输出色相 12 扇区详细特征表与特征重要性权重。
- 自动生成 `ai_analysis_prompt.md`，可直接投喂大语言模型获取个性化视觉盲点强化方案。

---

## ⌨️ 快捷操作指南

| 场景 | 按键 | 功能说明 |
| :--- | :--- | :--- |
| **全局 / 训练** | `Esc` | 立即保存训练并打开总结结算 / 退出界面 |
| **通用做答** | `Space` (空格) | 确认提交当前滑块数值 / 手动切换下一题 |
| **2AFC 二分判别** | `1` 或 `2` | 快速选择左侧区域 A 或右侧区域 B |
| **矢量迁移选择** | `1` ~ `4` | 快速切换 4 个候选推移色块 |
| **休眠保护** | 任意键 / 点击 | 闲置休眠或失焦后一键恢复计时与训练 |

---

## 🛠️ 技术架构

- **前端核心**：[Preact 10](https://preactjs.com/) (极轻量 JSX 运行时)
- **构建工程**：[Vite 5](https://vitejs.dev/) + TypeScript 5
- **界面样式**：[Tailwind CSS 3](https://tailwindcss.com/) + [Lucide Preact](https://lucide.dev/)
- **代码规范**：[Biome](https://biomejs.dev/) (Formatter & Linter)
- **离线存储**：IndexedDB (`idb` v8.0)
- **单元测试**：[Vitest](https://vitest.dev/) (配合 `fake-indexeddb`)

---

## 🚀 本地开发与构建

### 1. 安装依赖
```bash
npm install
```

### 2. 启动本地开发服务
```bash
npm run dev
```

### 3. 代码检查与格式化
```bash
npm run check
```

### 4. 运行单元测试
```bash
npm run test
```

### 5. 构建生产产物
```bash
npm run build
```
产物将输出至 `dist/` 目录。