/**
 * AI分析サービス
 * Google Gemini APIを使用してレビューの要約・分析を行う
 *
 * セキュリティ設計:
 * - APIキーはサーバーサイドの環境変数でのみ保持
 * - クライアントには一切公開しない
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Geminiクライアントの初期化（遅延初期化）
let geminiClient = null;
let geminiModel = null;

function getGeminiModel() {
  if (!geminiModel) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API keyが設定されていません');
    }
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = geminiClient.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });
  }
  return geminiModel;
}

// NGワードリスト（メンタルガードモード用）
const NG_WORDS = [
  'クソ', 'ゴミ', '死ね', '氏ね', 'しね', 'カス', '詐欺',
  '金返せ', '返金', 'バカ', 'アホ', 'キチガイ', '障害',
  'fuck', 'shit', 'trash', 'garbage', 'scam', 'steal',
  'stupid', 'idiot', 'worst', 'terrible', 'awful'
];

// 変換マッピング（メンタルガードモード用）
const WORD_REPLACEMENTS = {
  'クソ': '',
  'ゴミ': '',
  'バグだらけ': '不具合',
  'カクつく': 'フレームレート低下',
  'カクつき': 'フレームレート低下',
  '重い': '最適化',
  '遅い': 'レスポンス',
  'つまらない': 'ゲーム性',
  'boring': 'gameplay',
  'laggy': 'performance',
  'broken': 'issues'
};

/**
 * レビューの要約を生成
 * @param {Array} reviews - レビュー配列
 * @param {Object} options - オプション
 * @returns {Promise<Object>} 要約結果
 */
async function generateSummary(reviews, options = {}) {
  const { mentalGuardMode = false } = options;

  const model = getGeminiModel();

  // レビューをポジティブ/ネガティブに分類
  const positiveReviews = reviews.filter(r => r.votedUp);
  const negativeReviews = reviews.filter(r => !r.votedUp);

  // 代表的なレビューを抽出（最大20件ずつ）
  const samplePositive = positiveReviews
    .slice(0, 20)
    .map(r => r.review)
    .join('\n---\n');

  const sampleNegative = negativeReviews
    .slice(0, 20)
    .map(r => r.review)
    .join('\n---\n');

  // メンタルガードモード用のプロンプト
  const mentalGuardPrompt = mentalGuardMode ? `
【重要：メンタルガードモード有効】
あなたは傷つきやすい開発者を守る「優秀で冷静な秘書」です。
以下のルールを厳守してください：
- 暴言・人格否定・汚い言葉（クソ、ゴミ、死ね等）はすべて削除
- 強い否定表現は「改善要望」としてマイルドに書き換え
- ただし「バグ」「ラグ」「UI問題」などの重要な技術情報は残す
- 淡々とした事務的なトーンで出力
- 感情的な攻撃は一切含めない
` : '';

  const prompt = `
あなたはゲームレビューを分析する専門家です。正確で客観的な分析を提供してください。
${mentalGuardPrompt}

【重要】
- すべての出力は必ず日本語で行ってください
- 英語・中国語・韓国語などのレビューも内容を日本語に翻訳して分析してください
- 引用（quote）も日本語で出力してください

以下はSteamゲームのレビューです。内容を分析して要約してください。

【ポジティブレビュー（抜粋）】
${samplePositive || 'なし'}

【ネガティブレビュー（抜粋）】
${sampleNegative || 'なし'}

以下のJSON形式で日本語で回答してください（良い点・悪い点は6件ずつ）：
{
  "goodPoints": [
    {"point": "良い点1（日本語）", "quote": "根拠となるレビュー引用（日本語で短く）"},
    {"point": "良い点2（日本語）", "quote": "根拠となるレビュー引用（日本語で短く）"},
    {"point": "良い点3（日本語）", "quote": "根拠となるレビュー引用（日本語で短く）"},
    {"point": "良い点4（日本語）", "quote": "根拠となるレビュー引用（日本語で短く）"},
    {"point": "良い点5（日本語）", "quote": "根拠となるレビュー引用（日本語で短く）"},
    {"point": "良い点6（日本語）", "quote": "根拠となるレビュー引用（日本語で短く）"}
  ],
  "badPoints": [
    {"point": "改善点1（日本語）", "quote": "根拠となるレビュー引用（日本語で短く）"},
    {"point": "改善点2（日本語）", "quote": "根拠となるレビュー引用（日本語で短く）"},
    {"point": "改善点3（日本語）", "quote": "根拠となるレビュー引用（日本語で短く）"},
    {"point": "改善点4（日本語）", "quote": "根拠となるレビュー引用（日本語で短く）"},
    {"point": "改善点5（日本語）", "quote": "根拠となるレビュー引用（日本語で短く）"},
    {"point": "改善点6（日本語）", "quote": "根拠となるレビュー引用（日本語で短く）"}
  ],
  "categories": {
    "gameplay": {"positive": 0, "negative": 0, "keywords": []},
    "graphics": {"positive": 0, "negative": 0, "keywords": []},
    "story": {"positive": 0, "negative": 0, "keywords": []},
    "performance": {"positive": 0, "negative": 0, "keywords": []},
    "price": {"positive": 0, "negative": 0, "keywords": []},
    "controls": {"positive": 0, "negative": 0, "keywords": []},
    "bugs": {"positive": 0, "negative": 0, "keywords": []},
    "localization": {"positive": 0, "negative": 0, "keywords": []}
  }
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return JSON.parse(text);

  } catch (error) {
    console.error('AI要約エラー:', error);
    throw error;
  }
}

/**
 * 暴言を建設的フィードバックに変換（メンタルガードモード）
 * @param {string} reviewText - 元のレビューテキスト
 * @returns {Promise<Object>} 変換結果
 */
async function transformToConstructive(reviewText) {
  const model = getGeminiModel();

  const prompt = `
あなたは傷つきやすい開発者を守る「優秀で冷静な秘書」です。
以下のレビューを分析し、開発者に伝えるべき「事実」と「改善点」だけを抽出してください。

【絶対的なルール】
- 暴言・人格否定・汚い言葉（クソ、ゴミ、死ね等）はすべて削除
- 強い否定表現は「改善要望」としてマイルドに書き換え
- 「バグ」「不具合」「UIの問題」などの技術情報は正確に残す
- 出力は箇条書きで、淡々とした事務的なトーン

【元のレビュー】
${reviewText}

以下のJSON形式で回答：
{
  "category": "操作性/バグ/価格/翻訳/ゲームプレイ/その他",
  "summary": "事務的に要約した内容（1-2文）",
  "technicalIssues": ["技術的な問題点があれば配列で"],
  "suggestions": ["建設的な改善提案があれば配列で"],
  "severity": "high/medium/low"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return JSON.parse(text);

  } catch (error) {
    console.error('変換エラー:', error);
    throw error;
  }
}

