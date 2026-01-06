/**
 * Steam Store Doctor サービス
 * ストアページを診断し、改善点を提案する
 */

const axios = require('axios');

const STEAM_API_BASE = 'https://store.steampowered.com';

// 多言語メッセージ
const messages = {
  ja: {
    // タグ診断
    tagCriticalNoTags: 'タグが取得できませんでした。手動で確認してください。',
    tagSuggestionNoTags: 'Steamストアページを直接確認し、タグが20個設定されているか確認してください。',
    tagCriticalFewTags: (count) => `タグが少なすぎます（現在${count}個 / 推奨20個）`,
    tagSuggestionFewTags: 'Steamは最大20個のタグを推奨しています。タグが少ないと「おすすめ」に表示される機会を失います。',
    tagWarningLowTags: (count) => `タグ数が少なめです（現在${count}個 / 推奨20個）`,
    tagSuggestionLowTags: 'あと数個タグを追加することで、より多くのユーザーに発見されやすくなります。',
    tagPassedCount: (count) => `タグ数は適切です（${count}個）`,
    tagWarningBroadTags: (tags) => `上位タグに広義すぎるタグがあります: ${tags}`,
    tagSuggestionBroadTags: '「Indie」「Action」などの広義なタグは検索ノイズになりやすいです。より具体的なタグ（例: Roguelike, Metroidvania）を上位に配置してください。',
    tagWarningNoSpecific: 'ジャンルを明確に定義する具体的なタグがありません',
    tagSuggestionNoSpecific: 'Roguelike、Metroidvania、Souls-likeなど、ゲームの特徴を明確に示すタグを追加してください。',
    tagPassedSpecific: '具体的なジャンルタグが設定されています',

    // ビジュアル診断
    visualCriticalNoTrailer: 'トレーラー動画が設定されていません',
    visualSuggestionNoTrailer: 'トレーラーはストアページで最も重要な要素です。必ず1本以上設定してください。',
    visualPassedTrailer: (count) => `トレーラー動画: ${count}本設定済み`,
    visualCriticalNoScreenshots: 'スクリーンショットが設定されていません',
    visualSuggestionNoScreenshots: 'スクリーンショットは最低10枚以上推奨です。ゲームプレイの多様性を見せてください。',
    visualWarningFewScreenshots: (count) => `スクリーンショットが少なすぎます（現在${count}枚 / 推奨10枚以上）`,
    visualSuggestionFewScreenshots: 'スクショが5枚以下だと「地雷ゲーム」と判断されやすいです。10枚以上用意してください。',
    visualWarningLowScreenshots: (count) => `スクリーンショットがやや少なめです（現在${count}枚 / 推奨10枚以上）`,
    visualSuggestionLowScreenshots: 'UIだけでなく、ゲームプレイの多様性を見せるスクショを追加してください。',
    visualPassedScreenshots: (count) => `スクリーンショット: ${count}枚（十分な数）`,
    visualPassedHeader: 'ヘッダー画像が設定されています',
    visualCriticalNoHeader: 'ヘッダー画像が設定されていません',
    visualSuggestionNoHeader: 'カプセル画像はSteamのあらゆる場所で表示される最重要ビジュアルです。',

    // テキスト診断
    textCriticalNoShortDesc: '短い説明文が設定されていません',
    textSuggestionNoShortDesc: '検索結果やウィッシュリストで表示される重要な文章です。ゲームの魅力を簡潔に伝えてください。',
    textWarningShortDescTooShort: (len) => `短い説明文が短すぎます（現在${len}文字）`,
    textSuggestionShortDescTooShort: '100〜300文字程度で、ゲームの核心的な魅力（USP）を伝えてください。',
    textWarningShortDescTooLong: (len) => `短い説明文が長すぎる可能性があります（現在${len}文字）`,
    textSuggestionShortDescTooLong: '重要な部分が「...」で省略される可能性があります。冒頭に最も伝えたいことを書いてください。',
    textPassedShortDesc: (len) => `短い説明文: ${len}文字（適切な長さ）`,
    textCriticalNoDetailedDesc: '詳細説明文が設定されていません',
    textSuggestionNoDetailedDesc: 'ゲームの特徴、ストーリー、システムを詳しく説明してください。',
    textWarningDetailedDescShort: '詳細説明文が短めです',
    textSuggestionDetailedDescShort: 'ゲームの特徴をより詳しく説明し、GIF画像を挿入して視覚的に訴求してください。',
    textPassedDetailedDesc: '詳細説明文が設定されています',

    // 説明文品質分析
    descWarningNoImages: '詳細説明文に画像/GIFがありません',
    descSuggestionNoImages: '文字の壁（Wall of text）は読まれません。ゲームプレイのGIFを配置して、視覚的に飽きさせない工夫が必要です。',
    descWarningNoGif: '説明文に静止画はありますが、GIFアニメーションがありません',
    descSuggestionNoGif: 'GIF画像は実際のゲームプレイを見せる最良の方法です。2〜3個のGIFを追加することで、購入前の不安を解消できます。',
    descPassedGif: 'GIFアニメーションが含まれています',
    descPassedImages: '説明文に画像が含まれています',

    // 基本情報
    basicWarningReleaseDateUnknown: 'リリース日が「近日公開」のままです',
    basicSuggestionReleaseDateUnknown: '具体的な日付を設定してください。ウィッシュリスト追加の動機になります。',
    basicPassedReleaseDate: 'リリース日が設定されています',
    basicWarningNoDevName: '開発者名が設定されていません',
    basicSuggestionNoDevName: '個人開発でも、開発者/スタジオ名を設定してください。',
    basicPassedDevName: (name) => `開発者: ${name}`,
    basicWarningNoLanguages: '対応言語情報がありません',
    basicSuggestionNoLanguages: '対応言語を設定してください。',
    basicPassedLanguages: (count) => `対応言語: ${count}言語`,
    basicWarningFewLanguages: '英語のみの対応です',
    basicSuggestionFewLanguages: '英語、日本語、中国語（簡体字）は最低限対応することで、グローバル市場にリーチできます。',
    basicPassedGenres: (genres) => `ジャンル: ${genres}`,
    basicWarningNoGenres: 'ジャンルが設定されていません',
    basicSuggestionNoGenres: 'ジャンルを設定してください。',

    // ランク
    gradeS: '完璧',
    gradeA: '合格',
    gradeB: '良好',
    gradeC: '改善推奨',
    gradeD: '要改善',
    gradeF: '危険',

    // 説明文品質分析（詳細）
    descPassedImagesGifs: '詳細説明文に画像/GIFが含まれています',
    descPassedGifCount: (count) => `GIF/動画: ${count}個検出（動きが伝わります）`,
    descPassedImagesOnly: '詳細説明文に画像が含まれています',
    descGifSuggestion: 'GIF動画を追加するとゲームプレイがより伝わりやすくなります',
    descWarningNoHeadings: '見出しや強調がありません',
    descSuggestionNoHeadings: '「ゲームの特徴」「ストーリー」「システム」など、セクションを見出しで区切ると読みやすくなります。',
    descPassedHeadings: '見出し・強調が使用されています',
    descWarningNoList: '箇条書きが使用されていません',
    descSuggestionNoList: 'ゲームの特徴は箇条書きで整理すると、一目で把握しやすくなります。',
    descPassedList: '箇条書き/リスト形式が使用されています',
    descWarningNoBreaks: '改行・段落が少なく、文字の壁になっています',
    descSuggestionNoBreaks: '2〜3文ごとに改行を入れ、セクション間には空白行を入れると読みやすくなります。',
    descPassedBreaks: '適切な改行・段落分けがされています',
    descWarningNoGameplay: 'ゲームシステムや遊び方の説明が不足しています',
    descSuggestionNoGameplay: '「どんなジャンルか」「何をするゲームか」「どう遊ぶか」を明確に書きましょう。例: 「ターン制RPG」「ダンジョン探索」「キャラクター育成」など。',
    descPassedGameplayDetailed: 'ゲームシステム・遊び方が明確に説明されています',
    descPassedGameplayBasic: 'ゲームの基本的な内容が説明されています',
    descWarningNoAppeal: 'ゲームの魅力・特徴のアピールが弱い可能性があります',
    descSuggestionNoAppeal: '「このゲームならではの魅力は何か」「他のゲームとの違いは何か」を明確に伝えましょう。',
    descWarningNoHook: '冒頭でユーザーの興味を引く表現が弱い可能性があります',
    descSuggestionNoHook: '最初の1〜2文で「このゲームは何か」「なぜ面白いか」を伝え、続きを読みたくなる導入にしましょう。',

    // 基本情報（追加）
    basicWarningFewLanguages2: (count) => `対応言語が少なめです（${count}言語）`,
    basicSuggestionFewLanguages2: '英語、日本語、中国語（簡体字）は最低限対応することで、グローバル市場にリーチできます。',
    basicWarningNoGenres2: 'ジャンルが設定されていません',
    basicSuggestionNoGenres2: 'ジャンル設定はSteamの分類に影響します。適切なジャンルを選択してください。',
    basicWarningFewCategories: 'カテゴリ（機能）の設定が少ないです',
    basicSuggestionFewCategories: 'シングルプレイヤー、実績、コントローラー対応など、該当する機能は全て設定してください。',
    basicPassedCategories: (count) => `カテゴリ: ${count}個設定済み`,
    basicPassedPriceFree: '価格設定: 無料',
    basicPassedPrice: (price) => `価格設定: ${price}`
  },
  en: {
    // タグ診断
    tagCriticalNoTags: 'Could not retrieve tags. Please check manually.',
    tagSuggestionNoTags: 'Check the Steam store page directly to ensure 20 tags are set.',
    tagCriticalFewTags: (count) => `Too few tags (currently ${count} / recommended 20)`,
    tagSuggestionFewTags: 'Steam recommends up to 20 tags. Fewer tags means less visibility in recommendations.',
    tagWarningLowTags: (count) => `Tag count is low (currently ${count} / recommended 20)`,
    tagSuggestionLowTags: 'Adding a few more tags will help more users discover your game.',
    tagPassedCount: (count) => `Tag count is appropriate (${count})`,
    tagWarningBroadTags: (tags) => `Top tags include overly broad tags: ${tags}`,
    tagSuggestionBroadTags: 'Broad tags like "Indie" or "Action" create search noise. Place more specific tags (e.g., Roguelike, Metroidvania) at the top.',
    tagWarningNoSpecific: 'No specific genre-defining tags found',
    tagSuggestionNoSpecific: 'Add tags that clearly define your game\'s characteristics, such as Roguelike, Metroidvania, or Souls-like.',
    tagPassedSpecific: 'Specific genre tags are set',

    // ビジュアル診断
    visualCriticalNoTrailer: 'No trailer video is set',
    visualSuggestionNoTrailer: 'Trailers are the most important element on a store page. Make sure to add at least one.',
    visualPassedTrailer: (count) => `Trailer videos: ${count} set`,
    visualCriticalNoScreenshots: 'No screenshots are set',
    visualSuggestionNoScreenshots: 'At least 10 screenshots are recommended. Show gameplay variety.',
    visualWarningFewScreenshots: (count) => `Too few screenshots (currently ${count} / recommended 10+)`,
    visualSuggestionFewScreenshots: 'Games with 5 or fewer screenshots are often seen as low quality. Prepare 10 or more.',
    visualWarningLowScreenshots: (count) => `Screenshots are somewhat low (currently ${count} / recommended 10+)`,
    visualSuggestionLowScreenshots: 'Add screenshots showing gameplay variety, not just UI.',
    visualPassedScreenshots: (count) => `Screenshots: ${count} (sufficient)`,
    visualPassedHeader: 'Header image is set',
    visualCriticalNoHeader: 'No header image is set',
    visualSuggestionNoHeader: 'Capsule images are the most important visual, displayed everywhere on Steam.',

    // テキスト診断
    textCriticalNoShortDesc: 'Short description is not set',
    textSuggestionNoShortDesc: 'This text appears in search results and wishlists. Convey your game\'s appeal concisely.',
    textWarningShortDescTooShort: (len) => `Short description is too short (currently ${len} characters)`,
    textSuggestionShortDescTooShort: 'Use 100-300 characters to convey your game\'s core appeal (USP).',
    textWarningShortDescTooLong: (len) => `Short description may be too long (currently ${len} characters)`,
    textSuggestionShortDescTooLong: 'Important parts may be truncated with "...". Put the most important information first.',
    textPassedShortDesc: (len) => `Short description: ${len} characters (appropriate length)`,
    textCriticalNoDetailedDesc: 'Detailed description is not set',
    textSuggestionNoDetailedDesc: 'Explain your game\'s features, story, and systems in detail.',
    textWarningDetailedDescShort: 'Detailed description is short',
    textSuggestionDetailedDescShort: 'Explain your game\'s features in more detail and insert GIF images for visual appeal.',
    textPassedDetailedDesc: 'Detailed description is set',

    // 説明文品質分析
    descWarningNoImages: 'No images/GIFs in detailed description',
    descSuggestionNoImages: 'Walls of text are not read. Place gameplay GIFs to keep it visually engaging.',
    descWarningNoGif: 'Description has static images but no GIF animations',
    descSuggestionNoGif: 'GIF images are the best way to show actual gameplay. Adding 2-3 GIFs can reduce pre-purchase anxiety.',
    descPassedGif: 'GIF animations are included',
    descPassedImages: 'Description includes images',

    // 基本情報
    basicWarningReleaseDateUnknown: 'Release date is still "Coming Soon"',
    basicSuggestionReleaseDateUnknown: 'Set a specific date. It motivates wishlist additions.',
    basicPassedReleaseDate: 'Release date is set',
    basicWarningNoDevName: 'Developer name is not set',
    basicSuggestionNoDevName: 'Set a developer/studio name, even for solo development.',
    basicPassedDevName: (name) => `Developer: ${name}`,
    basicWarningNoLanguages: 'No language support information',
    basicSuggestionNoLanguages: 'Set supported languages.',
    basicPassedLanguages: (count) => `Supported languages: ${count}`,
    basicWarningFewLanguages: 'Only English is supported',
    basicSuggestionFewLanguages: 'Supporting English, Japanese, and Simplified Chinese at minimum will help reach global markets.',
    basicPassedGenres: (genres) => `Genres: ${genres}`,
    basicWarningNoGenres: 'No genres are set',
    basicSuggestionNoGenres: 'Set game genres.',

    // ランク
    gradeS: 'Perfect',
    gradeA: 'Pass',
    gradeB: 'Good',
    gradeC: 'Needs Work',
    gradeD: 'Poor',
    gradeF: 'Critical',

    // 説明文品質分析（詳細）
    descPassedImagesGifs: 'Detailed description includes images/GIFs',
    descPassedGifCount: (count) => `GIF/videos: ${count} detected (shows movement)`,
    descPassedImagesOnly: 'Detailed description includes images',
    descGifSuggestion: 'Adding GIF videos will better convey gameplay',
    descWarningNoHeadings: 'No headings or emphasis found',
    descSuggestionNoHeadings: 'Divide content into sections with headings like "Features", "Story", "System" for better readability.',
    descPassedHeadings: 'Headings and emphasis are used',
    descWarningNoList: 'No bullet lists are used',
    descSuggestionNoList: 'Organizing features in bullet lists makes them easier to scan.',
    descPassedList: 'Bullet/list format is used',
    descWarningNoBreaks: 'Few line breaks create a wall of text',
    descSuggestionNoBreaks: 'Add line breaks every 2-3 sentences and blank lines between sections for readability.',
    descPassedBreaks: 'Proper paragraph breaks are used',
    descWarningNoGameplay: 'Game system and gameplay explanation is lacking',
    descSuggestionNoGameplay: 'Clearly state "what genre is it", "what do you do", and "how do you play". E.g., "turn-based RPG", "dungeon exploration", "character development".',
    descPassedGameplayDetailed: 'Game system and gameplay are clearly explained',
    descPassedGameplayBasic: 'Basic game content is explained',
    descWarningNoAppeal: 'Game appeal and unique features may be weak',
    descSuggestionNoAppeal: 'Clearly communicate "what makes this game special" and "how is it different from other games".',
    descWarningNoHook: 'Opening may not grab user attention',
    descSuggestionNoHook: 'In the first 1-2 sentences, convey "what is this game" and "why is it fun" to make readers want to continue.',

    // 基本情報（追加）
    basicWarningFewLanguages2: (count) => `Supported languages are limited (${count} languages)`,
    basicSuggestionFewLanguages2: 'Supporting English, Japanese, and Simplified Chinese at minimum will help reach global markets.',
    basicWarningNoGenres2: 'No genres are set',
    basicSuggestionNoGenres2: 'Genre settings affect Steam classification. Select appropriate genres.',
    basicWarningFewCategories: 'Few categories (features) are set',
    basicSuggestionFewCategories: 'Set all applicable features like single-player, achievements, controller support.',
    basicPassedCategories: (count) => `Categories: ${count} set`,
    basicPassedPriceFree: 'Pricing: Free',
    basicPassedPrice: (price) => `Pricing: ${price}`
  }
};

