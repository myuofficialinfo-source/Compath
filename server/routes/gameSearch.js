/**
 * Steamゲーム検索API
 * Steam公式APIを使用してタグ検索を実現
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

// キャッシュ（10分間有効）
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

// Steamタグ名からタグIDへのマッピング（主要なタグ）
const TAG_IDS = {
  // ジャンル
  'action': 19,
  'adventure': 21,
  'rpg': 122,
  'strategy': 9,
  'simulation': 599,
  'puzzle': 1664,
  'platformer': 1625,
  'shooter': 1774,
  'racing': 699,
  'sports': 701,
  'fighting': 1743,
  'horror': 1667,
  'survival': 1662,
  'roguelike': 1716,
  'roguelite': 3959,
  'metroidvania': 1628,
  'visual novel': 3799,
  'jrpg': 4434,
  'tactical': 1708,
  'tower defense': 1645,
  // テーマ
  'fantasy': 1684,
  'sci-fi': 3942,
  'anime': 4085,
  'pixel graphics': 3964,
  'retro': 4004,
  'dark': 1721,
  'cute': 4726,
  'atmospheric': 4166,
  'comedy': 1719,
  'mystery': 5716,
  'post-apocalyptic': 3843,
  'cyberpunk': 4115,
  'medieval': 4172,
  'historical': 3987,
  'western': 1647,
  // 機能
  'singleplayer': 4182,
  'multiplayer': 3859,
  'co-op': 1685,
  'online co-op': 3843,
  'local co-op': 3841,
  'pvp': 1775,
  'open world': 1695,
  'sandbox': 3810,
  'procedural generation': 5125,
  'crafting': 1702,
  'base building': 7332,
  'character customization': 4747,
  'controller': 7481,
  'vr': 21978,
  'early access': 493,
  // プレイスタイル
  'casual': 597,
  'difficult': 4026,
  'relaxing': 1654,
  'fast-paced': 1734,
  'turn-based': 1677,
  'real time': 1687,
  'story rich': 1742,
  'choices matter': 6426,
  'exploration': 3834,
  'hack and slash': 1646
};

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

    const tagLower = tag.toLowerCase();
    const tagId = TAG_IDS[tagLower];

    // キャッシュチェック
    const cacheKey = `tag:${tagLower}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[GameSearch] キャッシュヒット: ${tag}`);
      return res.json(cached.data);
    }

    console.log(`[GameSearch] Steam検索: ${tag} (tagId: ${tagId})`);

    let games = [];

    if (tagId) {
      // Steam Store API - タグでフィルタされたゲームリストを取得
      const steamResponse = await axios.get('https://store.steampowered.com/api/storesearch/', {
        params: {
          term: '*',
          l: 'japanese',
          cc: 'JP',
          category1: tagId,
          category2: '',
          page: 1
        },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (steamResponse.data && steamResponse.data.items) {
        games = steamResponse.data.items;
      }
    }

    // タグ名で直接検索（フォールバック）
    if (games.length === 0) {
      const searchResponse = await axios.get('https://store.steampowered.com/api/storesearch/', {
        params: {
          term: tag,
          l: 'japanese',
          cc: 'JP'
        },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (searchResponse.data && searchResponse.data.items) {
        games = searchResponse.data.items;
      }
    }

    // ゲームデータを整形
    const formattedGames = {};
    for (const game of games.slice(0, 100)) {
      formattedGames[game.id] = {
        appid: game.id,
        name: game.name,
        price: game.price ? game.price.final : 0,
        positive: 0,
        negative: 0,
        owners: 'N/A',
        tags: {}
      };
    }

    // キャッシュに保存
    cache.set(cacheKey, { data: formattedGames, timestamp: Date.now() });

    res.json(formattedGames);
  } catch (error) {
    console.error('[GameSearch] エラー:', error.message);

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Steam APIがタイムアウトしました' });
    }

    res.status(500).json({
      error: 'ゲーム検索に失敗しました',
      message: error.message
    });
  }
});

/**
 * 人気ゲームを取得（タグID指定）
 * GET /api/game-search/popular?tagId=19
 */
router.get('/popular', async (req, res) => {
  try {
    const { tagId } = req.query;

    const cacheKey = `popular:${tagId || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    // Steam Store featured games
    const response = await axios.get('https://store.steampowered.com/api/featured/', {
      params: {
        l: 'japanese',
        cc: 'JP'
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = response.data;
    cache.set(cacheKey, { data, timestamp: Date.now() });

    res.json(data);
  } catch (error) {
    console.error('[GameSearch] 人気ゲーム取得エラー:', error.message);
    res.status(500).json({ error: '人気ゲームの取得に失敗しました' });
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
