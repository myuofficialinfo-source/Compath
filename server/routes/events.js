/**
 * Events API
 * イベント・スケジュール統合エンドポイント
 */

const express = require('express');
const router = express.Router();
const eventScraperService = require('../services/eventScraperService');

/**
 * GET /api/events/all
 * 全イベントを取得
 */
router.get('/all', async (req, res) => {
  try {
    const { refresh } = req.query;
    const events = await eventScraperService.fetchAllEvents(refresh === 'true');

    res.json({
      success: true,
      count: events.length,
      events
    });

  } catch (error) {
    console.error('イベント取得エラー:', error.message);
    res.status(500).json({
      error: 'イベントの取得に失敗しました',
      message: error.message
    });
  }
});

/**
 * GET /api/events/range
 * 指定期間のイベントを取得
 */
router.get('/range', async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'start と end パラメータが必要です' });
    }

    const events = await eventScraperService.getEventsInRange(start, end);

    res.json({
      success: true,
      startDate: start,
      endDate: end,
      count: events.length,
      events
    });

  } catch (error) {
    console.error('イベント取得エラー:', error.message);
    res.status(500).json({
      error: 'イベントの取得に失敗しました',
      message: error.message
    });
  }
});

/**
 * GET /api/events/for-release
 * リリース日に関連するイベントを取得
 */
router.get('/for-release', async (req, res) => {
  try {
    const { releaseDate, monthsBefore = 6, monthsAfter = 3 } = req.query;

    if (!releaseDate) {
      return res.status(400).json({ error: 'releaseDate パラメータが必要です' });
    }

    const events = await eventScraperService.getEventsForRelease(
      releaseDate,
      parseInt(monthsBefore),
      parseInt(monthsAfter)
    );

    res.json({
      success: true,
      releaseDate,
      count: events.length,
      events
    });

  } catch (error) {
    console.error('イベント取得エラー:', error.message);
    res.status(500).json({
      error: 'イベントの取得に失敗しました',
      message: error.message
    });
  }
});

/**
 * GET /api/events/steam-sales
 * 今後のSteamセールを取得
 */
router.get('/steam-sales', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const events = await eventScraperService.getUpcomingSteamSales(parseInt(limit));

    res.json({
      success: true,
      count: events.length,
      events
    });

  } catch (error) {
    console.error('Steamセール取得エラー:', error.message);
    res.status(500).json({
      error: 'Steamセールの取得に失敗しました',
      message: error.message
    });
  }
});

/**
 * GET /api/events/industry
 * 今後の業界イベントを取得
 */
router.get('/industry', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const events = await eventScraperService.getUpcomingIndustryEvents(parseInt(limit));

    res.json({
      success: true,
      count: events.length,
      events
    });

  } catch (error) {
    console.error('業界イベント取得エラー:', error.message);
    res.status(500).json({
      error: '業界イベントの取得に失敗しました',
      message: error.message
    });
  }
});

/**
 * GET /api/events/by-category
 * カテゴリ別にイベントを取得
 */
router.get('/by-category', async (req, res) => {
  try {
    const categorized = await eventScraperService.getEventsByCategory();

    res.json({
      success: true,
      categories: categorized
    });

  } catch (error) {
    console.error('カテゴリ別取得エラー:', error.message);
    res.status(500).json({
      error: 'カテゴリ別取得に失敗しました',
      message: error.message
    });
  }
});

/**
 * GET /api/events/by-region
 * 地域別にイベントを取得
 */
router.get('/by-region', async (req, res) => {
  try {
    const { regions } = req.query;

    if (!regions) {
      return res.status(400).json({ error: 'regions パラメータが必要です（カンマ区切り）' });
    }

    const regionList = regions.split(',').map(r => r.trim());
    const events = await eventScraperService.getEventsByRegion(regionList);

    res.json({
      success: true,
      regions: regionList,
      count: events.length,
      events
    });

  } catch (error) {
    console.error('地域別取得エラー:', error.message);
    res.status(500).json({
      error: '地域別取得に失敗しました',
      message: error.message
    });
  }
});

module.exports = router;
