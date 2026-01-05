/**
 * キャッシュサービス
 * API呼び出し結果をメモリにキャッシュしてコスト削減
 *
 * 特徴:
 * - インメモリキャッシュ（サーバー再起動でクリア）
 * - TTL（有効期限）付き
 * - キャッシュヒット率の統計
 */

// キャッシュストレージ
const cache = new Map();

// 統計情報
const stats = {
  hits: 0,
  misses: 0,
  saves: 0
};

// デフォルトTTL（ミリ秒）
const DEFAULT_TTL = {
  keywords: 24 * 60 * 60 * 1000,      // キーワード分析: 24時間
  keywordsDeep: 24 * 60 * 60 * 1000,  // キーワード深掘り: 24時間
  summary: 12 * 60 * 60 * 1000,       // AI要約: 12時間
  community: 6 * 60 * 60 * 1000,      // コミュニティ分析: 6時間
  gameInfo: 7 * 24 * 60 * 60 * 1000,  // ゲーム情報: 7日間
};

/**
 * キャッシュキーを生成
 * @param {string} type - キャッシュタイプ（keywords, summary等）
 * @param {string} appId - Steam AppID
 * @param {Object} options - オプション（フィルター等）
 * @returns {string} キャッシュキー
 */
function generateKey(type, appId, options = {}) {
  const optionsStr = Object.keys(options)
    .sort()
    .map(k => `${k}:${options[k]}`)
    .join('|');
  return `${type}:${appId}:${optionsStr}`;
}

/**
 * キャッシュから取得
 * @param {string} type - キャッシュタイプ
 * @param {string} appId - Steam AppID
 * @param {Object} options - オプション
 * @returns {Object|null} キャッシュされたデータ、または null
 */
function get(type, appId, options = {}) {
  const key = generateKey(type, appId, options);
  const entry = cache.get(key);

  if (!entry) {
    stats.misses++;
    return null;
  }

  // TTLチェック
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    stats.misses++;
    console.log(`[Cache] Expired: ${key}`);
    return null;
  }

  stats.hits++;
  console.log(`[Cache] Hit: ${key}`);
  return entry.data;
}

/**
 * キャッシュに保存
 * @param {string} type - キャッシュタイプ
 * @param {string} appId - Steam AppID
 * @param {Object} data - 保存するデータ
 * @param {Object} options - オプション
 * @param {number} ttl - 有効期限（ミリ秒）、省略時はデフォルト
 */
function set(type, appId, data, options = {}, ttl = null) {
  const key = generateKey(type, appId, options);
  const expiresAt = Date.now() + (ttl || DEFAULT_TTL[type] || DEFAULT_TTL.keywords);

  cache.set(key, {
    data,
    createdAt: Date.now(),
    expiresAt,
    type,
    appId
  });

  stats.saves++;
  console.log(`[Cache] Saved: ${key} (expires in ${Math.round((expiresAt - Date.now()) / 1000 / 60)} minutes)`);
}

/**
 * 特定のキャッシュを削除
 * @param {string} type - キャッシュタイプ
 * @param {string} appId - Steam AppID
 * @param {Object} options - オプション
 */
function remove(type, appId, options = {}) {
  const key = generateKey(type, appId, options);
  cache.delete(key);
  console.log(`[Cache] Removed: ${key}`);
}

/**
 * 期限切れのキャッシュをクリーンアップ
 */
function cleanup() {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[Cache] Cleanup: ${cleaned} expired entries removed`);
  }
}

/**
 * 全キャッシュをクリア
 */
function clear() {
  cache.clear();
  console.log('[Cache] All cache cleared');
}

/**
 * 統計情報を取得
 * @returns {Object} 統計情報
 */
function getStats() {
  const totalRequests = stats.hits + stats.misses;
  const hitRate = totalRequests > 0 ? Math.round((stats.hits / totalRequests) * 100) : 0;

  return {
    hits: stats.hits,
    misses: stats.misses,
    saves: stats.saves,
    hitRate: `${hitRate}%`,
    cacheSize: cache.size,
    entries: Array.from(cache.entries()).map(([key, entry]) => ({
      key,
      type: entry.type,
      appId: entry.appId,
      createdAt: new Date(entry.createdAt).toISOString(),
      expiresAt: new Date(entry.expiresAt).toISOString(),
      remainingMinutes: Math.round((entry.expiresAt - Date.now()) / 1000 / 60)
    }))
  };
}

/**
 * 統計をリセット
 */
function resetStats() {
  stats.hits = 0;
  stats.misses = 0;
  stats.saves = 0;
}

// 定期的にクリーンアップ（1時間ごと）
setInterval(cleanup, 60 * 60 * 1000);

module.exports = {
  get,
  set,
  remove,
  cleanup,
  clear,
  getStats,
  resetStats,
  DEFAULT_TTL
};
