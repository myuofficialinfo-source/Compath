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
  const { mentalGuardMode = false, lang = 'ja' } = options;
  const isJa = lang === 'ja';

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
  const mentalGuardPrompt = mentalGuardMode ? (isJa ? `
【重要：メンタルガードモード有効】
あなたは傷つきやすい開発者を守る「優秀で冷静な秘書」です。
以下のルールを厳守してください：
- 暴言・人格否定・汚い言葉（クソ、ゴミ、死ね等）はすべて削除
- 強い否定表現は「改善要望」としてマイルドに書き換え
- ただし「バグ」「ラグ」「UI問題」などの重要な技術情報は残す
- 淡々とした事務的なトーンで出力
- 感情的な攻撃は一切含めない
` : `
[IMPORTANT: Mental Guard Mode Enabled]
You are a calm, professional assistant protecting a sensitive developer.
Follow these rules strictly:
- Remove all insults, personal attacks, and profanity
- Rephrase harsh criticism as "improvement suggestions"
- Keep important technical info like "bugs", "lag", "UI issues"
- Use a neutral, professional tone
- Do not include any emotional attacks
`) : '';

  const prompt = isJa ? `
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
` : `
You are an expert game review analyst. Provide accurate and objective analysis.
${mentalGuardPrompt}

[IMPORTANT]
- All output must be in English
- Translate reviews from any language (Japanese, Chinese, Korean, etc.) into English for analysis
- Quotes must also be in English

Below are Steam game reviews. Analyze and summarize them.

[Positive Reviews (Sample)]
${samplePositive || 'None'}

[Negative Reviews (Sample)]
${sampleNegative || 'None'}

Respond in the following JSON format in English (6 good points and 6 bad points):
{
  "goodPoints": [
    {"point": "Good point 1 (English)", "quote": "Short quote from review (English)"},
    {"point": "Good point 2 (English)", "quote": "Short quote from review (English)"},
    {"point": "Good point 3 (English)", "quote": "Short quote from review (English)"},
    {"point": "Good point 4 (English)", "quote": "Short quote from review (English)"},
    {"point": "Good point 5 (English)", "quote": "Short quote from review (English)"},
    {"point": "Good point 6 (English)", "quote": "Short quote from review (English)"}
  ],
  "badPoints": [
    {"point": "Improvement 1 (English)", "quote": "Short quote from review (English)"},
    {"point": "Improvement 2 (English)", "quote": "Short quote from review (English)"},
    {"point": "Improvement 3 (English)", "quote": "Short quote from review (English)"},
    {"point": "Improvement 4 (English)", "quote": "Short quote from review (English)"},
    {"point": "Improvement 5 (English)", "quote": "Short quote from review (English)"},
    {"point": "Improvement 6 (English)", "quote": "Short quote from review (English)"}
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
  const { mentalGuardMode = false, lang = 'ja' } = options;
  const isJa = lang === 'ja';
  const reviews = reviewsData.reviews || reviewsData;

  const model = getGeminiModel();

  // レビューをポジティブ/ネガティブに分類
  const positiveReviews = reviews.filter(r => r.votedUp);
  const negativeReviews = reviews.filter(r => !r.votedUp);

  // テキストを結合
  const positiveText = positiveReviews.map(r => r.review).join(' ');
  const negativeText = negativeReviews.map(r => r.review).join(' ');

  const mentalGuardInstruction = mentalGuardMode ? (isJa ? `
【メンタルガードモード】
- 「クソ」「ゴミ」「金返せ」「詐欺」などの攻撃的な単語は除外
- 攻撃的な形容詞を取り除き、名詞のみを抽出
- 例：「クソ操作性」→「操作性」
` : `
[Mental Guard Mode]
- Exclude offensive words like profanity, insults, and scam-related terms
- Remove aggressive adjectives, extract only nouns
- Example: "terrible controls" → "controls"
`) : '';

  const prompt = isJa ? `
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
` : `
As an expert in extracting keywords from game reviews, extract important frequently-occurring keywords from the following review text.
${mentalGuardInstruction}

[Extraction Rules]
- Exclude overly generic words like "game", "fun", "recommend"
- Extract nouns that describe features: "controls", "soundtrack", "bugs", "story", etc.
- Rate each keyword's frequency (importance) with a score of 1-100
- Maximum 30 keywords
- [IMPORTANT] All keywords must be in English. Translate non-English keywords to English.

