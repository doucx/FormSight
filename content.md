## [WIP] 取消 3D 视图的自动旋转

我将修改 `playground/fractal_section_prototype.html` 中的 `initThree` 函数，将 `controls.autoRotate` 设置为 `false`，从而取消 3D 视图的自动旋转。

~~~~~act
patch_file
playground/fractal_section_prototype.html
~~~~~
~~~~~old
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.8;
~~~~~
~~~~~new
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0.8;
~~~~~
