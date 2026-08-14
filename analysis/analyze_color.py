#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
FormSight 色感训练数据分析脚本
用于分析色相 (Hue)、明度 (Value)、饱和度 (Sat) 做答数据，计算 12 色相扇区正确率，
并通过随机森林提取各维度对识别准确率的影响权重。
"""

import glob
import json
import math
import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier


def find_export_file():
    """在根目录及当前目录搜寻最新的 FormSight 导出 JSON 文件"""
    search_paths = [
        "formsight_data_*.json",
        "../formsight_data_*.json",
        "analysis/formsight_data_*.json",
    ]
    matched_files = []
    for pattern in search_paths:
        matched_files.extend(glob.glob(pattern))

    if not matched_files:
        return None

    # 按修改时间排序，取最新的一个
    latest_file = max(matched_files, key=os.path.getmtime)
    return latest_file


def load_data(file_path):
    """载入并解析 JSON 数据"""
    print(f"📦 正在载入数据文件: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def analyze_color_data():
    file_path = find_export_file()
    if not file_path:
        print("❌ 未找到导出的 JSON 数据文件！")
        print(
            "💡 请先在 FormSight Web 界面点击『全局设置』->『导出全量 JSON』，并将其放置在项目根目录或 analysis 目录下。"
        )
        sys.exit(1)

    raw_data = load_data(file_path)
    color_records = raw_data.get("color_records", [])

    if not color_records:
        print("⚠️ 导出数据中未包含 `color_records` 训练日志。请先去色感模块练习几道题吧！")
        return

    df = pd.DataFrame(color_records)

    # 展开 HSV 数组特征
    df["targetH"] = df["targetHSV"].apply(lambda x: x[0] if isinstance(x, list) else 0)
    df["targetS"] = df["targetHSV"].apply(lambda x: x[1] if isinstance(x, list) else 0)
    df["targetV"] = df["targetHSV"].apply(lambda x: x[2] if isinstance(x, list) else 0)

    # 仅分析色相 (H) 模式数据
    df_h = df[df["mode"] == "H"].copy()

    print(f"\n✅ 成功加载 {len(df)} 条色感日志，其中色相 (H) 模式记录: {len(df_h)} 条\n")

    if len(df_h) == 0:
        print("⚠️ 暂无色相 (H) 模式的练习记录，无法生成色相弱点分析。")
        return

    # === 1. 12 色相扇区 (每 30° 一区) 统计 ===
    bins = list(range(0, 390, 30))
    labels = [f"{i}°-{i+30}°" for i in range(0, 360, 30)]
    df_h["hue_bucket"] = pd.cut(
        df_h["targetH"], bins=bins, labels=labels, include_lowest=True, right=False
    )

    bucket_stats = (
        df_h.groupby("hue_bucket", observed=False)
        .agg(
            total=("isHit", "count"),
            hits=("isHit", "sum"),
            avg_error=("errorValue", "mean"),
            avg_rt=("responseTimeMs", "mean"),
        )
        .reset_index()
    )

    bucket_stats["accuracy"] = np.where(
        bucket_stats["total"] > 0,
        (bucket_stats["hits"] / bucket_stats["total"] * 100).round(1),
        0.0,
    )
    bucket_stats["avg_error"] = bucket_stats["avg_error"].round(1)
    bucket_stats["avg_rt_sec"] = (bucket_stats["avg_rt"] / 1000.0).round(2)

    # 重命名便于展示
    display_stats = bucket_stats[
        ["hue_bucket", "total", "hits", "accuracy", "avg_error", "avg_rt_sec"]
    ].copy()
    display_stats.columns = [
        "色相区间",
        "题数",
        "击中数",
        "正确率 (%)",
        "平均角度误差 (°)",
        "平均用时 (s)",
    ]

    print("📊 【色相 12 扇区做答表现统计】")
    print(display_stats.to_string(index=False))
    print("\n" + "=" * 60 + "\n")

    # === 2. 随机森林特征归因分析 ===
    # 针对色相环形连续性，构造 sin/cos 编码
    df_h["hue_rad"] = df_h["targetH"] * math.pi / 180.0
    df_h["hue_sin"] = np.sin(df_h["hue_rad"])
    df_h["hue_cos"] = np.cos(df_h["hue_rad"])

    X = df_h[["hue_sin", "hue_cos", "targetS", "targetV", "difficultyLevel"]]
    y = df_h["isHit"].astype(int)

    rf_summary_text = ""
    if len(df_h) >= 10 and len(y.unique()) > 1:
        clf = RandomForestClassifier(n_estimators=100, max_depth=4, random_state=42)
        clf.fit(X, y)

        feature_names = [
            "色相方向 (Sin)",
            "色相方向 (Cos)",
            "饱和度 (S)",
            "明度 (V)",
            "难度 Level",
        ]
        importances = clf.feature_importances_

        rf_summary_text += "🌲 【随机森林维度影响权重 (Feature Importances)】\n"
        for name, imp in sorted(
            zip(feature_names, importances), key=lambda x: x[1], reverse=True
        ):
            rf_summary_text += f" - {name:<12}: {imp*100:5.1f}%\n"
    else:
        rf_summary_text += "💡 当前样本量小于 10 条或做答全胜/全败，建议继续积累练习数据后进行机器学习归因。\n"

    print(rf_summary_text)

    # === 3. 生成可直接提交给 AI 诊断的 Prompt 报告 ===
    weak_sectors = display_stats[
        (display_stats["题数"] >= 1) & (display_stats["正确率 (%)"] < 70)
    ]

    ai_prompt = f"""# FormSight 色色彩感知数据分析报告

## 1. 总体概况
- **总做答题数**: {len(df_h)} 题
- **总体正确率**: {(df_h['isHit'].mean() * 100):.1f}%
- **平均绝对角度误差**: {df_h['errorValue'].mean():.1f}°
- **平均响应用时**: {(df_h['responseTimeMs'].mean() / 1000.0):.2f} 秒

## 2. 色相 12 扇区明细 (0°~360°)
{display_stats.to_markdown(index=False)}

## 3. 维度因子归因 (随机森林模型)
```text
{rf_summary_text}
```

## 4. 识别出的盲点扇区 (正确率 < 70%)
{weak_sectors.to_markdown(index=False) if not weak_sectors.empty else "目前各已知扇区正确率均在 70% 以上，表现良好！"}

---

### AI 诊断指引
请作为资深视觉艺术与色彩学专家，针对以上数据提供具体的诊断与建议：
1. 分析特定色相区间（例如 250°-360° 蓝紫/品红区）表现较差的原因（如视锥细胞对短波光的敏感度差异或显示器发光特性）。
2. 分析饱和度 (S) 与明度 (V) 对色相辨识的干扰模式。
3. 给出后续针对性的练习策与强化建议。
"""

    output_prompt_path = os.path.join(
        os.path.dirname(file_path), "ai_analysis_prompt.md"
    )
    if not os.path.exists(os.path.dirname(output_prompt_path)):
        output_prompt_path = "ai_analysis_prompt.md"

    with open(output_prompt_path, "w", encoding="utf-8") as f:
        f.write(ai_prompt)

    print("=" * 60)
    print(f"✨ 分析完成！结构化 Prompt 报告已导出至: `{output_prompt_path}`")
    print("👉 你可以将该文件内容直接复制发送给 ChatGPT / Claude 获取专属色彩训练指导。")


if __name__ == "__main__":
    analyze_color_data()