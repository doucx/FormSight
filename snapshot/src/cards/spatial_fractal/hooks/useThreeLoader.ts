import { useEffect, useState } from 'preact/hooks';
import type * as THREE_TYPE from 'three';
import type { OrbitControls as OrbitControls_TYPE } from 'three/examples/jsm/controls/OrbitControls.js';

export interface ThreeLibs {
  THREE: typeof THREE_TYPE;
  OrbitControls: typeof OrbitControls_TYPE;
}

// 全局 Promise 缓存，保障整个生命周期只请求一次
let threePromiseCache: Promise<ThreeLibs> | null = null;

export function useThreeLoader() {
  const [libs, setLibs] = useState<ThreeLibs | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!threePromiseCache) {
      threePromiseCache = Promise.all([
        import('three'),
        import('three/examples/jsm/controls/OrbitControls.js'),
      ]).then(([threeModule, controlsModule]) => ({
        THREE: threeModule,
        OrbitControls: controlsModule.OrbitControls,
      }));
    }

    threePromiseCache
      .then((loadedLibs) => {
        if (isMounted) setLibs(loadedLibs);
      })
      .catch((err) => {
        if (isMounted) setError(err);
        threePromiseCache = null; 
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { 
    libs, 
    isLoading: !libs && !error, 
    error 
  };
}