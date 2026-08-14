# FormSight 色感与造型数据离线分析工具集

本目录提供用于解析 FormSight 导出的全量 JSON 数据的 Python 脚本，支持对色相 (Hue)、明度 (Value)、饱和度 (Sat) 练习历史进行深入统计与机器学习归因。

---

## 快速上手

### 1. 安装依赖

确保系统中已安装 Python 3.8+，然后安装分析所需依赖：

```bash
pip install -r analysis/requirements.txt
```

### 2. 导出数据

1. 打开 FormSight 应用界面。
2. 点击右上角 **『全局设置』** $\rightarrow$ 点击 **『导出全量 JSON』**。
3. 将下载的 `formsight_data_YYYY-MM-DD.json` 文件拷贝至项目根目录或 `analysis/` 目录下。

### 3. 运行分析脚本

```bash
python analysis/analyze_color.py
```

---

## 输出说明

运行脚本后将产生两部分输出：

1. **终端控制台汇总**：
   - **色相 12 扇区分布表**：将 $0^\circ \sim 360^\circ$ 划分为 12 个 $30^\circ$ 扇区，输出每个扇区的作答数、正确率、平均角度误差及用时。
   - **随机森林维度影响权重**：评估色相成分（$\sin/\cos$）、饱和度、明度及难度 Level 对判定正确率的贡献比例。

2. **`ai_analysis_prompt.md` 文件**：
   - 自动生成结构化的 Markdown 报告。
   - 可直接复制全文投喂给 AI 大模型（如 ChatGPT / Claude），获取专业的视觉色彩盲点诊断与强化方案。