[Positive Reviews]
${positiveText.slice(0, 5000)}

[Negative Reviews]
${negativeText.slice(0, 5000)}

Respond in the following JSON format with English keywords:
{
  "positive": [
    {"word": "English keyword", "score": 85, "count": 12}
  ],
  "negative": [
    {"word": "English keyword", "score": 75, "count": 8}
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
  const { mentalGuardMode = false, lang = 'ja' } = options;
  const isJa = lang === 'ja';
  const reviews = reviewsData.reviews || reviewsData;

  const model = getGeminiModel();

  // レビューをポジティブ/ネガティブに分類
  const positiveReviews = reviews.filter(r => r.votedUp);
  const negativeReviews = reviews.filter(r => !r.votedUp);

  // テキストを結合
  const positiveText = positiveReviews.map(r => r.review).join('\n---\n');
  const negativeText = negativeReviews.map(r => r.review).join('\n---\n');

  const mentalGuardInstruction = mentalGuardMode ? (isJa ? `
【メンタルガードモード】
- 攻撃的な単語は除外し、建設的な表現に変換
` : `
[Mental Guard Mode]
- Exclude offensive words and convert to constructive expressions
`) : '';

  const prompt = isJa ? `
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
` : `
Analyze the game reviews and extract the main topics/keywords.
${mentalGuardInstruction}

[Extraction Rules]
- Exclude overly generic words like "game", "fun"
- Extract topics related to game features and quality: "story", "controls", "graphics", "bugs", "price", "content length", "difficulty", "music", "characters", "UI", etc.
- Count the number of mentions for each topic in the reviews
- Write a 1-2 sentence summary of the review content for each topic
- Maximum 10 topics (by importance)
- [IMPORTANT] All output must be in English
- [REQUIRED] positiveTopics and negativeTopics must be output. summary must not be empty - always include a sentence summarizing the review content.

[Positive Reviews (${positiveReviews.length} reviews)]
${positiveText.slice(0, 8000)}

[Negative Reviews (${negativeReviews.length} reviews)]
${negativeText.slice(0, 8000)}

Respond in the following JSON format (summary is required for positiveTopics and negativeTopics):
{
  "positiveTopics": [
    {"keyword": "Story", "count": 25, "summary": "The story development is excellent with an emotionally impactful ending"},
    {"keyword": "Music", "count": 18, "summary": "The BGM is memorable and well-suited to each scene"}
  ],
  "negativeTopics": [
    {"keyword": "Bugs", "count": 15, "summary": "Many reports of save data corruption and progress-blocking bugs"},
    {"keyword": "Price", "count": 12, "summary": "Many feel the price is too high for the amount of content"}
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
async function analyzeCommunityThreads(appId, options = {}) {
  const { lang = 'ja' } = options;
  const isJa = lang === 'ja';
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

    const prompt = isJa ? `
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
` : `
Below is a list of Steam game community discussion thread titles.
Analyze these and extract the main topics/subjects, outputting the mention count and summary.

[Thread Title List]
${threadList}

[Output Rules]
- Group similar topics and count them together
- Example: "Bug report", "Issue", "Crash" → Group as "Bugs & Issues"
- Maximum 10 topics
- All output must be in English

Respond in the following JSON format:
{
  "topics": [
    {"topic": "Bugs & Issues", "count": 8, "summary": "Many reports of game crashes and save-related issues"},
    {"topic": "Tips & Questions", "count": 6, "summary": "Questions about defeating specific bosses and obtaining items"}
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

/**
 * ストアページの説明文の品質をAIで評価
 * Steam公式ガイドライン（partner.steamgames.com）に基づく評価
 * @param {string} description - 説明文（HTML）
 * @param {string} shortDescription - 短い説明文
 * @param {string} gameName - ゲーム名
 * @param {string} lang - 言語（ja/en）
 * @returns {Promise<Object>} 評価結果
 */
async function evaluateStoreDescription(description, shortDescription, gameName, lang = 'ja') {
  const isJa = lang === 'ja';
  const model = getGeminiModel();

  // HTMLタグを除去してプレーンテキストに
  const plainDesc = description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

  const prompt = isJa ? `
あなたは日本語で回答するSteamストアページの専門家です。

Steam公式ガイドライン（Steamworks Documentation）に基づいて、以下のゲーム説明文を評価してください。

【Steam公式ガイドラインの評価基準】
- 説明文に外部リンクを含めてはいけない
- Steam UIを模倣した画像（ウィッシュリストボタン、価格表示など）は禁止
- 他の製品の宣伝は禁止
- ゲームの特徴、世界観、遊び方が明確に伝わるべき
- 視覚的な要素（GIF、スクリーンショット）を活用すべき

【ゲーム名】
${gameName}

【短い説明文】
${shortDescription}

【詳細説明文】
${plainDesc.slice(0, 3000)}

以下の観点で0-100点で評価してください：

1. ゲーム内容の明確さ (contentClarity): どんなジャンルのゲームか、プレイヤーは何をするのかが明確に伝わるか
2. 魅力・訴求力 (appeal): ゲームの独自性や面白さが伝わり、購入したくなるか
3. 読みやすさ (readability): 見出しや段落で整理され、スキャンしやすいか
4. 情報の充実度 (completeness): プレイ時間、難易度、ゲームシステムなど購入判断に必要な情報があるか

必ず以下のJSON形式で日本語のみで回答してください。英語は使わないでください：
{
  "scores": {
    "contentClarity": 75,
    "appeal": 80,
    "readability": 70,
    "completeness": 65
  },
  "overallScore": 72,
  "summary": "（ここに日本語で評価の要約を書く）",
  "goodPoints": ["（日本語で良い点1）", "（日本語で良い点2）", "（日本語で良い点3）"],
  "improvements": ["（日本語で改善点1）", "（日本語で改善点2）", "（日本語で改善点3）"]
}

回答例：
{
  "scores": {"contentClarity": 78, "appeal": 72, "readability": 85, "completeness": 60},
  "overallScore": 74,
  "summary": "ゲームの世界観やビジュアルは魅力的に伝わりますが、具体的なゲームプレイの説明がやや不足しています。",
  "goodPoints": ["パズルやアドベンチャー要素が分かりやすく説明されている", "ユニークな世界観が興味を引く", "複数のゲームプレイモードが紹介されている"],
  "improvements": ["プレイ時間の目安を記載する", "難易度についての情報を追加する", "ジャンルを冒頭で明確にする"]
}
` : `
You are a Steam store page expert. Evaluate the following game description based on Steam's official guidelines (Steamworks Documentation).

[Steam Official Guidelines - Evaluation Criteria]
- Description must not contain external links
- Images mimicking Steam UI (wishlist buttons, price displays) are prohibited
- Promoting other products is prohibited
- Game features, world, and gameplay should be clearly conveyed
- Visual elements (GIFs, screenshots) should be utilized

[Game Name]
${gameName}

[Short Description]
${shortDescription}

[Detailed Description]
${plainDesc.slice(0, 3000)}

Evaluate on a scale of 0-100 for each aspect:

1. **Content Clarity** (contentClarity): Is it clear what genre the game is and what the player does?
2. **Appeal** (appeal): Does it convey the game's uniqueness and fun, making players want to buy?
3. **Readability** (readability): Is it organized with headings and paragraphs, easy to scan?
4. **Completeness** (completeness): Does it include info needed for purchase decisions (playtime, difficulty, game systems)?

Respond in the following JSON format:
{
  "scores": {
    "contentClarity": 75,
    "appeal": 80,
    "readability": 70,
    "completeness": 65
  },
  "overallScore": 72,
  "summary": "Overall evaluation summary (1-2 sentences)",
  "goodPoints": ["Good point 1", "Good point 2"],
  "improvements": ["Improvement 1", "Improvement 2", "Improvement 3"]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('[AI] Store description evaluation response:', text.substring(0, 200));
    return JSON.parse(text);
  } catch (error) {
    console.error('説明文評価エラー:', error);
    // エラー時はデフォルト値を返す
    return {
      scores: {
        contentClarity: 50,
        appeal: 50,
        readability: 50,
        completeness: 50
      },
      overallScore: 50,
      summary: isJa ? 'AI評価を取得できませんでした' : 'Could not get AI evaluation',
      goodPoints: [],
      improvements: []
    };
  }
}

module.exports = {
  generateSummary,
  transformToConstructive,
  extractKeywords,
  extractKeywordsDeep,
  analyzeCommunityThreads,
  filterNGWords,
  normalizeKeyword,
  evaluateStoreDescription
};
