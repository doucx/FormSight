好的，我们将对 `src/storage/db/importExport.ts` 中的 `importAllData` 实现进行全量性能优化，消除事务分批等待、减少 GC 开销并加入域与时间计算缓存。

## [WIP] perf: 优化全量数据导入性能减少批量写入延迟

### 用户需求
解决当导入 7MB（约 19,000 条做答记录）备份文件时，导入过程耗时达 32 秒的性能瓶颈，将其优化至 1~2 秒级别。

### 评论
当前实现中频繁创建读写事务并等待落盘 (`await tx.done`)、高频浅拷贝大对象导致 GC 停顿以及未缓存域解析与时间计算，严重制约了数据治理管道的吞吐量。此次优化可显著改善大批量历史数据恢复时的体验。

### 目标
1. 在 `importAllData` 中，将 `records` 表的写入合并为单一事务，彻底消除多次分批事务带来的硬磁盘同步（fsync）等待。
2. 建立卡片所属域（`domain`）的内存缓存，避免万级循环重复查询注册表。
3. 原地修改解析后的 JSON 记录对象，消除 `{ ...r }` 浅拷贝引发的垃圾回收停顿。
4. 优化 `daily_summaries` 退化计算逻辑，加入时间戳邻近缓存避免高频 `new Date()`。

### 基本原理
IndexedDB 的批量写入性能主要受事务落盘频率与对象分配开销制约。通过将所有 `records.put` 放入同一个 `readwrite` 事务中并由浏览器底层调度批量提交，配合原地属性赋值（In-place mutation），能将 I/O 与 CPU 资源消耗降至最低。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/state #scope/core #scope/dx #ai/instruct #task/domain/storage #task/object/backup-import #task/action/performance-optimization #task/state/begin

---

### Script

#### Acts 1: 优化 `importExport.ts` 中的 `importAllData` 实现

我们将重构 `importAllData` 中的写入与聚合逻辑，消除多余的事务截断与对象复制。

~~~~~act
patch_file
src/storage/db/importExport.ts
~~~~~
~~~~~typescript
    // 1. 导入 sessions
    if (parsed.sessions && parsed.sessions.length > 0) {
      const tx = db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      for (const s of parsed.sessions) {
        const cardId = s.cardId || s.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : s.domain || 'core';
        store.put({ ...s, domain, cardId });
      }
      await tx.done;
    }

    // 2. 导入 profiles
    if (parsed.profiles && parsed.profiles.length > 0) {
      const tx = db.transaction('user_profiles', 'readwrite');
      const store = tx.objectStore('user_profiles');
      for (const p of parsed.profiles) {
        const cardId = p.cardId || p.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : p.domain || 'core';
        const totalTrials = p.totalTrials ?? 0;
        store.put({ ...p, cardId, domain, totalTrials });
      }
      await tx.done;
    }

    // 3. 分批写入海量 records (每 2500 条为一个独立事务批次，采用管线并发排队)
    if (parsed.records && parsed.records.length > 0) {
      const BATCH_SIZE = 2500;
      for (let i = 0; i < parsed.records.length; i += BATCH_SIZE) {
        const batch = parsed.records.slice(i, i + BATCH_SIZE);
        const tx = db.transaction('records', 'readwrite');
        const store = tx.objectStore('records');
        for (const r of batch) {
          const cardId = r.cardId || r.mode;
          const card = registry.getCardById(cardId);
          const domain = card ? card.domain : r.domain || 'core';
          store.put({ ...r, domain, cardId });
        }
        await tx.done;
      }
    }

    // 4. 写入或重新生成 daily_summaries
    if (parsed.dailySummaries && parsed.dailySummaries.length > 0) {
      const tx = db.transaction('daily_summaries', 'readwrite');
      const store = tx.objectStore('daily_summaries');
      for (const d of parsed.dailySummaries) {
        const cardId = d.cardId || d.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : d.domain || 'core';
        store.put({
          ...d,
          cardId,
          domain,
        });
      }
      await tx.done;
    } else if (parsed.records && parsed.records.length > 0) {
      const summaryMap = new Map<string, DailySummaryData>();
      for (const r of parsed.records) {
        const cardId = r.cardId || r.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : r.domain || 'core';
        const date = getLocalDateString(r.timestamp);
        const summaryId = `${date}_${cardId}`;
        const respMs = Number(r.responseTimeMs) || 0;
        const level = Number(r.difficultyLevel) || 1;

        const existing = summaryMap.get(summaryId);
        if (!existing) {
          summaryMap.set(summaryId, {
            id: summaryId,
            date,
            cardId,
            domain,
            mode: r.mode,
            totalCount: 1,
            hitCount: r.isHit ? 1 : 0,
            totalTimeMs: respMs,
            maxLevel: level,
            minLevel: level,
            lastLevel: level,
            updatedAt: r.timestamp,
          });
        } else {
          existing.domain = domain;
          existing.totalCount += 1;
          if (r.isHit) existing.hitCount += 1;
          existing.totalTimeMs += respMs;
          existing.maxLevel = Math.max(existing.maxLevel, level);
          existing.minLevel = Math.min(existing.minLevel, level);
          if (r.timestamp >= existing.updatedAt) {
            existing.lastLevel = level;
            existing.updatedAt = r.timestamp;
          }
        }
      }

      const tx = db.transaction('daily_summaries', 'readwrite');
      const store = tx.objectStore('daily_summaries');
      for (const summary of summaryMap.values()) {
        store.put(summary);
      }
      await tx.done;
    }
