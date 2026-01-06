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
 * 市場分析を実行
 * @param {Object} concept - ユーザーのゲームコンセプト
 * @returns {Promise<Object>} 分析結果
 */
async function analyzeMarket(concept) {
  const { tags = [], freeText = '' } = concept;

  try {
    // 選択されたタグを検索用に使用
    const searchTags = tags.filter(Boolean);

    // Steam検索で競合を取得
    const competitors = await searchSteamGames(searchTags);

    // 上位競合の詳細を取得
    const topCompetitors = await getTopCompetitorsDetails(competitors.slice(0, 10));

    // AIで市場分析
    const aiAnalysis = await generateMarketAnalysis({
      searchTags,
      competitors,
      topCompetitors,
      freeText,
      concept
    });

    // オーシャンカラー判定
    const oceanColor = determineOceanColor(competitors.length, aiAnalysis);

    // ピボット提案を生成
    const pivotSuggestions = await generatePivotSuggestions(searchTags, competitors.length, freeText);

    // 競合の平均レビュー数を計算
    const avgReviews = topCompetitors.length > 0
      ? Math.round(topCompetitors.reduce((sum, c) => sum + (c.recommendations || 0), 0) / topCompetitors.length)
      : 0;

    // 競合の平均好評率（簡易推定）
    const avgRating = topCompetitors.length > 0 ? 75 : 0;

    // 需要レベルをテキストに変換
    const demandLabels = { high: '高', medium: '中', low: '低' };

    return {
      concept: {
        tags: searchTags,
        freeText
      },
      oceanColor: oceanColor.color,
      stats: {
        competitorCount: competitors.length,
        avgReviews: avgReviews,
        avgRating: avgRating,
        demandLevel: demandLabels[aiAnalysis.estimatedDemand] || '中'
      },
      topCompetitors: topCompetitors.map(c => ({
        ...c,
        reviewCount: c.recommendations,
        positiveRate: 75 // 簡易推定
      })),
      aiAnalysis: {
        marketStrengths: aiAnalysis.opportunities || [],
        marketRisks: aiAnalysis.threats || [],
        differentiationPoints: aiAnalysis.recommendedFeatures || [],
        targetAudience: ['コアゲーマー', 'カジュアルゲーマー', 'ジャンルファン'],
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
      marketPosition: calculateMarketPosition(competitors.length, aiAnalysis.estimatedDemand)
    };

  } catch (error) {
    console.error('市場分析エラー:', error);
    throw error;
  }
}

/**
 * Steamでゲームを検索
 */
async function searchSteamGames(tags) {
  const games = [];

  try {
    // タグでの検索（複数回実行して結果を集約）
    for (const tag of tags.slice(0, 3)) {
      const response = await axios.get(STEAM_SEARCH_API, {
        params: {
          term: tag,
          l: 'japanese',
          cc: 'JP'
        },
        timeout: 10000
      });

      if (response.data && response.data.items) {
        for (const item of response.data.items) {
          if (!games.find(g => g.id === item.id)) {
            games.push({
              id: item.id,
              name: item.name,
              price: item.price?.final || 0,
              metascore: item.metascore || null,
              platforms: item.platforms || {}
            });
          }
        }
      }

      // API制限対策
      await new Promise(resolve => setTimeout(resolve, 300));
    }

  } catch (error) {
    console.error('Steam検索エラー:', error.message);
  }

  return games;
}

/**
 * 上位競合の詳細を取得
 */
async function getTopCompetitorsDetails(games) {
  const details = [];

  for (const game of games.slice(0, 5)) {
    try {
      const response = await axios.get(`${STEAM_API_BASE}/api/appdetails`, {
        params: { appids: game.id, l: 'japanese' },
        timeout: 10000
      });

      const data = response.data[game.id];
      if (data && data.success) {
        const gameData = data.data;
        details.push({
          id: game.id,
          name: gameData.name,
          headerImage: gameData.header_image,
          developers: gameData.developers || [],
          releaseDate: gameData.release_date?.date,
          genres: gameData.genres?.map(g => g.description) || [],
          tags: gameData.categories?.map(c => c.description) || [],
          reviewScore: gameData.metacritic?.score || null,
          price: gameData.price_overview?.final_formatted || '無料',
          shortDescription: gameData.short_description,
          recommendations: gameData.recommendations?.total || 0
        });
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`詳細取得エラー (${game.id}):`, error.message);
    }
  }

  return details;
}

/**
 * AIで市場分析レポートを生成
 */
async function generateMarketAnalysis(data) {
  const model = getGeminiModel();

  const competitorInfo = data.topCompetitors.map(c =>
    `- ${c.name}: ${c.recommendations}件のレビュー、${c.genres?.join(', ')}`
  ).join('\n');

  const prompt = `
あなたはSteamゲーム市場の専門アナリストです。以下のデータを分析し、市場評価を行ってください。

【ユーザーのゲームコンセプト】
タグ: ${data.searchTags.join(', ')}
アイデア: ${data.freeText || '（未入力）'}

【競合状況】
検索で見つかった競合数: ${data.competitors.length}本

【上位競合の詳細】
${competitorInfo || '（データなし）'}

以下のJSON形式で日本語で回答してください：
{
  "estimatedDemand": "high/medium/low（需要レベル）",
  "qualityBar": "high/medium/low（品質の壁）",
  "averageReviews": 0,
  "marketSummary": "市場の現状を2-3文で説明",
  "opportunities": ["チャンス1", "チャンス2", "チャンス3"],
  "threats": ["脅威1", "脅威2"],
  "competitorWeaknesses": ["既存ゲームの弱点1", "弱点2"],
  "winningStrategy": "このジャンルで勝つための具体的な戦略を2-3文で",
  "recommendedFeatures": ["差別化に有効な機能1", "機能2", "機能3"],
  "riskLevel": "high/medium/low",
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
      estimatedDemand: 'medium',
      qualityBar: 'medium',
      averageReviews: 0,
      marketSummary: '分析データが不足しています。',
      opportunities: [],
      threats: [],
      competitorWeaknesses: [],
      winningStrategy: '',
      recommendedFeatures: [],
      riskLevel: 'medium',
      verdict: 'データ不足のため判断保留'
    };
  }
}

/**
 * オーシャンカラーを判定
 * マップポジションと連動させるため、同じ基準を使用
 */
function determineOceanColor(competitorCount, aiAnalysis) {
  const demand = aiAnalysis.estimatedDemand;

  // X軸基準: 競合50未満 = 少ない（左側）、50以上 = 多い（右側）
  const isLowCompetition = competitorCount < 50;
  // Y軸基準: demand が high/medium = 需要あり（上側）、low = 需要少（下側）
  const isHighDemand = demand === 'high' || demand === 'medium';

  // 左上: 競合少 + 需要あり = ブルーオーシャン
  if (isLowCompetition && isHighDemand) {
    return {
      color: 'blue',
      label: 'ブルーオーシャン',
      emoji: '🟦',
      description: '競合が少なく、需要が見込める狙い目の市場です。',
      recommendation: '参入推奨！早期に市場を確保しましょう。'
    };
  }

  // 左下: 競合少 + 需要少 = パープルオーシャン（ニッチ）
  if (isLowCompetition && !isHighDemand) {
    return {
      color: 'purple',
      label: 'パープルオーシャン',
      emoji: '🟪',
      description: '市場は小さいですが、熱狂的なファン層が存在する可能性があります。',
      recommendation: 'コアなファンを獲得できれば安定した売上が期待できます。'
    };
  }

  // 右上: 競合多 + 需要多 = レッドオーシャン
  if (!isLowCompetition && isHighDemand) {
    return {
      color: 'red',
      label: 'レッドオーシャン',
      emoji: '🟥',
      description: '競合が非常に多い激戦区です。',
      recommendation: '強力な差別化要素がない限り、埋もれるリスクが高いです。ピボットを検討してください。'
    };
  }

  // 右下: 競合多 + 需要少 = イエロー（危険地帯）
  return {
    color: 'yellow',
    label: '低需要・高競合',
    emoji: '🟨',
    description: '競合が多いのに需要が少ない危険な市場です。',
    recommendation: '参入は避けるか、大幅なピボットを検討してください。'
  };
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
 * 市場ポジションを計算（2軸マップ用）
 * オーシャンカラー判定と連動: 競合50が境界、需要medium以上が上側
 */
function calculateMarketPosition(competitorCount, demand) {
  // X軸: 競合の数 (0-100)
  // 50未満を左側（0-50%）、50以上を右側（50-100%）にマッピング
  let x;
  if (competitorCount < 10) x = 10;
  else if (competitorCount < 30) x = 25;
  else if (competitorCount < 50) x = 40;  // ここまでが左側（ブルー/パープル）
  else if (competitorCount < 80) x = 60;  // ここからが右側（レッド/イエロー）
  else if (competitorCount < 150) x = 75;
  else x = 90;

  // Y軸: 需要の大きさ (0-100)
  // high/medium を上側（50%以上）、low を下側（50%未満）
  let y;
  if (demand === 'high') y = 80;
  else if (demand === 'medium') y = 60;  // mediumも上側
  else y = 25;  // lowは下側

  // 象限判定（オーシャンカラーと一致）
  let quadrant;
  if (x < 50 && y >= 50) quadrant = 'blue';     // 左上: ブルーオーシャン
  else if (x >= 50 && y >= 50) quadrant = 'red';    // 右上: レッドオーシャン
  else if (x < 50 && y < 50) quadrant = 'purple';  // 左下: パープルオーシャン
  else quadrant = 'yellow'; // 右下: イエロー（危険）

  return { x, y, quadrant };
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
