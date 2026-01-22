/**
 * Visual Trend Hunter Service
 * Steamカプセル画像のトレンド分析サービス
 *
 * 機能:
 * - 近日登場/新作ゲームのカプセル画像収集
 * - AI Vision による純粋なビジュアル評価
 * - クリック要因タグ付け
 * - ユーザー画像との比較分析
 *
 * 注意: 既存の人気作品やセール/アップデートによる一時的な注目は除外し、
 * バナー画像単体のデザイン評価に特化
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const cheerio = require('cheerio');

// Geminiクライアント初期化
let geminiModel = null;

function getGeminiModel() {
  if (!geminiModel) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API keyが設定されていません');
    }
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = client.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });
  }
  return geminiModel;
}

// Vision用モデル（画像分析用）
let visionModel = null;

function getVisionModel() {
  if (!visionModel) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API keyが設定されていません');
    }
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    visionModel = client.getGenerativeModel({
      model: 'gemini-2.5-flash'
    });
  }
  return visionModel;
}

// クリック要因タグ定義
const CLICK_FACTOR_TAGS = {
  artStyle: {
    'pixel-art': { ja: 'ドット絵', en: 'Pixel Art', color: '#10b981' },
    'anime': { ja: '美少女/アニメ調', en: 'Anime Style', color: '#ec4899' },
    '3d-realistic': { ja: 'リアル3D', en: 'Realistic 3D', color: '#6366f1' },
    'hand-drawn': { ja: '手描き風', en: 'Hand-drawn', color: '#f59e0b' },
    'low-poly': { ja: 'ローポリ', en: 'Low Poly', color: '#14b8a6' },
    'watercolor': { ja: '水彩風', en: 'Watercolor', color: '#8b5cf6' },
    'cel-shaded': { ja: 'セル風', en: 'Cel-shaded', color: '#f97316' },
    'minimalist': { ja: 'ミニマル', en: 'Minimalist', color: '#64748b' }
  },
  colorScheme: {
    'vibrant': { ja: 'ビビッド', en: 'Vibrant', color: '#ef4444' },
    'dark-moody': { ja: 'ダーク', en: 'Dark & Moody', color: '#1e293b' },
    'pastel': { ja: 'パステル', en: 'Pastel', color: '#fda4af' },
    'neon': { ja: 'ネオン', en: 'Neon/Cyber', color: '#22d3ee' },
    'monochrome': { ja: 'モノクロ', en: 'Monochrome', color: '#71717a' },
    'warm': { ja: '暖色系', en: 'Warm Tones', color: '#fb923c' },
    'cool': { ja: '寒色系', en: 'Cool Tones', color: '#60a5fa' }
  },
  composition: {
    'character-focus': { ja: 'キャラ中心', en: 'Character Focus', color: '#a855f7' },
    'action-scene': { ja: 'アクションシーン', en: 'Action Scene', color: '#ef4444' },
    'landscape': { ja: '風景/ワールド', en: 'Landscape', color: '#22c55e' },
    'logo-dominant': { ja: 'ロゴ主体', en: 'Logo Dominant', color: '#eab308' },
    'mysterious': { ja: 'ミステリアス', en: 'Mysterious', color: '#6366f1' },
    'cute-mascot': { ja: 'マスコット', en: 'Cute Mascot', color: '#ec4899' }
  },
  appeal: {
    'epic-scale': { ja: '壮大スケール', en: 'Epic Scale', color: '#dc2626' },
    'cozy': { ja: 'ほっこり', en: 'Cozy/Relaxing', color: '#f97316' },
    'horror': { ja: 'ホラー感', en: 'Horror Vibes', color: '#0f172a' },
    'retro': { ja: 'レトロ', en: 'Retro/Nostalgic', color: '#ca8a04' },
    'unique-concept': { ja: '独特コンセプト', en: 'Unique Concept', color: '#7c3aed' },
    'polished': { ja: '高品質感', en: 'Polished Look', color: '#0ea5e9' }
  }
};

// ジャンルIDマッピング（Steam タグID）
const GENRE_TAG_IDS = {
  'Action': 19,
  'Adventure': 21,
  'RPG': 122,
  'Strategy': 9,
  'Simulation': 599,
  'Casual': 597,
  'Horror': 1667,
  'Indie': 492,
  'Roguelike': 1716,
  'Platformer': 1625,
  'Puzzle': 1664,
  'VR': 21978,
  'Visual Novel': 3799
};

// データソースタイプ
const DATA_SOURCE_TYPES = {
  COMING_SOON: 'coming_soon',      // 近日登場
  NEW_RELEASES: 'new_releases',    // 新作（発売1ヶ月以内）
  POPULAR_UPCOMING: 'popular_upcoming' // 人気の近日登場
};

// キャッシュ（5分間保持）
const cache = {
  data: {},
  timestamp: {}
};
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * 画像URLが有効かどうかを確認
 * @param {string} url - 画像URL
 * @returns {Promise<boolean>} 有効かどうか
 */
