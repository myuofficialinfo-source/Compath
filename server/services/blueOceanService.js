/**
 * Blue Ocean Scout サービス
 * 市場分析＆勝算判定ツール
 */

const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const STEAM_SEARCH_API = 'https://store.steampowered.com/api/storesearch';
const STEAM_API_BASE = 'https://store.steampowered.com';

// Geminiクライアント
let geminiModel = null;

function getGeminiModel() {
  if (!geminiModel) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API keyが設定されていません');
    }
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = client.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });
  }
  return geminiModel;
}

// 人気タグリスト（Steam公式タグ）
const POPULAR_TAGS = {
  genres: [
    'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports', 'Racing',
    'Puzzle', 'Casual', 'Indie', 'FPS', 'Platformer', 'Horror', 'Survival',
    'Fighting', 'Shooter', 'Visual Novel', 'JRPG', 'Turn-Based', 'Real-Time'
  ],
  subgenres: [
    'Roguelike', 'Roguelite', 'Metroidvania', 'Souls-like', 'Bullet Hell',
    'Tower Defense', 'City Builder', 'Management', 'Dungeon Crawler',
    'Deck Building', 'Auto Battler', 'Battle Royale', 'Open World',
    'Sandbox', 'Crafting', 'Base Building', 'Colony Sim', 'Life Sim'
  ],
  themes: [
    'Fantasy', 'Sci-fi', 'Cyberpunk', 'Post-apocalyptic', 'Medieval',
    'Horror', 'Comedy', 'Dark', 'Cute', 'Anime', 'Pixel Graphics',
    'Retro', 'Zombies', 'Vampires', 'Dragons', 'Space', 'Military'
  ],
  features: [
    'Singleplayer', 'Multiplayer', 'Co-op', 'PvP', 'Online Co-Op',
    'Local Co-Op', 'Controller', 'VR', 'Early Access', 'Free to Play'
  ]
};

/**
 * 市場分析を実行（売上データベースのブルーオーシャン判定）
 * @param {Object} concept - ユーザーのゲームコンセプト
 * @returns {Promise<Object>} 分析結果
 */
async function analyzeMarket(concept) {
  const { tags = [], freeText = '' } = concept;

  try {
    const searchTags = tags.filter(Boolean);
    console.log(`[BlueOcean] 分析開始: tags=${searchTags.join(', ')}`);

    // 1. Steamでタグに該当するゲームを大量取得（100件以上目標）
    const allGames = await searchGamesByTags(searchTags);
    console.log(`[BlueOcean] 取得ゲーム数: ${allGames.length}`);

    // 2. 各ゲームの詳細（レビュー数＝売上指標）を取得
    const gamesWithDetails = await getGamesDetails(allGames.slice(0, 50)); // 最大50件の詳細取得
    console.log(`[BlueOcean] 詳細取得: ${gamesWithDetails.length}件`);

    // 3. 売上で分類
    const salesAnalysis = analyzeGamesBySales(gamesWithDetails);
    console.log(`[BlueOcean] 売上分析:`, salesAnalysis.summary);

    // 4. ブルーオーシャン判定
    const oceanResult = determineOceanColorBySales(salesAnalysis);
    console.log(`[BlueOcean] 判定: ${oceanResult.color}`);

    // 5. AIでアイデアと照らし合わせて差別化ポイントを提案
    const aiAnalysis = await generateMarketAnalysisWithSalesData({
      searchTags,
      salesAnalysis,
      topGames: salesAnalysis.hitGames.slice(0, 5),
      freeText
    });

    // 6. ピボット提案
    const pivotSuggestions = await generatePivotSuggestions(searchTags, allGames.length, freeText);

    return {
      concept: {
        tags: searchTags,
        freeText
      },
      oceanColor: oceanResult.color,
      stats: {
        totalGames: allGames.length,
        analyzedGames: gamesWithDetails.length,
        hitGames: salesAnalysis.hitGames.length,
        mediumGames: salesAnalysis.mediumGames.length,
        lowGames: salesAnalysis.lowGames.length,
        avgReviews: salesAnalysis.summary.avgReviews,
        maxReviews: salesAnalysis.summary.maxReviews,
        demandLevel: salesAnalysis.summary.demandLevel
      },
      topCompetitors: salesAnalysis.hitGames.slice(0, 10).map(g => ({
        id: g.id,
        name: g.name,
        headerImage: g.headerImage,
        reviewCount: g.reviewCount,
        positiveRate: g.positiveRate,
        price: g.price,
        releaseDate: g.releaseDate,
        tags: g.tags || []
      })),
      aiAnalysis: {
        marketSummary: aiAnalysis.marketSummary || '',
        marketStrengths: aiAnalysis.opportunities || [],
        marketRisks: aiAnalysis.threats || [],
        differentiationPoints: aiAnalysis.recommendedFeatures || [],
        winningStrategy: aiAnalysis.winningStrategy || '',
        verdict: aiAnalysis.verdict || ''
      },
      pivotSuggestions: pivotSuggestions.map(s => ({
        addTags: s.addTag ? [s.addTag] : [],
        removeTags: s.removeTag ? [s.removeTag] : [],
        concept: s.newConcept || '',
        reason: s.whyItWorks || '',
        pitch: s.examplePitch || ''
      })),
      marketPosition: oceanResult.position,
      oceanExplanation: oceanResult.explanation
    };

  } catch (error) {
    console.error('市場分析エラー:', error);
    throw error;
  }
}