/**
 * レビューからキーワードを抽出（ワードクラウド用）
 * @param {Object} reviewsData - レビューデータ
 * @param {Object} options - オプション
 * @returns {Promise<Object>} キーワード結果
 */
async function extractKeywords(reviewsData, options = {}) {
  const { mentalGuardMode = false } = options;
  const reviews = reviewsData.reviews || reviewsData;

  const model = getGeminiModel();

  // レビューをポジティブ/ネガティブに分類
  const positiveReviews = reviews.filter(r => r.votedUp);
  const negativeReviews = reviews.filter(r => !r.votedUp);

  // テキストを結合
  const positiveText = positiveReviews.map(r => r.review).join(' ');
  const negativeText = negativeReviews.map(r => r.review).join(' ');

  const mentalGuardInstruction = mentalGuardMode ? `
【メンタルガードモード】
- 「クソ」「ゴミ」「金返せ」「詐欺」などの攻撃的な単語は除外
- 攻撃的な形容詞を取り除き、名詞のみを抽出
- 例：「クソ操作性」→「操作性」
` : '';

  const prompt = `
ゲームレビューからキーワードを抽出する専門家として、以下のレビューテキストから頻出する重要なキーワードを抽出してください。
${mentalGuardInstruction}

【抽出ルール】
- 「ゲーム」「面白い」「おすすめ」などの汎用的すぎる単語は除外
- 「操作性」「サウンドトラック」「バグ」「ストーリー」など特徴を表す名詞を抽出
- 各キーワードの出現頻度（重要度）を1-100のスコアで評価
- 最大30個まで
- 【重要】すべてのキーワードは日本語で出力してください。英語のキーワードも日本語に翻訳してください。

【ポジティブレビュー】
${positiveText.slice(0, 5000)}

【ネガティブレビュー】
${negativeText.slice(0, 5000)}

以下のJSON形式で日本語のキーワードで回答：
{
  "positive": [
    {"word": "日本語キーワード", "score": 85, "count": 12}
  ],
  "negative": [
    {"word": "日本語キーワード", "score": 75, "count": 8}
  ]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('Gemini keywords response:', text.substring(0, 500));
    const parsed = JSON.parse(text);
    console.log('Parsed keywords - positive:', parsed.positive?.length, 'negative:', parsed.negative?.length);
    return parsed;

  } catch (error) {
    console.error('キーワード抽出エラー:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

/**
 * レビューからキーワードを深掘り分析（表形式用）
 * @param {Object} reviewsData - レビューデータ
 * @param {Object} options - オプション
 * @returns {Promise<Object>} キーワード結果（言及数・概要付き）
 */
async function extractKeywordsDeep(reviewsData, options = {}) {
  const { mentalGuardMode = false } = options;
  const reviews = reviewsData.reviews || reviewsData;

  const model = getGeminiModel();

  // レビューをポジティブ/ネガティブに分類
  const positiveReviews = reviews.filter(r => r.votedUp);
  const negativeReviews = reviews.filter(r => !r.votedUp);

  // テキストを結合
  const positiveText = positiveReviews.map(r => r.review).join('\n---\n');
  const negativeText = negativeReviews.map(r => r.review).join('\n---\n');

  const mentalGuardInstruction = mentalGuardMode ? `
【メンタルガードモード】
- 攻撃的な単語は除外し、建設的な表現に変換
` : '';

  const prompt = `
ゲームレビューを分析して、主要なトピック/キーワードを抽出してください。
${mentalGuardInstruction}

【抽出ルール】
- 「ゲーム」「面白い」などの汎用的すぎる単語は除外
- 「シナリオ」「操作性」「グラフィック」「バグ」「価格」「ボリューム」「難易度」「音楽」「キャラクター」「UI」など、ゲームの特徴や品質に関するトピックを抽出
- 各トピックについて、レビュー中での言及回数をカウント
- 各トピックについて、レビュー内容を要約した概要を必ず1-2文で記述
- 最大10個まで（重要度順）
- 【重要】すべて日本語で出力
- 【必須】positiveTopicsとnegativeTopicsは必ず出力すること。summaryは空にせず、必ずレビュー内容を要約した文章を入れること。

【ポジティブレビュー（${positiveReviews.length}件）】
${positiveText.slice(0, 8000)}

【ネガティブレビュー（${negativeReviews.length}件）】
${negativeText.slice(0, 8000)}

以下のJSON形式で必ず回答（positiveTopicsとnegativeTopicsのsummaryは必須）：
{
  "positiveTopics": [
    {"keyword": "シナリオ", "count": 25, "summary": "ストーリーの展開が秀逸で、感動的な結末が高く評価されている"},
    {"keyword": "音楽", "count": 18, "summary": "BGMが印象的で、場面に合った演出が好評"}
  ],
  "negativeTopics": [
    {"keyword": "バグ", "count": 15, "summary": "セーブデータの破損や進行不能バグの報告が多い"},
    {"keyword": "価格", "count": 12, "summary": "ボリュームに対して価格が高いという意見が目立つ"}
  ]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('extractKeywordsDeep response:', text.substring(0, 500));
    const parsed = JSON.parse(text);

    // positive/negative配列が存在しない場合、positiveTopics/negativeTopicsから生成
    if ((!parsed.positive || parsed.positive.length === 0) && parsed.positiveTopics) {
      parsed.positive = parsed.positiveTopics.map((topic, index) => ({
        word: topic.keyword,
        score: Math.max(100 - index * 10, 30),
        count: topic.count
      }));
    }
    if ((!parsed.negative || parsed.negative.length === 0) && parsed.negativeTopics) {
      parsed.negative = parsed.negativeTopics.map((topic, index) => ({
        word: topic.keyword,
        score: Math.max(100 - index * 10, 30),
        count: topic.count
      }));
    }

    // 逆方向：positiveTopics/negativeTopicsが無い場合、positive/negativeから生成
    if ((!parsed.positiveTopics || parsed.positiveTopics.length === 0) && parsed.positive && parsed.positive.length > 0) {
      console.log('Generating positiveTopics from positive array');
      parsed.positiveTopics = parsed.positive.map(k => ({
        keyword: k.word,
        count: k.count || k.score || 0,
        summary: '' // 概要はAIから取得できなかった
      }));
    }
    if ((!parsed.negativeTopics || parsed.negativeTopics.length === 0) && parsed.negative && parsed.negative.length > 0) {
      console.log('Generating negativeTopics from negative array');
      parsed.negativeTopics = parsed.negative.map(k => ({
        keyword: k.word,
        count: k.count || k.score || 0,
        summary: '' // 概要はAIから取得できなかった
      }));
    }

    console.log('extractKeywordsDeep - positive:', parsed.positive?.length, 'negative:', parsed.negative?.length);
    console.log('extractKeywordsDeep - positiveTopics:', parsed.positiveTopics?.length, 'negativeTopics:', parsed.negativeTopics?.length);
    return parsed;

  } catch (error) {
    console.error('キーワード深掘りエラー:', error);
    throw error;
  }
}

