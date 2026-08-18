## [COMMIT] refactor(color): Implement tetrahedral distractor generation with gamut margin filtering

~~~~~act
git_add
src/utils/relativeColorUtils.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(color): Implement tetrahedral distractor generation with gamut margin filtering

Resolves a vulnerability in relative color training where target colors landing near the extreme sRGB gamut boundary caused distractor options to collapse ("flatten") onto the S=100% boundary, enabling user exploits (e.g., matching hues and picking darker swatches).

- Replaced deterministic axis-aligned orthogonal offsets with a regular tetrahedron generated via random 3D rotations (Rodrigues' rotation formula).
- Implemented `hasGamutMargin` and `isOkLabInGamut` to verify that target color D maintains sufficient headroom in all 3D OKLab axes before wrapping it with distractor vertices at distance R.
- Ensures all 4 options maintain equal perceptual distances and prevents gamut-clipping flattening artifacts.
~~~~~
