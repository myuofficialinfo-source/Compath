/**
 * Global Launch Commander サービス
 * グローバルローンチ戦略・マーケティングスケジュール生成ツール
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const eventScraperService = require('./eventScraperService');

// Geminiクライアント
let geminiModel = null;

function getGeminiModel() {
  if (!geminiModel) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API keyが設定されていません');
    }
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = client.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });
  }
  return geminiModel;
}

// ===========================================
// イベントデータベース（2024-2025年）
// ===========================================
const GAMING_EVENTS = {
  steamNextFest: [
    { name: 'Steam Next Fest (2月)', startDate: '2025-02-24', endDate: '2025-03-03', region: 'global', importance: 'critical' },
    { name: 'Steam Next Fest (6月)', startDate: '2025-06-09', endDate: '2025-06-16', region: 'global', importance: 'critical' },
    { name: 'Steam Next Fest (10月)', startDate: '2025-10-13', endDate: '2025-10-20', region: 'global', importance: 'critical' }
  ],
  steamSales: [
    { name: 'Steam春セール', startDate: '2025-03-13', endDate: '2025-03-20', region: 'global', importance: 'high' },
    { name: 'Steamサマーセール', startDate: '2025-06-26', endDate: '2025-07-10', region: 'global', importance: 'critical' },
    { name: 'Steamオータムセール', startDate: '2025-11-27', endDate: '2025-12-04', region: 'global', importance: 'high' },
    { name: 'Steamウィンターセール', startDate: '2025-12-19', endDate: '2026-01-02', region: 'global', importance: 'critical' }
  ],
  majorEvents: [
    { name: 'GDC (Game Developers Conference)', startDate: '2025-03-17', endDate: '2025-03-21', region: 'US', importance: 'high' },
    { name: 'PAX East', startDate: '2025-05-08', endDate: '2025-05-11', region: 'US', importance: 'medium' },
    { name: 'Summer Game Fest', startDate: '2025-06-06', endDate: '2025-06-06', region: 'global', importance: 'high' },
    { name: 'BitSummit (京都)', startDate: '2025-07-18', endDate: '2025-07-20', region: 'Japan', importance: 'high' },
    { name: 'Gamescom', startDate: '2025-08-20', endDate: '2025-08-24', region: 'EU', importance: 'critical' },
    { name: 'Tokyo Game Show', startDate: '2025-09-25', endDate: '2025-09-28', region: 'Japan', importance: 'critical' },
    { name: 'PAX West', startDate: '2025-08-29', endDate: '2025-09-01', region: 'US', importance: 'medium' },
    { name: 'The Game Awards', startDate: '2025-12-11', endDate: '2025-12-11', region: 'global', importance: 'high' }
  ],
  chinaEvents: [
    { name: '春節（中国）', startDate: '2025-01-29', endDate: '2025-02-04', region: 'China', importance: 'critical', type: 'holiday' },
    { name: 'ChinaJoy', startDate: '2025-07-25', endDate: '2025-07-28', region: 'China', importance: 'high' },
    { name: '国慶節（中国）', startDate: '2025-10-01', endDate: '2025-10-07', region: 'China', importance: 'high', type: 'holiday' },
    { name: '双11（独身の日）', startDate: '2025-11-11', endDate: '2025-11-11', region: 'China', importance: 'critical', type: 'sale' }
  ]
};

// ===========================================
// 地域別マーケティング戦略データ
// ===========================================
const REGIONAL_STRATEGIES = {
  US: {
    name: 'アメリカ',
    nameEn: 'United States',
    platforms: ['Steam', 'Epic Games Store', 'GOG', 'itch.io'],
    socialMedia: ['Twitter/X', 'Reddit', 'Discord', 'YouTube', 'TikTok'],
    influencerTypes: ['YouTuber', 'Twitch Streamer', 'TikToker'],
    mediaOutlets: ['IGN', 'Kotaku', 'PC Gamer', 'Rock Paper Shotgun'],
    priceRange: { min: 9.99, max: 29.99, currency: 'USD' },
    keyTiming: 'リリースは火曜日〜木曜日が最適。ホリデーシーズン（11-12月）は競争激化に注意',
    culturalNotes: 'ダイレクトなマーケティング、Redditコミュニティの重要性が高い',
    localization: { priority: 'required', effort: 'low' }
  },
  China: {
    name: '中国',
    nameEn: 'China',
    platforms: ['Steam China', 'WeGame', 'TapTap'],
    socialMedia: ['Bilibili', 'Weibo', 'Douyin (TikTok中国版)', 'QQ'],
    influencerTypes: ['Bilibiliアップ主', 'Douyinインフルエンサー'],
    mediaOutlets: ['游民星空', '3DM', 'A9VG'],
    priceRange: { min: 38, max: 128, currency: 'CNY' },
    keyTiming: '春節・国慶節は避ける。週末リリース推奨',
    culturalNotes: '中国語ローカライズ必須。センシティブコンテンツに注意（骸骨、血液等）。Bilibiliでのコミュニティ形成が重要',
    localization: { priority: 'critical', effort: 'high' }
  },
  Japan: {
    name: '日本',
    nameEn: 'Japan',
    platforms: ['Steam', 'Nintendo eShop', 'PlayStation Store'],
    socialMedia: ['Twitter/X', 'YouTube', 'ニコニコ動画'],
    influencerTypes: ['VTuber', 'YouTuber', '実況者'],
    mediaOutlets: ['ファミ通', '4Gamer', 'AUTOMATON', 'IGN Japan'],
    priceRange: { min: 980, max: 3980, currency: 'JPY' },
    keyTiming: '木曜日リリースが伝統的。ゴールデンウィーク、年末年始は高需要',
    culturalNotes: '品質へのこだわりが強い。VTuberとの相性が良い。Twitter/Xの影響力大',
    localization: { priority: 'critical', effort: 'high' }
  },
  EU: {
    name: '欧州・北欧',
    nameEn: 'Europe/Nordic',
    platforms: ['Steam', 'GOG', 'Epic Games Store'],
    socialMedia: ['Twitter/X', 'Reddit', 'Discord', 'YouTube'],
    influencerTypes: ['YouTuber', 'Twitch Streamer'],
    mediaOutlets: ['Eurogamer', 'PC Gamer UK', 'Gamereactor'],
    priceRange: { min: 9.99, max: 29.99, currency: 'EUR' },
    keyTiming: 'Gamescom（8月）に合わせた告知が効果的。夏休みシーズンを活用',
    culturalNotes: '多言語対応が加点要素。インディーゲームへの理解が深い市場',
    localization: { priority: 'recommended', effort: 'medium' }
  }
};

// ===========================================
// インディーゲーム成功事例データベース
// ===========================================
const SUCCESS_CASES = {
  Action: [
    {
      name: 'Hades',
      developer: 'Supergiant Games',
      genre: 'Action Roguelike',
      releaseYear: 2020,
      wishlists: 300000,
      firstWeekSales: 700000,
      totalSales: 3000000,
      marketingBudget: 'medium',
      tactics: [
        'Early Access で2年間コミュニティ育成',
        'Discord公式サーバーで濃いファン層構築',
        'アップデートごとにトレーラー公開',
        'ストリーマーへの積極的なキー配布'
      ],
      lessonsLearned: 'Early Accessを活用したコミュニティドリブン開発の成功例'
    },
    {
      name: 'Vampire Survivors',
      developer: 'poncle',
      genre: 'Action Roguelike',
      releaseYear: 2022,
      wishlists: 50000,
      firstWeekSales: 500000,
      totalSales: 6000000,
      marketingBudget: 'low',
      tactics: [
        '低価格（$3）で参入障壁を下げる',
        'TikTok/YouTubeでのバイラル拡散',
        'シンプルなゲームプレイがクリップ向き',
        '頻繁な無料アップデート'
      ],
      lessonsLearned: '低価格＋バイラル性＋頻繁なアップデートの組み合わせ'
    }
  ],
  RPG: [
    {
      name: 'Baldur\'s Gate 3',
      developer: 'Larian Studios',
      genre: 'RPG',
      releaseYear: 2023,
      wishlists: 2000000,
      firstWeekSales: 2500000,
      totalSales: 15000000,
      marketingBudget: 'high',
      tactics: [
        '3年間のEarly Accessで品質向上',
        '大規模なコミュニティイベント開催',
        'Panel From Hellでの定期的な情報公開',
        'ストリーマー・メディアへの大規模展開'
      ],
      lessonsLearned: '長期Early Access＋透明性のある開発＋コミュニティ重視'
    },
    {
      name: 'Stardew Valley',
      developer: 'ConcernedApe',
      genre: 'Farming RPG',
      releaseYear: 2016,
      wishlists: 30000,
      firstWeekSales: 400000,
      totalSales: 20000000,
      marketingBudget: 'low',
      tactics: [
        '開発日記をSNSで継続的に投稿',
        'Redditでのコミュニティ構築',
        '口コミによる自然拡散',
        'リリース後も無料大型アップデート継続'
      ],
      lessonsLearned: '一人開発でも丁寧なコミュニティ構築で成功可能'
    }
  ],
  Horror: [
    {
      name: 'Lethal Company',
      developer: 'Zeekerss',
      genre: 'Co-op Horror',
      releaseYear: 2023,
      wishlists: 20000,
      firstWeekSales: 1000000,
      totalSales: 10000000,
      marketingBudget: 'low',
      tactics: [
        'TwitchストリーマーによるCo-op配信',
        '低価格（$10）で友達と一緒に購入しやすい',
        'ミーム化しやすいゲームプレイ',
        'Early Accessでの継続的改善'
      ],
      lessonsLearned: 'Co-opゲームは配信映えとミーム性が重要'
    },
    {
      name: 'Phasmophobia',
      developer: 'Kinetic Games',
      genre: 'Co-op Horror',
      releaseYear: 2020,
      wishlists: 15000,
      firstWeekSales: 500000,
      totalSales: 5000000,
      marketingBudget: 'low',
      tactics: [
        'VRサポートでニッチ市場から開始',
        'Twitch配信で自然拡散',
        'ハロウィンシーズンを活用',
        '継続的なコンテンツ追加'
      ],
      lessonsLearned: 'ニッチ（VR）から始めて拡大、季節イベントの活用'
    }
  ],
  Platformer: [
    {
      name: 'Celeste',
      developer: 'Maddy Makes Games',
      genre: 'Platformer',
      releaseYear: 2018,
      wishlists: 50000,
      firstWeekSales: 100000,
      totalSales: 1000000,
      marketingBudget: 'low',
      tactics: [
        'ゲームジャム版から認知度構築',
        'アクセシビリティへの配慮が話題に',
        'スピードラン・コミュニティとの連携',
        '感動的なストーリーで口コミ拡散'
      ],
      lessonsLearned: 'アクセシビリティとストーリーで差別化'
    },
    {
      name: 'Hollow Knight',
      developer: 'Team Cherry',
      genre: 'Metroidvania',
      releaseYear: 2017,
      wishlists: 40000,
      firstWeekSales: 50000,
      totalSales: 3000000,
      marketingBudget: 'low',
      tactics: [
        'Kickstarter で初期コミュニティ構築',
        '圧倒的なコンテンツ量で高評価',
        '無料DLCで継続的な話題維持',
        'アートスタイルの統一感'
      ],
      lessonsLearned: 'クラファン活用、無料DLCで長期的な成功'
    }
  ],
  Roguelike: [
    {
      name: 'Slay the Spire',
      developer: 'MegaCrit',
      genre: 'Deckbuilder Roguelike',
      releaseYear: 2019,
      wishlists: 100000,
      firstWeekSales: 200000,
      totalSales: 4000000,
      marketingBudget: 'low',
      tactics: [
        'Early Accessで2年間フィードバック収集',
        'ストリーマーとの相性が抜群',
        '高いリプレイ性で長時間配信向き',
        'MODサポートでコミュニティ拡大'
      ],
      lessonsLearned: 'リプレイ性の高いゲームは配信・MODと好相性'
    }
  ],
  Simulation: [
    {
      name: 'Cities: Skylines',
      developer: 'Colossal Order',
      genre: 'City Builder',
      releaseYear: 2015,
      wishlists: 200000,
      firstWeekSales: 500000,
      totalSales: 12000000,
      marketingBudget: 'medium',
      tactics: [
        'SimCity不在の市場ニーズを狙い撃ち',
        '発売時からSteam Workshop対応',
        'MOD文化を全面サポート',
        'YouTuber実況で拡散'
      ],
      lessonsLearned: '競合の弱点を狙い、MODコミュニティを重視'
    }
  ],
  'Visual Novel': [
    {
      name: 'Doki Doki Literature Club',
      developer: 'Team Salvato',
      genre: 'Psychological Horror VN',
      releaseYear: 2017,
      wishlists: 10000,
      firstWeekSales: 500000,
      totalSales: 5000000,
      marketingBudget: 'low',
      tactics: [
        '無料リリースで参入障壁ゼロ',
        'ネタバレ禁止カルチャーの活用',
        'Let\'s Play動画での自然拡散',
        '予想外の展開がミーム化'
      ],
      lessonsLearned: '無料＋話題性＋ネタバレ文化の活用'
    }
  ]
};

// ===========================================
// 2025-2026年 Steam公式イベントスケジュール（詳細版）
// ===========================================
const STEAM_OFFICIAL_EVENTS = {
  2025: [
    // Q1
    { name: 'Steam春節セール', startDate: '2025-01-23', endDate: '2025-01-30', type: 'sale', importance: 'high' },
    { name: 'Steam Next Fest (2月)', startDate: '2025-02-24', endDate: '2025-03-03', type: 'fest', importance: 'critical', deadline: '2025-01-24' },
    { name: 'Steam春セール', startDate: '2025-03-13', endDate: '2025-03-20', type: 'sale', importance: 'high' },
    // Q2
    { name: 'Steam Indie Showcase', startDate: '2025-04-14', endDate: '2025-04-21', type: 'showcase', importance: 'medium' },
    { name: 'Stealth Fest', startDate: '2025-05-05', endDate: '2025-05-12', type: 'genre_fest', importance: 'medium' },
    { name: 'Steam Next Fest (6月)', startDate: '2025-06-09', endDate: '2025-06-16', type: 'fest', importance: 'critical', deadline: '2025-05-09' },
    { name: 'Steamサマーセール', startDate: '2025-06-26', endDate: '2025-07-10', type: 'sale', importance: 'critical' },
    // Q3
    { name: 'Steam Survival Fest', startDate: '2025-07-21', endDate: '2025-07-28', type: 'genre_fest', importance: 'medium' },
    { name: 'Steam Horror Fest', startDate: '2025-08-04', endDate: '2025-08-11', type: 'genre_fest', importance: 'high' },
    { name: 'Steam Visual Novel Fest', startDate: '2025-09-08', endDate: '2025-09-15', type: 'genre_fest', importance: 'medium' },
    // Q4
    { name: 'Steam Next Fest (10月)', startDate: '2025-10-13', endDate: '2025-10-20', type: 'fest', importance: 'critical', deadline: '2025-09-13' },
    { name: 'Steam Scream Fest (ハロウィン)', startDate: '2025-10-27', endDate: '2025-11-03', type: 'sale', importance: 'high' },
    { name: 'Steamオータムセール', startDate: '2025-11-27', endDate: '2025-12-04', type: 'sale', importance: 'high' },
    { name: 'The Game Awards セール', startDate: '2025-12-11', endDate: '2025-12-15', type: 'sale', importance: 'medium' },
    { name: 'Steamウィンターセール', startDate: '2025-12-19', endDate: '2026-01-02', type: 'sale', importance: 'critical' }
  ],
  2026: [
    { name: 'Steam春節セール', startDate: '2026-02-12', endDate: '2026-02-19', type: 'sale', importance: 'high' },
    { name: 'Steam Next Fest (2月)', startDate: '2026-02-23', endDate: '2026-03-02', type: 'fest', importance: 'critical', deadline: '2026-01-23' },
    { name: 'Steam春セール', startDate: '2026-03-12', endDate: '2026-03-19', type: 'sale', importance: 'high' },
    { name: 'Steam Next Fest (6月)', startDate: '2026-06-08', endDate: '2026-06-15', type: 'fest', importance: 'critical', deadline: '2026-05-08' },
    { name: 'Steamサマーセール', startDate: '2026-06-25', endDate: '2026-07-09', type: 'sale', importance: 'critical' },
    { name: 'Steam Next Fest (10月)', startDate: '2026-10-12', endDate: '2026-10-19', type: 'fest', importance: 'critical', deadline: '2026-09-12' },
    { name: 'Steamウィンターセール', startDate: '2026-12-17', endDate: '2027-01-03', type: 'sale', importance: 'critical' }
  ]
};

// ===========================================
// マーケティングチャネル効果データ
// ===========================================
const MARKETING_CHANNELS = {
  socialMedia: {
    'Twitter/X': { reach: 'high', cost: 'free', effort: 'medium', bestFor: ['告知', 'コミュニティ', 'デベロッパーブランディング'] },
    'Reddit': { reach: 'high', cost: 'free', effort: 'high', bestFor: ['コミュニティ', 'フィードバック', 'AMA'] },
    'Discord': { reach: 'medium', cost: 'free', effort: 'high', bestFor: ['コアファン', 'テスター募集', 'コミュニティ構築'] },
    'TikTok': { reach: 'very_high', cost: 'free', effort: 'medium', bestFor: ['バイラル', '若年層', 'クリップ向きゲーム'] },
    'YouTube': { reach: 'high', cost: 'varies', effort: 'high', bestFor: ['トレーラー', 'デベロッパーログ', '実況'] },
    'Bilibili': { reach: 'high', cost: 'varies', effort: 'high', bestFor: ['中国市場', 'コミュニティ'] }
  },
  influencerTypes: {
    'Mega (100万+)': { cost: '$5000-50000', conversionRate: '0.1-0.5%', reach: 'massive', risk: 'high' },
    'Macro (10-100万)': { cost: '$1000-5000', conversionRate: '0.5-2%', reach: 'large', risk: 'medium' },
    'Micro (1-10万)': { cost: '$100-1000', conversionRate: '2-5%', reach: 'medium', risk: 'low' },
    'Nano (1万未満)': { cost: '無料-$100', conversionRate: '5-10%', reach: 'small', risk: 'very_low' }
  },
  prTactics: {
    'プレスリリース': { cost: 'free', timing: '発売4-6週前', expectedCoverage: 'varies' },
    'メディアキー配布': { cost: 'free', timing: '発売2-4週前', expectedCoverage: 'high' },
    'インフルエンサーキー': { cost: 'free', timing: '発売1-2週前', expectedCoverage: 'very_high' },
    'Steam Next Fest': { cost: 'free', timing: 'リリース前', expectedWishlists: '10000-50000' }
  }
};

// ===========================================
// Steam公式推奨スケジュール
// ===========================================
const STEAM_RECOMMENDED_TIMELINE = [
  { weeksBeforeRelease: 52, task: 'Steamストアページ作成・公開', category: 'store', priority: 'critical' },
  { weeksBeforeRelease: 52, task: 'ウィッシュリスト収集開始', category: 'marketing', priority: 'critical' },
  { weeksBeforeRelease: 26, task: 'Coming Soon表示で認知拡大', category: 'store', priority: 'high' },
  { weeksBeforeRelease: 20, task: 'Steam Next Fest参加申請（該当する場合）', category: 'event', priority: 'high' },
  { weeksBeforeRelease: 16, task: 'プレスキット準備・メディアリスト作成', category: 'pr', priority: 'high' },
  { weeksBeforeRelease: 12, task: 'トレーラー制作・公開', category: 'marketing', priority: 'critical' },
  { weeksBeforeRelease: 8, task: 'デモ版準備（Next Fest用）', category: 'development', priority: 'high' },
  { weeksBeforeRelease: 6, task: 'インフルエンサー・メディアへのキー配布', category: 'pr', priority: 'high' },
  { weeksBeforeRelease: 4, task: 'リリース日告知・カウントダウン開始', category: 'marketing', priority: 'critical' },
  { weeksBeforeRelease: 2, task: 'レビューアーへの早期アクセス提供', category: 'pr', priority: 'high' },
  { weeksBeforeRelease: 1, task: 'ローンチトレーラー公開', category: 'marketing', priority: 'critical' },
  { weeksBeforeRelease: 0, task: 'リリース！', category: 'release', priority: 'critical' },
  { weeksBeforeRelease: -1, task: 'ローンチ後のバグ対応・コミュニティ対応', category: 'support', priority: 'critical' },
  { weeksBeforeRelease: -2, task: 'ローンチ後のアップデート告知', category: 'marketing', priority: 'high' }
];

// ===========================================
// メイン分析関数
// ===========================================

/**
 * ローンチ戦略を生成
 * @param {Object} input - ユーザー入力
 * @returns {Promise<Object>} 戦略結果
 */