/**
 * Steamコミュニティスレッドを分析
 * @param {string} appId - Steam AppID
 * @returns {Promise<Object>} コミュニティ分析結果
 */
async function analyzeCommunityThreads(appId) {
  const axios = require('axios');
  const cheerio = require('cheerio');

  try {
    // Steamコミュニティのディスカッションページを取得
    const url = `https://steamcommunity.com/app/${appId}/discussions/`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ja,en;q=0.9'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // スレッドタイトルを取得
    const threads = [];
    $('.forum_topic').each((i, el) => {
      if (i >= 50) return false; // 最大50件
      const title = $(el).find('.forum_topic_name').text().trim();
      const replies = $(el).find('.forum_topic_reply_count').text().trim();
      if (title) {
        threads.push({ title, replies });
      }
    });

    if (threads.length === 0) {
      return { topics: [] };
    }

    // AIでトピックを分析
    const model = getGeminiModel();
    const threadList = threads.map(t => `- ${t.title} (${t.replies})`).join('\n');

    const prompt = `
以下はSteamゲームのコミュニティディスカッションスレッドのタイトル一覧です。
これらを分析して、主要なトピック/話題を抽出し、言及数と概要を出力してください。

【スレッドタイトル一覧】
${threadList}

【出力ルール】
- 似たトピックはグループ化してカウント
- 例：「バグ報告」「不具合」「クラッシュ」→「バグ・不具合」としてまとめる
- 最大10トピックまで
- すべて日本語で出力

以下のJSON形式で回答：
{
  "topics": [
    {"topic": "バグ・不具合", "count": 8, "summary": "ゲームのクラッシュやセーブ関連の不具合報告が多い"},
    {"topic": "攻略・質問", "count": 6, "summary": "特定ボスの倒し方やアイテムの入手方法についての質問"}
  ]
}
`;

    const result = await model.generateContent(prompt);
    const aiResponse = await result.response;
    const text = aiResponse.text();
    return JSON.parse(text);

  } catch (error) {
    console.error('コミュニティ分析エラー:', error.message);
    return { topics: [] };
  }
}

/**
 * テキストからNGワードをフィルタリング（簡易版、AI不要）
 * @param {string} text - 元のテキスト
 * @returns {string} フィルタリング後のテキスト
 */
function filterNGWords(text) {
  let filtered = text;
  for (const word of NG_WORDS) {
    filtered = filtered.replace(new RegExp(word, 'gi'), '***');
  }
  return filtered;
}

/**
 * ワードクラウド用のキーワードを正規化（メンタルガード用）
 * @param {string} word - キーワード
 * @returns {string} 正規化後のキーワード
 */
function normalizeKeyword(word) {
  for (const [pattern, replacement] of Object.entries(WORD_REPLACEMENTS)) {
    if (word.includes(pattern)) {
      return word.replace(pattern, replacement).trim() || replacement;
    }
  }
  return word;
}

module.exports = {
  generateSummary,
  transformToConstructive,
  extractKeywords,
  extractKeywordsDeep,
  analyzeCommunityThreads,
  filterNGWords,
  normalizeKeyword
};