// メッセージ取得ヘルパー
function getMsg(lang, key, ...args) {
  const langMessages = messages[lang] || messages.ja;
  const msg = langMessages[key];
  if (typeof msg === 'function') {
    return msg(...args);
  }
  return msg || key;
}

// 推奨タグ（上位に配置すべき具体的なタグ）
const RECOMMENDED_SPECIFIC_TAGS = [
  'Roguelike', 'Roguelite', 'Metroidvania', 'Souls-like', 'Hack and Slash',
  'Turn-Based', 'Real-Time', 'Tower Defense', 'Bullet Hell', 'Survival',
  'Open World', 'Linear', 'Story Rich', 'Atmospheric', 'Horror',
  'Puzzle', 'Platformer', 'Fighting', 'Racing', 'Sports',
  'City Builder', 'Management', 'Simulation', 'Strategy', 'Tactical',
  'Visual Novel', 'Dating Sim', 'JRPG', 'Action RPG', 'Dungeon Crawler',
  'Stealth', 'Shooter', 'FPS', 'Third Person', 'Top-Down',
  'Side Scroller', 'Pixel Graphics', '2D', '3D', 'Retro',
  'Cyberpunk', 'Fantasy', 'Sci-fi', 'Post-apocalyptic', 'Medieval'
];

