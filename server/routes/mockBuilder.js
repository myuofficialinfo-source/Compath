/**
 * Mock Builder API
 * AIでゲーム説明を解析してモック設定を生成
 */

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

// Gemini AI初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ゲーム関連の批判的・過激な表現に対応するため、安全フィルタは最高レベルのみブロック
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
];

/**
 * POST /api/mock-builder/analyze
 * ユーザーのゲーム説明をAIで解析してモック設定を生成
 */
router.post('/analyze', async (req, res) => {
  try {
    const {
      title,
      gameType,
      objective,
      controls,
      ui,
      entities,
      systems,
      language = 'ja'
    } = req.body;

    const isJa = language === 'ja';

    // 全ての説明を結合
    const fullDescription = `
タイトル: ${title}
ゲームタイプ: ${gameType}
目的/ゴール: ${objective}
操作方法: ${controls}
UI要素: ${ui}
敵/アイテム: ${entities}
特殊システム: ${systems}
    `.trim();

    console.log('モックビルダーAI解析:', fullDescription.substring(0, 200) + '...');

    // AIプロンプト
    const prompt = isJa ? `
あなたはゲームモックビルダーのAIアシスタントです。
ユーザーのゲーム説明を分析して、2Dゲームモックを生成するための設定JSONを出力してください。

【ユーザーのゲーム説明】
${fullDescription}

【出力形式】
以下のJSON形式で出力してください。JSONのみを出力し、説明文は不要です。

{
  "uiElements": [
    {
      "type": "inventory" | "healthBar" | "score" | "timer" | "minimap" | "skillBar",
      "position": "top-left" | "top-right" | "top-center" | "bottom-left" | "bottom-right" | "bottom-center" | "bottom",
      "gridSize": { "cols": 3, "rows": 3 },  // inventoryの場合のみ
      "label": "バックパック"  // 表示ラベル
    }
  ],
  "enemyTypes": [
    {
      "type": "識別子",
      "emoji": "絵文字1つ",
      "dropsItem": true/false,
      "behavior": "walk" | "fly" | "chase" | "stationary"
    }
  ],
  "actions": {
    "canJump": true/false,
    "canDoubleJump": true/false,
    "canShoot": true/false,
    "canAttack": true/false,
    "canCapture": true/false,
    "canDash": true/false,
    "hasGravity": true/false
  },
  "specialSystems": [
    {
      "type": "adjacencyBonus" | "combo" | "craft" | "upgrade",
      "description": "説明"
    }
  ],
  "playerEmoji": "プレイヤーキャラの絵文字1つ",
  "playerSize": 40
}

【重要なルール】
1. ユーザーの説明に「バックパック」「インベントリ」「収集」「格納」などがあれば、必ずinventory UIを追加
2. 「HP」「体力」「ライフ」があればhealthBarを追加
3. 「スコア」「ポイント」があればscoreを追加
4. 敵の種類が複数ある場合は、適切な絵文字で区別
5. 「虫」「bug」があれば虫の絵文字（🐛🐜🦗🐞など）を使用
6. 「攻撃」「倒す」があればcanAttackをtrue
7. 「キャプチャ」「捕まえる」「回収」があればcanCaptureをtrue
8. 「射撃」「撃つ」「シュート」があればcanShootをtrue
9. 「隣接」「組み合わせ」があればadjacencyBonusシステムを追加
10. プレイヤーの絵文字はゲームの世界観に合わせて選択
` : `
You are an AI assistant for a game mock builder.
Analyze the user's game description and output a configuration JSON for generating a 2D game mock.

【User's Game Description】
${fullDescription}

【Output Format】
Output only JSON in the following format, no explanation needed.

{
  "uiElements": [...],
  "enemyTypes": [...],
  "actions": {...},
  "specialSystems": [...],
  "playerEmoji": "single emoji",
  "playerSize": 40
}

Analyze the description carefully and extract:
- UI elements (inventory, health bar, score, etc.)
- Enemy types with appropriate emojis
- Player actions (jump, shoot, attack, capture, etc.)
- Special game systems (adjacency bonus, combos, etc.)
`;

    // Gemini AIで解析
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', safetySettings: SAFETY_SETTINGS });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log('AI応答:', responseText.substring(0, 500));

    // JSONを抽出
    let gameConfig;
    try {
      // JSONブロックを抽出
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        gameConfig = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON not found in response');
      }
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      // フォールバック: デフォルト設定を返す
      gameConfig = generateFallbackConfig(fullDescription, gameType);
    }

    // バリデーションと補完
    gameConfig = validateAndCompleteConfig(gameConfig, fullDescription, gameType);

    res.json({
      success: true,
      gameConfig
    });

  } catch (error) {
    console.error('モックビルダーAI解析エラー:', error.message);

    // エラー時はフォールバック設定を返す
    const fallbackConfig = generateFallbackConfig(
      req.body.objective + ' ' + req.body.ui + ' ' + req.body.entities,
      req.body.gameType
    );

    res.json({
      success: true,
      gameConfig: fallbackConfig,
      fallback: true
    });
  }
});