async function generateLaunchStrategy(input) {
  const {
    releaseDate,
    genre,
    completionPercent,
    assets = {},
    budget = 'low',
    targetRegions = ['US', 'Japan'],
    language = 'ja',
    gameDescription = '',
    steamUrl = '',
    snsAccounts = {}
  } = input;

  try {
    // リリース日から逆算してタイムラインを生成
    const timeline = generateBackcastTimeline(releaseDate, completionPercent);

    // 関連イベントをフィルタリング（統合イベントソースから取得）
    const relevantEvents = await filterRelevantEvents(releaseDate, targetRegions);

    // 地域別戦略を取得
    const regionalStrategies = targetRegions.map(region => ({
      region,
      ...REGIONAL_STRATEGIES[region],
      customTips: getRegionalTips(region, genre, budget)
    }));

    // AIで詳細な戦略を生成
    const aiStrategy = await generateAIStrategy({
      releaseDate,
      genre,
      completionPercent,
      assets,
      budget,
      targetRegions,
      relevantEvents,
      language,
      gameDescription,
      steamUrl,
      snsAccounts
    });

    // To-Doリストを優先度順に生成
    const todoList = generatePrioritizedTodoList(timeline, relevantEvents, assets, completionPercent);

    // 同ジャンルの成功事例を取得
    const successCases = getSuccessCases(genre, budget);

    // Steam公式イベント（詳細版）を取得（統合イベントソースから）
    const steamEvents = await getSteamOfficialEvents(releaseDate);

    // ガントチャート用のデータを生成
    const ganttData = generateGanttData(releaseDate, timeline, relevantEvents);

    return {
      success: true,
      releaseDate,
      daysUntilRelease: calculateDaysUntil(releaseDate),
      timeline,
      ganttData,
      relevantEvents,
      steamEvents,
      regionalStrategies,
      aiStrategy,
      todoList,
      successCases,
      marketingChannels: MARKETING_CHANNELS,
      warnings: generateWarnings(releaseDate, completionPercent, assets)
    };

  } catch (error) {
    console.error('ローンチ戦略生成エラー:', error);
    throw error;
  }
}