async function checkImageExists(url) {
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      validateStatus: (status) => status === 200
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 有効な画像URLを取得（フォールバック付き）
 * @param {string} appId - SteamアプリID
 * @returns {Promise<Object>} 画像URLオブジェクト
 */
async function getValidImageUrls(appId) {
  const urls = {
    header: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
    capsule616: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`,
    capsule231: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_231x87.jpg`,
    library600: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
    storeCapsule: `https://store.steampowered.com/app/${appId}/header.jpg`
  };

  // headerが存在すればそれを使う
  if (await checkImageExists(urls.header)) {
    return {
      capsuleUrl: urls.header,
      capsuleSmallUrl: urls.capsule231,
      capsuleLargeUrl: urls.capsule616,
      isValid: true
    };
  }

  // capsule_616x353を試す
  if (await checkImageExists(urls.capsule616)) {
    return {
      capsuleUrl: urls.capsule616,
      capsuleSmallUrl: urls.capsule231,
      capsuleLargeUrl: urls.capsule616,
      isValid: true
    };
  }

  // 画像が見つからない場合
  return {
    capsuleUrl: urls.header,
    capsuleSmallUrl: urls.capsule231,
    capsuleLargeUrl: urls.capsule616,
    isValid: false
  };
}

/**
 * Steamの近日登場ゲームをスクレイピング
 * @param {string} genre - ジャンル
 * @param {string} sourceType - データソースタイプ
 * @param {number} limit - 取得件数
 * @returns {Promise<Array>} ゲームリスト
 */
async function fetchSteamUpcoming(genre = 'Indie', sourceType = 'coming_soon', limit = 20) {
  const cacheKey = `${genre}_${sourceType}`;

  // キャッシュチェック
  if (cache.data[cacheKey] && cache.timestamp[cacheKey] &&
      (Date.now() - cache.timestamp[cacheKey] < CACHE_DURATION)) {
    return cache.data[cacheKey].slice(0, limit);
  }

  const tagId = GENRE_TAG_IDS[genre] || GENRE_TAG_IDS['Indie'];
  let url;

  switch (sourceType) {
    case DATA_SOURCE_TYPES.NEW_RELEASES:
      // 新作（発売済み、新しい順）
      url = `https://store.steampowered.com/search/?sort_by=Released_DESC&tags=${tagId}&category1=998&supportedlang=english&ndl=1`;
      break;
    case DATA_SOURCE_TYPES.POPULAR_UPCOMING:
      // 人気の近日登場（ウィッシュリスト数順）
      url = `https://store.steampowered.com/search/?filter=popularcomingsoon&tags=${tagId}&ndl=1`;
      break;
    case DATA_SOURCE_TYPES.COMING_SOON:
    default:
      // 近日登場（デフォルト）
      url = `https://store.steampowered.com/search/?filter=comingsoon&tags=${tagId}&ndl=1`;
      break;
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'birthtime=0; mature_content=1'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const rawGames = [];
    $('#search_resultsRows a.search_result_row').each((index, element) => {
      if (rawGames.length >= limit * 3) return false; // より多く取得して画像チェック

      const $el = $(element);
      const appId = $el.attr('data-ds-appid');
      const name = $el.find('.title').text().trim();
      const releaseDate = $el.find('.search_released').text().trim();
      const reviewSummary = $el.find('.search_review_summary').attr('data-tooltip-html') || '';
      const priceText = $el.find('.discount_final_price, .search_price').text().trim();
      // 検索結果のサムネイルURL（これは必ず存在する）
      const searchThumb = $el.find('.search_capsule img').attr('src') || '';

      if (appId && name) {
        rawGames.push({
          appId,
          name,
          releaseDate,
          reviewSummary: reviewSummary.split('<br>')[0] || 'N/A',
          price: priceText || 'TBD',
          sourceType,
          searchThumb // スクレイピング時のサムネイル
        });
      }
    });

    // 画像の存在確認を並列実行（上限あり）
    const games = [];
    const batchSize = 5;

    for (let i = 0; i < rawGames.length && games.length < limit * 2; i += batchSize) {
      const batch = rawGames.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (game) => {
          const imageUrls = await getValidImageUrls(game.appId);
          if (imageUrls.isValid) {
            return {
              ...game,
              capsuleUrl: imageUrls.capsuleUrl,
              capsuleSmallUrl: imageUrls.capsuleSmallUrl,
              capsuleLargeUrl: imageUrls.capsuleLargeUrl
            };
          }
          return null;
        })
      );

      results.forEach(result => {
        if (result && games.length < limit * 2) {
          games.push(result);
        }
      });
    }

    // キャッシュに保存
    cache.data[cacheKey] = games;
    cache.timestamp[cacheKey] = Date.now();

    return games.slice(0, limit);

  } catch (error) {
    console.error(`Steam検索エラー (${genre}, ${sourceType}):`, error.message);
    return [];
  }
}

