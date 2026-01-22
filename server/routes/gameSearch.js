/**
 * Steamゲーム検索API
 * Steamタグページをスクレイピングして多くのゲームを取得
 */

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();

// キャッシュ（10分間有効）
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

// Steamタグ名からタグIDへのマッピング（Steam API準拠）
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
  'rhythm': 1752,
  'card game': 1666,
  'board game': 1770,
  'city builder': 4328,
  'management': 12472,
  'farming sim': 87918,
  'dating sim': 9551,
  'fps': 1663,
  'third person': 1697,
  'top-down': 4791,
  'side scroller': 3798,
  'bullet hell': 4885,
  'beat em up': 4158,
  'point and click': 1698,
  'stealth': 1687,
  'indie': 492,
  'arcade': 1773,
  'mmorpg': 1754,
  'moba': 1718,
  'souls-like': 29482,
  'action rpg': 4231,
  'dungeon crawler': 1720,
  'party game': 7178,
  'walking simulator': 5900,
  'idle': 615955,
  'clicker': 379975,
  // テーマ
  'fantasy': 1684,
  'sci-fi': 3942,
  'anime': 4085,
  'pixel graphics': 3964,
  'retro': 4004,
  'dark': 4342,
  'cute': 4726,
  'atmospheric': 4166,
  'comedy': 1719,
  'mystery': 5716,
  'post-apocalyptic': 3835,
  'cyberpunk': 4115,
  'medieval': 4172,
  'historical': 3987,
  'western': 1647,
  'space': 1755,
  'zombies': 1659,
  'military': 4168,
  'nature': 30358,
  'underwater': 9157,
  '2d': 3871,
  '3d': 4191,
  'isometric': 5851,
  'minimalist': 4094,
  'colorful': 4305,
  'music': 1621,
  'magic': 4057,
  'dragons': 4046,
  'mechs': 4821,
  'robots': 5752,
  'vampire': 4018,
  'demons': 9541,
  'lovecraftian': 7432,
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
  'moddable': 1669,
  'level editor': 8122,
  'replay value': 4711,
  'great soundtrack': 1756,
  'free to play': 113,
  'local multiplayer': 7368,
  'split screen': 10816,
  'perma death': 1759,
  'trading': 4202,
  // プレイスタイル
  'casual': 597,
  'difficult': 4026,
  'relaxing': 1654,
  'fast-paced': 1734,
  'turn-based': 1677,
  'real time': 4161,
  'story rich': 1742,
  'choices matter': 6426,
  'exploration': 3834,
  'hack and slash': 1646,
  'competitive': 3878,
  'pve': 6730,
  'battle royale': 176981,
  'automation': 255534,
  'building': 1643,
  'linear': 7250,
  'nonlinear': 6869,
  'short': 4234,
  'replayable': 4711,
  'loot': 1680,
  'class-based': 4155
};

/**
 * Steamタグページからゲームリストを取得
 * @param {number|number[]} tagIds - 単一または複数のタグID
 */
async function fetchGamesFromTagPage(tagIds) {
  // 複数タグをカンマ区切りで指定
  const tagsParam = Array.isArray(tagIds) ? tagIds.join(',') : tagIds;
  const url = `https://store.steampowered.com/search/?tags=${tagsParam}&category1=998&ndl=1`;

  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja,en;q=0.9',
      'Cookie': 'birthtime=0; mature_content=1; wants_mature_content=1'
    }
  });

  const $ = cheerio.load(response.data);
  const games = [];

  $('#search_resultsRows a').each((i, el) => {
    if (i >= 50) return false; // 最大50件

    const $el = $(el);
    const appid = $el.attr('data-ds-appid');
    const name = $el.find('.title').text().trim();
    const priceText = $el.find('.discount_final_price').text().trim() ||
                      $el.find('.search_price').text().trim();

    // レビュースコア
    const reviewSummary = $el.find('.search_review_summary').attr('data-tooltip-html') || '';
    let positive = 0;
    let negative = 0;
    const reviewMatch = reviewSummary.match(/(\d+)%.*?(\d[\d,]*)\s*(?:件|user)/i);
    if (reviewMatch) {
      const percent = parseInt(reviewMatch[1]);
      const total = parseInt(reviewMatch[2].replace(/,/g, ''));
      positive = Math.round(total * percent / 100);
      negative = total - positive;
    }

    // 価格パース
    let price = 0;
    if (priceText.includes('無料') || priceText.toLowerCase().includes('free')) {
      price = 0;
    } else {
      const priceMatch = priceText.match(/[¥￥]?\s*([\d,]+)/);
      if (priceMatch) {
        price = parseInt(priceMatch[1].replace(/,/g, ''));
      }
    }

    if (appid && name) {
      games.push({
        appid: parseInt(appid),
        name,
        price,
        positive,
        negative,
        owners: 'N/A',
        tags: {}
      });
    }
  });

  return games;
}

/**
 * タグでゲームを検索
 * GET /api/game-search/tag?tag=Action
 * GET /api/game-search/tag?tags=Action,Fantasy,Singleplayer (複数タグ)
 */
router.get('/tag', async (req, res) => {
  try {
    const { tag, tags } = req.query;

    // 複数タグ対応
    let tagList = [];
    if (tags) {
      tagList = tags.split(',').map(t => t.trim());
    } else if (tag) {
      tagList = [tag];
    } else {
      return res.status(400).json({ error: 'タグが指定されていません' });
    }

    // タグIDに変換
    const tagIds = tagList
      .map(t => TAG_IDS[t.toLowerCase()])
      .filter(id => id !== undefined);

    if (tagIds.length === 0) {
      return res.status(400).json({ error: '有効なタグが見つかりません' });
    }

    // キャッシュチェック
    const cacheKey = `tags:${tagIds.sort().join(',')}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[GameSearch] キャッシュヒット: ${tagList.join(',')} (${Object.keys(cached.data).length}件)`);
      return res.json(cached.data);
    }

    console.log(`[GameSearch] Steam検索: ${tagList.join(',')} (tagIds: ${tagIds.join(',')})`);

    let games = [];

    // 複数タグでスクレイピング
    try {
      games = await fetchGamesFromTagPage(tagIds);
      console.log(`[GameSearch] タグページから${games.length}件取得`);
    } catch (scrapeError) {
      console.error('[GameSearch] スクレイピングエラー:', scrapeError.message);
    }

    // フォールバック: Steam Store Search API
    if (games.length === 0) {
      console.log('[GameSearch] フォールバック: Store Search API');
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
        games = searchResponse.data.items.map(game => ({
          appid: game.id,
          name: game.name,
          price: game.price ? game.price.final : 0,
          positive: 0,
          negative: 0,
          owners: 'N/A',
          tags: {}
        }));
      }
    }

    // オブジェクト形式に変換
    const formattedGames = {};
    for (const game of games) {
      formattedGames[game.appid] = game;
    }

    // キャッシュに保存
    cache.set(cacheKey, { data: formattedGames, timestamp: Date.now() });

    console.log(`[GameSearch] 最終結果: ${Object.keys(formattedGames).length}件`);
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
 * 人気ゲームを取得
 * GET /api/game-search/popular
 */
router.get('/popular', async (req, res) => {
  try {
    const cacheKey = 'popular:all';
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

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