// 広義すぎるタグ（上位5つに入れるべきでない）
const OVERLY_BROAD_TAGS = [
  'Indie', 'Singleplayer', 'Action', 'Adventure', 'Casual',
  'Free to Play', 'Early Access', 'Great Soundtrack', 'Controller',
  'Full controller support', 'Steam Achievements'
];

/**
 * ストア診断を実行
 * @param {string} appId - Steam AppID
 * @param {Object} options - オプション
 * @returns {Promise<Object>} 診断結果
 */
async function diagnoseStore(appId, options = {}) {
  const { lang = 'ja' } = options;
  try {
    // ゲーム詳細情報を取得（日本語版と英語版の両方を取得）
    const [detailResponseJp, detailResponseEn] = await Promise.all([
      axios.get(`${STEAM_API_BASE}/api/appdetails`, {
        params: { appids: appId, l: 'japanese' },
        timeout: 15000
      }),
      axios.get(`${STEAM_API_BASE}/api/appdetails`, {
        params: { appids: appId, l: 'english' },
        timeout: 15000
      })
    ]);

    const detailData = detailResponseJp.data[appId];
    const detailDataEn = detailResponseEn.data[appId];
    if (!detailData || !detailData.success) {
      throw new Error('ゲーム情報が取得できませんでした');
    }

    const gameData = detailData.data;

    // 英語版のdetailed_descriptionも保持（画像チェック用）
    if (detailDataEn && detailDataEn.success) {
      gameData.detailed_description_en = detailDataEn.data.detailed_description || '';
    }

    // タグ情報を取得（別APIから）
    let tags = [];
    try {
      const tagResponse = await axios.get(`${STEAM_API_BASE}/app/${appId}`, {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000
      });
      tags = extractTagsFromHtml(tagResponse.data);
    } catch (e) {
      console.error('タグ取得エラー:', e.message);
    }

    // 各項目を診断
    const tagDiagnosis = diagnoseTag(tags, lang);
    const visualDiagnosis = diagnoseVisuals(gameData, lang);
    const textDiagnosis = diagnoseText(gameData, lang);
    const basicDiagnosis = diagnoseBasicInfo(gameData, lang);

    // 総合スコア計算（テキスト診断の比重を上げた）
    const totalScore = Math.round(
      tagDiagnosis.score * 0.30 +
      visualDiagnosis.score * 0.25 +
      textDiagnosis.score * 0.35 +
      basicDiagnosis.score * 0.10
    );

    // 判定ランク
    const grade = getGrade(totalScore, lang);

    return {
      gameInfo: {
        appId,
        name: gameData.name,
        headerImage: gameData.header_image,
        developers: gameData.developers || [],
        releaseDate: gameData.release_date?.date
      },
      totalScore,
      grade,
      diagnoses: {
        tags: tagDiagnosis,
        visuals: visualDiagnosis,
        text: textDiagnosis,
        basic: basicDiagnosis
      },
      suggestedTags: getSuggestedTags(tags)
    };

  } catch (error) {
    console.error('診断エラー:', error.message);
    throw error;
  }
}

