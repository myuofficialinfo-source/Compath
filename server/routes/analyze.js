/**
 * AI分析API
 * レビューの要約・分析を行う
 *
 * セキュリティ: OpenAI APIキーはサーバーサイドでのみ使用
 * キャッシュ: 同じゲームの分析結果をキャッシュしてAPI呼び出しを削減
 */

const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const cacheService = require('../services/cacheService');

/**
 * レビューからappIdを推測（最初のレビューのrecommendationIdから）
 * 実際にはクライアントからappIdを送ってもらうのがベスト
 */
function getAppIdFromReviews(reviews) {
  // レビューにappIdが含まれている場合
  if (reviews[0]?.appId) {
    return reviews[0].appId.toString();
  }
  // recommendationIdの最初の部分をハッシュとして使用（簡易的）
  if (reviews[0]?.recommendationId) {
    return `review_${reviews[0].recommendationId}`;
  }
  return null;
}

/**
 * POST /api/analyze/summary
 * レビューのAI要約を生成（キャッシュ対応）
 */
router.post('/summary', async (req, res) => {
  try {
    const { reviews, mentalGuardMode, appId } = req.body;

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ error: 'レビューデータが必要です' });
    }

    // キャッシュキー用のappId
    const cacheAppId = appId || getAppIdFromReviews(reviews);
    const cacheOptions = { mentalGuardMode: mentalGuardMode || false, reviewCount: reviews.length };

    // キャッシュをチェック
    if (cacheAppId) {
      const cached = cacheService.get('summary', cacheAppId, cacheOptions);
      if (cached) {
        console.log(`[Cache] Summary cache hit for ${cacheAppId}`);
        return res.json({
          success: true,
          summary: cached,
          cached: true
        });
      }
    }

    // AI分析を実行
    const summary = await aiService.generateSummary(reviews, {
      mentalGuardMode: mentalGuardMode || false
    });

    // キャッシュに保存
    if (cacheAppId) {
      cacheService.set('summary', cacheAppId, summary, cacheOptions);
    }

    res.json({
      success: true,
      summary,
      cached: false
    });

  } catch (error) {
    console.error('AI分析エラー:', error);

    // APIキーが設定されていない場合
    if (error.message.includes('API key')) {
      return res.status(503).json({
        error: 'AI機能が利用できません',
        hint: 'サーバー管理者にお問い合わせください'
      });
    }

    res.status(500).json({
      error: 'AI分析に失敗しました',
      message: error.message
    });
  }
});

/**
 * POST /api/analyze/transform
 * メンタルガードモード用：暴言を建設的フィードバックに変換
 */
router.post('/transform', async (req, res) => {
  try {
    const { review } = req.body;

    if (!review) {
      return res.status(400).json({ error: 'レビューテキストが必要です' });
    }

    const transformed = await aiService.transformToConstructive(review);

    res.json({
      success: true,
      transformed
    });

  } catch (error) {
    console.error('変換エラー:', error);
    res.status(500).json({
      error: '変換に失敗しました',
      message: error.message
    });
  }
});

/**
 * POST /api/analyze/keywords
 * レビューからキーワードを抽出（ワードクラウド用）（キャッシュ対応）
 */
router.post('/keywords', async (req, res) => {
  try {
    const { reviews, mentalGuardMode, appId } = req.body;

    if (!reviews || !Array.isArray(reviews)) {
      return res.status(400).json({ error: 'レビューデータが必要です' });
    }

    // キャッシュキー用のappId
    const cacheAppId = appId || getAppIdFromReviews(reviews);
    const cacheOptions = { mentalGuardMode: mentalGuardMode || false, reviewCount: reviews.length };

    // キャッシュをチェック
    if (cacheAppId) {
      const cached = cacheService.get('keywords', cacheAppId, cacheOptions);
      if (cached) {
        console.log(`[Cache] Keywords cache hit for ${cacheAppId}`);
        return res.json({
          success: true,
          keywords: cached,
          cached: true
        });
      }
    }

    const keywords = await aiService.extractKeywords(reviews, {
      mentalGuardMode: mentalGuardMode || false
    });

    // キャッシュに保存
    if (cacheAppId) {
      cacheService.set('keywords', cacheAppId, keywords, cacheOptions);
    }

    res.json({
      success: true,
      keywords,
      cached: false
    });

  } catch (error) {
    console.error('キーワード抽出エラー:', error.message);
    res.status(500).json({
      error: 'キーワード抽出に失敗しました',
      message: error.message
    });
  }
});

/**
 * POST /api/analyze/keywords-deep
 * レビューからキーワードを深掘り分析（表形式用）（キャッシュ対応）
 */
router.post('/keywords-deep', async (req, res) => {
  try {
    const { reviews, mentalGuardMode, appId } = req.body;

    if (!reviews || !Array.isArray(reviews)) {
      return res.status(400).json({ error: 'レビューデータが必要です' });
    }

    // キャッシュキー用のappId
    const cacheAppId = appId || getAppIdFromReviews(reviews);
    const cacheOptions = { mentalGuardMode: mentalGuardMode || false, reviewCount: reviews.length };

    // キャッシュをチェック
    if (cacheAppId) {
      const cached = cacheService.get('keywordsDeep', cacheAppId, cacheOptions);
      if (cached) {
        console.log(`[Cache] KeywordsDeep cache hit for ${cacheAppId}`);
        return res.json({
          success: true,
          keywords: cached,
          cached: true
        });
      }
    }

    const keywords = await aiService.extractKeywordsDeep(reviews, {
      mentalGuardMode: mentalGuardMode || false
    });

    // キャッシュに保存
    if (cacheAppId) {
      cacheService.set('keywordsDeep', cacheAppId, keywords, cacheOptions);
    }

    res.json({
      success: true,
      keywords,
      cached: false
    });

  } catch (error) {
    console.error('キーワード深掘りエラー:', error.message);
    res.status(500).json({
      error: 'キーワード深掘り分析に失敗しました',
      message: error.message
    });
  }
});

/**
 * POST /api/analyze/community
 * Steamコミュニティスレッドを分析（キャッシュ対応）
 */
router.post('/community', async (req, res) => {
  try {
    const { appId } = req.body;

    if (!appId) {
      return res.status(400).json({ error: 'appIdが必要です' });
    }

    // キャッシュをチェック
    const cached = cacheService.get('community', appId);
    if (cached) {
      console.log(`[Cache] Community cache hit for ${appId}`);
      return res.json({
        success: true,
        ...cached,
        cached: true
      });
    }

    const result = await aiService.analyzeCommunityThreads(appId);

    // キャッシュに保存
    cacheService.set('community', appId, result);

    res.json({
      success: true,
      ...result,
      cached: false
    });

  } catch (error) {
    console.error('コミュニティ分析エラー:', error.message);
    res.status(500).json({
      success: false,
      error: 'コミュニティ分析に失敗しました',
      message: error.message,
      topics: []
    });
  }
});

/**
 * GET /api/analyze/cache/stats
 * キャッシュ統計情報を取得
 */
router.get('/cache/stats', (req, res) => {
  const stats = cacheService.getStats();
  res.json({
    success: true,
    ...stats
  });
});

/**
 * POST /api/analyze/cache/clear
 * キャッシュをクリア（管理用）
 */
router.post('/cache/clear', (req, res) => {
  cacheService.clear();
  cacheService.resetStats();
  res.json({
    success: true,
    message: 'キャッシュをクリアしました'
  });
});

module.exports = router;
