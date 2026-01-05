/**
 * Steam Store Doctor サービス
 * ストアページを診断し、改善点を提案する
 */

const axios = require('axios');

const STEAM_API_BASE = 'https://store.steampowered.com';

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
 * @returns {Promise<Object>} 診断結果
 */
async function diagnoseStore(appId) {
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
    const tagDiagnosis = diagnoseTag(tags);
    const visualDiagnosis = diagnoseVisuals(gameData);
    const textDiagnosis = diagnoseText(gameData);
    const basicDiagnosis = diagnoseBasicInfo(gameData);

    // 総合スコア計算（テキスト診断の比重を上げた）
    const totalScore = Math.round(
      tagDiagnosis.score * 0.30 +
      visualDiagnosis.score * 0.25 +
      textDiagnosis.score * 0.35 +
      basicDiagnosis.score * 0.10
    );

    // 判定ランク
    const grade = getGrade(totalScore);

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
function diagnoseTag(tags) {
  const issues = [];
  const warnings = [];
  const passed = [];
  let score = 100;

  // タグ数チェック
  if (tags.length === 0) {
    issues.push({
      type: 'critical',
      message: 'タグが取得できませんでした。手動で確認してください。',
      suggestion: 'Steamストアページを直接確認し、タグが20個設定されているか確認してください。'
    });
    score -= 40;
  } else if (tags.length < 10) {
    issues.push({
      type: 'critical',
      message: `タグが少なすぎます（現在${tags.length}個 / 推奨20個）`,
      suggestion: 'Steamは最大20個のタグを推奨しています。タグが少ないと「おすすめ」に表示される機会を失います。'
    });
    score -= 30;
  } else if (tags.length < 15) {
    warnings.push({
      type: 'warning',
      message: `タグ数が少なめです（現在${tags.length}個 / 推奨20個）`,
      suggestion: 'あと数個タグを追加することで、より多くのユーザーに発見されやすくなります。'
    });
    score -= 15;
  } else {
    passed.push(`タグ数は適切です（${tags.length}個）`);
  }

  // 上位5タグの品質チェック
  const top5Tags = tags.slice(0, 5);
  const broadTagsInTop5 = top5Tags.filter(tag =>
    OVERLY_BROAD_TAGS.some(broad => tag.toLowerCase().includes(broad.toLowerCase()))
  );

  if (broadTagsInTop5.length > 0) {
    issues.push({
      type: 'warning',
      message: `上位タグに広義すぎるタグがあります: ${broadTagsInTop5.join(', ')}`,
      suggestion: '「Indie」「Action」などの広義なタグは検索ノイズになりやすいです。より具体的なタグ（例: Roguelike, Metroidvania）を上位に配置してください。'
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
      message: 'ジャンルを明確に定義する具体的なタグがありません',
      suggestion: 'Roguelike、Metroidvania、Souls-likeなど、ゲームの特徴を明確に示すタグを追加してください。'
    });
    score -= 10;
  } else if (hasSpecificTag) {
    passed.push('具体的なジャンルタグが設定されています');
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
function diagnoseVisuals(gameData) {
  const issues = [];
  const warnings = [];
  const passed = [];
  let score = 100;

  // トレーラーチェック
  const movies = gameData.movies || [];
  if (movies.length === 0) {
    issues.push({
      type: 'critical',
      message: 'トレーラー動画が設定されていません',
      suggestion: 'トレーラーはストアページで最も重要な要素です。必ず1本以上設定してください。'
    });
    score -= 40;
  } else {
    passed.push(`トレーラー動画: ${movies.length}本設定済み`);
  }

  // スクリーンショットチェック
  const screenshots = gameData.screenshots || [];
  if (screenshots.length === 0) {
    issues.push({
      type: 'critical',
      message: 'スクリーンショットが設定されていません',
      suggestion: 'スクリーンショットは最低10枚以上推奨です。ゲームプレイの多様性を見せてください。'
    });
    score -= 30;
  } else if (screenshots.length < 5) {
    issues.push({
      type: 'warning',
      message: `スクリーンショットが少なすぎます（現在${screenshots.length}枚 / 推奨10枚以上）`,
      suggestion: 'スクショが5枚以下だと「地雷ゲーム」と判断されやすいです。10枚以上用意してください。'
    });
    score -= 20;
  } else if (screenshots.length < 10) {
    warnings.push({
      type: 'warning',
      message: `スクリーンショットがやや少なめです（現在${screenshots.length}枚 / 推奨10枚以上）`,
      suggestion: 'UIだけでなく、ゲームプレイの多様性を見せるスクショを追加してください。'
    });
    score -= 10;
  } else {
    passed.push(`スクリーンショット: ${screenshots.length}枚（十分な数）`);
  }

  // ヘッダー画像チェック
  if (gameData.header_image) {
    passed.push('ヘッダー画像が設定されています');
  } else {
    issues.push({
      type: 'critical',
      message: 'ヘッダー画像が設定されていません',
      suggestion: 'カプセル画像はSteamのあらゆる場所で表示される最重要ビジュアルです。'
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
function diagnoseText(gameData) {
  const issues = [];
  const warnings = [];
  const passed = [];
  let score = 100;

  // Short Description チェック
  const shortDesc = gameData.short_description || '';
  if (shortDesc.length === 0) {
    issues.push({
      type: 'critical',
      message: '短い説明文が設定されていません',
      suggestion: '検索結果やウィッシュリストで表示される重要な文章です。ゲームの魅力を簡潔に伝えてください。'
    });
    score -= 40;
  } else if (shortDesc.length < 100) {
    warnings.push({
      type: 'warning',
      message: `短い説明文が短すぎます（現在${shortDesc.length}文字）`,
      suggestion: '100〜300文字程度で、ゲームの核心的な魅力（USP）を伝えてください。'
    });
    score -= 15;
  } else if (shortDesc.length > 300) {
    warnings.push({
      type: 'warning',
      message: `短い説明文が長すぎる可能性があります（現在${shortDesc.length}文字）`,
      suggestion: '重要な部分が「...」で省略される可能性があります。冒頭に最も伝えたいことを書いてください。'
    });
    score -= 10;
  } else {
    passed.push(`短い説明文: ${shortDesc.length}文字（適切な長さ）`);
  }

  // Detailed Description チェック
  const detailedDesc = gameData.detailed_description || '';
  const detailedDescEn = gameData.detailed_description_en || '';

  if (detailedDesc.length === 0) {
    issues.push({
      type: 'critical',
      message: '詳細説明文が設定されていません',
      suggestion: 'ゲームの特徴、ストーリー、システムを詳しく説明してください。'
    });
    score -= 30;
  } else if (detailedDesc.length < 500) {
    warnings.push({
      type: 'warning',
      message: '詳細説明文が短めです',
      suggestion: 'ゲームの特徴をより詳しく説明し、GIF画像を挿入して視覚的に訴求してください。'
    });
    score -= 10;
  } else {
    passed.push('詳細説明文が設定されています');
  }

  // 詳細説明文の深い分析
  const descAnalysis = analyzeDescriptionQuality(detailedDesc, detailedDescEn);

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
function analyzeDescriptionQuality(descJp, descEn) {
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
      message: '詳細説明文に画像/GIFがありません',
      suggestion: '文字の壁（Wall of text）は読まれません。ゲームプレイのGIFを配置して、視覚的に飽きさせない工夫が必要です。'
    });
    penalty += 15;
  } else if (hasImages && gifCount === 0) {
    // GIFが無くても画像があればOKとする（警告を軽くする）
    // 静止画のみでも問題ないケースが多い
    passed.push('詳細説明文に画像が含まれています');
    // GIFが無いことは軽い提案にとどめる
    details.suggestion = 'GIF動画を追加するとゲームプレイがより伝わりやすくなります';
  } else if (hasImages) {
    passed.push('詳細説明文に画像/GIFが含まれています');
    if (gifCount > 0) {
      passed.push(`GIF/動画: ${gifCount}個検出（動きが伝わります）`);
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
      message: '見出しや強調がありません',
      suggestion: '「ゲームの特徴」「ストーリー」「システム」など、セクションを見出しで区切ると読みやすくなります。'
    });
    penalty += 8;
  } else if (hasHeadings) {
    passed.push('見出し・強調が使用されています');
  }

  // リスト形式の使用
  const hasList = /<ul|<ol|<li|・|●|★|◆|■|▶|→/i.test(descJp);
  details.hasList = hasList;

  if (!hasList && plainText.length > 500) {
    warnings.push({
      type: 'warning',
      message: '箇条書きが使用されていません',
      suggestion: 'ゲームの特徴は箇条書きで整理すると、一目で把握しやすくなります。'
    });
    penalty += 5;
  } else if (hasList) {
    passed.push('箇条書き/リスト形式が使用されています');
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
      message: '改行・段落が少なく、文字の壁になっています',
      suggestion: '2〜3文ごとに改行を入れ、セクション間には空白行を入れると読みやすくなります。'
    });
    penalty += 10;
  } else if (paragraphBreaks > 0) {
    passed.push('適切な改行・段落分けがされています');
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
      message: 'ゲームシステムや遊び方の説明が不足しています',
      suggestion: '「どんなジャンルか」「何をするゲームか」「どう遊ぶか」を明確に書きましょう。例: 「ターン制RPG」「ダンジョン探索」「キャラクター育成」など。'
    });
    penalty += 10;
  } else if (foundKeywords.length >= 5) {
    passed.push('ゲームシステム・遊び方が明確に説明されています');
  } else if (foundKeywords.length >= 3) {
    passed.push('ゲームの基本的な内容が説明されています');
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
      message: 'ゲームの魅力・特徴のアピールが弱い可能性があります',
      suggestion: '「このゲームならではの魅力は何か」「他のゲームとの違いは何か」を明確に伝えましょう。'
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
      message: '冒頭でユーザーの興味を引く表現が弱い可能性があります',
      suggestion: '最初の1〜2文で「このゲームは何か」「なぜ面白いか」を伝え、続きを読みたくなる導入にしましょう。'
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
function diagnoseBasicInfo(gameData) {
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
      message: `対応言語が少なめです（${languageCount}言語）`,
      suggestion: '英語、日本語、中国語（簡体字）は最低限対応することで、グローバル市場にリーチできます。'
    });
    score -= 20;
  } else {
    passed.push(`対応言語: ${languageCount}言語`);
  }

  // ジャンル設定チェック
  const genres = gameData.genres || [];
  if (genres.length === 0) {
    warnings.push({
      type: 'warning',
      message: 'ジャンルが設定されていません',
      suggestion: 'ジャンル設定はSteamの分類に影響します。適切なジャンルを選択してください。'
    });
    score -= 15;
  } else {
    passed.push(`ジャンル: ${genres.map(g => g.description).join(', ')}`);
  }

  // カテゴリ（機能）チェック
  const categories = gameData.categories || [];
  if (categories.length < 3) {
    warnings.push({
      type: 'warning',
      message: 'カテゴリ（機能）の設定が少ないです',
      suggestion: 'シングルプレイヤー、実績、コントローラー対応など、該当する機能は全て設定してください。'
    });
    score -= 10;
  } else {
    passed.push(`カテゴリ: ${categories.length}個設定済み`);
  }

  // 価格チェック
  if (gameData.is_free) {
    passed.push('価格設定: 無料');
  } else if (gameData.price_overview) {
    passed.push(`価格設定: ${gameData.price_overview.final_formatted}`);
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
function getGrade(score) {
  if (score >= 90) return { letter: 'S', label: '完璧', color: '#00d4aa' };
  if (score >= 80) return { letter: 'A', label: '合格', color: '#4CAF50' };
  if (score >= 70) return { letter: 'B', label: '良好', color: '#8BC34A' };
  if (score >= 60) return { letter: 'C', label: '改善推奨', color: '#FFC107' };
  if (score >= 50) return { letter: 'D', label: '要改善', color: '#FF9800' };
  return { letter: 'F', label: '危険', color: '#f44336' };
}

module.exports = {
  diagnoseStore
};