/**
 * HTMLからタグを抽出
 */
function extractTagsFromHtml(html) {
  const tags = [];
  // Steam store pageからタグを抽出する正規表現
  const tagRegex = /class="app_tag"[^>]*>([^<]+)</g;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[1].trim();
    if (tag && tag !== '+') {
      tags.push(tag);
    }
  }
  return tags;
}

/**
 * タグ診断
 */
function diagnoseTag(tags, lang = 'ja') {
  const issues = [];
  const warnings = [];
  const passed = [];
  let score = 100;

  // タグ数チェック
  if (tags.length === 0) {
    issues.push({
      type: 'critical',
      message: getMsg(lang, 'tagCriticalNoTags'),
      suggestion: getMsg(lang, 'tagSuggestionNoTags')
    });
    score -= 40;
  } else if (tags.length < 10) {
    issues.push({
      type: 'critical',
      message: getMsg(lang, 'tagCriticalFewTags', tags.length),
      suggestion: getMsg(lang, 'tagSuggestionFewTags')
    });
    score -= 30;
  } else if (tags.length < 15) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'tagWarningLowTags', tags.length),
      suggestion: getMsg(lang, 'tagSuggestionLowTags')
    });
    score -= 15;
  } else {
    passed.push(getMsg(lang, 'tagPassedCount', tags.length));
  }

  // 上位5タグの品質チェック
  const top5Tags = tags.slice(0, 5);
  const broadTagsInTop5 = top5Tags.filter(tag =>
    OVERLY_BROAD_TAGS.some(broad => tag.toLowerCase().includes(broad.toLowerCase()))
  );

  if (broadTagsInTop5.length > 0) {
    issues.push({
      type: 'warning',
      message: getMsg(lang, 'tagWarningBroadTags', broadTagsInTop5.join(', ')),
      suggestion: getMsg(lang, 'tagSuggestionBroadTags')
    });
    score -= 15;
  }

  // 具体的なタグの存在チェック
  const hasSpecificTag = tags.some(tag =>
    RECOMMENDED_SPECIFIC_TAGS.some(specific =>
      tag.toLowerCase().includes(specific.toLowerCase())
    )
  );

  if (!hasSpecificTag && tags.length > 0) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'tagWarningNoSpecific'),
      suggestion: getMsg(lang, 'tagSuggestionNoSpecific')
    });
    score -= 10;
  } else if (hasSpecificTag) {
    passed.push(getMsg(lang, 'tagPassedSpecific'));
  }

  return {
    score: Math.max(0, score),
    maxScore: 30,
    weightedScore: Math.max(0, score) * 0.30,
    tags,
    issues,
    warnings,
    passed
  };
}

