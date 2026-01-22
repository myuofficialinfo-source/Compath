/**
 * インディーリリースカレンダーAPI
 * Steamの近日リリース予定のインディーゲームを取得
 */

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();

// キャッシュ（30分間有効）
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

// 価格上限（円）
const MAX_PRICE = 5000;

/**
 * Steamの近日リリースページからゲームを取得
 * @param {number} page - ページ番号
 */
async function fetchUpcomingGames(page = 0) {
  // Indieタグ (492) + 近日リリースでフィルタ
  const start = page * 50;
  const url = `https://store.steampowered.com/search/?sort_by=Released_DESC&tags=492&category1=998&os=win&filter=comingsoon&start=${start}&count=50&ndl=1`;

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
    const $el = $(el);
    const appid = $el.attr('data-ds-appid');
    const name = $el.find('.title').text().trim();

    // 発売日を取得
    const releaseDateText = $el.find('.search_released').text().trim();

    // 価格を取得
    const priceText = $el.find('.discount_final_price').text().trim() ||
                      $el.find('.search_price').text().trim();

    let price = 0;
    if (priceText.includes('無料') || priceText.toLowerCase().includes('free')) {
      price = 0;
    } else {
      const priceMatch = priceText.match(/[¥￥]?\s*([\d,]+)/);
      if (priceMatch) {
        price = parseInt(priceMatch[1].replace(/,/g, ''));
      }
    }

    // 価格フィルタ（5000円以下、または未定/無料）
    if (price > MAX_PRICE) {
      return;
    }

    // 発売日をパース
    const releaseDate = parseReleaseDate(releaseDateText);

    if (appid && name) {
      games.push({
        appid: parseInt(appid),
        name,
        price,
        releaseDate,
        releaseDateText,
        headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`
      });
    }
  });

  return games;
}

/**
 * 発売日テキストをパースしてYYYY-MM-DD形式に変換
 */
function parseReleaseDate(dateStr) {
  if (!dateStr) return null;

  // "2025年1月15日" 形式
  const jaMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (jaMatch) {
    return `${jaMatch[1]}-${jaMatch[2].padStart(2, '0')}-${jaMatch[3].padStart(2, '0')}`;
  }

  // "Jan 15, 2025" または "15 Jan, 2025" 形式
  const months = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };

  // "Jan 15, 2025"
  const enMatch1 = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (enMatch1) {
    const month = months[enMatch1[1]] || '01';
    return `${enMatch1[3]}-${month}-${enMatch1[2].padStart(2, '0')}`;
  }

  // "15 Jan, 2025"
  const enMatch2 = dateStr.match(/(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/);
  if (enMatch2) {
    const month = months[enMatch2[2]] || '01';
    return `${enMatch2[3]}-${month}-${enMatch2[1].padStart(2, '0')}`;
  }

  // "Q1 2025" や "2025" のような曖昧な日付
  const yearMatch = dateStr.match(/(\d{4})/);
  if (yearMatch) {
    // 年だけの場合は1月1日として扱う
    return `${yearMatch[1]}-01-01`;
  }

  return null;
}

/**
 * 近日リリースのインディーゲームを取得
 * GET /api/indie-calendar/upcoming
 */
router.get('/upcoming', async (req, res) => {
  try {
    const cacheKey = 'indie:upcoming';
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[IndieCalendar] キャッシュヒット: ${cached.data.length}件`);
      return res.json({ games: cached.data });
    }

    console.log('[IndieCalendar] Steam検索開始');

    // 複数ページから取得
    const allGames = [];
    for (let page = 0; page < 3; page++) {
      try {
        const games = await fetchUpcomingGames(page);
        allGames.push(...games);
        console.log(`[IndieCalendar] ページ${page + 1}: ${games.length}件`);

        if (games.length < 50) break; // これ以上ページがない
      } catch (err) {
        console.error(`[IndieCalendar] ページ${page + 1}取得エラー:`, err.message);
        break;
      }
    }

    // 重複を除去
    const uniqueGames = Array.from(
      new Map(allGames.map(g => [g.appid, g])).values()
    );

    // 発売日でソート（日付がないものは後ろ）
    uniqueGames.sort((a, b) => {
      if (!a.releaseDate && !b.releaseDate) return 0;
      if (!a.releaseDate) return 1;
      if (!b.releaseDate) return -1;
      return a.releaseDate.localeCompare(b.releaseDate);
    });

    // キャッシュに保存
    cache.set(cacheKey, { data: uniqueGames, timestamp: Date.now() });

    console.log(`[IndieCalendar] 最終結果: ${uniqueGames.length}件`);
    res.json({ games: uniqueGames });
  } catch (error) {
    console.error('[IndieCalendar] エラー:', error.message);
    res.status(500).json({
      error: 'インディーゲーム情報の取得に失敗しました',
      message: error.message
    });
  }
});

/**
 * 特定月のゲームを取得
 * GET /api/indie-calendar/month?year=2025&month=1
 */
router.get('/month', async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: '年と月を指定してください' });
    }

    // まず全データを取得
    const cacheKey = 'indie:upcoming';
    let allGames;

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      allGames = cached.data;
    } else {
      // キャッシュがない場合は取得
      const games = [];
      for (let page = 0; page < 3; page++) {
        try {
          const pageGames = await fetchUpcomingGames(page);
          games.push(...pageGames);
          if (pageGames.length < 50) break;
        } catch (err) {
          break;
        }
      }
      allGames = Array.from(new Map(games.map(g => [g.appid, g])).values());
      cache.set(cacheKey, { data: allGames, timestamp: Date.now() });
    }

    // 指定月でフィルタ
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const monthGames = allGames.filter(g =>
      g.releaseDate && g.releaseDate.startsWith(yearMonth)
    );

    res.json({ games: monthGames });
  } catch (error) {
    console.error('[IndieCalendar] 月別取得エラー:', error.message);
    res.status(500).json({
      error: '月別データの取得に失敗しました',
      message: error.message
    });
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
