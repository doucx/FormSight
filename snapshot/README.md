# FormSight (寻星练习 · Star-Hopping)

<p align="center">
  <strong>基于视知觉心理学与极坐标空间建模的自适应视觉与手眼协调强化训练系统</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Framework-Preact_10-673ab7?style=flat-square&logo=preact" alt="Preact">
  <img src="https://img.shields.io/badge/Language-TypeScript_5-3178c6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Styling-Tailwind_CSS_3-06b6d4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Build_Tool-Vite_5-646cff?style=flat-square&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Storage-IndexedDB_(Offline)--First)-success?style=flat-square" alt="IndexedDB">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

---

## 📖 项目简介

**FormSight (寻星练习)** 是一款源自天文学目视观测（寻找暗星）及视觉认知心理学的应用工具。

在训练过程中，用户需要在左侧“参考画布”上观察锚点（Anchor）与目标点（Target）的几何位置关系（涵盖距离、角度、正交投影及旋转比例），并在右侧“交互画布”的点阵网格中准确点击定位目标点。

系统通过实时记录每次点击的**像素级位置偏差、极角与响应时间**，配合**心理物理学自适应算法**与**空间偏置诊断模型**，帮助用户精准测定并提升视觉系统的极坐标方位感知、比例估计力及心智旋转（Mental Rotation）能力。

---

## ✨ 核心特性

- 🎯 **三大几何拓扑训练模式**
  - **单锚点模式 (Single Anchor)**：极坐标方位与距离感知的基本功训练。
  - **水平双锚点 (Double Horiz)**：基于线段两端锚点的正交投影与距离比例判定。
  - **旋转双锚点 (Double Rotated)**：叠加任意旋转角度（15°~150°），训练复杂视角下的心智旋转与空间构图能力。

- ⚡ **心理物理学自适应难度引擎**
  - **经典 3U1D 阶梯算法 (Staircase)**：连续 3 题正确提升难度（网格步长缩小），1 题错误降低难度。
  - **轮次胜率评估引擎 (Block Master)**：按固定题量（10/15/20 题）评估通关率，动态调整能力阶梯。
  - **精细步长控制**：支持标准阶梯（5px 梯度）与精细阶梯（1px 逐级递进）。

- 🔍 **空间偏置与盲区诊断 (Analytics Engine)**
  - **中心相对偏差热力散点图**：归一化原点分析，精准诊断视觉系统是否存在系统性偏置（如偏左、偏下等 $\Delta X, \Delta Y$ 偏移）。
  - **8 方向弱点罗盘**：将 360° 空间切分为 8 个 45° 视角扇区，实时统计各方位的命中率与平均误差。
  - **弱点靶向强化 (Targeting Mode)**：自动/手动锁定表现最差的角度扇区，加权生成训练题目，精准消除视角盲区。

- 🔒 **离线优先与数据隐私 (Offline-First)**
  - 基于 IndexedDB 本地数据库存储，不依赖任何后端服务。
  - 完整记录训练会话、单题细节日志与能力看板，支持 JSON 一键导出与导入。

---

## 📐 算法与技术原理

### 1. 几何变换与加权生成 (`geometry.ts`)
目标点 $B$ 与网格点阵的计算基于二维刚体变换：
$$P_{rotated} = R(\theta) \cdot (P - P_{center}) + P_{center}$$
题目生成算法内置加权概率判定，在开启靶向强化时，系统以 $70\%$ 的概率将目标生成在用户的弱点扇区内（带 $\pm 20^\circ$ 随机抖动），其余 $30\%$保持全局随机采样。

### 2. 吸附与判定机制
用户点击 $P_{click}$ 后，系统通过欧氏距离计算最近的网格点 $P_{grid}$，并基于网格步长 $S_{step}$ 的 $55\%$ 建立有效感应半径：
$$R_{hit} = 0.55 \times S_{step}$$
保证在不同难度阶梯下点击判定的精确度与舒适度。

---

## 🛠️ 技术栈

- **前端框架**：[Preact](https://preactjs.com/) (替代 React 的超轻量化 JSX 库)
- **构建工具**：[Vite 5](https://vitejs.dev/)
- **语言**：TypeScript 5
- **样式**：[Tailwind CSS 3](https://tailwindcss.com/)
- **图标**：[Lucide Preact](https://lucide.dev/)
- **本地存储**：`idb` (IndexedDB Wrapper)

---

## 📁 项目结构

```text
FormSight/
├── src/
│   ├── components/            # UI 组件
│   │   ├── AnalyticsModal.tsx  # 弱点分析与热力图 Modal (Canvas 绘制)
│   │   ├── SettingsModal.tsx   # 偏好与参数配置 Modal
│   │   └── StarCanvas.tsx      # 核心双 Canvas 交互与视觉反馈渲染
│   ├── types/                 # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/                 # 工具与核心算法
│   │   ├── adaptiveEngine.ts  # 自适应难度引擎 (3U1D / Block)
│   │   ├── db.ts              # IndexedDB 数据库封装
│   │   ├── geometry.ts        # 几何计算、吸附与题目生成器
│   │   └── settings.ts        # 本地配置持久化
│   ├── views/                 # 主页面视图
│   │   ├── Dashboard.tsx      # 模式选择与能力看板
│   │   └── TrainingView.tsx   # 训练交互与实时监控 Header
│   ├── app.tsx                # 应用根组件与路由状态管理
│   ├── main.tsx               # 入口文件
│   └── index.css              # Tailwind 指令与全局样式
├── index.html                 # 页面 HTML 模板
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 🚀 快速开始

### 1. 环境准备
确保你的本地环境已安装 [Node.js](https://nodejs.org/) (推荐 v18+)。

### 2. 克隆项目与安装依赖
```bash
# 克隆仓库
git clone https://github.com/doucx/FormSight.git

# 进入项目目录
cd FormSight

# 安装依赖
npm install
```

### 3. 启动开发服务器
```bash
npm run dev
```
打开浏览器访问 `http://localhost:5173` 即可开始体验。

### 4. 构建生产版本
```bash
npm run build
```
构建产物将存放在 `dist/` 目录中。

---

## ⌨️ 快捷键说明

| 快捷键 | 功能 | 说明 |
| :--- | :--- | :--- |
| `Space` (空格键) | 下一题 | 当关闭“自动翻页”或答题完毕显示答案后按下 |
| `Esc` (退出键) | 结算并退出 | 在训练界面中可快速保存并返回主页看板 |