/**
 * フォールバック設定を生成
 */
function generateFallbackConfig(description, gameType) {
  const text = description.toLowerCase();

  const uiElements = [];
  const enemyTypes = [];
  const actions = {
    canJump: gameType === 'platformer' || text.includes('ジャンプ') || text.includes('jump'),
    canAttack: text.includes('攻撃') || text.includes('attack') || text.includes('倒す'),
    canShoot: text.includes('射撃') || text.includes('shoot') || text.includes('撃つ'),
    canCapture: text.includes('キャプチャ') || text.includes('capture') || text.includes('捕まえ') || text.includes('回収'),
    hasGravity: gameType === 'platformer' || gameType === 'survival'
  };

  // UI検出
  if (text.includes('バックパック') || text.includes('backpack') ||
      text.includes('インベントリ') || text.includes('inventory') ||
      text.includes('格納') || text.includes('収集')) {
    const gridMatch = text.match(/(\d+)\s*[x×]\s*(\d+)/);
    uiElements.push({
      type: 'inventory',
      position: 'bottom',
      gridSize: gridMatch ? { cols: parseInt(gridMatch[1]), rows: parseInt(gridMatch[2]) } : { cols: 3, rows: 3 },
      label: 'バックパック'
    });
  }

  if (text.includes('hp') || text.includes('体力') || text.includes('health') || text.includes('ライフ')) {
    uiElements.push({ type: 'healthBar', position: 'top-left' });
  }

  if (text.includes('スコア') || text.includes('score') || text.includes('ポイント')) {
    uiElements.push({ type: 'score', position: 'top-right' });
  }

  // 敵検出
  if (text.includes('虫') || text.includes('bug') || text.includes('insect')) {
    enemyTypes.push({ type: 'bug1', emoji: '🐛', dropsItem: true, behavior: 'walk' });
    if (text.includes('種類') || text.includes('type')) {
      enemyTypes.push({ type: 'bug2', emoji: '🐜', dropsItem: true, behavior: 'walk' });
      enemyTypes.push({ type: 'bug3', emoji: '🦗', dropsItem: true, behavior: 'walk' });
    }
  } else {
    enemyTypes.push({ type: 'enemy', emoji: '👾', dropsItem: false, behavior: 'walk' });
  }

  // 特殊システム
  const specialSystems = [];
  if (text.includes('隣接') || text.includes('adjacent') || text.includes('組み合わせ')) {
    specialSystems.push({ type: 'adjacencyBonus', description: '隣接効果システム' });
  }

  return {
    uiElements,
    enemyTypes,
    actions,
    specialSystems,
    playerEmoji: '🧙',
    playerSize: 40
  };
}

/**
 * 設定をバリデート・補完
 */
function validateAndCompleteConfig(config, description, gameType) {
  const text = description.toLowerCase();

  // デフォルト値で補完
  if (!config.uiElements) config.uiElements = [];
  if (!config.enemyTypes) config.enemyTypes = [{ type: 'enemy', emoji: '👾', dropsItem: false }];
  if (!config.actions) config.actions = {};
  if (!config.specialSystems) config.specialSystems = [];
  if (!config.playerEmoji) config.playerEmoji = '🧙';
  if (!config.playerSize) config.playerSize = 40;

  // ゲームタイプに基づくデフォルト設定
  if (gameType === 'platformer') {
    if (config.actions.canJump === undefined) config.actions.canJump = true;
    if (config.actions.hasGravity === undefined) config.actions.hasGravity = true;
  }

  // 説明に基づく追加検出（AIが見逃した場合の補完）
  const hasInventoryUI = config.uiElements.some(ui => ui.type === 'inventory');
  if (!hasInventoryUI && (text.includes('バックパック') || text.includes('インベントリ') || text.includes('格納'))) {
    const gridMatch = text.match(/(\d+)\s*[x×]\s*(\d+)/);
    config.uiElements.push({
      type: 'inventory',
      position: 'bottom',
      gridSize: gridMatch ? { cols: parseInt(gridMatch[1]), rows: parseInt(gridMatch[2]) } : { cols: 3, rows: 3 },
      label: 'バックパック'
    });
  }

  const hasHealthBar = config.uiElements.some(ui => ui.type === 'healthBar');
  if (!hasHealthBar && (text.includes('hp') || text.includes('体力') || text.includes('ライフ'))) {
    config.uiElements.push({ type: 'healthBar', position: 'top-left' });
  }

  const hasScore = config.uiElements.some(ui => ui.type === 'score');
  if (!hasScore && (text.includes('スコア') || text.includes('score'))) {
    config.uiElements.push({ type: 'score', position: 'top-right' });
  }

  // キャプチャ機能の補完
  if (text.includes('キャプチャ') || text.includes('捕まえ') || text.includes('回収')) {
    config.actions.canCapture = true;
  }

  return config;
}

module.exports = router;
