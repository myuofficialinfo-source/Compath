/**
 * Blue Ocean Scout API
 * 市場分析エンドポイント
 */

const express = require('express');
const router = express.Router();
const blueOceanService = require('../services/blueOceanService');

/**
 * POST /api/blue-ocean/analyze
 * 市場分析を実行
 */
router.post('/analyze', async (req, res) => {
  try {
    const { mainGenre, subGenres, themes, freeText } = req.body;

    if (!mainGenre) {
      return res.status(400).json({ error: 'メインジャンルは必須です' });
    }

    console.log(`市場分析開始: ${mainGenre}, ${subGenres?.join(', ')}, ${themes?.join(', ')}`);

    const result = await blueOceanService.analyzeMarket({
      mainGenre,
      subGenres: subGenres || [],
      themes: themes || [],
      freeText: freeText || ''
    });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('市場分析エラー:', error.message);
    res.status(500).json({
      error: '市場分析に失敗しました',
      message: error.message
    });
  }
});

/**
 * GET /api/blue-ocean/tags
 * 利用可能なタグリストを取得
 */
router.get('/tags', (req, res) => {
  const tags = blueOceanService.getTagList();
  res.json({
    success: true,
    tags
  });
});

module.exports = router;
