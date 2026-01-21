/**
 * Steamゲーム検索API
 * SteamSpy APIをサーバーサイドでプロキシしてCORS問題を回避
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

// キャッシュ（5分間有効）
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * タグでゲームを検索
 * GET /api/game-search/tag?tag=Action
 */
router.get('/tag', async (req, res) => {
  try {
    const { tag } = req.query;

    if (!tag) {
      return res.status(400).json({ error: 'タグが指定されていません' });
    }

    // キャッシュチェック
    const cacheKey = `tag:${tag.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[GameSearch] キャッシュヒット: ${tag}`);
      return res.json(cached.data);
    }

    console.log(`[GameSearch] SteamSpy APIリクエスト: ${tag}`);

    // SteamSpy APIにリクエスト
    const response = await axios.get('https://steamspy.com/api.php', {
      params: {
        request: 'tag',
        tag: tag
      },
      timeout: 15000,
      headers: {
        'User-Agent': 'SteamCompass/1.0'
      }
    });

    const data = response.data;

    // キャッシュに保存
    cache.set(cacheKey, { data, timestamp: Date.now() });

    res.json(data);
  } catch (error) {
    console.error('[GameSearch] エラー:', error.message);

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'SteamSpy APIがタイムアウトしました' });
    }

    res.status(500).json({
      error: 'ゲーム検索に失敗しました',
      message: error.message
    });
  }
});

/**
 * ゲーム詳細を取得
 * GET /api/game-search/appdetails?appid=123456
 */
router.get('/appdetails', async (req, res) => {
  try {
    const { appid } = req.query;

    if (!appid) {
      return res.status(400).json({ error: 'AppIDが指定されていません' });
    }

    // キャッシュチェック
    const cacheKey = `app:${appid}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    const response = await axios.get('https://steamspy.com/api.php', {
      params: {
        request: 'appdetails',
        appid: appid
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'SteamCompass/1.0'
      }
    });

    const data = response.data;
    cache.set(cacheKey, { data, timestamp: Date.now() });

    res.json(data);
  } catch (error) {
    console.error('[GameSearch] 詳細取得エラー:', error.message);
    res.status(500).json({ error: 'ゲーム詳細の取得に失敗しました' });
  }
});

// 古いキャッシュを定期的にクリーンアップ
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}, 60000);

module.exports = router;
