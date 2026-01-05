/**
 * Global Launch Commander API
 * ローンチ戦略生成エンドポイント
 */

const express = require('express');
const router = express.Router();
const launchCommanderService = require('../services/launchCommanderService');

/**
 * POST /api/launch-commander/generate
 * ローンチ戦略を生成
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      releaseDate,
      genre,
      completionPercent,
      assets,
      budget,
      targetRegions,
      language,
      gameDescription,
      steamUrl,
      snsAccounts
    } = req.body;

    if (!releaseDate) {
      return res.status(400).json({ error: 'リリース日は必須です' });
    }

    if (!genre) {
      return res.status(400).json({ error: 'ジャンルは必須です' });
    }

    console.log(`ローンチ戦略生成開始: ${releaseDate}, ${genre}, ${completionPercent}%`);

    const result = await launchCommanderService.generateLaunchStrategy({
      releaseDate,
      genre,
      completionPercent: completionPercent || 0,
      assets: assets || {},
      budget: budget || 'low',
      targetRegions: targetRegions || ['US', 'Japan'],
      language: language || 'ja',
      gameDescription: gameDescription || '',
      steamUrl: steamUrl || '',
      snsAccounts: snsAccounts || {}
    });

    res.json(result);

  } catch (error) {
    console.error('ローンチ戦略生成エラー:', error.message);
    res.status(500).json({
      error: 'ローンチ戦略の生成に失敗しました',
      message: error.message
    });
  }
});

/**
 * POST /api/launch-commander/recalculate
 * 遅延時の再計算（Plan B）
 */
router.post('/recalculate', async (req, res) => {
  try {
    const { originalStrategy, newReleaseDate, reason } = req.body;

    if (!newReleaseDate) {
      return res.status(400).json({ error: '新しいリリース日は必須です' });
    }

    console.log(`戦略再計算: 新リリース日 ${newReleaseDate}`);

    const result = await launchCommanderService.recalculateWithDelay(
      originalStrategy,
      newReleaseDate
    );

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('戦略再計算エラー:', error.message);
    res.status(500).json({
      error: '戦略の再計算に失敗しました',
      message: error.message
    });
  }
});

/**
 * GET /api/launch-commander/events
 * イベントリストを取得
 */
router.get('/events', (req, res) => {
  const events = launchCommanderService.getEventList();
  res.json({
    success: true,
    events
  });
});

/**
 * GET /api/launch-commander/regions
 * 地域別戦略情報を取得
 */
router.get('/regions', (req, res) => {
  const regions = launchCommanderService.getRegionalStrategies();
  res.json({
    success: true,
    regions
  });
});

module.exports = router;
