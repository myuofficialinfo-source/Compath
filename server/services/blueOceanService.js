/**
 * Blue Ocean Scout サービス
 * 市場分析＆勝算判定ツール
 */

const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const STEAM_SEARCH_API = 'https://store.steampowered.com/api/storesearch';
const STEAM_API_BASE = 'https://store.steampowered.com';
const STEAM_SEARCH_HTML = 'https://store.steampowered.com/search/';

// タグ名→タグIDマッピング（キャッシュ）
let tagNameToIdCache = {};

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
 * 市場分析を実行（6軸スコアリングによるブルーオーシャン判定）
 * @param {Object} concept - ユーザーのゲームコンセプト
 * @returns {Promise<Object>} 分析結果
 */
async function analyzeMarket(concept) {
  const { tags = [], tagIds = [], freeText = '' } = concept;

  try {
    const searchTags = tags.filter(Boolean);
    const searchTagIds = tagIds.filter(Boolean);
    console.log(`[BlueOcean] 分析開始: tags=${searchTags.join(', ')}, tagIds=${searchTagIds.join(', ')}`);

    // 1. タグIDを使って正確なタイトル数を取得
    const tagStats = await getTagTitleCounts(searchTagIds, searchTags);
    console.log(`[BlueOcean] タグ統計:`, tagStats);

    // 2. Steamでタグに該当するゲームを取得（サンプル）
    const allGames = await searchGamesByTagIds(searchTagIds);
    console.log(`[BlueOcean] 取得ゲーム数: ${allGames.length}`);

    // 3. 各ゲームの詳細（レビュー数＝売上指標）を取得
    const gamesWithDetails = await getGamesDetails(allGames.slice(0, 50));
    console.log(`[BlueOcean] 詳細取得: ${gamesWithDetails.length}件`);

    // 4. 売上で分類
    const salesAnalysis = analyzeGamesBySales(gamesWithDetails);
    console.log(`[BlueOcean] 売上分析:`, salesAnalysis.summary);

    // 5. 6軸スコアリング計算
    const sixAxisScores = calculateSixAxisScores(tagStats, salesAnalysis);
    console.log(`[BlueOcean] 6軸スコア:`, sixAxisScores);

    // 6. 総合スコアとブルーオーシャン判定
    const totalScore = calculateTotalScore(sixAxisScores);
    const oceanResult = determineOceanByScore(totalScore, sixAxisScores);
    console.log(`[BlueOcean] 総合スコア: ${totalScore}点, 判定: ${oceanResult.color}`);

    // 7. AIでアイデアと照らし合わせて差別化ポイントを提案
    const aiAnalysis = await generateMarketAnalysisWithSalesData({
      searchTags,
      salesAnalysis,
      topGames: salesAnalysis.hitGames.slice(0, 5),
      freeText,
      sixAxisScores,
      totalScore
    });

    // 8. ピボット提案
    const pivotSuggestions = await generatePivotSuggestions(searchTags, tagStats.combinedCount, freeText);

    return {
      concept: {
        tags: searchTags,
        freeText
      },
      oceanColor: oceanResult.color,
      totalScore,
      sixAxisScores,
      stats: {
        totalGames: tagStats.combinedCount,
        analyzedGames: gamesWithDetails.length,
        hitGames: salesAnalysis.hitGames.length,
        mediumGames: salesAnalysis.mediumGames.length,
        lowGames: salesAnalysis.lowGames.length,
        avgReviews: salesAnalysis.summary.avgReviews,
        maxReviews: salesAnalysis.summary.maxReviews,
        demandLevel: salesAnalysis.summary.demandLevel,
        tagStats
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
 * タグIDからSteamのタイトル数を取得
 * Steam検索HTMLから "showing X - Y of Z" をパース
 */
async function getTagTitleCounts(tagIds, tagNames) {
  const result = {
    individualCounts: {},
    combinedCount: 0
  };

  try {
    // 複合タグの検索（タグIDをカンマ区切り）
    if (tagIds.length > 0) {
      const combinedTagParam = tagIds.join(',');
      const combinedCount = await fetchTagCount(combinedTagParam);
      result.combinedCount = combinedCount;
      console.log(`[BlueOcean] 複合タグ(${tagIds.join('+')})のタイトル数: ${combinedCount}`);
    }

    // 個別タグのカウント（最初の3つまで）
    for (let i = 0; i < Math.min(tagIds.length, 3); i++) {
      const tagId = tagIds[i];
      const tagName = tagNames[i] || `Tag${tagId}`;
      const count = await fetchTagCount(tagId.toString());
      result.individualCounts[tagName] = count;
      console.log(`[BlueOcean] ${tagName}(${tagId})のタイトル数: ${count}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

  } catch (error) {
    console.error('[BlueOcean] タイトル数取得エラー:', error.message);
  }

  return result;
}

/**
 * Steam検索HTMLからタグのタイトル数を取得
 */
async function fetchTagCount(tagParam) {
  try {
    const response = await axios.get(STEAM_SEARCH_HTML, {
      params: {
        tags: tagParam,
        category1: 998 // ゲームのみ
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // "showing 1 - 50 of 12345" からタイトル数を抽出
    const match = response.data.match(/showing\s+\d+\s*-\s*\d+\s+of\s+([\d,]+)/i);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }

    // 結果がない場合
    if (response.data.includes('No results')) {
      return 0;
    }

    return 0;
  } catch (error) {
    console.error(`[BlueOcean] fetchTagCount エラー (${tagParam}):`, error.message);
    return 0;
  }
}

/**
 * タグIDを使ってSteam検索からゲームを取得
 */
async function searchGamesByTagIds(tagIds) {
  const allGames = [];
  const seenIds = new Set();

  if (tagIds.length === 0) {
    return allGames;
  }

  try {
    const tagParam = tagIds.join(',');

    // Steam検索HTMLからゲームIDを抽出（最大3ページ）
    for (let page = 0; page < 3; page++) {
      const start = page * 50;

      const response = await axios.get(STEAM_SEARCH_HTML, {
        params: {
          tags: tagParam,
          category1: 998,
          start: start,
          count: 50
        },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // data-ds-appid="12345" からAppIDを抽出
      const matches = response.data.match(/data-ds-appid="(\d+)"/g) || [];
      let newCount = 0;

      for (const match of matches) {
        const appId = match.match(/\d+/)[0];
        if (!seenIds.has(appId)) {
          seenIds.add(appId);
          allGames.push({ id: appId });
          newCount++;
        }
      }

      console.log(`[BlueOcean] ページ${page + 1}: ${newCount}件取得`);

      if (matches.length < 25) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[BlueOcean] タグID検索合計: ${allGames.length}件`);

  } catch (error) {
    console.error('[BlueOcean] タグID検索エラー:', error.message);
  }

  return allGames;
}

/**
 * 6軸スコアリング計算
 */
function calculateSixAxisScores(tagStats, salesAnalysis) {
  const { combinedCount, individualCounts } = tagStats;
  const { hitGames, mediumGames, allGames, summary } = salesAnalysis;

  // === 1. 競争係数（タイトル数÷平均レビュー数）===
  // 低いほど良い（1レビューを生み出すのに必要な競合が少ない）
  const competitionCoef = summary.avgReviews > 0
    ? combinedCount / summary.avgReviews
    : combinedCount; // レビューがなければタイトル数そのまま

  let competitionScore;
  if (competitionCoef < 1) {
    competitionScore = 100; // 超優秀
  } else if (competitionCoef < 3) {
    competitionScore = 80;
  } else if (competitionCoef < 5) {
    competitionScore = 60;
  } else if (competitionCoef < 10) {
    competitionScore = 40;
  } else {
    competitionScore = 20; // 競争激しい
  }

  // === 2. ヒット密度（Hit Density）===
  // (1000レビュー超タイトル数 ÷ サンプル中の全タイトル数) × 100
  const hitDensity = allGames.length > 0
    ? (hitGames.length / allGames.length) * 100
    : 0;

  let hitDensityScore;
  if (hitDensity >= 10) {
    hitDensityScore = 100; // 1/10がヒット
  } else if (hitDensity >= 5) {
    hitDensityScore = 80; // 1/20がヒット
  } else if (hitDensity >= 2) {
    hitDensityScore = 60;
  } else if (hitDensity >= 1) {
    hitDensityScore = 40;
  } else {
    hitDensityScore = 20; // ヒットがほぼない
  }

  // === 3. 収益性（Revenue per Title）===
  // 平均レビュー数ベース
  let revenueScore;
  if (summary.avgReviews >= 1000) {
    revenueScore = 100;
  } else if (summary.avgReviews >= 500) {
    revenueScore = 80;
  } else if (summary.avgReviews >= 200) {
    revenueScore = 60;
  } else if (summary.avgReviews >= 100) {
    revenueScore = 40;
  } else {
    revenueScore = 20;
  }

  // === 4. ニッチ度スコア（Niche Score）===
  // タイトル数が少ないほど高スコア
  let nicheScore;
  if (combinedCount < 100) {
    nicheScore = 100; // 超ニッチ
  } else if (combinedCount < 500) {
    nicheScore = 80;
  } else if (combinedCount < 2000) {
    nicheScore = 60;
  } else if (combinedCount < 5000) {
    nicheScore = 40;
  } else {
    nicheScore = 20; // 超メジャー
  }

  // === 5. タグシナジースコア（複数タグの組み合わせ効果）===
  // 個別タグの合計に対する複合タグの縮小率
  const individualSum = Object.values(individualCounts).reduce((a, b) => a + b, 0);
  let synergyScore = 50; // デフォルト

  if (individualSum > 0 && combinedCount > 0) {
    const synergyRatio = combinedCount / individualSum;
    // 比率が小さいほど絞り込みが効いている
    if (synergyRatio < 0.05) {
      synergyScore = 100; // 非常に効果的な組み合わせ
    } else if (synergyRatio < 0.1) {
      synergyScore = 80;
    } else if (synergyRatio < 0.2) {
      synergyScore = 60;
    } else if (synergyRatio < 0.4) {
      synergyScore = 40;
    } else {
      synergyScore = 20; // 組み合わせ効果薄い
    }
  }

  // === 6. 需要確実性スコア（ヒット作の存在）===
  let demandScore;
  if (hitGames.length >= 5) {
    demandScore = 100; // 需要確実
  } else if (hitGames.length >= 3) {
    demandScore = 80;
  } else if (hitGames.length >= 1) {
    demandScore = 60;
  } else if (mediumGames.length >= 5) {
    demandScore = 40;
  } else {
    demandScore = 20; // 需要不明
  }

  return {
    competition: {
      score: competitionScore,
      value: Math.round(competitionCoef * 100) / 100,
      label: '競争係数',
      description: competitionCoef < 1 ? '超優秀' : competitionCoef < 5 ? '良好' : '激戦'
    },
    hitDensity: {
      score: hitDensityScore,
      value: Math.round(hitDensity * 10) / 10,
      label: 'ヒット密度',
      description: `${hitGames.length}/${allGames.length}本がヒット`
    },
    revenue: {
      score: revenueScore,
      value: summary.avgReviews,
      label: '収益性',
      description: `平均${summary.avgReviews}レビュー`
    },
    niche: {
      score: nicheScore,
      value: combinedCount,
      label: 'ニッチ度',
      description: `${combinedCount.toLocaleString()}本`
    },
    synergy: {
      score: synergyScore,
      value: individualSum > 0 ? Math.round((combinedCount / individualSum) * 100) : 0,
      label: 'タグシナジー',
      description: individualSum > 0 ? `${Math.round((combinedCount / individualSum) * 100)}%に絞り込み` : '-'
    },
    demand: {
      score: demandScore,
      value: hitGames.length,
      label: '需要確実性',
      description: hitGames.length > 0 ? `${hitGames.length}本のヒット作あり` : 'ヒット作なし'
    }
  };
}

/**
 * 総合スコア計算（重み付け）
 * 競争係数(30%) + ヒット密度(30%) + 収益性(15%) + ニッチ度(10%) + シナジー(5%) + 需要確実性(10%)
 */
function calculateTotalScore(scores) {
  // 基準点50からの加減算
  const total = 50 + (
    (scores.competition.score - 50) * 0.30 +
    (scores.hitDensity.score - 50) * 0.30 +
    (scores.revenue.score - 50) * 0.15 +
    (scores.niche.score - 50) * 0.10 +
    (scores.synergy.score - 50) * 0.05 +
    (scores.demand.score - 50) * 0.10
  );

  return Math.round(Math.max(0, Math.min(100, total)));
}

/**
 * 総合スコアに基づくブルーオーシャン判定
 */
function determineOceanByScore(totalScore, scores) {
  let result;

  // 黄金ゾーン: 競争係数1未満 かつ ヒット密度5%以上
  const isGoldenZone = scores.competition.value < 1 && scores.hitDensity.value >= 5;

  if (totalScore >= 85 || isGoldenZone) {
    result = {
      color: 'blue',
      position: { x: 20, y: 80 },
      explanation: isGoldenZone
        ? `🔥 黄金ゾーン発見！競争係数${scores.competition.value}（1未満）かつヒット密度${scores.hitDensity.value}%（5%以上）。即開発推奨！`
        : `総合スコア${totalScore}点。需要が確認でき、競合も適度。狙い目の市場です！`
    };
  } else if (totalScore >= 70) {
    result = {
      color: 'blue',
      position: { x: 35, y: 70 },
      explanation: `総合スコア${totalScore}点。有望な市場です。差別化ポイントを明確にして参入を検討。`
    };
  } else if (totalScore >= 55) {
    result = {
      color: 'yellow',
      position: { x: 50, y: 50 },
      explanation: `総合スコア${totalScore}点。競争が激しいか、需要が不明確。タグの組み合わせを再検討推奨。`
    };
  } else if (totalScore >= 40) {
    result = {
      color: 'red',
      position: { x: 70, y: 40 },
      explanation: `総合スコア${totalScore}点。レッドオーシャンの可能性。強力な差別化なしでは厳しい市場。`
    };
  } else {
    result = {
      color: 'purple',
      position: { x: 30, y: 25 },
      explanation: `総合スコア${totalScore}点。需要が見えない市場。ニッチすぎるか、市場自体が存在しない可能性。`
    };
  }

  return result;
}

/**
 * ゲームの詳細情報（レビュー数含む）を取得
 * 複数のAPIソースを使用して確実にレビュー数を取得
 */
async function getGamesDetails(games) {
  const details = [];
  const batchSize = 5; // 同時リクエスト数

  console.log(`[BlueOcean] 詳細情報取得開始: ${games.length}件`);

  for (let i = 0; i < games.length; i += batchSize) {
    const batch = games.slice(i, i + batchSize);

    const promises = batch.map(async (game) => {
      try {
        // 方法1: appdetails API（詳細情報）
        const detailsResponse = await axios.get(`${STEAM_API_BASE}/api/appdetails`, {
          params: { appids: game.id, l: 'japanese' },
          timeout: 10000
        });

        const detailsData = detailsResponse.data[game.id];
        if (!detailsData || !detailsData.success) {
          return null;
        }

        const gameData = detailsData.data;
        if (gameData.type !== 'game') {
          return null;
        }

        // レビュー数を取得（recommendationsから）
        let reviewCount = gameData.recommendations?.total || 0;
        let positiveRate = 0;

        // 方法2: レビュー数が0の場合、別のAPIで取得を試みる
        if (reviewCount === 0) {
          try {
            const reviewResponse = await axios.get(`${STEAM_API_BASE}/appreviews/${game.id}`, {
              params: { json: 1, language: 'all', purchase_type: 'all', num_per_page: 0 },
              timeout: 5000
            });

            if (reviewResponse.data && reviewResponse.data.query_summary) {
              const summary = reviewResponse.data.query_summary;
              reviewCount = summary.total_reviews || 0;
              if (reviewCount > 0) {
                positiveRate = Math.round((summary.total_positive / reviewCount) * 100);
              }
            }
          } catch (reviewError) {
            // レビューAPI失敗は無視
          }
        }

        return {
          id: parseInt(game.id),
          name: gameData.name || game.name,
          headerImage: gameData.header_image || game.headerImage,
          releaseDate: gameData.release_date?.date,
          price: gameData.price_overview?.final_formatted || (gameData.is_free ? '無料' : '価格不明'),
          reviewCount: reviewCount,
          positiveRate: positiveRate,
          tags: gameData.genres?.map(g => g.description) || [],
          developers: gameData.developers || []
        };
      } catch (error) {
        console.log(`[BlueOcean] 詳細取得失敗 (${game.id}): ${error.message}`);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const validResults = results.filter(r => r !== null);
    details.push(...validResults);

    console.log(`[BlueOcean] 詳細取得: ${i + validResults.length}/${games.length}件完了`);

    // API制限対策
    if (i + batchSize < games.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`[BlueOcean] 詳細取得完了: ${details.length}件`);
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
