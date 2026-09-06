## [WIP] 移除负责渲染 3D 视口中截面法向量指示箭头的代码段

我将修改 `playground/fractal_section_prototype.html` 中的 `updateCuttingPlaneVisual` 函数，移除负责渲染 3D 视口中截面法向量指示箭头的代码段。

~~~~~act
patch_file
playground/fractal_section_prototype.html
~~~~~
~~~~~old
        const leftEdgeGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-halfSize, -halfSize, 0.002),
          new THREE.Vector3(-halfSize, halfSize, 0.002)
        ]);
        const leftEdgeLine = new THREE.Line(leftEdgeGeom, new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 4 }));
        planeHelper.add(leftEdgeLine);
      }

      // 法向量指示箭头
      const arrow = new THREE.ArrowHelper(q.normal, new THREE.Vector3(0,0,0), 0.65, 0x10b981, 0.15, 0.1);
      planeHelper.add(arrow);

      scene.add(planeHelper);
    }
~~~~~
~~~~~new
        const leftEdgeGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-halfSize, -halfSize, 0.002),
          new THREE.Vector3(-halfSize, halfSize, 0.002)
        ]);
        const leftEdgeLine = new THREE.Line(leftEdgeGeom, new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 4 }));
        planeHelper.add(leftEdgeLine);
      }

      scene.add(planeHelper);
    }
~~~~~