/**
 * ビジュアル診断
 */
function diagnoseVisuals(gameData, lang = 'ja') {
  const issues = [];
  const warnings = [];
  const passed = [];
  let score = 100;

  // トレーラーチェック
  const movies = gameData.movies || [];
  if (movies.length === 0) {
    issues.push({
      type: 'critical',
      message: getMsg(lang, 'visualCriticalNoTrailer'),
      suggestion: getMsg(lang, 'visualSuggestionNoTrailer')
    });
    score -= 40;
  } else {
    passed.push(getMsg(lang, 'visualPassedTrailer', movies.length));
  }

  // スクリーンショットチェック
  const screenshots = gameData.screenshots || [];
  if (screenshots.length === 0) {
    issues.push({
      type: 'critical',
      message: getMsg(lang, 'visualCriticalNoScreenshots'),
      suggestion: getMsg(lang, 'visualSuggestionNoScreenshots')
    });
    score -= 30;
  } else if (screenshots.length < 5) {
    issues.push({
      type: 'warning',
      message: getMsg(lang, 'visualWarningFewScreenshots', screenshots.length),
      suggestion: getMsg(lang, 'visualSuggestionFewScreenshots')
    });
    score -= 20;
  } else if (screenshots.length < 10) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'visualWarningLowScreenshots', screenshots.length),
      suggestion: getMsg(lang, 'visualSuggestionLowScreenshots')
    });
    score -= 10;
  } else {
    passed.push(getMsg(lang, 'visualPassedScreenshots', screenshots.length));
  }

  // ヘッダー画像チェック
  if (gameData.header_image) {
    passed.push(getMsg(lang, 'visualPassedHeader'));
  } else {
    issues.push({
      type: 'critical',
      message: getMsg(lang, 'visualCriticalNoHeader'),
      suggestion: getMsg(lang, 'visualSuggestionNoHeader')
    });
    score -= 30;
  }

  return {
    score: Math.max(0, score),
    maxScore: 25,
    weightedScore: Math.max(0, score) * 0.25,
    movieCount: movies.length,
    screenshotCount: screenshots.length,
    issues,
    warnings,
    passed
  };
}

