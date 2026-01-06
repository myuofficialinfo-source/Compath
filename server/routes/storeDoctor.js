/**
 * Steam Store Doctor API
 * ストア診断エンドポイント
 */

const express = require('express');
const router = express.Router();
const storeDoctorService = require('../services/storeDoctorService');

// AppID抽出用（steamServiceと同じロジック）
function extractAppId(url) {
  if (!url) return null;
  if (/^\d+$/.test(url.trim())) {
    return url.trim();
  }
  const patterns = [
    /store\.steampowered\.com\/app\/(\d+)/i,
    /steampowered\.com\/app\/(\d+)/i,
    /\/app\/(\d+)/i
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * POST /api/store-doctor/diagnose
 * ストアページを診断
 */
router.post('/diagnose', async (req, res) => {
  try {
    const { url, lang } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URLが必要です' });
    }

    const appId = extractAppId(url);
    if (!appId) {
      return res.status(400).json({ error: '有効なSteam URLまたはAppIDを入力してください' });
    }

    console.log(`診断開始: AppID ${appId}, lang: ${lang || 'ja'}`);

    const result = await storeDoctorService.diagnoseStore(appId, { lang: lang || 'ja' });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('診断エラー:', error.message);
    res.status(500).json({
      error: '診断に失敗しました',
      message: error.message
    });
  }
});

module.exports = router;
