/**
 * Steam レビュー取得API
 * Steam Web APIからレビューを取得してフロントエンドに返す
 */

const express = require('express');
const router = express.Router();
const steamService = require('../services/steamService');

/**
 * POST /api/reviews/fetch
 * SteamストアURLからレビューを取得
 */
router.post('/fetch', async (req, res) => {
  try {
    const { url, language, playtimeFilter, dateFilter, count } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URLが指定されていません' });
    }

    // URLからAppIDを抽出
    const appId = steamService.extractAppId(url);
    if (!appId) {
      return res.status(400).json({
        error: '無効なSteamストアURLです',
        hint: 'https://store.steampowered.com/app/12345/... の形式で入力してください'
      });
    }

    // ゲーム情報を取得
    const gameInfo = await steamService.getGameInfo(appId);

    // レビューを取得
    const reviews = await steamService.fetchReviews(appId, {
      language: language || 'all',
      playtimeFilter: playtimeFilter || 'all',
      dateFilter: dateFilter || 'all',
      count: Math.min(count || 1000, 1000) // 最大1000件
    });

    res.json({
      success: true,
      appId,
      gameInfo,
      reviews,
      totalFetched: reviews.length
    });

  } catch (error) {
    console.error('レビュー取得エラー:', error);
    res.status(500).json({
      error: 'レビューの取得に失敗しました',
      message: error.message
    });
  }
});

/**
 * GET /api/reviews/game/:appId
 * AppIDから直接ゲーム情報を取得
 */
router.get('/game/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const gameInfo = await steamService.getGameInfo(appId);

    if (!gameInfo) {
      return res.status(404).json({ error: 'ゲームが見つかりません' });
    }

    res.json({ success: true, gameInfo });
  } catch (error) {
    console.error('ゲーム情報取得エラー:', error);
    res.status(500).json({ error: 'ゲーム情報の取得に失敗しました' });
  }
});

/**
 * POST /api/reviews/user-games
 * レビュアーが他に遊んでいるゲームを集計
 */
router.post('/user-games', async (req, res) => {
  try {
    const { steamIds, appId } = req.body;

    if (!steamIds || !Array.isArray(steamIds) || steamIds.length === 0) {
      return res.status(400).json({ error: 'steamIdsが指定されていません' });
    }

    if (!appId) {
      return res.status(400).json({ error: 'appIdが指定されていません' });
    }

    // 最大100人まで
    const limitedIds = steamIds.slice(0, 100);

    const result = await steamService.aggregateUserGames(limitedIds, appId);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('ユーザーゲーム集計エラー:', error);
    res.status(500).json({
      error: 'ユーザーゲームの集計に失敗しました',
      message: error.message
    });
  }
});

module.exports = router;
