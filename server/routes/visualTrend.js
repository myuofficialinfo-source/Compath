/**
 * Visual Trend Hunter API
 * カプセル画像トレンド分析エンドポイント
 *
 * 改善点:
 * - 近日登場/新作にフォーカス（既存人気作品を排除）
 * - 純粋なビジュアル評価に特化
 * - AIによるバナーデザインスコアリング
 */

const express = require('express');
const router = express.Router();
const visualTrendService = require('../services/visualTrendService');

/**
 * GET /api/visual-trend/trending
 * 近日登場/新作のカプセル画像を取得
 * sourceType: coming_soon, new_releases, popular_upcoming
 */
router.get('/trending', async (req, res) => {
  try {
    const {
      genre = 'Indie',
      sourceType = 'coming_soon',
      limit = 12
    } = req.query;

    console.log(`カプセル取得: ${genre}, source=${sourceType}, limit=${limit}`);

    const capsules = await visualTrendService.getTrendingCapsules(
      genre,
      sourceType,
      parseInt(limit)
    );

    res.json({
      success: true,
      genre,
      sourceType,
      count: capsules.length,
      capsules
    });

  } catch (error) {
    console.error('カプセル取得エラー:', error.message);
    res.status(500).json({
      error: 'カプセルの取得に失敗しました',
      message: error.message
    });
  }
});

/**
 * GET /api/visual-trend/ranked
 * AIビジュアルスコアでランク付けされたカプセル画像を取得
 */
router.get('/ranked', async (req, res) => {
  try {
    const {
      genre = 'Indie',
      sourceType = 'coming_soon',
      topN = 6
    } = req.query;

    console.log(`ランキング取得: ${genre}, source=${sourceType}, top=${topN}`);

    // まずカプセルを取得
    const capsules = await visualTrendService.getTrendingCapsules(
      genre,
      sourceType,
      parseInt(topN) * 2 // 余裕を持って取得
    );

    // AIスコアでランキング
    const rankedCapsules = await visualTrendService.rankByVisualScore(
      capsules,
      parseInt(topN)
    );

    res.json({
      success: true,
      genre,
      sourceType,
      count: rankedCapsules.length,
      capsules: rankedCapsules
    });

  } catch (error) {
    console.error('ランキング取得エラー:', error.message);
    res.status(500).json({
      error: 'ランキングの取得に失敗しました',
      message: error.message
    });
  }
});

/**
 * GET /api/visual-trend/genres
 * 利用可能なジャンル一覧
 */
router.get('/genres', (req, res) => {
  const genres = visualTrendService.getAvailableGenres();
  res.json({
    success: true,
    genres
  });
});

/**
 * GET /api/visual-trend/source-types
 * 利用可能なデータソースタイプ一覧
 */
router.get('/source-types', (req, res) => {
  const sourceTypes = visualTrendService.getDataSourceTypes();
  res.json({
    success: true,
    sourceTypes
  });
});

/**
 * GET /api/visual-trend/tags
 * クリック要因タグ定義を取得
 */
router.get('/tags', (req, res) => {
  const tags = visualTrendService.getClickFactorTags();
  res.json({
    success: true,
    tags
  });
});

/**
 * POST /api/visual-trend/analyze
 * 単一カプセル画像をAI分析（純粋なビジュアル評価）
 */
router.post('/analyze', async (req, res) => {
  try {
    const { imageUrl, language = 'ja' } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: '画像URLは必須です' });
    }

    console.log(`画像分析開始: ${imageUrl}, lang=${language}`);

    const analysis = await visualTrendService.analyzeImageWithVision(imageUrl, language);

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('画像分析エラー:', error.message);
    res.status(500).json({
      error: '画像分析に失敗しました',
      message: error.message
    });
  }
});

/**
 * POST /api/visual-trend/analyze-trends
 * 複数画像からトレンドパターンを分析
 */
router.post('/analyze-trends', async (req, res) => {
  try {
    const { genre = 'Indie', sourceType = 'coming_soon' } = req.body;

    console.log(`トレンドパターン分析: ${genre}, source=${sourceType}`);

    // 近日登場/新作カプセルを取得
    const capsules = await visualTrendService.getTrendingCapsules(genre, sourceType, 8);

    // パターン分析
    const trendAnalysis = await visualTrendService.analyzeTrendPatterns(capsules);

    res.json({
      success: true,
      genre,
      sourceType,
      capsules,
      trendAnalysis
    });

  } catch (error) {
    console.error('トレンド分析エラー:', error.message);
    res.status(500).json({
      error: 'トレンド分析に失敗しました',
      message: error.message
    });
  }
});

/**
 * POST /api/visual-trend/compare
 * ユーザー画像とトレンドを比較
 */
router.post('/compare', async (req, res) => {
  try {
    const { userImage, genre = 'Indie', sourceType = 'coming_soon' } = req.body;

    if (!userImage) {
      return res.status(400).json({ error: 'ユーザー画像は必須です' });
    }

    console.log(`トレンド比較分析: ${genre}, source=${sourceType}`);

    // 近日登場/新作のトレンドを分析
    const capsules = await visualTrendService.getTrendingCapsules(genre, sourceType, 6);
    const trendAnalysis = await visualTrendService.analyzeTrendPatterns(capsules);

    // ユーザー画像と比較
    const comparison = await visualTrendService.compareWithTrends(userImage, trendAnalysis);

    res.json({
      success: true,
      genre,
      sourceType,
      trendAnalysis,
      comparison
    });

  } catch (error) {
    console.error('比較分析エラー:', error.message);
    res.status(500).json({
      error: '比較分析に失敗しました',
      message: error.message
    });
  }
});

module.exports = router;
