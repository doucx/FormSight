我们可以在 `useHashRoute` 钩子中实现路由级的滚动位置记忆与恢复机制（Scroll Restoration）。在路由发生变化前记录当前页面滚动的 `window.scrollY`，并在切换回历史路由完成 DOM 渲染后自动还原滚动位置。

## [WIP] feat: 为 Hash 路由添加页面切换滚动位置持久化与恢复

### 用户需求
在页面路由切换（例如从主页 `#/` 切换到看板 `#/dashboard/abstraction` 再切回主页 `#/`）时，保留并恢复之前在对应页面的滚动条位置，避免总是自动重置回到顶端。

### 评论
单页应用（SPA）基于 Hash 路由跳转时，浏览器默认不会自动管理各虚拟路由的滚动状态，导致每次路由变化都会造成视觉断层或必须重新滚动定位。为 `useHashRoute` 补充基于 Hash 维度的滚动记忆，能够显著提升操作连续性与用户体验。

### 目标
1. 在 `src/hooks/useHashRoute.ts` 中维护路由与滚动高度（`window.scrollY`）的映射表。
2. 监听页面滚动与路由切换事件，在离开当前页面时保存其滚动高度。
3. 在切回或跳转到目标 Hash 路由时，使用 `requestAnimationFrame` 在 DOM 渲染后平滑还原对应的滚动位置。

### 基本原理
- 在 `useHashRoute` 中使用 `useRef` 维护 `scrollPositionsRef` 与 `currentHashRef`。
- 绑定全局 `scroll` 事件实时更新当前活动 Hash 对应的 `scrollY`。
- 在 `hashchange` 和 `navigate` 调用发生时记录旧路由的滚动位置，更新当前路由，并利用双重 `requestAnimationFrame` 确保页面挂载与渲染后执行 `window.scrollTo(0, targetScrollY)`。

### 标签
#intent/build #flow/ready #priority/medium #comp/cli #concept/navigation #scope/ux #ai/instruct #task/domain/ui #task/object/scroll-restoration #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 更新 `useHashRoute.ts` 实现滚动条位置恢复

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript.old
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { TrainingDomain } from '../utils/db';

export type RouteLocation =
  | { type: 'home' }
  | { type: 'dashboard'; domain: TrainingDomain }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' };

function parseHash(hash: string): RouteLocation {
  const cleanHash = hash.replace(/^#\/?/, '').trim();
  if (!cleanHash) return { type: 'home' };

  const [pathPart, queryPart] = cleanHash.split('?');
  const segments = pathPart.split('/').filter(Boolean);

  if (segments[0] === 'dashboard' && segments[1]) {
    const domain = segments[1] as TrainingDomain;
    if (
      [
        'abstraction',
        'concretization',
        'star',
        'color',
        'relative_color',
        'negative_space',
      ].includes(domain)
    ) {
      return { type: 'dashboard', domain };
    }
  }

  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const params = new URLSearchParams(queryPart || '');
    const sessionType = params.get('type') === 'benchmark' ? 'benchmark' : 'training';
    return { type: 'train', cardId, sessionType };
  }

  return { type: 'home' };
}

function stringifyRoute(route: RouteLocation): string {
  if (route.type === 'home') return '#/';
  if (route.type === 'dashboard') return `#/dashboard/${route.domain}`;
  if (route.type === 'train') return `#/train/${route.cardId}?type=${route.sessionType}`;
  return '#/';
}

export function useHashRoute() {
  const [route, setRoute] = useState<RouteLocation>(() =>
    typeof window !== 'undefined' ? parseHash(window.location.hash) : { type: 'home' },
  );

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((target: RouteLocation) => {
    const newHash = stringifyRoute(target);
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    }
  }, []);

  return { route, navigate };
}
~~~~~
~~~~~typescript.new
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { TrainingDomain } from '../utils/db';

export type RouteLocation =
  | { type: 'home' }
  | { type: 'dashboard'; domain: TrainingDomain }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' };

function parseHash(hash: string): RouteLocation {
  const cleanHash = hash.replace(/^#\/?/, '').trim();
  if (!cleanHash) return { type: 'home' };

  const [pathPart, queryPart] = cleanHash.split('?');
  const segments = pathPart.split('/').filter(Boolean);

  if (segments[0] === 'dashboard' && segments[1]) {
    const domain = segments[1] as TrainingDomain;
    if (
      [
        'abstraction',
        'concretization',
        'star',
        'color',
        'relative_color',
        'negative_space',
      ].includes(domain)
    ) {
      return { type: 'dashboard', domain };
    }
  }

  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const params = new URLSearchParams(queryPart || '');
    const sessionType = params.get('type') === 'benchmark' ? 'benchmark' : 'training';
    return { type: 'train', cardId, sessionType };
  }

  return { type: 'home' };
}

function stringifyRoute(route: RouteLocation): string {
  if (route.type === 'home') return '#/';
  if (route.type === 'dashboard') return `#/dashboard/${route.domain}`;
  if (route.type === 'train') return `#/train/${route.cardId}?type=${route.sessionType}`;
  return '#/';
}

export function useHashRoute() {
  const [route, setRoute] = useState<RouteLocation>(() =>
    typeof window !== 'undefined' ? parseHash(window.location.hash) : { type: 'home' },
  );

  const scrollPositionsRef = useRef<Record<string, number>>({});
  const currentHashRef = useRef<string>(
    typeof window !== 'undefined' ? window.location.hash || '#/' : '#/',
  );

  useEffect(() => {
    const handleScroll = () => {
      const currentKey = currentHashRef.current || '#/';
      scrollPositionsRef.current[currentKey] = window.scrollY;
    };

    const handleHashChange = () => {
      const prevHash = currentHashRef.current || '#/';
      scrollPositionsRef.current[prevHash] = window.scrollY;

      const newHash = window.location.hash || '#/';
      currentHashRef.current = newHash;
      setRoute(parseHash(newHash));

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetY = scrollPositionsRef.current[newHash] ?? 0;
          window.scrollTo(0, targetY);
        });
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = useCallback((target: RouteLocation) => {
    const newHash = stringifyRoute(target);
    if (window.location.hash !== newHash) {
      const prevHash = currentHashRef.current || '#/';
      scrollPositionsRef.current[prevHash] = window.scrollY;
      window.location.hash = newHash;
    }
  }, []);

  return { route, navigate };
}
~~~~~

### 下一步建议

1. **功能验证**：在浏览器中测试从主页向下滚动一段距离后进入具体看板，然后点击“返回主页”或使用浏览器后退键，验证滚动条是否准确停留在离开前的位置。
2. **代码提交**：确认效果符合预期后，可以由用户发起确认并生成对应的 `[COMMIT]` 计划。