/**
 * テキスト診断
 */
function diagnoseText(gameData, lang = 'ja') {
  const issues = [];
  const warnings = [];
  const passed = [];
  let score = 100;

  // Short Description チェック
  const shortDesc = gameData.short_description || '';
  if (shortDesc.length === 0) {
    issues.push({
      type: 'critical',
      message: getMsg(lang, 'textCriticalNoShortDesc'),
      suggestion: getMsg(lang, 'textSuggestionNoShortDesc')
    });
    score -= 40;
  } else if (shortDesc.length < 100) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'textWarningShortDescTooShort', shortDesc.length),
      suggestion: getMsg(lang, 'textSuggestionShortDescTooShort')
    });
    score -= 15;
  } else if (shortDesc.length > 300) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'textWarningShortDescTooLong', shortDesc.length),
      suggestion: getMsg(lang, 'textSuggestionShortDescTooLong')
    });
    score -= 10;
  } else {
    passed.push(getMsg(lang, 'textPassedShortDesc', shortDesc.length));
  }

  // Detailed Description チェック
  const detailedDesc = gameData.detailed_description || '';
  const detailedDescEn = gameData.detailed_description_en || '';

  if (detailedDesc.length === 0) {
    issues.push({
      type: 'critical',
      message: getMsg(lang, 'textCriticalNoDetailedDesc'),
      suggestion: getMsg(lang, 'textSuggestionNoDetailedDesc')
    });
    score -= 30;
  } else if (detailedDesc.length < 500) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'textWarningDetailedDescShort'),
      suggestion: getMsg(lang, 'textSuggestionDetailedDescShort')
    });
    score -= 10;
  } else {
    passed.push(getMsg(lang, 'textPassedDetailedDesc'));
  }

  // 詳細説明文の深い分析
  const descAnalysis = analyzeDescriptionQuality(detailedDesc, detailedDescEn, lang);

  // 分析結果を統合
  issues.push(...descAnalysis.issues);
  warnings.push(...descAnalysis.warnings);
  passed.push(...descAnalysis.passed);
  score -= descAnalysis.penalty;

  return {
    score: Math.max(0, score),
    maxScore: 35,
    weightedScore: Math.max(0, score) * 0.35,
    shortDescLength: shortDesc.length,
    detailedDescLength: detailedDesc.length,
    descriptionAnalysis: descAnalysis.details, // 詳細分析結果
    issues,
    warnings,
    passed
  };
}

/**
 * 説明文の品質を深く分析
 */