/**
 * トレンドゲームのカプセル画像URLを取得
 * @param {string} genre - ジャンル
 * @param {string} sourceType - データソースタイプ (coming_soon, new_releases, popular_upcoming)
 * @param {number} limit - 取得件数
 * @returns {Promise<Array>} トレンドゲームリスト
 */
async function getTrendingCapsules(genre = 'Indie', sourceType = 'coming_soon', limit = 12) {
  // Steamから近日登場/新作を取得
  const games = await fetchSteamUpcoming(genre, sourceType, limit);

  if (games.length === 0) {
    // フォールバック: 別のソースタイプを試す
    const fallbackGames = await fetchSteamUpcoming(genre, 'new_releases', limit);
    if (fallbackGames.length > 0) {
      return fallbackGames;
    }
  }

  return games;
}

/**
 * Steam APIから実際のトレンドデータを取得（オプション）
 */
async function fetchSteamTrending(genre) {
  try {
    // SteamSpy API (非公式だが利用可能)
    const response = await axios.get(`https://steamspy.com/api.php?request=genre&genre=${encodeURIComponent(genre)}`, {
      timeout: 10000
    });

    if (response.data) {
      const games = Object.entries(response.data).slice(0, 20).map(([appId, data]) => ({
        appId,
        name: data.name,
        followers: data.owners ? parseInt(data.owners.split(' ')[0].replace(/,/g, '')) : 0,
        growth: '+?%'
      }));
      return games;
    }
  } catch (error) {
    console.log('SteamSpy API unavailable, using fallback data');
  }
  return null;
}

/**
 * カプセル画像をAI Vision で分析（純粋なビジュアル評価）
 * ゲームの人気度やセール状況とは関係なく、バナー画像単体のデザイン品質を評価
 * @param {string} imageUrl - 画像URL
 * @param {string} language - 出力言語 ('ja' or 'en')
 * @returns {Promise<Object>} 分析結果
 */
