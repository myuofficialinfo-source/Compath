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
    const { tags, tagIds, freeText } = req.body;

    if (!tags || tags.length === 0) {
      return res.status(400).json({ error: 'タグを1つ以上選択してください' });
    }

    console.log(`市場分析開始: tags=[${tags.join(', ')}], tagIds=[${(tagIds || []).join(', ')}]`);

    const result = await blueOceanService.analyzeMarket({
      tags: tags,
      tagIds: tagIds || [],
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
 * 利用可能なタグリストを取得（ハードコード版）
 */
router.get('/tags', (req, res) => {
  const tags = blueOceanService.getTagList();
  res.json({
    success: true,
    tags
  });
});

/**
 * GET /api/blue-ocean/steam-tags
 * Steam公式タグAPIからタグリストを取得
 */
router.get('/steam-tags', async (req, res) => {
  try {
    const lang = req.query.lang || 'japanese';
    const tags = await blueOceanService.fetchSteamTags(lang);
    res.json({
      success: true,
      tags
    });
  } catch (error) {
    console.error('Steamタグ取得エラー:', error.message);
    res.status(500).json({
      error: 'タグの取得に失敗しました',
      message: error.message
    });
  }
});

module.exports = router;