function analyzeDescriptionQuality(descJp, descEn, lang = 'ja') {
  const issues = [];
  const warnings = [];
  const passed = [];
  let penalty = 0;
  const details = {};

  // HTMLタグを除去したプレーンテキストを取得
  const plainText = descJp.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const plainTextEn = descEn.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

  // === 1. 画像/GIFの有無チェック ===
  const checkForImages = (text) => {
    return text.includes('<img') ||
           text.includes('[img]') ||
           text.includes('steamcdn') ||
           text.includes('clan.cloudflare.steamstatic.com') ||
           text.includes('cdn.cloudflare.steamstatic.com') ||
           text.includes('steamstatic.com') ||
           text.includes('steampowered.com/') ||
           /\.(gif|png|jpg|jpeg|webp)/i.test(text) ||
           text.includes('src="http') ||
           text.includes("src='http");
  };

  const hasImagesJp = checkForImages(descJp);
  const hasImagesEn = checkForImages(descEn);
  const hasImages = hasImagesJp || hasImagesEn;

  // 画像の数をカウント
  const imageCount = (descJp.match(/<img/gi) || []).length +
                     (descEn.match(/<img/gi) || []).length;

  // GIF検出：様々なパターンに対応
  // Steam CDNのGIFは .gif 拡張子、またはアニメーション関連のパラメータを持つ
  const combinedDesc = descJp + descEn;
  const gifPatterns = [
    /\.gif/gi,                           // .gif 拡張子
    /animation/gi,                        // animationパラメータ
    /animated/gi,                         // animated属性
    /webm/gi,                             // webm動画（GIF代替）
    /mp4/gi,                              // mp4動画
    /autoplay/gi,                         // autoplay属性（動画の兆候）
    /loop/gi,                             // loop属性（GIF/動画の兆候）
  ];

  // より柔軟なGIF検出
  let gifCount = 0;
  for (const pattern of gifPatterns) {
    const matches = combinedDesc.match(pattern);
    if (matches) {
      gifCount += matches.length;
    }
  }

  // Steam CDN の画像URLパターンからGIFを検出
  // 例: https://clan.cloudflare.steamstatic.com/images/xxx/yyy.gif
  const steamGifMatches = combinedDesc.match(/steamstatic\.com[^"'\s]*\.gif/gi) || [];
  const steamCdnGifMatches = combinedDesc.match(/steamcdn[^"'\s]*\.gif/gi) || [];
  gifCount += steamGifMatches.length + steamCdnGifMatches.length;

  // デバッグ: 画像URLの詳細を出力
  const imgSrcMatches = combinedDesc.match(/src=["'][^"']+["']/gi) || [];
  console.log('[StoreDiagnosis] Image sources found:', imgSrcMatches.length);
  if (imgSrcMatches.length > 0) {
    console.log('[StoreDiagnosis] First 3 image sources:', imgSrcMatches.slice(0, 3));
  }
  console.log('[StoreDiagnosis] GIF detection count:', gifCount);

  details.imageCount = Math.max(imageCount, (descJp.match(/src=/gi) || []).length);
  details.hasGif = gifCount > 0;

  if (!hasImages && descJp.length > 0) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'descWarningNoImages'),
      suggestion: getMsg(lang, 'descSuggestionNoImages')
    });
    penalty += 15;
  } else if (hasImages && gifCount === 0) {
    // GIFが無くても画像があればOKとする（警告を軽くする）
    // 静止画のみでも問題ないケースが多い
    passed.push(getMsg(lang, 'descPassedImagesOnly'));
    // GIFが無いことは軽い提案にとどめる
    details.suggestion = getMsg(lang, 'descGifSuggestion');
  } else if (hasImages) {
    passed.push(getMsg(lang, 'descPassedImagesGifs'));
    if (gifCount > 0) {
      passed.push(getMsg(lang, 'descPassedGifCount', gifCount));
    }
  }

  // === 2. 構造・フォーマットの分析 ===
  // 見出しタグの使用
  const hasH1 = /<h1/i.test(descJp) || /<h1/i.test(descEn);
  const hasH2 = /<h2/i.test(descJp) || /<h2/i.test(descEn);
  const hasBold = /<b>|<strong>/i.test(descJp) || /<b>|<strong>/i.test(descEn);
  const hasHeadings = hasH1 || hasH2 || hasBold;

  details.hasHeadings = hasHeadings;
  details.headingCount = ((descJp + descEn).match(/<h[12]|<b>|<strong>/gi) || []).length;

  if (!hasHeadings && plainText.length > 300) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'descWarningNoHeadings'),
      suggestion: getMsg(lang, 'descSuggestionNoHeadings')
    });
    penalty += 8;
  } else if (hasHeadings) {
    passed.push(getMsg(lang, 'descPassedHeadings'));
  }

  // リスト形式の使用
  const hasList = /<ul|<ol|<li|・|●|★|◆|■|▶|→/i.test(descJp);
  details.hasList = hasList;

  if (!hasList && plainText.length > 500) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'descWarningNoList'),
      suggestion: getMsg(lang, 'descSuggestionNoList')
    });
    penalty += 5;
  } else if (hasList) {
    passed.push(getMsg(lang, 'descPassedList'));
  }

  // === 3. 改行・段落の分析 ===
  const brCount = (descJp.match(/<br/gi) || []).length;
  const pCount = (descJp.match(/<\/p>/gi) || []).length;
  const paragraphBreaks = brCount + pCount;

  // 1000文字あたりの改行数
  const breaksPerThousand = plainText.length > 0
    ? Math.round((paragraphBreaks / plainText.length) * 1000)
    : 0;

  details.paragraphBreaks = paragraphBreaks;
  details.breaksPerThousand = breaksPerThousand;

  if (plainText.length > 500 && breaksPerThousand < 5) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'descWarningNoBreaks'),
      suggestion: getMsg(lang, 'descSuggestionNoBreaks')
    });
    penalty += 10;
  } else if (paragraphBreaks > 0) {
    passed.push(getMsg(lang, 'descPassedBreaks'));
  }

  // === 4. ゲーム内容の明確さ分析 ===
  const gameplayKeywords = [
    // ジャンル系
    'アクション', 'RPG', 'シミュレーション', 'パズル', 'アドベンチャー', 'ストラテジー',
    'ローグライク', 'ローグライト', 'サバイバル', 'ホラー', 'シューター', 'プラットフォーム',
    'Action', 'Puzzle', 'Adventure', 'Strategy', 'Survival', 'Horror', 'Shooter',
    // システム系
    '戦闘', 'バトル', '探索', '育成', 'クラフト', '建築', '経営', '管理',
    'レベルアップ', 'スキル', 'アイテム', '装備', '合成', 'ダンジョン',
    'combat', 'battle', 'explore', 'craft', 'build', 'manage', 'skill', 'level',
    // 遊び方系
    'プレイヤー', 'キャラクター', '操作', 'ターン制', 'リアルタイム',
    'ソロ', 'マルチ', '協力', '対戦', 'オンライン', 'オフライン',
    'player', 'character', 'turn-based', 'real-time', 'solo', 'coop', 'multiplayer'
  ];

  const combinedText = (plainText + ' ' + plainTextEn).toLowerCase();
  const foundKeywords = gameplayKeywords.filter(kw =>
    combinedText.includes(kw.toLowerCase())
  );

  details.gameplayKeywordsFound = foundKeywords.length;
  details.foundKeywords = foundKeywords.slice(0, 10);

  if (foundKeywords.length < 3 && plainText.length > 200) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'descWarningNoGameplay'),
      suggestion: getMsg(lang, 'descSuggestionNoGameplay')
    });
    penalty += 10;
  } else if (foundKeywords.length >= 5) {
    passed.push(getMsg(lang, 'descPassedGameplayDetailed'));
  } else if (foundKeywords.length >= 3) {
    passed.push(getMsg(lang, 'descPassedGameplayBasic'));
  }

  // === 5. 訴求ポイントの分析 ===
  const appealKeywords = [
    // 特徴・魅力系
    '特徴', '魅力', 'ユニーク', 'オリジナル', '独自', '新しい',
    'feature', 'unique', 'original', 'new',
    // 体験系
    '体験', '没入', '感動', '興奮', 'スリル', '緊張感',
    'experience', 'immersive', 'exciting', 'thrilling',
    // ボリューム系
    '時間', 'ボリューム', 'やりこみ', 'エンディング', 'ステージ', 'レベル',
    'hours', 'content', 'levels', 'stages', 'endings'
  ];

  const foundAppeals = appealKeywords.filter(kw =>
    combinedText.includes(kw.toLowerCase())
  );

  details.appealKeywordsFound = foundAppeals.length;

  if (foundAppeals.length < 2 && plainText.length > 300) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'descWarningNoAppeal'),
      suggestion: getMsg(lang, 'descSuggestionNoAppeal')
    });
    penalty += 5;
  }

  // === 6. 冒頭の掴みチェック ===
  const firstParagraph = plainText.substring(0, 200);
  const hasHookKeywords = /体験|挑め|待つ|世界|冒険|あなた|君|プレイヤー|experience|await|world|adventure|you|player/i.test(firstParagraph);

  details.hasHook = hasHookKeywords || firstParagraph.includes('!') || firstParagraph.includes('？');

  if (!details.hasHook && plainText.length > 200) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'descWarningNoHook'),
      suggestion: getMsg(lang, 'descSuggestionNoHook')
    });
    penalty += 5;
  }

  // デバッグログ
  console.log('[StoreDiagnosis] Description analysis:', {
    plainTextLength: plainText.length,
    imageCount: details.imageCount,
    hasGif: details.hasGif,
    hasHeadings: details.hasHeadings,
    hasList: details.hasList,
    paragraphBreaks: details.paragraphBreaks,
    gameplayKeywordsFound: details.gameplayKeywordsFound,
    penalty
  });

  return {
    issues,
    warnings,
    passed,
    penalty,
    details
  };
}