~~~~~
~~~~~typescript
    // 卡片 Domain 内存缓存映射，避免万级循环中高频查表
    const cardDomainCache = new Map<string, string>();
    const getCachedDomain = (cardId: string, fallbackDomain?: string): string => {
      const cached = cardDomainCache.get(cardId);
      if (cached !== undefined) return cached;
      const card = registry.getCardById(cardId);
      const domain = card ? card.domain : fallbackDomain || 'core';
      cardDomainCache.set(cardId, domain);
      return domain;
    };

    // 1 & 2. 导入 sessions 与 profiles (合并至单一元数据事务)
    if (
      (parsed.sessions && parsed.sessions.length > 0) ||
      (parsed.profiles && parsed.profiles.length > 0)
    ) {
      const metaTx = db.transaction(['sessions', 'user_profiles'], 'readwrite');
      if (parsed.sessions && parsed.sessions.length > 0) {
        const sessionStore = metaTx.objectStore('sessions');
        for (const s of parsed.sessions) {
          const cardId = s.cardId || s.mode;
          s.cardId = cardId;
          s.domain = getCachedDomain(cardId, s.domain);
          sessionStore.put(s);
        }
      }
      if (parsed.profiles && parsed.profiles.length > 0) {
        const profileStore = metaTx.objectStore('user_profiles');
        for (const p of parsed.profiles) {
          const cardId = p.cardId || p.mode;
          p.cardId = cardId;
          p.domain = getCachedDomain(cardId, p.domain);
          p.totalTrials = p.totalTrials ?? 0;
          profileStore.put(p);
        }
      }
      await metaTx.done;
    }

    // 3. 写入海量 records (单事务批量流式写入，原地修改对象消除 GC 停顿与多次 fsync)
    if (parsed.records && parsed.records.length > 0) {
      const tx = db.transaction('records', 'readwrite');
      const store = tx.objectStore('records');
      for (let i = 0; i < parsed.records.length; i++) {
        const r = parsed.records[i];
        const cardId = r.cardId || r.mode;
        r.cardId = cardId;
        r.domain = getCachedDomain(cardId, r.domain);
        store.put(r);
      }
      await tx.done;
    }

    // 4. 写入或重新生成 daily_summaries
    if (parsed.dailySummaries && parsed.dailySummaries.length > 0) {
      const tx = db.transaction('daily_summaries', 'readwrite');
      const store = tx.objectStore('daily_summaries');
      for (const d of parsed.dailySummaries) {
        const cardId = d.cardId || d.mode;
        d.cardId = cardId;
        d.domain = getCachedDomain(cardId, d.domain);
        store.put(d);
      }
      await tx.done;
    } else if (parsed.records && parsed.records.length > 0) {
      const summaryMap = new Map<string, DailySummaryData>();
      let lastTimestamp = -1;
      let lastDateStr = '';

      for (const r of parsed.records) {
        const cardId = r.cardId || r.mode;
        const domain = getCachedDomain(cardId, r.domain);

        // 时间戳邻近缓存优化：同日或近时间戳避免重复 new Date() 计算
        let dateStr = lastDateStr;
        if (Math.abs(r.timestamp - lastTimestamp) > 1000 * 60 * 60 * 12 || lastDateStr === '') {
          dateStr = getLocalDateString(r.timestamp);
          lastTimestamp = r.timestamp;
          lastDateStr = dateStr;
        }

        const summaryId = `${dateStr}_${cardId}`;
        const respMs = Number(r.responseTimeMs) || 0;
        const level = Number(r.difficultyLevel) || 1;

        const existing = summaryMap.get(summaryId);
        if (!existing) {
          summaryMap.set(summaryId, {
            id: summaryId,
            date: dateStr,
            cardId,
            domain,
            mode: r.mode,
            totalCount: 1,
            hitCount: r.isHit ? 1 : 0,
            totalTimeMs: respMs,
            maxLevel: level,
            minLevel: level,
            lastLevel: level,
            updatedAt: r.timestamp,
          });
        } else {
          existing.domain = domain;
          existing.totalCount += 1;
          if (r.isHit) existing.hitCount += 1;
          existing.totalTimeMs += respMs;
          existing.maxLevel = Math.max(existing.maxLevel, level);
          existing.minLevel = Math.min(existing.minLevel, level);
          if (r.timestamp >= existing.updatedAt) {
            existing.lastLevel = level;
            existing.updatedAt = r.timestamp;
          }
        }
      }

      const tx = db.transaction('daily_summaries', 'readwrite');
      const store = tx.objectStore('daily_summaries');
      for (const summary of summaryMap.values()) {
        store.put(summary);
      }
      await tx.done;
    }
~~~~~

### 下一步建议
- 执行导入 7MB 备份文件的实际测试，测量导入耗时并验证 UI 遮罩层是否流畅关闭。
- 确认全量数据导入后，数据统计（热力图、掌握度、生涯总用时等）能够即时且完整地刷新。