async function analyzeImageWithVision(imageUrl, language = 'ja') {
  const model = getVisionModel();

  try {
    // 画像をBase64で取得（エラーハンドリング強化）
    let imageResponse;
    try {
      imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
        validateStatus: (status) => status === 200
      });
    } catch (imgError) {
      console.error(`画像取得失敗 (${imageUrl}):`, imgError.message);
      throw new Error(`画像を取得できません: ${imgError.response?.status || imgError.message}`);
    }

    const base64Image = Buffer.from(imageResponse.data).toString('base64');
    const mimeType = 'image/jpeg';

    const isJa = language === 'ja';

    const prompt = isJa ? `
あなたはSteamゲームのカプセル画像（バナー）を分析するビジュアルデザインの専門家です。

【重要】この分析はゲームの人気度や知名度とは完全に独立した「バナー画像単体」の評価です。
セールやアップデートによる一時的な注目は考慮せず、純粋にビジュアルデザインの観点から評価してください。

以下のJSON形式で回答してください：
{
  "artStyle": "pixel-art/anime/3d-realistic/hand-drawn/low-poly/watercolor/cel-shaded/minimalist のいずれか",
  "colorScheme": "vibrant/dark-moody/pastel/neon/monochrome/warm/cool のいずれか",
  "composition": "character-focus/action-scene/landscape/logo-dominant/mysterious/cute-mascot のいずれか",
  "appeals": ["epic-scale", "cozy", "horror", "retro", "unique-concept", "polished から該当するものを配列で"],
  "visualScore": {
    "overall": 1-100の数値（バナーとしての総合的なビジュアル品質）,
    "colorImpact": 1-100（色使いのインパクト）,
    "compositionBalance": 1-100（構図のバランス）,
    "readability": 1-100（テキスト・タイトルの視認性）,
    "uniqueness": 1-100（他と差別化できる独自性）,
    "emotionalAppeal": 1-100（感情に訴える力）
  },
  "designStrengths": ["デザインの強み3つ"],
  "designWeaknesses": ["改善できる点1-2つ"],
  "firstImpression": "0.5秒で受ける第一印象（1文）",
  "targetGenreMatch": "このビジュアルが合うジャンル（複数可）",
  "designTips": ["このバナーをより良くするための具体的アドバイス2-3つ"],
  "similarVisualStyle": ["似たビジュアルスタイルで評価の高いゲーム2-3個"]
}
` : `
You are a visual design expert analyzing Steam game capsule images (banners).

【IMPORTANT】This analysis evaluates the "banner image alone" completely independent of the game's popularity or fame.
Do not consider temporary attention from sales or updates - evaluate purely from a visual design perspective.

Respond in the following JSON format:
{
  "artStyle": "one of: pixel-art/anime/3d-realistic/hand-drawn/low-poly/watercolor/cel-shaded/minimalist",
  "colorScheme": "one of: vibrant/dark-moody/pastel/neon/monochrome/warm/cool",
  "composition": "one of: character-focus/action-scene/landscape/logo-dominant/mysterious/cute-mascot",
  "appeals": ["array from: epic-scale, cozy, horror, retro, unique-concept, polished"],
  "visualScore": {
    "overall": 1-100 (overall visual quality as a banner),
    "colorImpact": 1-100 (color impact),
    "compositionBalance": 1-100 (composition balance),
    "readability": 1-100 (text/title visibility),
    "uniqueness": 1-100 (differentiation/uniqueness),
    "emotionalAppeal": 1-100 (emotional impact)
  },
  "designStrengths": ["3 design strengths"],
  "designWeaknesses": ["1-2 areas for improvement"],
  "firstImpression": "First impression in 0.5 seconds (1 sentence)",
  "targetGenreMatch": "Genres this visual suits (can be multiple)",
  "designTips": ["2-3 specific advice to improve this banner"],
  "similarVisualStyle": ["2-3 games with similar well-received visual style"]
}
`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Image
        }
      },
      prompt
    ]);

    const response = await result.response;
    const text = response.text();

    // JSONを抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Failed to parse AI response');

  } catch (error) {
    console.error('Vision分析エラー:', error.message);
    throw error;
  }
}

/**
 * 複数のカプセル画像からトレンドパターンを分析
 * @param {Array} images - 画像URL配列
 * @returns {Promise<Object>} トレンド分析結果
 */
async function analyzeTrendPatterns(images) {
  const model = getGeminiModel();

  // 最大5枚を分析
  const analysisPromises = images.slice(0, 5).map(img =>
    analyzeImageWithVision(img.capsuleUrl).catch(err => null)
  );

  const analyses = (await Promise.all(analysisPromises)).filter(a => a !== null);

  if (analyses.length === 0) {
    throw new Error('画像分析に失敗しました');
  }

  // トレンドを集計
  const trends = {
    artStyles: {},
    colorSchemes: {},
    compositions: {},
    appeals: {},
    avgClickability: 0
  };

  analyses.forEach(analysis => {
    if (analysis.artStyle) {
      trends.artStyles[analysis.artStyle] = (trends.artStyles[analysis.artStyle] || 0) + 1;
    }
    if (analysis.colorScheme) {
      trends.colorSchemes[analysis.colorScheme] = (trends.colorSchemes[analysis.colorScheme] || 0) + 1;
    }
    if (analysis.composition) {
      trends.compositions[analysis.composition] = (trends.compositions[analysis.composition] || 0) + 1;
    }
    if (analysis.appeals) {
      analysis.appeals.forEach(appeal => {
        trends.appeals[appeal] = (trends.appeals[appeal] || 0) + 1;
      });
    }
    if (analysis.clickability?.score) {
      trends.avgClickability += analysis.clickability.score;
    }
  });

  trends.avgClickability = Math.round(trends.avgClickability / analyses.length);

  // 最も多いパターンを特定
  const getTop = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    dominantArtStyle: getTop(trends.artStyles),
    dominantColorScheme: getTop(trends.colorSchemes),
    dominantComposition: getTop(trends.compositions),
    popularAppeals: Object.entries(trends.appeals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => key),
    avgClickability: trends.avgClickability,
    details: trends,
    individualAnalyses: analyses
  };
}