/**
 * 基本情報診断
 */
function diagnoseBasicInfo(gameData, lang = 'ja') {
  const issues = [];
  const warnings = [];
  const passed = [];
  let score = 100;

  // 対応言語チェック
  const languages = gameData.supported_languages || '';
  const languageCount = (languages.match(/,/g) || []).length + 1;

  if (languageCount < 3) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'basicWarningFewLanguages2', languageCount),
      suggestion: getMsg(lang, 'basicSuggestionFewLanguages2')
    });
    score -= 20;
  } else {
    passed.push(getMsg(lang, 'basicPassedLanguages', languageCount));
  }

  // ジャンル設定チェック
  const genres = gameData.genres || [];
  if (genres.length === 0) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'basicWarningNoGenres2'),
      suggestion: getMsg(lang, 'basicSuggestionNoGenres2')
    });
    score -= 15;
  } else {
    passed.push(getMsg(lang, 'basicPassedGenres', genres.map(g => g.description).join(', ')));
  }

  // カテゴリ（機能）チェック
  const categories = gameData.categories || [];
  if (categories.length < 3) {
    warnings.push({
      type: 'warning',
      message: getMsg(lang, 'basicWarningFewCategories'),
      suggestion: getMsg(lang, 'basicSuggestionFewCategories')
    });
    score -= 10;
  } else {
    passed.push(getMsg(lang, 'basicPassedCategories', categories.length));
  }

  // 価格チェック
  if (gameData.is_free) {
    passed.push(getMsg(lang, 'basicPassedPriceFree'));
  } else if (gameData.price_overview) {
    passed.push(getMsg(lang, 'basicPassedPrice', gameData.price_overview.final_formatted));
  }

  return {
    score: Math.max(0, score),
    maxScore: 10,
    weightedScore: Math.max(0, score) * 0.10,
    languageCount,
    genreCount: genres.length,
    categoryCount: categories.length,
    issues,
    warnings,
    passed
  };
}

/**
 * 不足しているタグを提案
 */
function getSuggestedTags(currentTags) {
  const currentLower = currentTags.map(t => t.toLowerCase());
  const suggestions = RECOMMENDED_SPECIFIC_TAGS.filter(tag =>
    !currentLower.some(current => current.includes(tag.toLowerCase()))
  );
  return suggestions.slice(0, 10);
}

/**
 * スコアから判定ランクを取得
 */
function getGrade(score, lang = 'ja') {
  if (score >= 90) return { letter: 'S', label: getMsg(lang, 'gradeS'), color: '#00d4aa' };
  if (score >= 80) return { letter: 'A', label: getMsg(lang, 'gradeA'), color: '#4CAF50' };
  if (score >= 70) return { letter: 'B', label: getMsg(lang, 'gradeB'), color: '#8BC34A' };
  if (score >= 60) return { letter: 'C', label: getMsg(lang, 'gradeC'), color: '#FFC107' };
  if (score >= 50) return { letter: 'D', label: getMsg(lang, 'gradeD'), color: '#FF9800' };
  return { letter: 'F', label: getMsg(lang, 'gradeF'), color: '#f44336' };
}

module.exports = {
  diagnoseStore
};