/**
 * Steam検索ページからタグに該当するゲームのAppIDを取得
 * HTMLをパースしてappidを抽出
 */
async function searchGamesByTags(tags) {
  const appIds = new Set();

  try {
    // タグ名からタグIDに変換（タグ名で検索する場合）
    // まずはタグ名で直接検索
    for (let page = 0; page < 3; page++) { // 3ページ分（約150件）
      const start = page * 50;
      const url = `https://store.steampowered.com/search/?term=${encodeURIComponent(tags.join(' '))}&start=${start}&count=50`;

      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // HTMLからdata-ds-appid属性を抽出
      const matches = response.data.match(/data-ds-appid="(\d+)"/g) || [];
      for (const match of matches) {
        const appId = match.match(/\d+/)[0];
        appIds.add(appId);
      }

      // 結果が少なければ終了
      if (matches.length < 20) break;

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`[BlueOcean] 検索で ${appIds.size} 件のゲームを発見`);

  } catch (error) {
    console.error('Steam検索エラー:', error.message);
  }

  return Array.from(appIds).map(id => ({ id }));
}

/**
 * ゲームの詳細情報（レビュー数含む）を取得
 */
async function getGamesDetails(games) {
  const details = [];
  const batchSize = 5; // 同時リクエスト数

  for (let i = 0; i < games.length; i += batchSize) {
    const batch = games.slice(i, i + batchSize);

    const promises = batch.map(async (game) => {
      try {
        const response = await axios.get(`${STEAM_API_BASE}/api/appdetails`, {
          params: { appids: game.id, l: 'japanese' },
          timeout: 10000
        });

        const data = response.data[game.id];
        if (data && data.success && data.data.type === 'game') {
          const gameData = data.data;
          return {
            id: parseInt(game.id),
            name: gameData.name,
            headerImage: gameData.header_image,
            releaseDate: gameData.release_date?.date,
            price: gameData.price_overview?.final_formatted || (gameData.is_free ? '無料' : '価格不明'),
            reviewCount: gameData.recommendations?.total || 0,
            positiveRate: 0, // 後で計算
            tags: gameData.genres?.map(g => g.description) || [],
            developers: gameData.developers || []
          };
        }
        return null;
      } catch (error) {
        return null;
      }
    });

    const results = await Promise.all(promises);
    details.push(...results.filter(r => r !== null));

    // API制限対策
    if (i + batchSize < games.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return details;
}

/**
 * ゲームを売上（レビュー数）で分類
 * レビュー数 × 50-100 ≒ 売上本数 という推定
 */
function analyzeGamesBySales(games) {
  // レビュー数でソート（降順）
  const sorted = [...games].sort((a, b) => b.reviewCount - a.reviewCount);

  // 売上分類の閾値
  // ヒット作：レビュー1000件以上（推定5万本以上）
  // 中堅：レビュー100-1000件（推定5千-5万本）
  // 低迷：レビュー100件未満
  const hitGames = sorted.filter(g => g.reviewCount >= 1000);
  const mediumGames = sorted.filter(g => g.reviewCount >= 100 && g.reviewCount < 1000);
  const lowGames = sorted.filter(g => g.reviewCount < 100);

  // 統計計算
  const totalReviews = sorted.reduce((sum, g) => sum + g.reviewCount, 0);
  const avgReviews = sorted.length > 0 ? Math.round(totalReviews / sorted.length) : 0;
  const maxReviews = sorted.length > 0 ? sorted[0].reviewCount : 0;

  // 需要レベル判定（ヒット作の数で判断）
  let demandLevel;
  if (hitGames.length >= 5) {
    demandLevel = '高';
  } else if (hitGames.length >= 2 || mediumGames.length >= 10) {
    demandLevel = '中';
  } else {
    demandLevel = '低';
  }

  return {
    hitGames,
    mediumGames,
    lowGames,
    allGames: sorted,
    summary: {
      totalGames: sorted.length,
      hitCount: hitGames.length,
      mediumCount: mediumGames.length,
      lowCount: lowGames.length,
      avgReviews,
      maxReviews,
      totalReviews,
      demandLevel
    }
  };
}

/**
 * 売上データに基づくブルーオーシャン判定
 *
 * ブルーオーシャン = 売れてるゲームがある（需要あり）+ 競合が少ない
 * レッドオーシャン = 売れてるゲームがある + 競合が多い
 * パープル = 売れてるゲームが少ない + 競合も少ない（ニッチ）
 * イエロー = 売れてるゲームが少ない + 競合は多い（危険）
 */
function determineOceanColorBySales(salesAnalysis) {
  const { hitGames, mediumGames, allGames, summary } = salesAnalysis;

  // 需要の判定（ヒット作があるか）
  const hasProvenDemand = hitGames.length >= 3 || (hitGames.length >= 1 && summary.maxReviews >= 10000);
  const hasSomeDemand = hitGames.length >= 1 || mediumGames.length >= 5;

  // 競合の判定
  const totalCompetitors = allGames.length;
  const isLowCompetition = totalCompetitors < 30;
  const isMediumCompetition = totalCompetitors >= 30 && totalCompetitors < 80;
  const isHighCompetition = totalCompetitors >= 80;

  let result;

  // ブルーオーシャン：需要が証明されている + 競合が少ない
  if (hasProvenDemand && isLowCompetition) {
    result = {
      color: 'blue',
      position: { x: 25, y: 75 },
      explanation: `売れてるゲームが${hitGames.length}本ありながら、競合は${totalCompetitors}本と少ない。狙い目の市場です！`
    };
  }
  // ブルーオーシャン（弱）：ある程度の需要 + 競合がかなり少ない
  else if (hasSomeDemand && totalCompetitors < 20) {
    result = {
      color: 'blue',
      position: { x: 20, y: 60 },
      explanation: `競合が${totalCompetitors}本と非常に少なく、需要の兆しもあります。先行者利益を狙えます。`
    };
  }
  // レッドオーシャン：需要あり + 競合多い
  else if (hasProvenDemand && isHighCompetition) {
    result = {
      color: 'red',
      position: { x: 80, y: 75 },
      explanation: `${hitGames.length}本のヒット作がある人気ジャンルですが、${totalCompetitors}本以上の競合がいる激戦区です。差別化必須。`
    };
  }
  // レッドオーシャン（やや）：需要あり + 競合中程度
  else if (hasProvenDemand && isMediumCompetition) {
    result = {
      color: 'red',
      position: { x: 60, y: 70 },
      explanation: `需要は確認できますが、${totalCompetitors}本の競合がいます。強力な差別化が必要です。`
    };
  }
  // パープル：需要が少ない + 競合も少ない（ニッチ）
  else if (!hasSomeDemand && isLowCompetition) {
    result = {
      color: 'purple',
      position: { x: 25, y: 30 },
      explanation: `競合は${totalCompetitors}本と少ないですが、ヒット作も見当たりません。ニッチなファン向けか、新市場開拓の可能性があります。`
    };
  }
  // イエロー：需要少ない + 競合多い（危険）
  else {
    result = {
      color: 'yellow',
      position: { x: 70, y: 30 },
      explanation: `${totalCompetitors}本の競合がいるのにヒット作が少ない。需要に対して供給過多の可能性があります。ピボットを検討してください。`
    };
  }

  return result;
}

/**
 * 売上データを使ったAI市場分析
 */
async function generateMarketAnalysisWithSalesData(data) {
  const model = getGeminiModel();

  const topGamesInfo = data.topGames.map(g =>
    `- ${g.name}: レビュー${g.reviewCount.toLocaleString()}件、${g.price}`
  ).join('\n');

  const prompt = `
あなたはSteamゲーム市場の専門アナリストです。売上データに基づいて市場を分析してください。

【ユーザーが作りたいゲーム】
タグ: ${data.searchTags.join(', ')}
アイデア: ${data.freeText || '（特になし）'}

【市場の売上データ】
- 分析対象ゲーム数: ${data.salesAnalysis.summary.totalGames}本
- ヒット作（レビュー1000件以上）: ${data.salesAnalysis.summary.hitCount}本
- 中堅（レビュー100-1000件）: ${data.salesAnalysis.summary.mediumCount}本
- 低迷（レビュー100件未満）: ${data.salesAnalysis.summary.lowCount}本
- 平均レビュー数: ${data.salesAnalysis.summary.avgReviews}件
- 最大レビュー数: ${data.salesAnalysis.summary.maxReviews.toLocaleString()}件

【トップ売上ゲーム】
${topGamesInfo || '（ヒット作なし）'}

このデータを分析し、以下のJSON形式で日本語で回答してください：
{
  "marketSummary": "この市場の現状を2-3文で。売れてるゲームの特徴や、市場の成熟度を説明",
  "opportunities": ["チャンス1", "チャンス2", "チャンス3"],
  "threats": ["リスク1", "リスク2"],
  "recommendedFeatures": ["差別化に有効な機能1", "機能2", "機能3"],
  "winningStrategy": "この市場で勝つための具体的な戦略を2-3文で",
  "verdict": "開発GOか見送りかの最終判断を1文で"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('AI分析エラー:', error);
    return {
      marketSummary: '売上データに基づく分析です。',
      opportunities: [],
      threats: [],
      recommendedFeatures: [],
      winningStrategy: '',
      verdict: 'データを確認してください'
    };
  }
}

/**
 * ピボット提案を生成
 */
async function generatePivotSuggestions(currentTags, competitorCount, freeText) {
  const model = getGeminiModel();

  const prompt = `
あなたはゲーム企画のコンサルタントです。
ユーザーは以下のタグでゲームを作ろうとしていますが、競合が${competitorCount}本あります。

現在のタグ: ${currentTags.join(', ')}
アイデア: ${freeText || '（未入力）'}

競合を減らしつつ、面白いゲームになる「タグのずらし方」を3つ提案してください。
斬新で、プレイヤーが「やってみたい」と思うような組み合わせを考えてください。

以下のJSON形式で日本語で回答：
{
  "suggestions": [
    {
      "addTag": "追加するタグ",
      "removeTag": "外すタグ（任意）",
      "newConcept": "新しいコンセプトの説明（1-2文）",
      "whyItWorks": "なぜこれが有効か（1文）",
      "examplePitch": "エレベーターピッチ（キャッチコピー）"
    }
  ]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const parsed = JSON.parse(text);
    return parsed.suggestions || [];
  } catch (error) {
    console.error('ピボット提案エラー:', error);
    return [];
  }
}

/**
 * タグリストを取得
 */
function getTagList() {
  return POPULAR_TAGS;
}

// タグキャッシュ（1時間有効）
let tagCache = {
  japanese: null,
  english: null,
  lastFetch: null
};
const TAG_CACHE_TTL = 60 * 60 * 1000; // 1時間

// ジャンル系タグID（Steam公式の分類に基づく）
// ※ Steam APIのレスポンスから正しいIDをマッピング
const GENRE_TAG_IDS = new Set([
  19,    // アクション
  21,    // アドベンチャー
  122,   // RPG
  9,     // ストラテジー
  599,   // シミュレーション
  701,   // スポーツ
  699,   // レース
  1664,  // パズル
  597,   // カジュアル
  492,   // インディー
  1774,  // シューティング
  1625,  // プラットフォーム
  1667,  // ホラー
  1662,  // サバイバル
  1773,  // アーケード
  128,   // MMO
  3799,  // ビジュアルノベル
  1716,  // ローグライク
  3959,  // ローグライト
  1663,  // FPS
  4106,  // アクションアドベンチャー
  1036,  // 教育
]);

// サブジャンル・プレイスタイル系タグID
const SUBGENRE_TAG_IDS = new Set([
  4182,  // シングルプレイヤー
  3859,  // マルチプレイヤー
  3834,  // 探検
  3993,  // コンバット
  3839,  // ファーストパーソン
  1697,  // サードパーソン
  1695,  // オープンワールド
  3810,  // サンドボックス
  1702,  // クラフト
  1643,  // 建設
  7332,  // 基地建設
  1646,  // ハックアンドスラッシュ
  1720,  // ダンジョンクロウル
  4885,  // 弾幕
  5379,  // 2Dプラットフォーム
  5395,  // 3Dプラットフォーム
  3798,  // 横スクロール
  4791,  // 見下ろし型
  1708,  // 戦術
  1741,  // ターン制ストラテジー
  14139, // ターン制戦略
  4325,  // ターン制コンバット
  4231,  // アクションRPG
  1685,  // 協力プレイ
  3843,  // オンライン協力プレイ
  7368,  // ローカルマルチプレイヤー
  1775,  // PvP
  6730,  // PvE
  1698,  // ポイント＆クリック
  1738,  // 探し物
  9551,  // 恋愛シミュレーション
  12472, // 管理
  8945,  // 資源管理
  5900,  // ウォーキングシミュレーター
  4486,  // 選択方式アドベンチャー
  6426,  // 選択型進行
  6971,  // マルチエンディング
  42804, // ローグライクアクション
  3978,  // サバイバルホラー
  21978, // VR
]);

// テーマ・世界観・ビジュアル系タグID
const THEME_TAG_IDS = new Set([
  1684,  // ファンタジー
  3942,  // SF
  4085,  // アニメ
  4726,  // かわいい
  3964,  // ドット絵
  4004,  // レトロ
  4172,  // 中世
  4295,  // 未来的
  3835,  // ポストアポカリプス
  4604,  // ダークファンタジー
  4342,  // ダーク
  1719,  // コメディ
  1721,  // 精神的恐怖
  1755,  // 宇宙
  4057,  // 魔法
  4947,  // ロマンス
  5716,  // ミステリー
  5984,  // ドラマ
  5608,  // 感動的
  4136,  // 笑える
  1742,  // 物語性
  4166,  // 雰囲気
  5350,  // 家族向け
  4175,  // リアル
  4252,  // スタイライズド
  4195,  // カートゥーン風
  4562,  // カートゥーン
  6815,  // 手描き
  4145,  // 映画的
  4094,  // ミニマリスト
  3916,  // オールドスクール
  4305,  // カラフル
  7250,  // リニア
  4026,  // 高難易度
  5125,  // 自動生成
  6129,  // 論理
  7208,  // 女性主人公
  4747,  // キャラクターカスタマイズ
  1654,  // リラックス
  3871,  // 2D
  4191,  // 3D
]);

/**
 * Steam公式タグAPIからタグリストを取得
 * @param {string} lang - 言語コード（japanese/english）
 */
async function fetchSteamTags(lang = 'japanese') {
  // キャッシュチェック
  const now = Date.now();
  if (tagCache[lang] && tagCache.lastFetch && (now - tagCache.lastFetch) < TAG_CACHE_TTL) {
    console.log(`[BlueOcean] Using cached tags for ${lang}`);
    return tagCache[lang];
  }

  try {
    const response = await axios.get(`https://store.steampowered.com/tagdata/populartags/${lang}`, {
      timeout: 10000
    });

    const allTags = response.data;

    // タグをカテゴリ分けして整理
    const categorizedTags = {
      genres: [],
      subgenres: [],
      themes: [],
      other: []
    };

    for (const tag of allTags) {
      const tagWithCategory = {
        tagid: tag.tagid,
        name: tag.name
      };

      if (GENRE_TAG_IDS.has(tag.tagid)) {
        categorizedTags.genres.push(tagWithCategory);
      } else if (SUBGENRE_TAG_IDS.has(tag.tagid)) {
        categorizedTags.subgenres.push(tagWithCategory);
      } else if (THEME_TAG_IDS.has(tag.tagid)) {
        categorizedTags.themes.push(tagWithCategory);
      } else {
        categorizedTags.other.push(tagWithCategory);
      }
    }

    // キャッシュに保存
    tagCache[lang] = categorizedTags;
    tagCache.lastFetch = now;

    console.log(`[BlueOcean] Fetched ${allTags.length} tags from Steam (${lang})`);
    console.log(`  - Genres: ${categorizedTags.genres.length}`);
    console.log(`  - Subgenres: ${categorizedTags.subgenres.length}`);
    console.log(`  - Themes: ${categorizedTags.themes.length}`);

    return categorizedTags;

  } catch (error) {
    console.error('[BlueOcean] Failed to fetch Steam tags:', error.message);
    throw error;
  }
}

module.exports = {
  analyzeMarket,
  getTagList,
  fetchSteamTags
};
