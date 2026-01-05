/**
 * Steam API サービス
 * Steamストアからレビューやゲーム情報を取得
 */

const axios = require('axios');

const STEAM_API_BASE = 'https://store.steampowered.com';
const STEAM_REVIEW_API = 'https://store.steampowered.com/appreviews';

/**
 * SteamストアURLからAppIDを抽出
 * @param {string} url - SteamストアURL
 * @returns {string|null} AppID
 */
function extractAppId(url) {
  // 対応パターン:
  // https://store.steampowered.com/app/12345/Game_Name
  // https://store.steampowered.com/app/12345
  // store.steampowered.com/app/12345
  // 12345 (直接AppID)

  if (!url) return null;

  // 数字のみの場合はそのままAppIDとして扱う
  if (/^\d+$/.test(url.trim())) {
    return url.trim();
  }

  // URLからAppIDを抽出
  const patterns = [
    /store\.steampowered\.com\/app\/(\d+)/i,
    /steampowered\.com\/app\/(\d+)/i,
    /\/app\/(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * ゲーム情報を取得
 * @param {string} appId - Steam AppID
 * @returns {Promise<Object>} ゲーム情報
 */
async function getGameInfo(appId) {
  try {
    const response = await axios.get(`${STEAM_API_BASE}/api/appdetails`, {
      params: {
        appids: appId,
        l: 'japanese'
      },
      timeout: 10000
    });

    const data = response.data[appId];
    if (!data || !data.success) {
      return null;
    }

    const gameData = data.data;
    return {
      appId,
      name: gameData.name,
      headerImage: gameData.header_image,
      shortDescription: gameData.short_description,
      developers: gameData.developers || [],
      publishers: gameData.publishers || [],
      releaseDate: gameData.release_date?.date,
      genres: gameData.genres?.map(g => g.description) || [],
      categories: gameData.categories?.map(c => c.description) || [],
      metacritic: gameData.metacritic?.score,
      priceOverview: gameData.price_overview ? {
        currency: gameData.price_overview.currency,
        initial: gameData.price_overview.initial / 100,
        final: gameData.price_overview.final / 100,
        discountPercent: gameData.price_overview.discount_percent
      } : null
    };
  } catch (error) {
    console.error('ゲーム情報取得エラー:', error.message);
    throw new Error('ゲーム情報の取得に失敗しました');
  }
}

/**
 * レビューを取得
 * @param {string} appId - Steam AppID
 * @param {Object} options - フィルターオプション
 * @returns {Promise<Array>} レビュー配列
 */
async function fetchReviews(appId, options = {}) {
  const {
    language = 'all',
    playtimeFilter = 'all',
    dateFilter = 'all',
    count = 200
  } = options;

  const reviews = [];
  let cursor = '*';
  let attempts = 0;
  const maxAttempts = 15; // 最大15回のAPIコール（1000件取得可能）

  // 言語マッピング
  const languageMap = {
    'all': 'all',
    'japanese': 'japanese',
    'english': 'english',
    'schinese': 'schinese',
    'tchinese': 'tchinese',
    'korean': 'korean'
  };

  // 日付フィルター（日数に変換）
  const dayRangeMap = {
    'all': -1,
    '30days': 30,
    '90days': 90,
    '180days': 180
  };

  const dayRange = dayRangeMap[dateFilter] || -1;

  while (reviews.length < count && attempts < maxAttempts) {
    try {
      const response = await axios.get(`${STEAM_REVIEW_API}/${appId}`, {
        params: {
          json: 1,
          language: languageMap[language] || 'all',
          cursor: cursor,
          num_per_page: 100,
          filter: 'recent',
          review_type: 'all',
          purchase_type: 'all',
          day_range: dayRange > 0 ? dayRange : undefined
        },
        timeout: 15000
      });

      const data = response.data;

      if (!data.success || !data.reviews || data.reviews.length === 0) {
        break;
      }

      // レビューを処理
      for (const review of data.reviews) {
        // 短すぎるレビューを除外（50文字未満）
        if (!review.review || review.review.length < 50) {
          continue;
        }

        // プレイ時間フィルター
        const playtimeHours = review.author.playtime_forever / 60;

        if (playtimeFilter === '10hours' && playtimeHours < 10) {
          continue;
        }
        if (playtimeFilter === '5hours' && playtimeHours < 5) {
          continue;
        }

        reviews.push({
          recommendationId: review.recommendationid,
          steamId: review.author.steamid,
          language: review.language,
          review: review.review,
          votedUp: review.voted_up, // true = ポジティブ, false = ネガティブ
          votesUp: review.votes_up,
          votesFunny: review.votes_funny,
          weightedVoteScore: review.weighted_vote_score,
          playtimeForever: Math.round(playtimeHours * 10) / 10, // 小数点1桁
          playtimeAtReview: Math.round((review.author.playtime_at_review || 0) / 60 * 10) / 10,
          timestampCreated: review.timestamp_created,
          timestampUpdated: review.timestamp_updated,
          commentCount: review.comment_count,
          steamPurchase: review.steam_purchase,
          receivedForFree: review.received_for_free,
          writtenDuringEarlyAccess: review.written_during_early_access
        });

        if (reviews.length >= count) {
          break;
        }
      }

      // 次のページのカーソル
      cursor = data.cursor;
      if (!cursor || cursor === '') {
        break;
      }

      attempts++;

      // API制限対策：少し待機
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error('レビュー取得エラー:', error.message);
      if (attempts === 0) {
        throw new Error('レビューの取得に失敗しました');
      }
      break;
    }
  }

  // レビューの統計情報を追加
  const stats = calculateReviewStats(reviews);

  return {
    reviews,
    stats
  };
}

/**
 * レビュー統計を計算
 * @param {Array} reviews - レビュー配列
 * @returns {Object} 統計情報
 */
function calculateReviewStats(reviews) {
  if (!reviews || reviews.length === 0) {
    return {
      total: 0,
      positive: 0,
      negative: 0,
      positiveRate: 0,
      averagePlaytime: 0,
      byLanguage: []
    };
  }

  const positive = reviews.filter(r => r.votedUp).length;
  const negative = reviews.length - positive;
  const totalPlaytime = reviews.reduce((sum, r) => sum + (r.playtimeForever || 0), 0);

  // 言語別統計
  const languageStats = {};
  const languageNames = {
    'japanese': '日本語',
    'english': '英語',
    'schinese': '簡体字中国語',
    'tchinese': '繁体字中国語',
    'korean': '韓国語',
    'german': 'ドイツ語',
    'french': 'フランス語',
    'spanish': 'スペイン語',
    'latam': 'スペイン語(中南米)',
    'russian': 'ロシア語',
    'portuguese': 'ポルトガル語',
    'brazilian': 'ブラジルポルトガル語',
    'italian': 'イタリア語',
    'polish': 'ポーランド語',
    'thai': 'タイ語',
    'vietnamese': 'ベトナム語',
    'turkish': 'トルコ語',
    'arabic': 'アラビア語',
    'dutch': 'オランダ語',
    'czech': 'チェコ語',
    'hungarian': 'ハンガリー語',
    'indonesian': 'インドネシア語',
    'ukrainian': 'ウクライナ語'
  };

  for (const review of reviews) {
    const lang = review.language || 'unknown';
    if (!languageStats[lang]) {
      languageStats[lang] = {
        language: lang,
        languageName: languageNames[lang] || lang,
        total: 0,
        positive: 0,
        negative: 0
      };
    }
    languageStats[lang].total++;
    if (review.votedUp) {
      languageStats[lang].positive++;
    } else {
      languageStats[lang].negative++;
    }
  }

  // 好評率を計算して配列に変換、件数順でソート
  const byLanguage = Object.values(languageStats)
    .map(stat => ({
      ...stat,
      positiveRate: stat.total > 0 ? Math.round((stat.positive / stat.total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total);

  return {
    total: reviews.length,
    positive,
    negative,
    positiveRate: Math.round((positive / reviews.length) * 100),
    averagePlaytime: Math.round((totalPlaytime / reviews.length) * 10) / 10,
    byLanguage
  };
}

/**
 * ユーザーの所持ゲーム一覧を取得
 * @param {string} steamId - Steam ID
 * @returns {Promise<Array|null>} ゲームリスト（非公開の場合はnull）
 */
async function getUserOwnedGames(steamId) {
  try {
    // Steam Web API（要APIキー）
    const apiKey = process.env.STEAM_API_KEY;
    if (!apiKey) {
      console.log('STEAM_API_KEYが設定されていません');
      return null;
    }

    const response = await axios.get('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/', {
      params: {
        key: apiKey,
        steamid: steamId,
        include_appinfo: 1,
        include_played_free_games: 1
      },
      timeout: 5000
    });

    const data = response.data.response;
    if (!data || !data.games) {
      return null; // 非公開プロフィール
    }

    return data.games.map(game => ({
      appId: game.appid,
      name: game.name,
      playtime: game.playtime_forever,
      iconUrl: game.img_icon_url ?
        `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg` : null
    }));
  } catch (error) {
    // 非公開やエラーの場合はnullを返す
    return null;
  }
}

/**
 * 複数ユーザーの所持ゲームを集計
 * @param {Array<string>} steamIds - Steam ID配列
 * @param {string} excludeAppId - 除外するAppID（対象ゲーム自身）
 * @returns {Promise<Object>} 集計結果
 */
async function aggregateUserGames(steamIds, excludeAppId) {
  const gameCount = {};
  const gameInfo = {};
  let processedUsers = 0;
  let publicUsers = 0;

  // 並列で処理（同時接続数を制限）
  const batchSize = 5;
  for (let i = 0; i < steamIds.length; i += batchSize) {
    const batch = steamIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(steamId => getUserOwnedGames(steamId))
    );

    for (const games of results) {
      processedUsers++;
      if (games) {
        publicUsers++;
        for (const game of games) {
          if (game.appId.toString() === excludeAppId.toString()) continue;
          if (game.playtime < 60) continue; // 1時間未満は除外

          const id = game.appId.toString();
          gameCount[id] = (gameCount[id] || 0) + 1;
          if (!gameInfo[id]) {
            gameInfo[id] = {
              appId: game.appId,
              name: game.name
            };
          }
        }
      }
    }

    // レート制限対策
    if (i + batchSize < steamIds.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // カウント順でソート、上位30件を取得
  const sortedGames = Object.entries(gameCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([appId, count]) => ({
      ...gameInfo[appId],
      count,
      percentage: Math.round((count / publicUsers) * 100)
    }));

  return {
    games: sortedGames,
    totalUsers: processedUsers,
    publicUsers,
    publicRate: Math.round((publicUsers / processedUsers) * 100)
  };
}

module.exports = {
  extractAppId,
  getGameInfo,
  fetchReviews,
  calculateReviewStats,
  getUserOwnedGames,
  aggregateUserGames
};
