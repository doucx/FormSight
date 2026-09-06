## [WIP] 取消负空间雕刻

我将修改 `playground/fractal_section_prototype.html`，完全**取消负空间雕刻**（移除通过 `Math.max(dist, holeDepth)` 在物体内部挖洞的逻辑），并把高难度阶段更新为“多层复合分形褶皱与高阶连续曲面”，确保所有难度下物体均保持饱满、坚实的连通外形。

~~~~~act
patch_file
playground/fractal_section_prototype.html
~~~~~
~~~~~old
    function evaluateSDF(x, y, z, level) {
      let r = Math.sqrt(x*x + y*y + z*z);

      let macroNoise = (smoothNoise3D(x * 0.85 + 1.2, y * 0.85 + 1.2, z * 0.85 + 1.2) - 0.5) * 0.65;
      let dist = (r - 1.15) - macroNoise;

      if (level <= 8) return dist;

      let facetWeight = Math.min(1.0, (level - 8) / 10);
      let facetNoise = Math.abs(smoothNoise3D(x * 1.6 + 3.0, y * 1.6 + 3.0, z * 1.6 + 3.0) - 0.5) * 0.85;
      dist = dist - facetWeight * facetNoise;

      if (level <= 18) return dist;

      let cavityWeight = Math.min(1.0, (level - 18) / 10);
      let cavityNoise = smoothNoise3D(x * 2.4 + 5.5, y * 2.4 + 5.5, z * 2.4 + 5.5);
      if (cavityNoise > 0.62) {
        let holeDepth = (cavityNoise - 0.62) * 2.8 * cavityWeight;
        dist = Math.max(dist, holeDepth);
      }

      if (level <= 28) return dist;

      let chaosWeight = (level - 28) / 7;
      let fineNoise = (fbm3D(x * 3.2, y * 3.2, z * 3.2, 3) - 0.5) * 0.6 * chaosWeight;
      dist = dist - fineNoise;

      return dist;
    }
~~~~~
~~~~~new
    function evaluateSDF(x, y, z, level) {
      let r = Math.sqrt(x*x + y*y + z*z);

      let macroNoise = (smoothNoise3D(x * 0.85 + 1.2, y * 0.85 + 1.2, z * 0.85 + 1.2) - 0.5) * 0.65;
      let dist = (r - 1.15) - macroNoise;

      if (level <= 8) return dist;

      let facetWeight = Math.min(1.0, (level - 8) / 10);
      let facetNoise = Math.abs(smoothNoise3D(x * 1.6 + 3.0, y * 1.6 + 3.0, z * 1.6 + 3.0) - 0.5) * 0.85;
      dist = dist - facetWeight * facetNoise;

      if (level <= 18) return dist;

      let chaosWeight = Math.min(1.0, (level - 18) / 17);
      let fineNoise = (fbm3D(x * 3.0, y * 3.0, z * 3.0, 3) - 0.5) * 0.65 * chaosWeight;
      dist = dist - fineNoise;

      return dist;
    }
~~~~~

~~~~~act
patch_file
playground/fractal_section_prototype.html
~~~~~
~~~~~old
    function getMorphologyMeta(level) {
      if (level <= 8) {
        return {
          tier: '入门 (平滑凸模)',
          stage: '形态: 平滑圆润大模',
          topology: '单连通平滑凸包',
          octavesText: '1~2 Macro Waves',
          desc: '低难度下物体呈平滑大模，截面具有规则单连通凸起，适合快速建立空间感知。'
        };
      } else if (level <= 18) {
        return {
          tier: '进阶 (棱角矿石)',
          stage: '形态: 多面棱角折叠',
          topology: '多凹陷单连通体',
          octavesText: '2 Octaves + 折痕切割',
          desc: '中等难度引入棱脊与多向非对称切面，截面出现折角和不对称特征。'
        };
      } else if (level <= 28) {
        return {
          tier: '挑战 (多孔空腔)',
          stage: '形态: 负空间多孔拓扑',
          topology: '环面多孔 / 局部孤岛',
          octavesText: '3 Octaves + 穿透空腔',
          desc: '高难度下激活负空间空腔雕刻，截面可能呈现内孔洞或分离的小岛屿。'
        };
      } else {
        return {
          tier: '大师 (混沌分形)',
          stage: '形态: 混沌多重分形簇',
          topology: '高阶复杂多岛群落',
          octavesText: '5 Octaves + 混沌微刺',
          desc: '大师级拥有丰富的微观多层自相似分形突刺，必须精确校验局域曲率。'
        };
      }
    }
~~~~~
~~~~~new
    function getMorphologyMeta(level) {
      if (level <= 8) {
        return {
          tier: '入门 (平滑凸模)',
          stage: '形态: 平滑圆润大模',
          topology: '单连通平滑凸包',
          octavesText: '1~2 Macro Waves',
          desc: '低难度下物体呈平滑大模，截面具有规则单连通凸起，适合快速建立空间感知。'
        };
      } else if (level <= 18) {
        return {
          tier: '进阶 (棱角矿石)',
          stage: '形态: 多面棱角折叠',
          topology: '多凹陷单连通体',
          octavesText: '2 Octaves + 折痕切割',
          desc: '中等难度引入棱脊与多向非对称切面，截面出现折角和不对称特征。'
        };
      } else if (level <= 28) {
        return {
          tier: '挑战 (复杂褶皱)',
          stage: '形态: 多层复合分形褶皱',
          topology: '高阶连续复杂曲面',
          octavesText: '3 Octaves + 表面褶皱',
          desc: '高难度下激活多层复合分形褶皱，截面呈现细腻的曲率起伏与非线性边界。'
        };
      } else {
        return {
          tier: '大师 (混沌分形)',
          stage: '形态: 混沌多重分形簇',
          topology: '高阶精细自相似体',
          octavesText: '5 Octaves + 混沌微刺',
          desc: '大师级拥有丰富的微观多层自相似分形突刺，必须精确校验局域曲率。'
        };
      }
    }
~~~~~