/**
 * ユーザー画像とトレンドを比較分析
 * @param {string} userImageBase64 - ユーザー画像（Base64）
 * @param {Object} trendData - トレンドデータ
 * @returns {Promise<Object>} 比較結果
 */
async function compareWithTrends(userImageBase64, trendData) {
  const model = getVisionModel();

  const prompt = `
あなたはSteamゲームのカプセル画像を分析するマーケティング専門家です。

このユーザーのカプセル画像を分析し、以下の現在のトレンドと比較してください：

【現在のトレンド】
- 主流のアートスタイル: ${trendData.dominantArtStyle || 'N/A'}
- 主流の色使い: ${trendData.dominantColorScheme || 'N/A'}
- 主流の構図: ${trendData.dominantComposition || 'N/A'}
- 人気のアピール要素: ${(trendData.popularAppeals || []).join(', ')}
- トレンド平均クリック率: ${trendData.avgClickability || 'N/A'}点

以下のJSON形式で回答してください：
{
  "userAnalysis": {
    "artStyle": "検出されたアートスタイル",
    "colorScheme": "検出された色使い",
    "composition": "検出された構図",
    "appeals": ["検出されたアピール要素"],
    "clickabilityScore": 1-100の数値
  },
  "comparison": {
    "matchesTrend": true/false,
    "trendAlignment": 1-100（トレンドとの一致度）,
    "standoutFactor": "トレンドと違う独自性（プラスにもマイナスにもなりうる）"
  },
  "recommendations": [
    "具体的な改善提案を3-5個（日本語）"
  ],
  "verdict": "総合評価を2-3文で（日本語）"
}
`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: userImageBase64.replace(/^data:image\/\w+;base64,/, '')
        }
      },
      prompt
    ]);

    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Failed to parse comparison response');

  } catch (error) {
    console.error('比較分析エラー:', error.message);
    throw error;
  }
}

/**
 * クリック要因タグを取得
 * @returns {Object} タグ定義
 */
function getClickFactorTags() {
  return CLICK_FACTOR_TAGS;
}

/**
 * 利用可能なジャンルリストを取得
 */
function getAvailableGenres() {
  return Object.keys(GENRE_TAG_IDS);
}

/**
 * 利用可能なデータソースタイプを取得
 */
function getDataSourceTypes() {
  return DATA_SOURCE_TYPES;
}

/**
 * バナーのビジュアルスコアでソート（AIスコアが高い順）
 * @param {Array} games - ゲームリスト
 * @param {number} topN - 上位N件を分析
 * @returns {Promise<Array>} スコア付きゲームリスト
 */
async function rankByVisualScore(games, topN = 6) {
  const analysisPromises = games.slice(0, topN).map(async (game) => {
    try {
      const analysis = await analyzeImageWithVision(game.capsuleUrl);
      return {
        ...game,
        visualAnalysis: analysis,
        visualScore: analysis.visualScore?.overall || 0
      };
    } catch (error) {
      console.error(`分析失敗 (${game.name}):`, error.message);
      return {
        ...game,
        visualAnalysis: null,
        visualScore: 0
      };
    }
  });

  const analyzedGames = await Promise.all(analysisPromises);

  // スコア順にソート
  return analyzedGames.sort((a, b) => b.visualScore - a.visualScore);
}

module.exports = {
  getTrendingCapsules,
  fetchSteamUpcoming,
  fetchSteamTrending,
  analyzeImageWithVision,
  analyzeTrendPatterns,
  compareWithTrends,
  getClickFactorTags,
  getAvailableGenres,
  getDataSourceTypes,
  rankByVisualScore,
  DATA_SOURCE_TYPES
};