/**
 * 遅延時の再計算（Plan B）
 */
async function recalculateWithDelay(input, newReleaseDate) {
  const { originalStrategy, reason } = input;

  // 新しい日付で再計算
  const newStrategy = await generateLaunchStrategy({
    ...input,
    releaseDate: newReleaseDate
  });

  // 変更点のサマリを生成
  const changes = calculateStrategyChanges(originalStrategy, newStrategy);

  return {
    ...newStrategy,
    isRecalculation: true,
    delayReason: reason,
    changes
  };
}

/**
 * バックキャスティングでタイムラインを生成
 */
function generateBackcastTimeline(releaseDate, completionPercent) {
  const release = new Date(releaseDate);
  const today = new Date();
  const weeksUntilRelease = Math.ceil((release - today) / (7 * 24 * 60 * 60 * 1000));

  const timeline = STEAM_RECOMMENDED_TIMELINE.map(item => {
    const taskDate = new Date(release);
    taskDate.setDate(taskDate.getDate() - (item.weeksBeforeRelease * 7));

    const isPast = taskDate < today;
    const isUrgent = !isPast && (taskDate - today) < (14 * 24 * 60 * 60 * 1000); // 2週間以内

    // 完成度に基づいてステータスを推定
    let status = 'pending';
    if (isPast && item.weeksBeforeRelease > 0) {
      // 過去のタスクで完成度が低ければ遅延
      if (completionPercent < 50 && item.category === 'store') {
        status = 'delayed';
      } else {
        status = 'completed';
      }
    } else if (isPast && item.weeksBeforeRelease <= 0) {
      status = 'future';
    }

    return {
      ...item,
      date: taskDate.toISOString().split('T')[0],
      isPast,
      isUrgent,
      status,
      weeksFromNow: Math.ceil((taskDate - today) / (7 * 24 * 60 * 60 * 1000))
    };
  });

  return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * 関連イベントをフィルタリング（eventScraperService統合版）
 */
async function filterRelevantEvents(releaseDate, targetRegions) {
  const release = new Date(releaseDate);
  const today = new Date();

  // eventScraperServiceから統合イベントを取得
  let allEvents;
  try {
    allEvents = await eventScraperService.getEventsForRelease(releaseDate, 6, 3);
  } catch (error) {
    console.log('eventScraperService取得エラー、フォールバック使用:', error.message);
    // フォールバック: 従来のGAMING_EVENTSを使用
    allEvents = [
      ...GAMING_EVENTS.steamNextFest,
      ...GAMING_EVENTS.steamSales,
      ...GAMING_EVENTS.majorEvents,
      ...GAMING_EVENTS.chinaEvents
    ].map(event => {
      const eventDate = new Date(event.startDate);
      const daysFromRelease = Math.ceil((eventDate - release) / (24 * 60 * 60 * 1000));
      return {
        ...event,
        daysFromRelease,
        isBeforeRelease: daysFromRelease < 0
      };
    });
  }

  // 地域フィルタリング
  const regionMappings = {
    'US': ['usa', 'san francisco', 'los angeles', 'boston', 'seattle', 'america', 'us'],
    'Japan': ['japan', 'tokyo', 'kyoto', 'yokohama'],
    'Europe': ['germany', 'cologne', 'sweden', 'malmö', 'europe', 'eu'],
    'Korea': ['korea', 'busan', 'seoul'],
    'China': ['china', 'shanghai', 'beijing']
  };

  return allEvents
    .filter(event => {
      // グローバルイベントは常に含める
      if (!event.location || event.source === 'steam_official') return true;

      const lowerLocation = (event.location || '').toLowerCase();
      for (const region of targetRegions) {
        const keywords = regionMappings[region] || [];
        for (const keyword of keywords) {
          if (lowerLocation.includes(keyword)) return true;
        }
      }
      return false;
    })
    .map(event => {
      const eventStart = new Date(event.startDate);
      const daysUntil = Math.ceil((eventStart - today) / (24 * 60 * 60 * 1000));
      const daysFromRelease = event.daysFromRelease ?? Math.ceil((eventStart - release) / (24 * 60 * 60 * 1000));

      return {
        ...event,
        daysUntil,
        daysFromRelease,
        isPast: eventStart < today,
        isBeforeRelease: eventStart < release,
        recommendation: getEventRecommendation(event, release, daysFromRelease)
      };
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

/**
 * イベントへの参加推奨を判定
 */
function getEventRecommendation(event, releaseDate, daysFromRelease) {
  // Steam Next Festはリリース前のみ
  if (event.name.includes('Next Fest')) {
    if (daysFromRelease < 0) return { action: 'skip', reason: 'リリース後のためスキップ' };
    if (daysFromRelease < 30) return { action: 'consider', reason: 'リリース直前。デモ準備が間に合えば参加推奨' };
    return { action: 'recommended', reason: 'デモを公開してウィッシュリストを獲得するチャンス' };
  }

  // セールはリリース後がメイン
  if (event.name.includes('セール')) {
    if (daysFromRelease > 0) return { action: 'prepare', reason: 'リリース前。セールに合わせた価格戦略を検討' };
    if (daysFromRelease > -30) return { action: 'skip', reason: '新作割引期間中はセール参加不可の場合あり' };
    return { action: 'recommended', reason: 'セール参加で売上ブースト' };
  }

  // 展示会イベント
  if (daysFromRelease > 60) return { action: 'consider', reason: '告知・デモ展示の機会' };
  if (daysFromRelease > 0 && daysFromRelease <= 60) return { action: 'recommended', reason: 'リリース告知の絶好の機会' };

  return { action: 'optional', reason: 'オプション' };
}

/**
 * 地域別の追加Tips
 */
function getRegionalTips(region, genre, budget) {
  const tips = [];

  if (region === 'China') {
    tips.push('Bilibiliで開発日記を投稿するとコミュニティが育ちやすい');
    tips.push('中国語翻訳は簡体字が必須。繁体字は台湾・香港向け');
    if (genre.includes('Horror') || genre.includes('Dark')) {
      tips.push('中国版では血液・骸骨表現の修正が必要な場合あり');
    }
  }

  if (region === 'Japan') {
    tips.push('VTuber案件は費用対効果が高い傾向');
    tips.push('Twitterでのこまめな開発進捗投稿が効果的');
    if (budget === 'low') {
      tips.push('小規模でもファミ通・4Gamerへのプレスリリースは無料で可能');
    }
  }

  if (region === 'US') {
    tips.push('Redditの関連サブレディットでAMA（質問会）を検討');
    tips.push('Discord公式サーバーの早期立ち上げ推奨');
  }

  if (region === 'EU') {
    tips.push('EFIGS（英仏伊独西）ローカライズで市場を大幅に拡大可能');
    tips.push('Gamescomへのインディーブース出展を検討');
  }

  return tips;
}

/**
 * AIで詳細戦略を生成
 */
async function generateAIStrategy(data) {
  const model = getGeminiModel();
  const { language } = data;
  const isJa = language === 'ja';

  // SNSアカウント情報を整形
  const snsInfo = [];
  if (data.snsAccounts?.twitter) snsInfo.push(`X/Twitter: ${data.snsAccounts.twitter}`);
  if (data.snsAccounts?.discord) snsInfo.push(`Discord: ${data.snsAccounts.discord}`);
  if (data.snsAccounts?.youtube) snsInfo.push(`YouTube: ${data.snsAccounts.youtube}`);

  const prompt = `
あなたはインディーゲームのグローバルマーケティング専門家です。以下の情報を基に、具体的で実行可能なローンチ戦略を提案してください。

【ゲーム情報】
- リリース予定日: ${data.releaseDate}
- ジャンル: ${data.genre}
- 完成度: ${data.completionPercent}%
- 予算レベル: ${data.budget}（low/medium/high）
- ターゲット地域: ${data.targetRegions.join(', ')}
${data.gameDescription ? `- ゲーム概要: ${data.gameDescription}` : ''}
${data.steamUrl ? `- SteamストアURL: ${data.steamUrl}` : ''}

【保有アセット】
- トレーラー: ${data.assets.trailer ? 'あり' : 'なし'}
- デモ版: ${data.assets.demo ? 'あり' : 'なし'}
- プレスキット: ${data.assets.pressKit ? 'あり' : 'なし'}
- Steamストアページ: ${data.assets.storePage ? 'あり' : 'なし'}
- SNSアカウント: ${data.assets.socialMedia ? 'あり' : 'なし'}

${snsInfo.length > 0 ? `【SNSアカウント】\n${snsInfo.join('\n')}` : ''}

【近日のイベント】
${data.relevantEvents.slice(0, 5).map(e => `- ${e.name} (${e.startDate})`).join('\n')}

${isJa ? '以下のJSON形式で日本語で回答してください' : 'Please respond in English in the following JSON format'}：
{
  "executiveSummary": "${isJa ? '戦略の要約（2-3文）' : 'Strategy summary (2-3 sentences)'}",
  "keyMilestones": [
    {
      "date": "YYYY-MM-DD",
      "milestone": "${isJa ? 'マイルストーン名' : 'Milestone name'}",
      "why": "${isJa ? 'なぜこの時期か' : 'Why this timing'}"
    }
  ],
  "budgetAllocation": {
    "marketing": 40,
    "localization": 30,
    "events": 20,
    "reserve": 10
  },
  "topPriorities": ["${isJa ? '最優先タスク1' : 'Top priority 1'}", "${isJa ? '最優先タスク2' : 'Top priority 2'}", "${isJa ? '最優先タスク3' : 'Top priority 3'}"],
  "risks": ["${isJa ? 'リスク1' : 'Risk 1'}", "${isJa ? 'リスク2' : 'Risk 2'}"],
  "opportunities": ["${isJa ? '機会1' : 'Opportunity 1'}", "${isJa ? '機会2' : 'Opportunity 2'}"],
  "weeklyFocus": [
    {
      "week": "1",
      "focus": "${isJa ? '今週のフォーカス' : 'This week focus'}"
    }
  ]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('AI戦略生成エラー:', error);
    return {
      executiveSummary: isJa ? 'AI分析を生成できませんでした。基本的なタイムラインを参考にしてください。' : 'Could not generate AI analysis. Please refer to the basic timeline.',
      keyMilestones: [],
      budgetAllocation: { marketing: 40, localization: 30, events: 20, reserve: 10 },
      topPriorities: [],
      risks: [],
      opportunities: [],
      weeklyFocus: []
    };
  }
}

/**
 * 優先度付きTo-Doリストを生成
 */
function generatePrioritizedTodoList(timeline, events, assets, completionPercent) {
  const todos = [];
  const today = new Date();

  // タイムラインからTo-Do
  timeline.forEach(item => {
    if (item.status !== 'completed' && !item.isPast) {
      todos.push({
        id: `timeline-${item.weeksBeforeRelease}`,
        task: item.task,
        category: item.category,
        dueDate: item.date,
        priority: item.priority,
        isUrgent: item.isUrgent,
        source: 'timeline'
      });
    }
  });

  // アセット不足からTo-Do
  if (!assets.storePage) {
    todos.push({
      id: 'asset-store',
      task: 'Steamストアページを作成・公開する',
      category: 'store',
      priority: 'critical',
      isUrgent: true,
      source: 'asset'
    });
  }

  if (!assets.trailer) {
    todos.push({
      id: 'asset-trailer',
      task: 'ゲームトレーラーを制作する',
      category: 'marketing',
      priority: 'critical',
      isUrgent: completionPercent >= 50,
      source: 'asset'
    });
  }

  if (!assets.demo && completionPercent >= 30) {
    todos.push({
      id: 'asset-demo',
      task: 'デモ版の準備を検討する',
      category: 'development',
      priority: 'high',
      isUrgent: false,
      source: 'asset'
    });
  }

  // イベントからTo-Do
  events.forEach(event => {
    if (!event.isPast && event.recommendation?.action === 'recommended') {
      todos.push({
        id: `event-${event.name}`,
        task: `${event.name}への参加準備`,
        category: 'event',
        dueDate: event.startDate,
        priority: event.importance === 'critical' ? 'critical' : 'high',
        isUrgent: event.daysUntil < 30,
        source: 'event',
        eventDetails: event
      });
    }
  });

  // 優先度でソート
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return todos.sort((a, b) => {
    // まず緊急度
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;
    // 次に優先度
    return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
  });
}

/**
 * 警告メッセージを生成
 */
function generateWarnings(releaseDate, completionPercent, assets) {
  const warnings = [];
  const daysUntil = calculateDaysUntil(releaseDate);

  if (daysUntil < 90 && !assets.storePage) {
    warnings.push({
      level: 'critical',
      message: 'リリースまで3ヶ月未満ですが、ストアページがまだ公開されていません。今すぐ作成を開始してください。'
    });
  }

  if (daysUntil < 60 && completionPercent < 70) {
    warnings.push({
      level: 'warning',
      message: `リリースまで${daysUntil}日ですが、完成度が${completionPercent}%です。スコープの縮小またはリリース延期を検討してください。`
    });
  }

  if (daysUntil < 30 && !assets.trailer) {
    warnings.push({
      level: 'critical',
      message: 'リリースまで1ヶ月を切っていますが、トレーラーがありません。至急制作してください。'
    });
  }

  if (daysUntil > 365 && assets.storePage) {
    warnings.push({
      level: 'info',
      message: 'リリースまで1年以上あります。早期のストアページ公開は良い戦略ですが、定期的な更新を忘れずに。'
    });
  }

  return warnings;
}

/**
 * 日数計算
 */
function calculateDaysUntil(dateStr) {
  const target = new Date(dateStr);
  const today = new Date();
  return Math.ceil((target - today) / (24 * 60 * 60 * 1000));
}

/**
 * 戦略変更点の計算
 */
function calculateStrategyChanges(oldStrategy, newStrategy) {
  const changes = [];

  // イベントの変化
  const oldEvents = new Set(oldStrategy.relevantEvents.map(e => e.name));
  const newEvents = new Set(newStrategy.relevantEvents.map(e => e.name));

  newStrategy.relevantEvents.forEach(event => {
    if (!oldEvents.has(event.name)) {
      changes.push({ type: 'added_event', detail: event.name });
    }
  });

  oldStrategy.relevantEvents.forEach(event => {
    if (!newEvents.has(event.name)) {
      changes.push({ type: 'removed_event', detail: event.name });
    }
  });

  return changes;
}

/**
 * イベントリストを取得
 */
function getEventList() {
  return GAMING_EVENTS;
}

/**
 * 地域戦略リストを取得
 */
function getRegionalStrategies() {
  return REGIONAL_STRATEGIES;
}

/**
 * 同ジャンルの成功事例を取得
 */
function getSuccessCases(genre, budget) {
  // ジャンルに直接マッチするものを優先
  let cases = SUCCESS_CASES[genre] || [];

  // 見つからない場合は関連ジャンルを探す
  if (cases.length === 0) {
    // 一般的なアクション系
    if (['Shooter', 'Fighting'].includes(genre)) {
      cases = SUCCESS_CASES['Action'] || [];
    }
    // シミュレーション系
    else if (['Strategy'].includes(genre)) {
      cases = SUCCESS_CASES['Simulation'] || [];
    }
    // アドベンチャー系
    else if (['Adventure', 'Puzzle', 'Casual'].includes(genre)) {
      cases = SUCCESS_CASES['Platformer'] || [];
    }
  }

  // 予算に合った事例を優先的に返す
  const sortedCases = [...cases].sort((a, b) => {
    const budgetOrder = { low: 0, medium: 1, high: 2 };
    const aBudget = budgetOrder[a.marketingBudget] || 1;
    const bBudget = budgetOrder[b.marketingBudget] || 1;
    const targetBudget = budgetOrder[budget] || 0;

    return Math.abs(aBudget - targetBudget) - Math.abs(bBudget - targetBudget);
  });

  return sortedCases.slice(0, 3);
}

/**
 * Steam公式イベントを取得（リリース日周辺）- eventScraperService統合版
 */
async function getSteamOfficialEvents(releaseDate) {
  const release = new Date(releaseDate);

  try {
    // eventScraperServiceから取得
    const allEvents = await eventScraperService.getEventsForRelease(releaseDate, 6, 6);

    // Steam公式イベントのみをフィルタ（sale, fest, genre_fest）
    return allEvents
      .filter(event =>
        event.source === 'steam_official' ||
        event.type === 'sale' ||
        event.type === 'fest' ||
        event.type === 'genre_fest'
      )
      .map(event => {
        const eventDate = new Date(event.startDate);
        const daysFromRelease = Math.ceil((eventDate - release) / (24 * 60 * 60 * 1000));
        return {
          ...event,
          daysFromRelease,
          isBeforeRelease: daysFromRelease < 0
        };
      })
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  } catch (error) {
    console.log('getSteamOfficialEventsエラー、フォールバック使用:', error.message);

    // フォールバック: 従来のSTEAM_OFFICIAL_EVENTSを使用
    const releaseYear = release.getFullYear();
    const years = [releaseYear - 1, releaseYear, releaseYear + 1];
    const allEvents = [];

    years.forEach(year => {
      const yearEvents = STEAM_OFFICIAL_EVENTS[year] || [];
      allEvents.push(...yearEvents);
    });

    const sixMonthsBefore = new Date(release);
    sixMonthsBefore.setMonth(sixMonthsBefore.getMonth() - 6);
    const sixMonthsAfter = new Date(release);
    sixMonthsAfter.setMonth(sixMonthsAfter.getMonth() + 6);

    return allEvents
      .filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate >= sixMonthsBefore && eventDate <= sixMonthsAfter;
      })
      .map(event => {
        const eventDate = new Date(event.startDate);
        const daysFromRelease = Math.ceil((eventDate - release) / (24 * 60 * 60 * 1000));
        return {
          ...event,
          daysFromRelease,
          isBeforeRelease: daysFromRelease < 0
        };
      })
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }
}

/**
 * ガントチャート用のデータを生成
 */
function generateGanttData(releaseDate, timeline, events) {
  const release = new Date(releaseDate);
  const today = new Date();

  // 表示期間を決定（今日から6ヶ月前〜リリース後3ヶ月）
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 1);
  const endDate = new Date(release);
  endDate.setMonth(endDate.getMonth() + 2);

  // 月の配列を生成
  const months = [];
  const current = new Date(startDate);
  current.setDate(1);

  while (current <= endDate) {
    const isCurrentMonth = current.getMonth() === today.getMonth() && current.getFullYear() === today.getFullYear();
    const isReleaseMonth = current.getMonth() === release.getMonth() && current.getFullYear() === release.getFullYear();

    months.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1,
      label: `${current.getFullYear()}/${current.getMonth() + 1}`,
      isCurrent: isCurrentMonth,
      isRelease: isReleaseMonth
    });
    current.setMonth(current.getMonth() + 1);
  }

  // タイムラインのタスクをガントチャート形式に変換
  const tasks = timeline
    .filter(item => {
      const taskDate = new Date(item.date);
      return taskDate >= startDate && taskDate <= endDate;
    })
    .map(item => {
      const taskDate = new Date(item.date);
      // 開始位置（パーセント）を計算
      const totalDays = (endDate - startDate) / (24 * 60 * 60 * 1000);
      const daysSinceStart = (taskDate - startDate) / (24 * 60 * 60 * 1000);
      const startPercent = Math.max(0, Math.min(100, (daysSinceStart / totalDays) * 100));

      // タスクの期間（仮：1週間）
      const duration = 7;
      const widthPercent = Math.min(100 - startPercent, (duration / totalDays) * 100);

      return {
        id: `task-${item.weeksBeforeRelease}`,
        name: item.task,
        category: item.category,
        priority: item.priority,
        date: item.date,
        startPercent,
        widthPercent: Math.max(2, widthPercent), // 最小幅2%
        isCompleted: item.status === 'completed',
        isUrgent: item.isUrgent
      };
    });

  // イベントをガントチャートに追加
  const eventBars = events
    .filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate >= startDate && eventDate <= endDate;
    })
    .map(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      const totalDays = (endDate - startDate) / (24 * 60 * 60 * 1000);
      const daysSinceStart = (eventStart - startDate) / (24 * 60 * 60 * 1000);
      const eventDuration = (eventEnd - eventStart) / (24 * 60 * 60 * 1000) + 1;

      const startPercent = Math.max(0, Math.min(100, (daysSinceStart / totalDays) * 100));
      const widthPercent = Math.min(100 - startPercent, (eventDuration / totalDays) * 100);

      return {
        id: `event-${event.name}`,
        name: event.name,
        category: 'event',
        priority: event.importance,
        date: event.startDate,
        startPercent,
        widthPercent: Math.max(2, widthPercent),
        isEvent: true
      };
    });

  // 今日の位置とリリース日の位置を計算
  const totalDays = (endDate - startDate) / (24 * 60 * 60 * 1000);
  const todayPercent = Math.max(0, Math.min(100, ((today - startDate) / (24 * 60 * 60 * 1000) / totalDays) * 100));
  const releasePercent = Math.max(0, Math.min(100, ((release - startDate) / (24 * 60 * 60 * 1000) / totalDays) * 100));

  return {
    months,
    tasks,
    events: eventBars,
    todayPercent,
    releasePercent,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

module.exports = {
  generateLaunchStrategy,
  recalculateWithDelay,
  getEventList,
  getRegionalStrategies
};
