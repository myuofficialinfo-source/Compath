/**
 * Compath - メインアプリケーション
 */

// グローバル状態
const AppState = {
  currentPage: 'home',
  currentGameData: null,
  currentReviews: null,
  currentKeywords: null,
  currentSummary: null,
  isLoading: false,
  language: 'ja' // 'ja' or 'en'
};

// ツールアクセス数管理（24時間ごとに並び順更新）
const ToolAccessTracker = {
  STORAGE_KEY: 'compath_tool_access',
  SORT_CACHE_KEY: 'compath_tool_sort_cache',
  UPDATE_INTERVAL: 24 * 60 * 60 * 1000, // 24時間（ミリ秒）

  // アクセス数を取得
  getAccessCounts() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },

  // キャッシュされた並び順を取得
  getSortCache() {
    try {
      const data = localStorage.getItem(this.SORT_CACHE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  // 並び順をキャッシュに保存
  saveSortCache(order) {
    const cache = {
      order: order,
      timestamp: Date.now()
    };
    localStorage.setItem(this.SORT_CACHE_KEY, JSON.stringify(cache));
  },

  // アクセスを記録
  recordAccess(toolId) {
    const counts = this.getAccessCounts();
    counts[toolId] = (counts[toolId] || 0) + 1;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(counts));
  },

  // 現在の並び順を計算（アクセス数ベース）
  calculateSortOrder() {
    const counts = this.getAccessCounts();
    const toolIds = ['review-insight', 'store-doctor', 'steamlytic'];

    // アクセス数でソート（多い順）
    return toolIds.sort((a, b) => {
      const aCount = counts[a] || 0;
      const bCount = counts[b] || 0;
      return bCount - aCount;
    });
  },

  // ツールカードを人気順に並べ替え（24時間キャッシュ）
  sortToolCards() {
    const grid = document.querySelector('.tools-grid');
    if (!grid) return;

    // キャッシュを確認
    const cache = this.getSortCache();
    let sortOrder;

    if (cache && (Date.now() - cache.timestamp) < this.UPDATE_INTERVAL) {
      // 24時間以内ならキャッシュを使用
      sortOrder = cache.order;
    } else {
      // 24時間経過または初回なら新しい順序を計算してキャッシュ
      sortOrder = this.calculateSortOrder();
      this.saveSortCache(sortOrder);
    }

    // アクティブなツールカード（Coming Soon以外）を取得
    const activeCards = Array.from(grid.querySelectorAll('.tool-card:not(.coming-soon)'));
    const comingSoonCards = Array.from(grid.querySelectorAll('.tool-card.coming-soon'));

    // キャッシュされた順序でソート
    activeCards.sort((a, b) => {
      const aId = a.getAttribute('data-tool') || '';
      const bId = b.getAttribute('data-tool') || '';
      const aIndex = sortOrder.indexOf(aId);
      const bIndex = sortOrder.indexOf(bId);
      // 見つからない場合は最後に
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    // グリッドをクリアして再配置
    grid.innerHTML = '';
    activeCards.forEach(card => grid.appendChild(card));
    comingSoonCards.forEach(card => grid.appendChild(card));
  }
};

// 言語管理
const Lang = {
  // 現在の言語を取得
  get current() {
    return AppState.language;
  },

  // UI翻訳データ
  ui: {
    ja: {
      betaBadge: '(β版)',
      heroTitle: 'Steam開発者のための<br>サポートツール',
      heroDescription: 'レビュー分析、市場調査、ユーザーフィードバックの可視化。<br>あなたのゲーム開発をデータで支援します。',
      toolReviewInsight: 'Steamレビュー分析',
      toolReviewInsightDesc: 'レビューを要約・AIが分析します。<br>ポジ/ネガを可視化し、改善点を発見。',
      toolStoreDoctor: 'ストアページ診断',
      toolStoreDoctorDesc: 'ストアページの見やすさ等をスコア化します。<br>改善点の洗い出しや調整の指針として使えます。',
      toolBlueOcean: 'ブルーオーシャン調査',
      toolBlueOceanDesc: 'ニッチ市場調査<br>未開拓のジャンル・タグの組み合わせを発見',
      toolLaunchCommander: 'グローバルリリース戦略',
      toolLaunchCommanderDesc: 'リリース戦略支援<br>地域別の最適リリースタイミングを分析',
      toolVisualTrend: 'ビジュアルトレンド調査',
      toolVisualTrendDesc: 'トレンド調査<br>売れているゲームのビジュアル傾向を分析',
      toolSteamlytic: 'Steamゲーム分析',
      toolSteamlyticDesc: 'Steamゲームの基本的な情報を取得。<br>複数のゲームを比較することが出来ます。',
      tagGameInfo: 'ゲーム情報',
      tagCompetitor: '競合比較',
      tagChart: 'チャート',
      tagAI: 'AI分析',
      tagWordcloud: 'ワードクラウド',
      tagTranslate: '日本語翻訳',
      tagDiagnosis: '自動診断',
      tagScore: 'スコア算出',
      tagOptimize: '最適化提案',
      tagMarket: '市場調査',
      tagNiche: 'ニッチ発見',
      tagTrend: 'トレンド分析',
      tagGlobal: 'グローバル',
      tagTiming: 'タイミング',
      tagStrategy: '戦略提案',
      tagVisual: 'ビジュアル',
      tagScreenshot: 'スクショ分析',
      tagColor: 'カラー傾向'
    },
    en: {
      betaBadge: '(Beta)',
      heroTitle: 'Development Tools for<br>Steam Developers',
      heroDescription: 'Review analysis, market research, user feedback visualization.<br>Supporting your game development with data.',
      toolReviewInsight: 'Steam Review Analysis',
      toolReviewInsightDesc: 'Summarize and analyze reviews with AI.<br>Visualize positive/negative feedback and discover improvements.',
      toolStoreDoctor: 'Store Page Diagnosis',
      toolStoreDoctorDesc: 'Score your store page visibility and more.<br>Use it to identify improvements and guide your adjustments.',
      toolBlueOcean: 'Blue Ocean Scout',
      toolBlueOceanDesc: 'Niche Market Research<br>Discover Untapped Genre & Tag Combinations',
      toolLaunchCommander: 'Global Launch Commander',
      toolLaunchCommanderDesc: 'Release Strategy Support<br>Analyze Optimal Release Timing by Region',
      toolVisualTrend: 'Visual Trend Hunter',
      toolVisualTrendDesc: 'Trend Research<br>Analyze Visual Trends of Best-Selling Games',
      toolSteamlytic: 'Steam Game Analysis',
      toolSteamlyticDesc: 'Get basic information about Steam games.<br>Compare multiple games side by side.',
      tagGameInfo: 'Game Info',
      tagCompetitor: 'Competitor',
      tagChart: 'Charts',
      tagAI: 'AI Analysis',
      tagWordcloud: 'Word Cloud',
      tagTranslate: 'Translation',
      tagDiagnosis: 'Auto Diagnosis',
      tagScore: 'Score Calc',
      tagOptimize: 'Optimization',
      tagMarket: 'Market Research',
      tagNiche: 'Niche Discovery',
      tagTrend: 'Trend Analysis',
      tagGlobal: 'Global',
      tagTiming: 'Timing',
      tagStrategy: 'Strategy',
      tagVisual: 'Visual',
      tagScreenshot: 'Screenshot',
      tagColor: 'Color Trend'
    }
  },

  // UIテキストを取得
  get(key) {
    return this.ui[this.current]?.[key] || this.ui['ja'][key] || key;
  },

  // ホームページのUIを更新
  updateHomeUI() {
    // ヒーローセクション
    const heroTitle = document.querySelector('.hero-title');
    const heroDesc = document.querySelector('.hero-description');
    if (heroTitle) heroTitle.innerHTML = this.get('heroTitle');
    if (heroDesc) heroDesc.innerHTML = this.get('heroDescription');

    // ツールカード
    const toolCards = [
      { id: 'btn-review-insight', nameKey: 'toolReviewInsight', descKey: 'toolReviewInsightDesc', tags: ['tagAI', 'tagWordcloud', 'tagTranslate'] },
      { id: 'btn-store-doctor', nameKey: 'toolStoreDoctor', descKey: 'toolStoreDoctorDesc', tags: ['tagDiagnosis', 'tagScore', 'tagOptimize'] },
      { id: 'btn-blue-ocean', nameKey: 'toolBlueOcean', descKey: 'toolBlueOceanDesc', tags: ['tagMarket', 'tagNiche', 'tagTrend'] },
      { id: 'btn-launch-commander', nameKey: 'toolLaunchCommander', descKey: 'toolLaunchCommanderDesc', tags: ['tagGlobal', 'tagTiming', 'tagStrategy'] },
      { id: 'btn-visual-trend', nameKey: 'toolVisualTrend', descKey: 'toolVisualTrendDesc', tags: ['tagVisual', 'tagScreenshot', 'tagColor'] },
      { id: 'btn-steamlytic', nameKey: 'toolSteamlytic', descKey: 'toolSteamlyticDesc', tags: ['tagGameInfo', 'tagCompetitor', 'tagChart'] }
    ];

    toolCards.forEach(card => {
      const el = document.getElementById(card.id);
      if (el) {
        const nameEl = el.querySelector('.tool-name');
        const descEl = el.querySelector('.tool-description');
        const tagsEl = el.querySelector('.tool-tags');
        if (nameEl) nameEl.textContent = this.get(card.nameKey);
        if (descEl) descEl.innerHTML = this.get(card.descKey);
        if (tagsEl) {
          tagsEl.innerHTML = card.tags.map(t => `<span class="tag">${this.get(t)}</span>`).join('');
        }
      }
    });
  },

  // 言語を設定
  set(lang) {
    AppState.language = lang;
    localStorage.setItem('compath_lang', lang);
    // 言語ボタンのアクティブ状態を更新
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    // ホームページのUIを更新
    this.updateHomeUI();
    // Steamlytic iframeに言語変更を通知（iframeをリロードせずに言語だけ変更）
    const steamlyticFrame = document.getElementById('steamlytic-iframe');
    if (steamlyticFrame && steamlyticFrame.contentWindow) {
      steamlyticFrame.contentWindow.postMessage({ type: 'setLanguage', lang }, '*');
    }
    // Steamlyticの外側ヘッダーも更新
    if (AppState.currentPage === 'steamlytic') {
      Steamlytic.updateHeader();
    }
  },

  // 初期化（localStorageから読み込み）
  init() {
    const saved = localStorage.getItem('compath_lang');
    if (saved && (saved === 'ja' || saved === 'en')) {
      this.set(saved);
    } else {
      // デフォルトでもUIを更新
      this.updateHomeUI();
    }
  },

  // タグ翻訳データ
  tags: {
    // メインジャンル
    mainGenres: {
      'Action': 'アクション',
      'Adventure': 'アドベンチャー',
      'RPG': 'RPG',
      'Strategy': 'ストラテジー',
      'Simulation': 'シミュレーション',
      'Sports': 'スポーツ',
      'Racing': 'レース',
      'Puzzle': 'パズル',
      'Casual': 'カジュアル',
      'Horror': 'ホラー',
      'Platformer': 'プラットフォーマー',
      'Shooter': 'シューター',
      'Fighting': '格闘',
      'Visual Novel': 'ビジュアルノベル',
      'Roguelike': 'ローグライク'
    },
    // サブジャンル
    subGenres: {
      'Metroidvania': 'メトロイドヴァニア',
      'Souls-like': 'ソウルライク',
      'Roguelite': 'ローグライト',
      'Turn-Based': 'ターン制',
      'Real-Time': 'リアルタイム',
      'Open World': 'オープンワールド',
      'Linear': 'リニア',
      'Sandbox': 'サンドボックス',
      'Tower Defense': 'タワーディフェンス',
      'Card Game': 'カードゲーム',
      'Survival': 'サバイバル',
      'Crafting': 'クラフト',
      'Base Building': '拠点建設',
      'City Builder': '街づくり',
      'Management': '経営',
      'Dating Sim': '恋愛シミュ',
      'Dungeon Crawler': 'ダンジョン探索',
      'Hack and Slash': 'ハクスラ',
      'Bullet Hell': '弾幕',
      'Rhythm': 'リズム'
    },
    // テーマ
    themes: {
      'Fantasy': 'ファンタジー',
      'Sci-Fi': 'SF',
      'Horror': 'ホラー',
      'Post-Apocalyptic': '終末世界',
      'Cyberpunk': 'サイバーパンク',
      'Medieval': '中世',
      'Modern': '現代',
      'Historical': '歴史',
      'Anime': 'アニメ調',
      'Pixel Art': 'ピクセルアート',
      'Cute': 'かわいい',
      'Dark': 'ダーク',
      'Comedy': 'コメディ',
      'Mystery': 'ミステリー',
      'Military': 'ミリタリー',
      'Space': '宇宙',
      'Underwater': '海中',
      'Western': '西部劇',
      'Steampunk': 'スチームパンク',
      'Mythology': '神話'
    }
  },

  // タグを現在の言語で取得
  getTag(category, key) {
    if (this.current === 'en') {
      return key; // 英語はそのまま
    }
    return this.tags[category]?.[key] || key;
  },

  // カテゴリ全体を取得
  getTags(category) {
    const keys = Object.keys(this.tags[category] || {});
    if (this.current === 'en') {
      return keys;
    }
    return keys.map(key => ({
      value: key,
      label: this.tags[category][key]
    }));
  }
};

// API呼び出しユーティリティ
const API = {
  async fetchReviews(url, options = {}) {
    const response = await fetch('/api/reviews/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, ...options })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'レビューの取得に失敗しました');
    }

    return response.json();
  },

  async analyzeKeywords(reviews, mentalGuardMode = false) {
    const response = await fetch('/api/analyze/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviews, mentalGuardMode, lang: Lang.current })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'キーワード抽出に失敗しました');
    }

    return response.json();
  },

  async analyzeSummary(reviews, mentalGuardMode = false, appId = null) {
    const response = await fetch('/api/analyze/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviews, mentalGuardMode, appId, lang: Lang.current })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'AI分析に失敗しました');
    }

    return response.json();
  },

  async checkStatus() {
    const response = await fetch('/api/status');
    return response.json();
  },

  async analyzeKeywordsDeep(reviews, mentalGuardMode = false, appId = null) {
    const response = await fetch('/api/analyze/keywords-deep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviews, mentalGuardMode, appId, lang: Lang.current })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'キーワード深掘り分析に失敗しました');
    }

    return response.json();
  },

  async analyzeCommunity(appId) {
    try {
      const response = await fetch('/api/analyze/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, lang: Lang.current })
      });

      if (!response.ok) {
        // コミュニティ分析は失敗しても続行
        return { success: false, topics: [] };
      }

      return response.json();
    } catch (error) {
      console.warn('コミュニティ分析エラー:', error);
      return { success: false, topics: [] };
    }
  }
};

// UI ユーティリティ
const UI = {
  showLoading(message = '分析中...') {
    AppState.isLoading = true;
    let overlay = document.querySelector('.loading-overlay');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">${message}</div>
      `;
      document.body.appendChild(overlay);
    } else {
      overlay.querySelector('.loading-text').textContent = message;
      overlay.style.display = 'flex';
    }
  },

  hideLoading() {
    AppState.isLoading = false;
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  },

  showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 4000);
  },

  formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  formatPlaytime(hours) {
    if (hours < 1) return `${Math.round(hours * 60)}分`;
    return `${hours}時間`;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  truncateText(text, maxLength = 200) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  },

  // 言語切り替えボタンのHTMLを生成
  getLanguageSwitcher() {
    const isJa = Lang.current === 'ja';
    return `
      <div class="language-switcher">
        <button class="lang-btn ${isJa ? 'active' : ''}" data-lang="ja">日本語</button>
        <button class="lang-btn ${!isJa ? 'active' : ''}" data-lang="en">EN</button>
      </div>
    `;
  },

  // 言語切り替えボタンのイベントを設定
  bindLanguageSwitcher() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        Lang.set(lang);
        // 現在のページを再描画
        // 注: Steamlyticの場合はLang.set()内でupdateHeader()を呼んでいるため、
        //     ここでinit()を呼ぶとiframeがリロードされてユーザーの状態が失われる
        if (AppState.currentPage === 'review-insight') {
          ReviewInsight.init();
        } else if (AppState.currentPage === 'store-doctor') {
          StoreDoctor.init();
        } else if (AppState.currentPage === 'blue-ocean') {
          BlueOcean.init();
        } else if (AppState.currentPage === 'launch-commander') {
          LaunchCommander.init();
        } else if (AppState.currentPage === 'visual-trend') {
          VisualTrend.init();
        }
        // steamlyticはLang.set()内でupdateHeader()とpostMessageで処理済み
      });
    });
  }
};

// Review Insight ツール
const ReviewInsight = {
  init() {
    this.renderPage();
    this.bindEvents();
  },

  renderPage() {
    const isJa = Lang.current === 'ja';
    const page = document.getElementById('review-insight-page');
    page.innerHTML = `
      <header class="tool-header">
        <div class="tool-header-left">
          <button class="back-button" id="review-insight-back-btn" title="${isJa ? '戻る' : 'Back'}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="tool-title">${Lang.get('toolReviewInsight')}</h1>
        </div>
        ${UI.getLanguageSwitcher()}
      </header>

      ${AdManager.getToolHeaderAd()}

      <div id="search-view">
        <section class="search-section">
          <h2 class="search-title">${isJa ? 'Steam レビュー分析' : 'Steam Review Analysis'}</h2>
          <p class="search-subtitle">${isJa ? 'SteamストアのURLを入力して、レビューを分析します' : 'Enter a Steam store URL to analyze reviews'}</p>

          <form class="search-form" id="search-form">
            <input
              type="text"
              class="input-field"
              id="steam-url"
              placeholder="https://store.steampowered.com/app/12345/..."
              autocomplete="off"
            >
            <button type="submit" class="btn btn-primary" id="analyze-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              ${isJa ? '分析' : 'Analyze'}
            </button>
          </form>

          <p class="search-hint">${isJa ? '例' : 'Example'}: https://store.steampowered.com/app/1245620/ELDEN_RING/</p>

          <div class="filter-section">
            <div class="filter-group">
              <label class="filter-label">${isJa ? '言語' : 'Language'}:</label>
              <select class="filter-select" id="filter-language">
                <option value="all">${isJa ? '全言語' : 'All Languages'}</option>
                <option value="japanese">${isJa ? '日本語' : 'Japanese'}</option>
                <option value="english">${isJa ? '英語' : 'English'}</option>
                <option value="schinese">${isJa ? '簡体字中国語' : 'Simplified Chinese'}</option>
                <option value="tchinese">${isJa ? '繁体字中国語' : 'Traditional Chinese'}</option>
                <option value="korean">${isJa ? '韓国語' : 'Korean'}</option>
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label">${isJa ? 'プレイ時間' : 'Playtime'}:</label>
              <select class="filter-select" id="filter-playtime">
                <option value="all">${isJa ? '全て' : 'All'}</option>
                <option value="5hours">${isJa ? '5時間以上' : '5+ hours'}</option>
                <option value="10hours">${isJa ? '10時間以上' : '10+ hours'}</option>
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label">${isJa ? '期間' : 'Period'}:</label>
              <select class="filter-select" id="filter-date">
                <option value="all">${isJa ? '全期間' : 'All Time'}</option>
                <option value="30days">${isJa ? '直近30日' : 'Last 30 days'}</option>
                <option value="90days">${isJa ? '直近90日' : 'Last 90 days'}</option>
                <option value="180days">${isJa ? '直近180日' : 'Last 180 days'}</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      <div id="results-view" class="hidden">
        <!-- 結果ページ上部の検索バー -->
        <div class="results-search-bar">
          <form class="results-search-form" id="results-search-form">
            <input
              type="text"
              class="input-field"
              id="results-steam-url"
              placeholder="https://store.steampowered.com/app/12345/..."
              autocomplete="off"
            >
            <button type="submit" class="btn btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              ${isJa ? '分析' : 'Analyze'}
            </button>
          </form>
          <div class="results-filter-section">
            <div class="filter-group">
              <label class="filter-label">${isJa ? '言語' : 'Language'}:</label>
              <select class="filter-select" id="results-filter-language">
                <option value="all">${isJa ? '全言語' : 'All Languages'}</option>
                <option value="japanese">${isJa ? '日本語' : 'Japanese'}</option>
                <option value="english">${isJa ? '英語' : 'English'}</option>
                <option value="schinese">${isJa ? '簡体字中国語' : 'Simplified Chinese'}</option>
                <option value="tchinese">${isJa ? '繁体字中国語' : 'Traditional Chinese'}</option>
                <option value="korean">${isJa ? '韓国語' : 'Korean'}</option>
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label">${isJa ? 'プレイ時間' : 'Playtime'}:</label>
              <select class="filter-select" id="results-filter-playtime">
                <option value="all">${isJa ? '全て' : 'All'}</option>
                <option value="5hours">${isJa ? '5時間以上' : '5+ hours'}</option>
                <option value="10hours">${isJa ? '10時間以上' : '10+ hours'}</option>
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label">${isJa ? '期間' : 'Period'}:</label>
              <select class="filter-select" id="results-filter-date">
                <option value="all">${isJa ? '全期間' : 'All Time'}</option>
                <option value="30days">${isJa ? '直近30日' : 'Last 30 days'}</option>
                <option value="90days">${isJa ? '直近90日' : 'Last 90 days'}</option>
                <option value="180days">${isJa ? '直近180日' : 'Last 180 days'}</option>
              </select>
            </div>
          </div>
        </div>

        <section class="results-section">
          <div class="results-header">
            <button class="csv-export-btn ${UserPlan.canUse('exportCSV') ? '' : 'pro-only'}" onclick="ReviewInsight.exportCSV()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              ${isJa ? 'CSV出力' : 'Export CSV'}
            </button>
          </div>
          <div id="game-info"></div>
          <div id="language-stats-section"></div>
          <div id="wordcloud-section"></div>
          <div id="summary-section"></div>
          <div id="community-section"></div>
          <div id="overall-rating-section"></div>
          <div id="game-cloud-section"></div>
        </section>
      </div>

      ${AdManager.getToolFooterAd()}
    `;
  },

  bindEvents() {
    // 検索フォーム（トップ）
    document.getElementById('search-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.analyze();
    });
    // 検索フォーム（結果ページ上部）
    document.getElementById('results-search-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.analyzeFromResults();
    });
    // 言語切り替え
    UI.bindLanguageSwitcher();

    // 戻るボタン（ビューによって動作を変更）
    document.getElementById('review-insight-back-btn').addEventListener('click', () => {
      const resultsView = document.getElementById('results-view');
      if (!resultsView.classList.contains('hidden')) {
        // 結果画面 → 検索画面に戻る
        this.backToTop();
      } else {
        // 検索画面 → ホームに戻る
        navigateTo('home');
      }
    });
  },

  backToTop() {
    // 結果画面を非表示にしてツールTOPに戻る
    document.getElementById('results-view').classList.add('hidden');
    document.getElementById('search-view').classList.remove('hidden');
  },

  async analyzeFromResults() {
    const url = document.getElementById('results-steam-url').value.trim();
    if (!url) {
      UI.showToast('URLを入力してください', 'error');
      return;
    }
    // 入力値をメインの検索欄にも反映
    document.getElementById('steam-url').value = url;
    // フィルター値も反映
    document.getElementById('filter-language').value = document.getElementById('results-filter-language').value;
    document.getElementById('filter-playtime').value = document.getElementById('results-filter-playtime').value;
    document.getElementById('filter-date').value = document.getElementById('results-filter-date').value;
    await this.analyze();
  },

  async analyze() {
    const url = document.getElementById('steam-url').value.trim();
    if (!url) {
      UI.showToast('URLを入力してください', 'error');
      return;
    }

    const filters = {
      language: document.getElementById('filter-language').value,
      playtimeFilter: document.getElementById('filter-playtime').value,
      dateFilter: document.getElementById('filter-date').value
    };

    // 結果画面のフィルターにも反映
    if (document.getElementById('results-filter-language')) {
      document.getElementById('results-filter-language').value = filters.language;
      document.getElementById('results-filter-playtime').value = filters.playtimeFilter;
      document.getElementById('results-filter-date').value = filters.dateFilter;
    }

    try {
      const isJa = Lang.current === 'ja';
      UI.showLoading(isJa ? 'レビューを取得中...' : 'Fetching reviews...');

      // レビュー取得
      const reviewData = await API.fetchReviews(url, filters);
      AppState.currentGameData = reviewData.gameInfo;
      AppState.currentReviews = reviewData.reviews;

      // 結果ビューを表示
      document.getElementById('search-view').classList.add('hidden');
      document.getElementById('results-view').classList.remove('hidden');

      // ゲーム情報を表示
      this.renderGameInfo(reviewData.gameInfo, reviewData.reviews.stats);

      // 言語別統計を表示
      this.renderLanguageStats(reviewData.reviews.stats);

      // AI分析を並行実行（キーワード分析を深掘り版に変更）
      UI.showLoading(isJa ? 'AIで分析中...' : 'Analyzing with AI...');

      // キーワード深掘り分析（失敗時は従来版にフォールバック）
      // appIdを渡してキャッシュを有効化
      const appId = reviewData.appId;
      let keywordsResult;
      try {
        keywordsResult = await API.analyzeKeywordsDeep(reviewData.reviews.reviews, false, appId);
        console.log('Deep keywords result:', keywordsResult, keywordsResult.cached ? '(cached)' : '(fresh)');
      } catch (e) {
        console.warn('深掘り分析失敗、従来版にフォールバック:', e);
        keywordsResult = await API.analyzeKeywords(reviewData.reviews.reviews, false);
      }

      // キーワードデータが空の場合、従来版で再取得
      const keywords = keywordsResult.keywords || keywordsResult;
      if ((!keywords.positive || keywords.positive.length === 0) &&
          (!keywords.negative || keywords.negative.length === 0)) {
        console.warn('キーワードが空、従来版で再取得');
        try {
          const fallbackResult = await API.analyzeKeywords(reviewData.reviews.reviews, false);
          keywordsResult = fallbackResult;
          console.log('Fallback keywords result:', fallbackResult);
        } catch (e) {
          console.error('フォールバックも失敗:', e);
        }
      }

      const [summaryResult, communityResult] = await Promise.all([
        API.analyzeSummary(reviewData.reviews.reviews, false, appId),
        API.analyzeCommunity(appId)
      ]);
      console.log('Summary result:', summaryResult.cached ? '(cached)' : '(fresh)');
      console.log('Community result:', communityResult.cached ? '(cached)' : '(fresh)');

      const finalKeywords = keywordsResult.keywords || keywordsResult;
      AppState.currentKeywords = finalKeywords;
      AppState.currentSummary = summaryResult.summary;

      // 結果を描画
      console.log('Rendering word cloud with:', finalKeywords);
      this.renderWordCloud(finalKeywords);
      // キーワード分析表を描画（positiveTopicsまたはnegativeTopicsがあれば）
      this.renderKeywordAnalysis(finalKeywords);
      this.renderSummary(summaryResult.summary);
      this.renderCommunityAnalysis(communityResult);
      this.renderOverallRating(summaryResult.summary, reviewData.reviews.stats, finalKeywords);

      UI.hideLoading();

      // ゲームクラウドを非同期で取得（バックグラウンド）
      this.fetchGameCloud(reviewData.reviews.reviews, reviewData.appId);

    } catch (error) {
      console.error('分析エラー:', error);
      UI.hideLoading();
      UI.showToast(error.message, 'error');
    }
  },


  renderGameInfo(gameInfo, stats) {
    const container = document.getElementById('game-info');
    const isJa = Lang.current === 'ja';

    // ジャンル名の日本語→英語マッピング
    const genreNamesEn = {
      'アクション': 'Action',
      'アドベンチャー': 'Adventure',
      'カジュアル': 'Casual',
      'インディー': 'Indie',
      'レース': 'Racing',
      'RPG': 'RPG',
      'シミュレーション': 'Simulation',
      'スポーツ': 'Sports',
      'ストラテジー': 'Strategy',
      '早期アクセス': 'Early Access',
      '無料プレイ': 'Free to Play',
      'MMO': 'MMO',
      'デザイン＆イラスト': 'Design & Illustration',
      'アニメーション＆モデリング': 'Animation & Modeling',
      'ユーティリティ': 'Utilities',
      'ビデオ制作': 'Video Production',
      'オーディオ制作': 'Audio Production',
      'ソフトウェアトレーニング': 'Software Training',
      '写真編集': 'Photo Editing',
      'ゲーム開発': 'Game Development',
      'ウェブパブリッシング': 'Web Publishing',
      '教育': 'Education',
      'ドキュメンタリー': 'Documentary',
      'チュートリアル': 'Tutorial',
      'ショートムービー': 'Short',
      '長編映画': 'Feature Film',
      'プロジェクト管理': 'Project Management'
    };

    const translateGenres = (genres) => {
      if (isJa || !genres) return genres;
      return genres.map(g => genreNamesEn[g] || g);
    };

    const translatedGenres = translateGenres(gameInfo.genres);

    container.innerHTML = `
      <div class="game-info-header">
        <img src="${gameInfo.headerImage}" alt="${UI.escapeHtml(gameInfo.name)}" class="game-image">
        <div class="game-details">
          <h2 class="game-name">${UI.escapeHtml(gameInfo.name)}</h2>
          <div class="game-meta">
            <span class="game-meta-item">📅 ${gameInfo.releaseDate || (isJa ? '発売日不明' : 'Release date unknown')}</span>
            <span class="game-meta-item">🏢 ${gameInfo.developers?.join(', ') || (isJa ? '開発元不明' : 'Developer unknown')}</span>
            ${translatedGenres ? `<span class="game-meta-item">🎮 ${translatedGenres.slice(0, 3).join(', ')}</span>` : ''}
          </div>
          <div class="game-stats">
            <div class="stat-item">
              <span class="stat-value positive">${stats.positiveRate}%</span>
              <span class="stat-label">${isJa ? 'ポジティブ' : 'Positive'}</span>
            </div>
            <div class="stat-item">
              <span class="stat-value negative">${100 - stats.positiveRate}%</span>
              <span class="stat-label">${isJa ? 'ネガティブ' : 'Negative'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderWordCloud(keywords) {
    const container = document.getElementById('wordcloud-section');
    const isJa = Lang.current === 'ja';

    // カラーパレット（グラデーション風）
    const positiveColors = [
      '#2ecc71', '#27ae60', '#1abc9c', '#16a085', '#3498db',
      '#2980b9', '#9b59b6', '#8e44ad', '#00b894', '#00cec9'
    ];
    const negativeColors = [
      '#e74c3c', '#c0392b', '#e67e22', '#d35400', '#f39c12',
      '#e17055', '#d63031', '#fd79a8', '#e84393', '#ff6b6b'
    ];

    const renderWords = (words, type, colors) => {
      if (!words || words.length === 0) {
        return `<p class="no-data">${isJa ? 'データがありません' : 'No data available'}</p>`;
      }

      // countでソート（多い順）
      const sortedWords = [...words].sort((a, b) => (b.count || b.score) - (a.count || a.score));
      const maxCount = sortedWords[0]?.count || sortedWords[0]?.score || 100;

      return sortedWords.map((word, index) => {
        // カウントに基づくサイズ計算
        const count = word.count || word.score || 50;
        const ratio = count / maxCount;
        const fontSize = this.getWordFontSize(ratio);
        // 色をインデックスで選択
        const color = colors[index % colors.length];

        return `
          <span class="cloud-word ${type}"
                style="font-size: ${fontSize}px; color: ${color};"
                data-word="${UI.escapeHtml(word.word)}"
                title="${word.count ? word.count + (isJa ? '件の言及' : ' mentions') : ''}">
            ${UI.escapeHtml(word.word)}
          </span>
        `;
      }).join('');
    };

    container.innerHTML = `
      <div class="wordcloud-section">
        <div class="wordcloud-card positive">
          <h3 class="wordcloud-title positive">
            <span class="icon">👍</span>
            ${isJa ? 'ポジティブ・ワードクラウド' : 'Positive Word Cloud'}
          </h3>
          <div class="cloud-container positive-cloud">
            ${renderWords(keywords.positive, 'positive', positiveColors)}
          </div>
        </div>
        <div class="wordcloud-card negative">
          <h3 class="wordcloud-title negative">
            <span class="icon">👎</span>
            ${isJa ? 'ネガティブ・ワードクラウド' : 'Negative Word Cloud'}
          </h3>
          <div class="cloud-container negative-cloud">
            ${renderWords(keywords.negative, 'negative', negativeColors)}
          </div>
        </div>
      </div>
    `;
  },

  getWordFontSize(ratio) {
    // 比率に応じたフォントサイズ（14px〜56px）
    const minSize = 14;
    const maxSize = 56;
    return Math.round(minSize + ratio * (maxSize - minSize));
  },

  // 誹謗中傷ワードフィルター（開発者保護用）
  filterOffensiveWords(text) {
    if (!text) return text;

    // NGワードリスト（日本語・英語）
    const ngWords = [
      // 日本語 - 罵倒・侮辱
      'クソ', 'くそ', 'ゴミ', 'ごみ', 'カス', 'かす', 'アホ', 'あほ', 'バカ', 'ばか', '馬鹿',
      '死ね', 'しね', '氏ね', '消えろ', '失せろ', 'キチガイ', 'きちがい', '基地外', '池沼',
      '障害者', 'ガイジ', 'がいじ', 'クズ', 'くず', '屑', 'ksks', 'ksg',
      // 日本語 - 詐欺・金銭関連の罵倒
      '詐欺', 'サギ', '金返せ', '返金しろ', '泥棒', 'ドロボウ', 'ぼったくり', 'ボッタクリ',
      // 日本語 - その他攻撃的表現
      '無能', 'むのう', '低脳', 'ふざけんな', 'ふざけるな', 'やる気ない',
      '手抜き', 'やめちまえ', '辞めろ', 'センスない', 'センス無い', 'ゲロ', 'うんこ', 'うんち',
      // 英語 - 罵倒・侮辱
      'fuck', 'fucking', 'fucked', 'shit', 'shitty', 'bullshit', 'crap', 'crappy',
      'damn', 'damned', 'ass', 'asshole', 'bastard', 'bitch', 'dick', 'dickhead',
      'idiot', 'idiotic', 'stupid', 'moron', 'moronic', 'retard', 'retarded',
      'dumb', 'dumbass', 'loser', 'pathetic', 'worthless', 'useless',
      // 英語 - 詐欺・金銭関連
      'scam', 'scammer', 'fraud', 'rip-off', 'ripoff', 'steal', 'stealing', 'thief',
      'robbery', 'robbed',
      // 英語 - その他攻撃的
      'trash', 'garbage', 'awful', 'terrible', 'worst', 'disgusting',
      'lazy', 'incompetent', 'braindead', 'brain-dead'
    ];

    let filtered = text;
    for (const word of ngWords) {
      // 大文字小文字を区別しない置換
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '***');
    }
    return filtered;
  },

  renderSummary(summary) {
    const container = document.getElementById('summary-section');

    const renderPoints = (points) => {
      if (!points || points.length === 0) {
        return '<li><span class="summary-point">分析データがありません</span></li>';
      }

      return points.map(item => {
        // 引用部分のみNGワードフィルターを適用（要点はそのまま）
        const filteredQuote = item.quote ? this.filterOffensiveWords(item.quote) : '';
        return `
          <li>
            <p class="summary-point">${UI.escapeHtml(item.point)}</p>
            ${filteredQuote ? `<p class="summary-quote">"${UI.escapeHtml(filteredQuote)}"</p>` : ''}
          </li>
        `;
      }).join('');
    };

    container.innerHTML = `
      <div class="summary-section">
        <h3 class="summary-title">
          <span class="icon">🤖</span>
          AI分析サマリー
        </h3>
        <div class="summary-grid">
          <div class="summary-column positive">
            <h4>
              <span>👍</span>
              良い点
            </h4>
            <ul class="summary-list">
              ${renderPoints(summary.goodPoints, 'positive')}
            </ul>
          </div>
          <div class="summary-column negative">
            <h4>
              <span>👎</span>
              悪い点
            </h4>
            <ul class="summary-list">
              ${renderPoints(summary.badPoints, 'negative')}
            </ul>
          </div>
        </div>
      </div>
    `;
  },

  async fetchGameCloud(reviews, appId) {
    const isJa = Lang.current === 'ja';
    const container = document.getElementById('game-cloud-section');

    // ローディング表示
    container.innerHTML = `
      <div class="game-cloud-section">
        <h3 class="game-cloud-title">
          <span class="icon">🎮</span>
          ${isJa ? 'レビュアーが遊んでいる他のゲーム' : 'Other Games Reviewers Play'}
        </h3>
        <div class="game-cloud-loading">
          <div class="spinner-small"></div>
          <span>${isJa ? 'ユーザーデータを取得中...' : 'Fetching user data...'}</span>
        </div>
      </div>
    `;

    try {
      // steamIdを抽出
      const steamIds = reviews.map(r => r.steamId).filter(id => id);
      if (steamIds.length === 0) {
        container.innerHTML = '';
        return;
      }

      const response = await fetch('/api/reviews/user-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steamIds, appId })
      });

      const data = await response.json();
      if (data.success && data.games && data.games.length > 0) {
        this.renderGameCloud(data);
      } else {
        container.innerHTML = `
          <div class="game-cloud-section">
            <h3 class="game-cloud-title">
              <span class="icon">🎮</span>
              ${isJa ? 'レビュアーが遊んでいる他のゲーム' : 'Other Games Reviewers Play'}
            </h3>
            <p class="game-cloud-empty">${isJa ? '公開プロフィールのユーザーが見つかりませんでした' : 'No users with public profiles found'}</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('ゲームクラウド取得エラー:', error);
      container.innerHTML = '';
    }
  },

  renderGameCloud(data) {
    const isJa = Lang.current === 'ja';
    const container = document.getElementById('game-cloud-section');
    const maxCount = data.games[0]?.count || 1;

    const gameItems = data.games.map(game => {
      // カウントに基づいてサイズを計算（60px〜180px）
      const ratio = game.count / maxCount;
      const size = Math.floor(60 + (ratio * 120));
      const headerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`;

      return `
        <a href="https://store.steampowered.com/app/${game.appId}/"
           target="_blank"
           class="game-cloud-item"
           style="width: ${size}px; height: ${Math.floor(size * 0.46)}px;"
           title="${UI.escapeHtml(game.name)} (${game.percentage}%)">
          <img src="${headerUrl}"
               alt="${UI.escapeHtml(game.name)}"
               loading="lazy">
        </a>
      `;
    }).join('');

    container.innerHTML = `
      <div class="game-cloud-section">
        <h3 class="game-cloud-title">
          <span class="icon">🎮</span>
          ${isJa ? 'レビュアーが遊んでいる他のゲーム' : 'Other Games Reviewers Play'}
        </h3>
        <p class="game-cloud-stats">
          ${isJa
            ? `${data.totalUsers}人中${data.publicUsers}人のプロフィールを取得 (${data.publicRate}%)`
            : `Retrieved ${data.publicUsers} of ${data.totalUsers} user profiles (${data.publicRate}%)`}
        </p>
        <div class="game-cloud-container">
          ${gameItems}
        </div>
      </div>
    `;
  },

  renderLanguageStats(stats) {
    const isJa = Lang.current === 'ja';
    const container = document.getElementById('language-stats-section');

    if (!stats.byLanguage || stats.byLanguage.length === 0) {
      container.innerHTML = '';
      return;
    }

    // 言語名の英語版マッピング
    const languageNamesEn = {
      'japanese': 'Japanese',
      'english': 'English',
      'schinese': 'Simplified Chinese',
      'tchinese': 'Traditional Chinese',
      'korean': 'Korean',
      'german': 'German',
      'french': 'French',
      'spanish': 'Spanish',
      'latam': 'Spanish (Latin America)',
      'russian': 'Russian',
      'portuguese': 'Portuguese',
      'brazilian': 'Brazilian Portuguese',
      'italian': 'Italian',
      'polish': 'Polish',
      'thai': 'Thai',
      'vietnamese': 'Vietnamese',
      'turkish': 'Turkish',
      'arabic': 'Arabic',
      'dutch': 'Dutch',
      'czech': 'Czech',
      'hungarian': 'Hungarian',
      'indonesian': 'Indonesian',
      'ukrainian': 'Ukrainian'
    };

    const getLanguageName = (lang) => {
      if (isJa) {
        return lang.languageName; // サーバーから日本語名が来る
      }
      return languageNamesEn[lang.language] || lang.language;
    };

    const rows = stats.byLanguage.map(lang => `
      <tr>
        <td>${UI.escapeHtml(getLanguageName(lang))}</td>
        <td>${lang.total}</td>
        <td class="positive">${lang.positive}</td>
        <td class="negative">${lang.negative}</td>
        <td class="rate-cell">${lang.positiveRate}%</td>
        <td>
          <div class="rate-bar">
            <div class="rate-bar-positive" style="width: ${lang.positiveRate}%"></div>
            <div class="rate-bar-negative" style="width: ${100 - lang.positiveRate}%"></div>
          </div>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="language-stats-section">
        <h3 class="language-stats-title">
          <span class="icon">🌐</span>
          ${isJa ? '言語別評価統計' : 'Review Statistics by Language'}
        </h3>
        <table class="language-stats-table">
          <thead>
            <tr>
              <th>${isJa ? '言語' : 'Language'}</th>
              <th>${isJa ? '合計' : 'Total'}</th>
              <th>${isJa ? '高評価' : 'Positive'}</th>
              <th>${isJa ? '低評価' : 'Negative'}</th>
              <th>${isJa ? '好評率' : 'Rate'}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  },

  renderKeywordAnalysis(keywords) {
    const isJa = Lang.current === 'ja';
    const container = document.getElementById('summary-section');

    console.log('renderKeywordAnalysis called with:', keywords);
    console.log('positiveTopics:', keywords.positiveTopics);
    console.log('negativeTopics:', keywords.negativeTopics);
    console.log('positive:', keywords.positive);
    console.log('negative:', keywords.negative);

    // サーバー側でpositiveTopics/negativeTopicsが生成されているはず
    const positiveTopics = keywords.positiveTopics;
    const negativeTopics = keywords.negativeTopics;

    // キーワードデータがまったくない場合はスキップ
    if ((!positiveTopics || positiveTopics.length === 0) && (!negativeTopics || negativeTopics.length === 0)) {
      console.log('No keyword data available, skipping keyword analysis section');
      return;
    }

    const renderTopicRows = (topics) => {
      if (!topics || topics.length === 0) {
        return `<tr><td colspan="3">${isJa ? 'データがありません' : 'No data'}</td></tr>`;
      }
      return topics.map(topic => {
        // 概要が空の場合は「-」を表示
        const summary = topic.summary && topic.summary.trim() ? topic.summary : '-';
        return `
          <tr>
            <td class="keyword-name">${UI.escapeHtml(topic.keyword)}</td>
            <td class="keyword-count">${topic.count}</td>
            <td class="keyword-summary">${UI.escapeHtml(summary)}</td>
          </tr>
        `;
      }).join('');
    };

    // summary-sectionの前にキーワード分析セクションを挿入
    const keywordSection = document.createElement('div');
    keywordSection.id = 'keyword-analysis-section';
    keywordSection.innerHTML = `
      <div class="keyword-analysis-section">
        <h3 class="keyword-analysis-title">
          <span class="icon">🔍</span>
          ${isJa ? 'キーワード分析' : 'Keyword Analysis'}
        </h3>
        <div class="keyword-tabs">
          <button class="keyword-tab positive active" data-tab="positive">
            👍 ${isJa ? '高評価キーワード' : 'Positive Keywords'}
          </button>
          <button class="keyword-tab negative" data-tab="negative">
            👎 ${isJa ? '低評価キーワード' : 'Negative Keywords'}
          </button>
        </div>
        <div class="keyword-table-container active" id="keyword-positive">
          <table class="keyword-table">
            <thead>
              <tr>
                <th>${isJa ? 'キーワード' : 'Keyword'}</th>
                <th>${isJa ? '言及数' : 'Count'}</th>
                <th>${isJa ? '概要' : 'Summary'}</th>
              </tr>
            </thead>
            <tbody>
              ${renderTopicRows(positiveTopics)}
            </tbody>
          </table>
        </div>
        <div class="keyword-table-container" id="keyword-negative">
          <table class="keyword-table">
            <thead>
              <tr>
                <th>${isJa ? 'キーワード' : 'Keyword'}</th>
                <th>${isJa ? '言及数' : 'Count'}</th>
                <th>${isJa ? '概要' : 'Summary'}</th>
              </tr>
            </thead>
            <tbody>
              ${renderTopicRows(negativeTopics)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.parentNode.insertBefore(keywordSection, container);

    // タブ切り替えイベント
    keywordSection.querySelectorAll('.keyword-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        keywordSection.querySelectorAll('.keyword-tab').forEach(t => t.classList.remove('active'));
        keywordSection.querySelectorAll('.keyword-table-container').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`keyword-${tab.dataset.tab}`).classList.add('active');
      });
    });
  },

  renderCommunityAnalysis(communityData) {
    const isJa = Lang.current === 'ja';
    const container = document.getElementById('community-section');

    if (!communityData.success || !communityData.topics || communityData.topics.length === 0) {
      container.innerHTML = `
        <div class="community-section">
          <h3 class="community-title">
            <span class="icon">💬</span>
            ${isJa ? 'コミュニティスレッド分析' : 'Community Thread Analysis'}
          </h3>
          <p style="color: var(--text-muted); text-align: center; padding: 20px;">
            ${isJa ? 'コミュニティデータを取得できませんでした' : 'Could not retrieve community data'}
          </p>
        </div>
      `;
      return;
    }

    const rows = communityData.topics.map(topic => `
      <tr>
        <td class="topic-name">${UI.escapeHtml(topic.topic)}</td>
        <td class="topic-count">${topic.count}</td>
        <td class="topic-summary">${UI.escapeHtml(topic.summary)}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="community-section">
        <h3 class="community-title">
          <span class="icon">💬</span>
          ${isJa ? 'コミュニティスレッド分析' : 'Community Thread Analysis'}
        </h3>
        <table class="community-table">
          <thead>
            <tr>
              <th>${isJa ? 'トピック' : 'Topic'}</th>
              <th>${isJa ? '言及数' : 'Count'}</th>
              <th>${isJa ? '概要' : 'Summary'}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  },

  renderOverallRating(summary, stats, keywords) {
    const isJa = Lang.current === 'ja';
    const container = document.getElementById('overall-rating-section');

    // 評価ランクを決定
    let ratingLabel, ratingEmoji, ratingDesc;
    if (stats.positiveRate >= 95) {
      ratingLabel = isJa ? '圧倒的に好評' : 'Overwhelmingly Positive';
      ratingEmoji = '🏆';
      ratingDesc = isJa ? 'ほぼ全てのプレイヤーから高評価を受けている稀有な作品です。' : 'A rare gem loved by almost all players.';
    } else if (stats.positiveRate >= 80) {
      ratingLabel = isJa ? '非常に好評' : 'Very Positive';
      ratingEmoji = '🌟';
      ratingDesc = isJa ? '多くのプレイヤーに愛されており、購入を検討する価値があります。' : 'Loved by many players and worth considering.';
    } else if (stats.positiveRate >= 70) {
      ratingLabel = isJa ? 'ほぼ好評' : 'Mostly Positive';
      ratingEmoji = '👍';
      ratingDesc = isJa ? '全体的に好意的な評価ですが、一部改善の余地があります。' : 'Generally positive with some room for improvement.';
    } else if (stats.positiveRate >= 40) {
      ratingLabel = isJa ? '賛否両論' : 'Mixed';
      ratingEmoji = '🤔';
      ratingDesc = isJa ? '評価が分かれています。自分の好みに合うか確認することをおすすめします。' : 'Opinions are divided. Check if it matches your preferences.';
    } else if (stats.positiveRate >= 20) {
      ratingLabel = isJa ? 'やや不評' : 'Mostly Negative';
      ratingEmoji = '⚠️';
      ratingDesc = isJa ? '多くの不満点が報告されています。購入前に詳細を確認してください。' : 'Many issues reported. Review details before purchasing.';
    } else {
      ratingLabel = isJa ? '不評' : 'Negative';
      ratingEmoji = '❌';
      ratingDesc = isJa ? '重大な問題が多数報告されています。' : 'Significant issues have been reported.';
    }

    // 主要な良い点・悪い点を抽出（3件ずつ）
    const topGoodList = summary.goodPoints?.slice(0, 3) || [];
    const topBadList = summary.badPoints?.slice(0, 3) || [];

    // キーワードからトップ3を取得
    const topPositiveKeywords = keywords?.positive?.slice(0, 3).map(k => k.word) || [];
    const topNegativeKeywords = keywords?.negative?.slice(0, 3).map(k => k.word) || [];

    // 言語別で最も多い言語
    const topLanguage = stats.byLanguage?.[0];

    container.innerHTML = `
      <div class="overall-rating-section">
        <h3 class="overall-rating-title">
          <span class="icon">⭐</span>
          ${isJa ? '総合評価' : 'Overall Rating'}
        </h3>
        <div class="overall-rating-content">
          <div class="rating-main">
            <span class="rating-emoji">${ratingEmoji}</span>
            <span class="rating-highlight">${ratingLabel}</span>
            <span class="rating-percent">${stats.positiveRate}%</span>
          </div>
          <p class="rating-desc">${ratingDesc}</p>

          <div class="rating-stats-grid">
            <div class="rating-stat-item">
              <span class="stat-label">${isJa ? '分析レビュー数' : 'Reviews Analyzed'}</span>
              <span class="stat-value">${stats.total}${isJa ? '件' : ''}</span>
            </div>
            <div class="rating-stat-item">
              <span class="stat-label">${isJa ? '高評価' : 'Positive'}</span>
              <span class="stat-value positive">${stats.positive}${isJa ? '件' : ''}</span>
            </div>
            <div class="rating-stat-item">
              <span class="stat-label">${isJa ? '低評価' : 'Negative'}</span>
              <span class="stat-value negative">${stats.negative}${isJa ? '件' : ''}</span>
            </div>
            <div class="rating-stat-item">
              <span class="stat-label">${isJa ? '平均プレイ時間' : 'Avg. Playtime'}</span>
              <span class="stat-value">${stats.averagePlaytime}${isJa ? '時間' : 'h'}</span>
            </div>
          </div>

          ${topLanguage ? `
            <p class="rating-language">
              ${isJa
                ? `最も多い言語は<strong>${topLanguage.languageName}</strong>（${topLanguage.total}件、好評率${topLanguage.positiveRate}%）です。`
                : `Most common language: <strong>${topLanguage.languageName}</strong> (${topLanguage.total} reviews, ${topLanguage.positiveRate}% positive).`}
            </p>
          ` : ''}

          ${topPositiveKeywords.length > 0 ? `
            <div class="rating-keywords">
              <span class="keywords-label positive">👍 ${isJa ? '頻出キーワード：' : 'Top Keywords:'}</span>
              <span class="keywords-list">${topPositiveKeywords.join('、')}</span>
            </div>
          ` : ''}

          ${topNegativeKeywords.length > 0 ? `
            <div class="rating-keywords">
              <span class="keywords-label negative">👎 ${isJa ? '改善要望：' : 'Areas for Improvement:'}</span>
              <span class="keywords-list">${topNegativeKeywords.join('、')}</span>
            </div>
          ` : ''}

          ${topGoodList.length > 0 ? `
            <div class="rating-points">
              <h4>✅ ${isJa ? '主な評価ポイント' : 'Main Strengths'}</h4>
              <ul>
                ${topGoodList.map(p => `<li>${UI.escapeHtml(p.point)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${topBadList.length > 0 ? `
            <div class="rating-points">
              <h4>⚠️ ${isJa ? '主な改善要望' : 'Main Concerns'}</h4>
              <ul>
                ${topBadList.map(p => `<li>${UI.escapeHtml(p.point)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  exportCSV() {
    if (!UserPlan.canUse('exportCSV')) {
      UserPlan.showPricingModal();
      return;
    }

    const isJa = Lang.current === 'ja';
    const gameInfo = AppState.currentGameData;
    const keywords = AppState.currentKeywords;
    const summary = AppState.currentSummary;

    if (!gameInfo) {
      UI.showToast(isJa ? 'エクスポートするデータがありません' : 'No data to export', 'error');
      return;
    }

    // CSVデータを構築
    let csv = '\uFEFF'; // BOM for Excel UTF-8 support
    csv += `${isJa ? 'ゲーム名' : 'Game Name'},${gameInfo.name}\n`;
    csv += `${isJa ? '発売日' : 'Release Date'},${gameInfo.releaseDate || ''}\n`;
    csv += `${isJa ? '開発元' : 'Developer'},${gameInfo.developers?.join('; ') || ''}\n\n`;

    csv += `${isJa ? 'ポジティブキーワード' : 'Positive Keywords'}\n`;
    csv += `${isJa ? 'キーワード' : 'Keyword'},${isJa ? 'スコア' : 'Score'}\n`;
    (keywords?.positive || []).forEach(k => {
      csv += `"${k.word}",${k.score}\n`;
    });

    csv += `\n${isJa ? 'ネガティブキーワード' : 'Negative Keywords'}\n`;
    csv += `${isJa ? 'キーワード' : 'Keyword'},${isJa ? 'スコア' : 'Score'}\n`;
    (keywords?.negative || []).forEach(k => {
      csv += `"${k.word}",${k.score}\n`;
    });

    csv += `\n${isJa ? '良い点' : 'Good Points'}\n`;
    (summary?.goodPoints || []).forEach(p => {
      csv += `"${p.point}"\n`;
    });

    csv += `\n${isJa ? '悪い点' : 'Bad Points'}\n`;
    (summary?.badPoints || []).forEach(p => {
      csv += `"${p.point}"\n`;
    });

    if (summary?.overallSummary) {
      csv += `\n${isJa ? '総評' : 'Overall Summary'}\n`;
      csv += `"${summary.overallSummary}"\n`;
    }

    // ダウンロード
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `review-insight-${gameInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    link.click();

    UI.showToast(isJa ? 'CSVをダウンロードしました' : 'CSV downloaded', 'success');
  }
};

// Store Doctor ツール
const StoreDoctor = {
  currentView: 'search', // 'search' or 'results'

  init() {
    this.currentView = 'search';
    this.renderPage();
    this.bindEvents();
  },

  goBack() {
    if (this.currentView === 'results') {
      // 結果画面から検索画面に戻る
      document.getElementById('doctor-search-view').classList.remove('hidden');
      document.getElementById('doctor-results-view').classList.add('hidden');
      this.currentView = 'search';
    } else {
      // 検索画面からホームに戻る
      navigateTo('home');
    }
  },

  renderPage() {
    const isJa = Lang.current === 'ja';
    const page = document.getElementById('store-doctor-page');
    page.innerHTML = `
      <header class="tool-header">
        <div class="tool-header-left">
          <button class="back-button" onclick="StoreDoctor.goBack()" title="${isJa ? '戻る' : 'Back'}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="tool-title">${Lang.get('toolStoreDoctor')}</h1>
        </div>
        ${UI.getLanguageSwitcher()}
      </header>

      ${AdManager.getToolHeaderAd()}

      <div id="doctor-search-view">
        <section class="search-section">
          <h2 class="search-title">${isJa ? 'ストア評価診断' : 'Store Page Diagnosis'}</h2>
          <p class="search-subtitle">${isJa ? 'SteamストアのURLを入力して、ストアページを診断します' : 'Enter a Steam store URL to diagnose your store page'}</p>

          <form class="search-form" id="doctor-search-form">
            <input
              type="text"
              class="input-field"
              id="doctor-steam-url"
              placeholder="https://store.steampowered.com/app/12345/..."
              autocomplete="off"
            >
            <button type="submit" class="btn btn-primary" id="diagnose-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              ${isJa ? '診断' : 'Diagnose'}
            </button>
          </form>

          <p class="search-hint">${isJa ? '例' : 'Example'}: https://store.steampowered.com/app/1245620/ELDEN_RING/</p>

          <div class="doctor-features">
            <div class="feature-item">
              <span class="feature-icon">🏷️</span>
              <div class="feature-text">
                <strong>${isJa ? 'タグ診断' : 'Tag Diagnosis'}</strong>
                <p>${isJa ? '最重要！<br>上位5タグの品質をチェック' : 'Most Important!<br>Check quality of top 5 tags'}</p>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🎬</span>
              <div class="feature-text">
                <strong>${isJa ? 'ビジュアル診断' : 'Visual Diagnosis'}</strong>
                <p>${isJa ? 'トレーラー・スクショ数を<br>チェック' : 'Check trailer &<br>screenshot count'}</p>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📝</span>
              <div class="feature-text">
                <strong>${isJa ? 'テキスト診断' : 'Text Diagnosis'}</strong>
                <p>${isJa ? '説明文の長さ・<br>GIF有無をチェック' : 'Check description length<br>& GIF presence'}</p>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🌐</span>
              <div class="feature-text">
                <strong>${isJa ? '基本情報診断' : 'Basic Info Diagnosis'}</strong>
                <p>${isJa ? '言語対応・<br>カテゴリ設定をチェック' : 'Check language support<br>& category settings'}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div id="doctor-results-view" class="hidden">
        <section class="results-section">
          <div class="results-header">
            <button class="csv-export-btn ${UserPlan.canUse('exportCSV') ? '' : 'pro-only'}" onclick="StoreDoctor.exportCSV()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              ${isJa ? 'CSV出力' : 'Export CSV'}
            </button>
          </div>
          <div id="diagnosis-header"></div>
          <div id="diagnosis-cards"></div>
          <div id="suggested-tags"></div>
        </section>
      </div>

      ${AdManager.getToolFooterAd()}
    `;
  },

  currentResult: null,

  bindEvents() {
    document.getElementById('doctor-search-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.diagnose();
    });
    // 言語切り替え
    UI.bindLanguageSwitcher();
  },

  async diagnose() {
    const url = document.getElementById('doctor-steam-url').value.trim();
    const isJa = Lang.current === 'ja';
    if (!url) {
      UI.showToast(isJa ? 'URLを入力してください' : 'Please enter a URL', 'error');
      return;
    }

    try {
      UI.showLoading(isJa ? 'ストアページを診断中...' : 'Diagnosing store page...');

      const response = await fetch('/api/store-doctor/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, lang: Lang.current })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '診断に失敗しました');
      }

      const result = await response.json();
      this.currentResult = result;

      // 結果ビューを表示
      document.getElementById('doctor-search-view').classList.add('hidden');
      document.getElementById('doctor-results-view').classList.remove('hidden');
      this.currentView = 'results';

      // 結果を描画
      this.renderDiagnosisHeader(result);
      this.renderDiagnosisCards(result.diagnoses);
      this.renderSuggestedTags(result.suggestedTags, result.diagnoses.tags.tags);

      UI.hideLoading();

    } catch (error) {
      console.error('診断エラー:', error);
      UI.hideLoading();
      UI.showToast(error.message, 'error');
    }
  },

  renderDiagnosisHeader(result) {
    const container = document.getElementById('diagnosis-header');
    const { gameInfo, totalScore, grade } = result;
    const isJa = Lang.current === 'ja';

    const getMessage = (score) => {
      if (isJa) {
        if (score >= 90) return '素晴らしい！ストアページは完璧に近い状態です。';
        if (score >= 80) return '合格ラインです。細かい改善でさらに良くなります。';
        if (score >= 70) return '良好ですが、いくつかの改善点があります。';
        if (score >= 60) return '改善が推奨されます。下記の指摘事項を確認してください。';
        if (score >= 50) return '要改善です。重要な設定が不足しています。';
        return '危険な状態です。早急に改善が必要です。';
      } else {
        if (score >= 90) return 'Excellent! Your store page is nearly perfect.';
        if (score >= 80) return 'Good job! Minor improvements can make it even better.';
        if (score >= 70) return 'Good, but there are some areas for improvement.';
        if (score >= 60) return 'Improvements recommended. Check the notes below.';
        if (score >= 50) return 'Needs work. Important settings are missing.';
        return 'Critical state. Urgent improvements needed.';
      }
    };

    container.innerHTML = `
      <div class="diagnosis-header">
        <img src="${gameInfo.headerImage}" alt="${UI.escapeHtml(gameInfo.name)}" class="diagnosis-game-image">
        <div class="diagnosis-game-info">
          <h2 class="diagnosis-game-name">${UI.escapeHtml(gameInfo.name)}</h2>
          <p class="diagnosis-game-meta">
            ${gameInfo.developers?.join(', ') || (isJa ? '開発元不明' : 'Developer unknown')} | ${gameInfo.releaseDate || (isJa ? '発売日不明' : 'Release date unknown')}
          </p>
          <div class="score-display">
            <div class="score-circle animate" style="border-color: ${grade.color}">
              <span class="score-number" style="color: ${grade.color}">${totalScore}</span>
              <span class="score-label">/ 100${isJa ? '点' : ''}</span>
            </div>
            <div class="grade-display">
              <div class="grade-letter animate" style="color: ${grade.color}">${grade.letter}</div>
              <div class="grade-label" style="color: ${grade.color}">${grade.label}</div>
            </div>
            <p class="score-message">${getMessage(totalScore)}</p>
          </div>
        </div>
      </div>
    `;
  },

  renderDiagnosisCards(diagnoses) {
    const container = document.getElementById('diagnosis-cards');

    const renderItems = (diagnosis) => {
      let html = '';

      // Critical/Warning issues
      [...(diagnosis.issues || []), ...(diagnosis.warnings || [])].forEach(item => {
        const isCritical = item.type === 'critical';
        html += `
          <div class="diagnosis-item ${isCritical ? 'critical' : 'warning'}">
            <div class="diagnosis-item-message">
              <span class="diagnosis-item-icon">${isCritical ? '❌' : '⚠️'}</span>
              ${UI.escapeHtml(item.message)}
            </div>
            <div class="diagnosis-item-suggestion">
              👉 ${UI.escapeHtml(item.suggestion)}
            </div>
          </div>
        `;
      });

      // Passed items
      (diagnosis.passed || []).forEach(item => {
        html += `
          <div class="diagnosis-item passed">
            <div class="diagnosis-item-message">
              <span class="diagnosis-item-icon">✅</span>
              ${UI.escapeHtml(item)}
            </div>
          </div>
        `;
      });

      const isJa = Lang.current === 'ja';
      return html || `<p class="no-data">${isJa ? '診断データがありません' : 'No diagnosis data available'}</p>`;
    };

    const getScoreClass = (score) => {
      if (score >= 80) return 'good';
      if (score >= 50) return 'warning';
      return 'bad';
    };

    const isJa = Lang.current === 'ja';
    const pt = isJa ? '点' : 'pts';

    container.innerHTML = `
      <div class="diagnosis-cards">
        <div class="diagnosis-card">
          <div class="diagnosis-card-header">
            <h3 class="diagnosis-card-title">
              <span>🏷️</span> ${isJa ? 'タグ設定' : 'Tags'}
            </h3>
            <span class="diagnosis-card-score ${getScoreClass(diagnoses.tags.score)}">
              ${Math.round(diagnoses.tags.score * 0.4)} / 40${pt}
            </span>
          </div>
          <div class="diagnosis-card-content">
            ${renderItems(diagnoses.tags)}
          </div>
        </div>

        <div class="diagnosis-card">
          <div class="diagnosis-card-header">
            <h3 class="diagnosis-card-title">
              <span>🎬</span> ${isJa ? 'ビジュアル' : 'Visuals'}
            </h3>
            <span class="diagnosis-card-score ${getScoreClass(diagnoses.visuals.score)}">
              ${Math.round(diagnoses.visuals.score * 0.3)} / 30${pt}
            </span>
          </div>
          <div class="diagnosis-card-content">
            ${renderItems(diagnoses.visuals)}
          </div>
        </div>

        <div class="diagnosis-card">
          <div class="diagnosis-card-header">
            <h3 class="diagnosis-card-title">
              <span>📝</span> ${isJa ? 'テキスト情報' : 'Text Content'}
            </h3>
            <span class="diagnosis-card-score ${getScoreClass(diagnoses.text.score)}">
              ${Math.round(diagnoses.text.score * 0.2)} / 20${pt}
            </span>
          </div>
          <div class="diagnosis-card-content">
            ${renderItems(diagnoses.text)}
          </div>
        </div>

        <div class="diagnosis-card">
          <div class="diagnosis-card-header">
            <h3 class="diagnosis-card-title">
              <span>🌐</span> ${isJa ? '基本情報' : 'Basic Info'}
            </h3>
            <span class="diagnosis-card-score ${getScoreClass(diagnoses.basic.score)}">
              ${Math.round(diagnoses.basic.score * 0.1)} / 10${pt}
            </span>
          </div>
          <div class="diagnosis-card-content">
            ${renderItems(diagnoses.basic)}
          </div>
        </div>
      </div>
    `;
  },

  renderSuggestedTags(suggestedTags, currentTags) {
    const container = document.getElementById('suggested-tags');
    const isJa = Lang.current === 'ja';

    const broadTags = ['Indie', 'Singleplayer', 'Action', 'Adventure', 'Casual'];

    const tagsHtml = suggestedTags.map(tag =>
      `<span class="suggested-tag" onclick="StoreDoctor.copyTag('${tag}')">${tag}</span>`
    ).join('');

    const currentTagsHtml = currentTags.length > 0 ? currentTags.map((tag, index) => {
      const isBroad = broadTags.some(b => tag.toLowerCase().includes(b.toLowerCase()));
      const isTop5 = index < 5;
      const className = isBroad && isTop5 ? 'current-tag broad' : 'current-tag';
      const title = isTop5 ? (isJa ? '上位5タグ' : 'Top 5 tags') : '';
      return `<span class="${className}" title="${title}">${index + 1}. ${tag}</span>`;
    }).join('') : '';

    container.innerHTML = `
      <div class="suggested-tags-section">
        <h3 class="suggested-tags-title">
          <span>💡</span> ${isJa ? '追加を検討すべきタグ' : 'Suggested Tags to Add'}
        </h3>
        <p style="color: var(--text-secondary); margin-bottom: 12px; font-size: 0.9rem;">
          ${isJa ? 'クリックでクリップボードにコピー' : 'Click to copy to clipboard'}
        </p>
        <div class="suggested-tags-list">
          ${tagsHtml}
        </div>
        ${currentTags.length > 0 ? `
          <div class="current-tags-section">
            <p class="current-tags-title">${isJa ? '現在設定されているタグ' : 'Current Tags'} (${currentTags.length}${isJa ? '個' : ''})</p>
            <div class="current-tags-list">
              ${currentTagsHtml}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="disclaimer-section" style="margin-top: 24px; padding: 16px; background: var(--bg-secondary); border-radius: 8px; border-left: 3px solid var(--text-muted);">
        <p style="color: var(--text-muted); font-size: 0.8rem; line-height: 1.6; margin: 0;">
          ${isJa
            ? '※ このスコアリングはSteam公式の基準を参考にしつつ、数値的な閾値は独自判断で設定しています。公式ガイドラインは以下をご参照ください。'
            : '※ This scoring is based on Steam official guidelines, but numerical thresholds are set at our discretion. Please refer to the official guidelines below.'}
        </p>
        <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px;">
          <a href="https://partner.steamgames.com/doc/store/tags" target="_blank" rel="noopener" style="color: var(--accent-primary); font-size: 0.8rem; text-decoration: none;">
            ${isJa ? 'タグ' : 'Tags'} ↗
          </a>
          <a href="https://partner.steamgames.com/doc/store/assets/standard" target="_blank" rel="noopener" style="color: var(--accent-primary); font-size: 0.8rem; text-decoration: none;">
            ${isJa ? '画像アセット' : 'Graphical Assets'} ↗
          </a>
          <a href="https://partner.steamgames.com/doc/store/trailer" target="_blank" rel="noopener" style="color: var(--accent-primary); font-size: 0.8rem; text-decoration: none;">
            ${isJa ? 'トレーラー' : 'Trailers'} ↗
          </a>
          <a href="https://partner.steamgames.com/doc/store/page/description" target="_blank" rel="noopener" style="color: var(--accent-primary); font-size: 0.8rem; text-decoration: none;">
            ${isJa ? '説明文' : 'Descriptions'} ↗
          </a>
        </div>
      </div>
    `;
  },

  copyTag(tag) {
    const isJa = Lang.current === 'ja';
    navigator.clipboard.writeText(tag).then(() => {
      UI.showToast(isJa ? `"${tag}" をコピーしました` : `Copied "${tag}"`, 'success');
      // ボタンの見た目を変更
      const buttons = document.querySelectorAll('.suggested-tag');
      buttons.forEach(btn => {
        if (btn.textContent === tag) {
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1000);
        }
      });
    });
  },

  exportCSV() {
    if (!UserPlan.canUse('exportCSV')) {
      UserPlan.showPricingModal();
      return;
    }

    const isJa = Lang.current === 'ja';
    const result = this.currentResult;

    if (!result) {
      UI.showToast(isJa ? 'エクスポートするデータがありません' : 'No data to export', 'error');
      return;
    }

    let csv = '\uFEFF';
    csv += `${isJa ? 'ゲーム名' : 'Game Name'},${result.gameInfo?.name || ''}\n`;
    csv += `${isJa ? '総合スコア' : 'Total Score'},${result.totalScore}\n\n`;

    csv += `${isJa ? '診断結果' : 'Diagnosis Results'}\n`;
    csv += `${isJa ? 'カテゴリ' : 'Category'},${isJa ? 'スコア' : 'Score'}\n`;
    csv += `${isJa ? 'タグ' : 'Tags'},${result.diagnoses?.tags?.score || 0}\n`;
    csv += `${isJa ? 'ビジュアル' : 'Visuals'},${result.diagnoses?.visuals?.score || 0}\n`;
    csv += `${isJa ? 'テキスト' : 'Text'},${result.diagnoses?.text?.score || 0}\n`;
    csv += `${isJa ? '基本情報' : 'Basic Info'},${result.diagnoses?.basic?.score || 0}\n\n`;

    csv += `${isJa ? '現在のタグ' : 'Current Tags'}\n`;
    (result.diagnoses?.tags?.tags || []).forEach((tag, i) => {
      csv += `${i + 1},"${tag}"\n`;
    });

    csv += `\n${isJa ? '推奨タグ' : 'Suggested Tags'}\n`;
    (result.suggestedTags || []).forEach(tag => {
      csv += `"${tag}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `store-doctor-${(result.gameInfo?.name || 'result').replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    link.click();

    UI.showToast(isJa ? 'CSVをダウンロードしました' : 'CSV downloaded', 'success');
  }
};

// Blue Ocean Scout ツール
const BlueOcean = {
  selectedTags: [], // 選択されたタグ（tagid, name）の配列
  currentResult: null,
  steamTags: null, // Steam公式タグ（キャッシュ）
  isLoadingTags: false,
  currentView: 'input', // 'input' or 'results'
  lastFreeText: '', // 検索時のフリーテキストを保存

  async init() {
    // 選択状態をリセット
    this.selectedTags = [];
    this.currentResult = null;
    this.currentView = 'input';
    this.lastFreeText = '';

    // まずローディング画面を表示
    this.renderLoadingPage();

    // Steam公式タグを取得
    await this.fetchSteamTags();

    // タグ取得後にページを描画
    this.renderPage();
    this.bindEvents();
  },

  renderLoadingPage() {
    const page = document.getElementById('blue-ocean-page');
    const isJa = Lang.current === 'ja';

    page.innerHTML = `
      <header class="tool-header">
        <div class="tool-header-left">
          <button class="back-button" onclick="navigateTo('home')" title="${isJa ? 'ホームに戻る' : 'Back to Home'}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="tool-title">${Lang.get('toolBlueOcean')}</h1>
        </div>
        ${UI.getLanguageSwitcher()}
      </header>
      <div class="loading-container" style="text-align: center; padding: 100px 20px;">
        <div class="spinner" style="margin: 0 auto 20px;"></div>
        <p style="color: #888;">${isJa ? 'Steamタグを読み込み中...' : 'Loading Steam tags...'}</p>
      </div>
    `;
  },

  async fetchSteamTags() {
    if (this.steamTags) return; // キャッシュがあればスキップ
    if (this.isLoadingTags) return;

    this.isLoadingTags = true;
    try {
      const lang = Lang.current === 'ja' ? 'japanese' : 'english';
      const response = await fetch(`/api/blue-ocean/steam-tags?lang=${lang}`);
      if (!response.ok) throw new Error('タグ取得失敗');
      const data = await response.json();
      this.steamTags = data.tags;
      console.log('Steam tags loaded:', this.steamTags);
    } catch (error) {
      console.error('Steam tags fetch error:', error);
      // フォールバック: ハードコードのタグを使用
      this.steamTags = {
        genres: [],
        subgenres: [],
        themes: [],
        other: []
      };
    } finally {
      this.isLoadingTags = false;
    }
  },

  renderTagSection(title, tags, selectorId, isRequired = false) {
    const isJa = Lang.current === 'ja';
    if (!tags || tags.length === 0) return '';

    return `
      <div class="form-section">
        <h3 class="form-section-title">
          ${title}
          ${isRequired
            ? `<span class="required">${isJa ? '必須' : 'Required'}</span>`
            : `<span class="optional">${isJa ? '任意・複数可' : 'Optional, Multiple'}</span>`
          }
        </h3>
        <div class="tag-selector" id="${selectorId}">
          ${tags.map(tag => `
            <span class="tag-option" data-tagid="${tag.tagid}" data-name="${tag.name}">${tag.name}</span>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderPage() {
    const page = document.getElementById('blue-ocean-page');
    const isJa = Lang.current === 'ja';
    const tags = this.steamTags || { genres: [], subgenres: [], themes: [], other: [] };

    page.innerHTML = `
      <header class="tool-header">
        <div class="tool-header-left">
          <button class="back-button" onclick="BlueOcean.goBack()" title="${isJa ? '戻る' : 'Back'}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="tool-title">${Lang.get('toolBlueOcean')}</h1>
        </div>
        ${UI.getLanguageSwitcher()}
      </header>

      ${AdManager.getToolHeaderAd()}

      <div id="ocean-input-view">
        <section class="search-section">
          <h2 class="search-title">${isJa ? 'ブルーオーシャン・スカウト' : 'Blue Ocean Scout'}</h2>
          <p class="search-subtitle">${isJa ? '作りたいゲームのタグを選択して、市場の空き状況を分析します' : 'Select tags for your game concept to analyze market opportunities'}</p>

          <!-- 選択中のタグ表示 -->
          <div class="selected-tags-container" id="selected-tags-container">
            <h3 class="form-section-title">${isJa ? '選択中のタグ' : 'Selected Tags'} <span id="selected-count">(0)</span></h3>
            <div class="selected-tags" id="selected-tags">
              <span class="no-tags-hint">${isJa ? 'タグを選択してください' : 'Please select tags'}</span>
            </div>
          </div>

          <form class="concept-form" id="concept-form">
            <!-- ジャンル（Steam公式タグ） -->
            ${this.renderTagSection(
              isJa ? 'ジャンル' : 'Genre',
              tags.genres,
              'genre-selector',
              true
            )}

            <!-- サブジャンル（Steam公式タグ） -->
            ${this.renderTagSection(
              isJa ? 'サブジャンル' : 'Sub Genre',
              tags.subgenres,
              'subgenre-selector',
              false
            )}

            <!-- テーマ（Steam公式タグ） -->
            ${this.renderTagSection(
              isJa ? 'テーマ・世界観' : 'Theme / Setting',
              tags.themes,
              'theme-selector',
              false
            )}

            <!-- その他のタグ -->
            ${tags.other && tags.other.length > 0 ? this.renderTagSection(
              isJa ? 'その他のタグ' : 'Other Tags',
              tags.other.slice(0, 50), // 最初の50件のみ表示
              'other-selector',
              false
            ) : ''}

            <!-- 自由記述 -->
            <div class="form-section">
              <h3 class="form-section-title">
                ${isJa ? 'アイデア詳細' : 'Idea Details'}
                <span class="optional">${isJa ? '任意' : 'Optional'}</span>
              </h3>
              <textarea
                class="idea-textarea"
                id="free-text"
                placeholder="${isJa ? 'ゲームの特徴やユニークな要素があれば記入してください。例：「時間を操る能力を持つ主人公」「料理とバトルを組み合わせたシステム」など' : 'Describe unique features of your game. e.g., "A protagonist who can manipulate time", "Cooking combined with combat system"'}"
              ></textarea>
            </div>

            <button type="submit" class="btn btn-primary analyze-button" id="ocean-analyze-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              ${isJa ? '市場を分析する' : 'Analyze Market'}
            </button>
          </form>
        </section>
      </div>

      <div id="ocean-results-view" class="hidden">
        <section class="results-section">
          <div class="results-header">
            <button class="csv-export-btn ${UserPlan.canUse('exportCSV') ? '' : 'pro-only'}" onclick="BlueOcean.exportCSV()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              ${isJa ? 'CSV出力' : 'Export CSV'}
            </button>
          </div>
          <div id="search-summary"></div>
          <div id="ocean-result"></div>
          <div id="judgment-reasons"></div>
          <div id="market-stats"></div>
          <div id="market-map"></div>
          <div id="competitors-section"></div>
          <div id="ai-analysis"></div>
          <div id="pivot-section"></div>
        </section>
      </div>

      ${AdManager.getToolFooterAd()}
    `;
  },

  bindEvents() {
    // 汎用タグ選択イベントハンドラ
    const handleTagClick = (selectorId, isMultiple = true) => {
      const selector = document.getElementById(selectorId);
      if (!selector) return;

      selector.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-option')) {
          const tagid = parseInt(e.target.dataset.tagid);
          const name = e.target.dataset.name;

          if (isMultiple) {
            // 複数選択可能
            e.target.classList.toggle('selected');
            if (e.target.classList.contains('selected')) {
              // 追加
              if (!this.selectedTags.find(t => t.tagid === tagid)) {
                this.selectedTags.push({ tagid, name });
              }
            } else {
              // 削除
              this.selectedTags = this.selectedTags.filter(t => t.tagid !== tagid);
            }
          } else {
            // 単一選択（ジャンル用 - でも複数選択に変更）
            e.target.classList.toggle('selected');
            if (e.target.classList.contains('selected')) {
              if (!this.selectedTags.find(t => t.tagid === tagid)) {
                this.selectedTags.push({ tagid, name });
              }
            } else {
              this.selectedTags = this.selectedTags.filter(t => t.tagid !== tagid);
            }
          }

          // 選択中タグの表示を更新
          this.updateSelectedTagsDisplay();
        }
      });
    };

    // 各セレクターにイベントを設定
    handleTagClick('genre-selector', true);
    handleTagClick('subgenre-selector', true);
    handleTagClick('theme-selector', true);
    handleTagClick('other-selector', true);

    // 選択中タグのクリックで削除
    const selectedTagsContainer = document.getElementById('selected-tags');
    if (selectedTagsContainer) {
      selectedTagsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('selected-tag-remove') || e.target.closest('.selected-tag-remove')) {
          const tagEl = e.target.closest('.selected-tag');
          if (tagEl) {
            const tagid = parseInt(tagEl.dataset.tagid);
            this.selectedTags = this.selectedTags.filter(t => t.tagid !== tagid);
            // 元のセレクター内のタグの選択も解除
            document.querySelectorAll(`.tag-option[data-tagid="${tagid}"]`).forEach(el => {
              el.classList.remove('selected');
            });
            this.updateSelectedTagsDisplay();
          }
        }
      });
    }

    // フォーム送信
    document.getElementById('concept-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.analyze();
    });

    // 言語切り替え
    UI.bindLanguageSwitcher();
  },

  updateSelectedTagsDisplay() {
    const container = document.getElementById('selected-tags');
    const countEl = document.getElementById('selected-count');
    const isJa = Lang.current === 'ja';

    if (!container) return;

    if (this.selectedTags.length === 0) {
      container.innerHTML = `<span class="no-tags-hint">${isJa ? 'タグを選択してください' : 'Please select tags'}</span>`;
      if (countEl) countEl.textContent = '(0)';
    } else {
      container.innerHTML = this.selectedTags.map(tag => `
        <span class="selected-tag" data-tagid="${tag.tagid}">
          ${tag.name}
          <span class="selected-tag-remove">×</span>
        </span>
      `).join('');
      if (countEl) countEl.textContent = `(${this.selectedTags.length})`;
    }
  },

  async analyze() {
    const isJa = Lang.current === 'ja';

    // 少なくとも1つのタグが必要
    if (this.selectedTags.length === 0) {
      UI.showToast(isJa ? 'タグを1つ以上選択してください' : 'Please select at least one tag', 'error');
      return;
    }

    const freeText = document.getElementById('free-text').value.trim();
    this.lastFreeText = freeText; // 検索時のテキストを保存

    try {
      UI.showLoading(isJa ? '市場を分析中...' : 'Analyzing market...');

      // タグ名とタグIDの配列を作成
      const tagNames = this.selectedTags.map(t => t.name);
      const tagIds = this.selectedTags.map(t => t.tagid);

      const response = await fetch('/api/blue-ocean/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: tagNames,
          tagIds: tagIds,
          freeText
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '市場分析に失敗しました');
      }

      const result = await response.json();
      console.log('Blue Ocean結果:', result);
      this.currentResult = result;

      // 結果ビューを表示
      document.getElementById('ocean-input-view').classList.add('hidden');
      document.getElementById('ocean-results-view').classList.remove('hidden');
      this.currentView = 'results';

      // サーバーから返されたオーシャンカラーと位置を使用
      const oceanColor = result.oceanColor || 'yellow';
      const marketPos = result.marketPosition || { x: 50, y: 50 };
      const totalScore = result.totalScore || 50;
      const sixAxisScores = result.sixAxisScores || null;

      // 検索条件サマリーを最上部に表示
      this.renderSearchSummary();
      this.renderOceanResult(oceanColor, totalScore, result.oceanExplanation);
      this.renderJudgmentReasons(result.judgmentReasons, totalScore, oceanColor);
      this.renderMarketStats(result.stats);
      this.renderMarketMap(marketPos, oceanColor);
      this.renderSixAxisScores(sixAxisScores);
      this.renderCompetitors(result.topCompetitors);
      this.renderAIAnalysis(result.aiAnalysis);
      this.renderPivotSuggestions(result.pivotSuggestions);

      UI.hideLoading();

    } catch (error) {
      console.error('市場分析エラー:', error);
      UI.hideLoading();
      UI.showToast(error.message, 'error');
    }
  },

  goBack() {
    if (this.currentView === 'results') {
      // 結果画面 → 入力画面に戻る
      document.getElementById('ocean-results-view').classList.add('hidden');
      document.getElementById('ocean-input-view').classList.remove('hidden');
      this.currentView = 'input';

      // 6軸スコア表示をクリア（重複防止）
      const sixAxisEl = document.querySelector('.six-axis-scores');
      if (sixAxisEl) sixAxisEl.remove();
    } else {
      // 入力画面 → ホームに戻る
      navigateTo('home');
    }
  },

  renderSearchSummary() {
    const container = document.getElementById('search-summary');
    if (!container) return;

    const isJa = Lang.current === 'ja';
    const tagNames = this.selectedTags.map(t => t.name);
    const freeText = this.lastFreeText;

    container.innerHTML = `
      <div class="search-summary">
        <div class="search-summary-label">${isJa ? '検索条件' : 'Search Criteria'}</div>
        <div class="search-summary-tags">
          ${tagNames.map(name => `<span class="summary-tag">${UI.escapeHtml(name)}</span>`).join('')}
        </div>
        ${freeText ? `<div class="search-summary-text">"${UI.escapeHtml(freeText)}"</div>` : ''}
      </div>
    `;
  },

  renderJudgmentReasons(reasons, totalScore, oceanColor) {
    const container = document.getElementById('judgment-reasons');
    if (!container || !reasons) return;

    const isJa = Lang.current === 'ja';

    // スコア閾値の説明
    const thresholdLabels = {
      blue: { label: isJa ? 'ブルーオーシャン' : 'Blue Ocean', range: '85+', color: '#2196F3' },
      bluePromising: { label: isJa ? 'ブルー（有望）' : 'Blue (Promising)', range: '70-84', color: '#4CAF50' },
      yellow: { label: isJa ? 'イエロー（要検討）' : 'Yellow (Needs Review)', range: '55-69', color: '#FF9800' },
      red: { label: isJa ? 'レッド（厳しい）' : 'Red (Challenging)', range: '40-54', color: '#f44336' },
      purple: { label: isJa ? 'パープル（需要不明）' : 'Purple (Unknown Demand)', range: '<40', color: '#9C27B0' }
    };

    // スコア内訳の表示
    const breakdown = reasons.scoreBreakdown || {};
    const breakdownLabels = {
      competition: isJa ? '競争係数' : 'Competition',
      hitDensity: isJa ? 'ヒット密度' : 'Hit Density',
      revenue: isJa ? '収益性' : 'Revenue',
      niche: isJa ? 'ニッチ度' : 'Niche',
      synergy: isJa ? 'タグシナジー' : 'Synergy',
      demand: isJa ? '需要確実性' : 'Demand'
    };

    const breakdownRows = Object.entries(breakdown).map(([key, data]) => {
      const contribColor = data.contribution > 0 ? '#4CAF50' : data.contribution < 0 ? '#f44336' : '#888';
      const contribSign = data.contribution > 0 ? '+' : '';
      return `
        <tr>
          <td>${breakdownLabels[key] || key}</td>
          <td>${data.score}</td>
          <td>×${data.weight}%</td>
          <td style="color: ${contribColor}; font-weight: 600;">${contribSign}${data.contribution}</td>
        </tr>
      `;
    }).join('');

    // 黄金ゾーン表示
    const goldenZoneHTML = reasons.goldenZone ? `
      <div class="golden-zone-alert">
        🔥 ${reasons.goldenZone}
      </div>
    ` : '';

    // ポジティブ・ネガティブ要因
    const positiveHTML = reasons.positive && reasons.positive.length > 0 ? `
      <div class="reasons-list positive">
        <h4>✅ ${isJa ? 'プラス要因' : 'Positive Factors'}</h4>
        <ul>
          ${reasons.positive.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
    ` : '';

    const negativeHTML = reasons.negative && reasons.negative.length > 0 ? `
      <div class="reasons-list negative">
        <h4>⚠️ ${isJa ? 'マイナス要因' : 'Negative Factors'}</h4>
        <ul>
          ${reasons.negative.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
    ` : '';

    container.innerHTML = `
      <div class="judgment-reasons">
        <h3 class="judgment-reasons-title">
          📊 ${isJa ? 'なぜこの判定？' : 'Why This Judgment?'}
        </h3>

        ${goldenZoneHTML}

        <div class="score-calculation">
          <div class="score-formula">
            <span class="base-score">${isJa ? '基準点' : 'Base'}: 50</span>
            <span class="operator">+</span>
            <span class="weighted-sum">${isJa ? '重み付け合計' : 'Weighted Sum'}</span>
            <span class="operator">=</span>
            <span class="final-score" style="color: ${thresholdLabels[oceanColor === 'blue' && totalScore < 85 ? 'bluePromising' : oceanColor]?.color || '#888'};">${totalScore}${isJa ? '点' : 'pts'}</span>
          </div>

          <table class="score-breakdown-table">
            <thead>
              <tr>
                <th>${isJa ? '項目' : 'Item'}</th>
                <th>${isJa ? 'スコア' : 'Score'}</th>
                <th>${isJa ? '重み' : 'Weight'}</th>
                <th>${isJa ? '貢献' : 'Contrib.'}</th>
              </tr>
            </thead>
            <tbody>
              ${breakdownRows}
            </tbody>
          </table>
        </div>

        <div class="threshold-reference">
          <h4>${isJa ? '判定基準' : 'Thresholds'}</h4>
          <div class="threshold-bars">
            ${Object.entries(thresholdLabels).map(([key, t]) => `
              <div class="threshold-item ${oceanColor === key || (oceanColor === 'blue' && key === 'bluePromising' && totalScore < 85) ? 'active' : ''}">
                <span class="threshold-color" style="background: ${t.color};"></span>
                <span class="threshold-label">${t.label}</span>
                <span class="threshold-range">${t.range}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="reasons-factors">
          ${positiveHTML}
          ${negativeHTML}
        </div>
      </div>
    `;
  },

  renderOceanResult(oceanColor, totalScore, explanation) {
    const container = document.getElementById('ocean-result');
    const isJa = Lang.current === 'ja';

    const colorConfig = {
      blue: { emoji: '🌊', label: 'BLUE OCEAN', color: '#2196F3' },
      red: { emoji: '🔥', label: 'RED OCEAN', color: '#f44336' },
      purple: { emoji: '🔮', label: 'PURPLE OCEAN', color: '#9C27B0' },
      yellow: { emoji: '⚡', label: 'YELLOW OCEAN', color: '#FF9800' }
    };

    const config = colorConfig[oceanColor] || colorConfig.yellow;
    const scoreColor = totalScore >= 70 ? '#4CAF50' : totalScore >= 55 ? '#FF9800' : totalScore >= 40 ? '#f44336' : '#9C27B0';

    container.innerHTML = `
      <div class="ocean-result">
        <div class="ocean-emoji">${config.emoji}</div>
        <div class="ocean-label ${oceanColor}">${config.label}</div>
        <div class="ocean-score" style="color: ${scoreColor}; font-size: 2.5rem; font-weight: bold; margin: 10px 0;">
          ${totalScore}<span style="font-size: 1rem; color: var(--text-secondary);">/100</span>
        </div>
        <p class="ocean-description">${explanation || ''}</p>
        <div class="ocean-recommendation">
          ${oceanColor === 'blue' ? (isJa ? '👍 このコンセプトで進めましょう！' : '👍 Go ahead with this concept!') :
            oceanColor === 'red' ? (isJa ? '⚠️ ピボットを検討してください' : '⚠️ Consider pivoting') :
            oceanColor === 'purple' ? (isJa ? '🎯 ターゲットを絞り込んで勝負' : '🎯 Target a niche audience') :
            (isJa ? '📊 もう少し調査が必要です' : '📊 More research needed')}
        </div>
      </div>
    `;
  },

  renderSixAxisScores(scores) {
    const container = document.getElementById('market-stats');
    if (!container || !scores) return;

    const isJa = Lang.current === 'ja';

    // 6軸スコアをレーダーチャート風に表示
    const axisLabels = {
      competition: { ja: '競争係数', en: 'Competition', weight: '30%' },
      hitDensity: { ja: 'ヒット密度', en: 'Hit Density', weight: '30%' },
      revenue: { ja: '収益性', en: 'Revenue', weight: '15%' },
      niche: { ja: 'ニッチ度', en: 'Niche', weight: '10%' },
      synergy: { ja: 'タグシナジー', en: 'Tag Synergy', weight: '5%' },
      demand: { ja: '需要確実性', en: 'Demand', weight: '10%' }
    };

    const axisCards = Object.entries(scores).map(([key, data]) => {
      const label = axisLabels[key] || { ja: key, en: key, weight: '?' };
      const scoreColor = data.score >= 70 ? '#4CAF50' : data.score >= 50 ? '#FF9800' : '#f44336';

      return `
        <div class="axis-score-card">
          <div class="axis-score-header">
            <span class="axis-label">${isJa ? label.ja : label.en}</span>
            <span class="axis-weight">(${label.weight})</span>
          </div>
          <div class="axis-score-value" style="color: ${scoreColor};">${data.score}</div>
          <div class="axis-score-bar">
            <div class="axis-score-fill" style="width: ${data.score}%; background: ${scoreColor};"></div>
          </div>
          <div class="axis-description">${data.description || ''}</div>
        </div>
      `;
    }).join('');

    // 既存のmarket-statsの後に6軸スコアを追加
    const sixAxisHTML = `
      <div class="six-axis-scores">
        <h3 class="six-axis-title">${isJa ? '📊 6軸スコア分析' : '📊 6-Axis Score Analysis'}</h3>
        <div class="axis-scores-grid">
          ${axisCards}
        </div>
      </div>
    `;

    // market-statsの後に追加
    container.insertAdjacentHTML('afterend', sixAxisHTML);
  },

  renderMarketStats(stats) {
    const container = document.getElementById('market-stats');
    const isJa = Lang.current === 'ja';

    // statsがundefinedの場合のデフォルト値
    const safeStats = stats || {};
    const totalGames = safeStats.totalGames ?? 0;
    const hitGames = safeStats.hitGames ?? 0;
    const avgReviews = safeStats.avgReviews ?? 0;
    const demandLevel = safeStats.demandLevel ?? (isJa ? '不明' : 'Unknown');

    container.innerHTML = `
      <div class="market-stats">
        <div class="stat-card">
          <div class="stat-card-value">${totalGames.toLocaleString()}</div>
          <div class="stat-card-label">${isJa ? '市場規模（タイトル数）' : 'Market Size'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">${hitGames}</div>
          <div class="stat-card-label">${isJa ? 'ヒット作（1000+レビュー）' : 'Hit Games (1000+ Reviews)'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">${avgReviews.toLocaleString()}</div>
          <div class="stat-card-label">${isJa ? '平均レビュー数' : 'Avg Reviews'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">${demandLevel}</div>
          <div class="stat-card-label">${isJa ? '需要レベル' : 'Demand Level'}</div>
        </div>
      </div>
    `;
  },

  renderMarketMap(position, oceanColor) {
    const container = document.getElementById('market-map');
    const isJa = Lang.current === 'ja';

    // positionがundefinedの場合のデフォルト値
    const safePos = position || { x: 50, y: 50 };

    const quadrantLabels = isJa ? {
      'top-left': 'ブルーオーシャン（狙い目）',
      'top-right': 'レッドオーシャン（激戦）',
      'bottom-left': 'パープルオーシャン（ニッチ）',
      'bottom-right': '低需要・高競合（危険）'
    } : {
      'top-left': 'Blue Ocean (Opportunity)',
      'top-right': 'Red Ocean (Competitive)',
      'bottom-left': 'Purple Ocean (Niche)',
      'bottom-right': 'Low Demand (Risky)'
    };

    container.innerHTML = `
      <div class="market-map">
        <h3 class="market-map-title">
          <span>📍</span>
          ${isJa ? '市場ポジションマップ' : 'Market Position Map'}
        </h3>
        <div class="map-container">
          <div class="map-quadrant top-left">${quadrantLabels['top-left']}</div>
          <div class="map-quadrant top-right">${quadrantLabels['top-right']}</div>
          <div class="map-quadrant bottom-left">${quadrantLabels['bottom-left']}</div>
          <div class="map-quadrant bottom-right">${quadrantLabels['bottom-right']}</div>
          <div class="map-position" style="left: ${safePos.x}%; top: ${100 - safePos.y}%;"></div>
          <span class="map-axis-label x-left">${isJa ? '競合少' : 'Few'}</span>
          <span class="map-axis-label x-right">${isJa ? '競合多' : 'Many'}</span>
          <span class="map-axis-label y-top">${isJa ? '需要高' : 'High'}</span>
          <span class="map-axis-label y-bottom">${isJa ? '需要低' : 'Low'}</span>
        </div>
      </div>
    `;
  },

  renderCompetitors(competitors) {
    const container = document.getElementById('competitors-section');
    const isJa = Lang.current === 'ja';

    if (!competitors || competitors.length === 0) {
      container.innerHTML = `
        <div class="competitors-section">
          <h3 class="competitors-title">
            <span>👑</span>
            ${isJa ? '競合' : 'Competitors'}
          </h3>
          <p style="color: var(--text-secondary); padding: 20px;">${isJa ? '競合データが見つかりませんでした。' : 'No competitor data found.'}</p>
        </div>
      `;
      return;
    }

    const competitorCards = competitors.map(comp => `
      <div class="competitor-card">
        <img src="${comp.headerImage || 'https://via.placeholder.com/184x69?text=No+Image'}" alt="${UI.escapeHtml(comp.name)}" class="competitor-image">
        <div class="competitor-info">
          <div class="competitor-name">${UI.escapeHtml(comp.name)}</div>
          <div class="competitor-meta">
            ${comp.releaseDate || (isJa ? '発売日不明' : 'Release unknown')} | ${comp.developers?.join(', ') || (isJa ? '開発元不明' : 'Developer unknown')}
          </div>
          <div class="competitor-reviews">
            ⭐ ${comp.reviewCount?.toLocaleString() || '?'}${isJa ? '件のレビュー' : ' reviews'} | ${comp.positiveRate || '?'}%${isJa ? '好評' : ' positive'}
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="competitors-section">
        <h3 class="competitors-title">
          <span>👑</span>
          ${isJa ? '競合' : 'Competitors'}
        </h3>
        ${competitorCards}
      </div>
    `;
  },

  renderAIAnalysis(analysis) {
    const container = document.getElementById('ai-analysis');
    const isJa = Lang.current === 'ja';

    if (!analysis) {
      container.innerHTML = '';
      return;
    }

    const renderList = (items) => {
      if (!items || items.length === 0) return `<li>${isJa ? 'データなし' : 'No data'}</li>`;
      return items.map(item => `<li>${UI.escapeHtml(item)}</li>`).join('');
    };

    container.innerHTML = `
      <div class="ai-analysis-section">
        <h3 class="competitors-title">
          <span>🤖</span>
          ${isJa ? 'AI市場分析' : 'AI Market Analysis'}
        </h3>
        <div class="analysis-grid">
          <div class="analysis-card">
            <h4 class="analysis-card-title">
              <span>💪</span> ${isJa ? '市場の強み' : 'Market Strengths'}
            </h4>
            <ul>${renderList(analysis.marketStrengths)}</ul>
          </div>
          <div class="analysis-card">
            <h4 class="analysis-card-title">
              <span>⚠️</span> ${isJa ? '市場のリスク' : 'Market Risks'}
            </h4>
            <ul>${renderList(analysis.marketRisks)}</ul>
          </div>
          <div class="analysis-card">
            <h4 class="analysis-card-title">
              <span>🎯</span> ${isJa ? '差別化ポイント' : 'Differentiation Points'}
            </h4>
            <ul>${renderList(analysis.differentiationPoints)}</ul>
          </div>
          <div class="analysis-card">
            <h4 class="analysis-card-title">
              <span>👥</span> ${isJa ? 'ターゲット層' : 'Target Audience'}
            </h4>
            <ul>${renderList(analysis.targetAudience)}</ul>
          </div>
          <div class="analysis-card winning-strategy">
            <h4 class="analysis-card-title">
              <span>🏆</span> ${isJa ? '勝ち筋' : 'Winning Strategy'}
            </h4>
            <p>${UI.escapeHtml(analysis.winningStrategy || (isJa ? '分析中...' : 'Analyzing...'))}</p>
          </div>
        </div>
      </div>
    `;
  },

  renderPivotSuggestions(pivots) {
    const container = document.getElementById('pivot-section');
    const isJa = Lang.current === 'ja';

    if (!pivots || pivots.length === 0) {
      container.innerHTML = '';
      return;
    }

    const pivotCards = pivots.map(pivot => `
      <div class="pivot-card">
        <div class="pivot-tag-change">
          ${pivot.addTags?.map(tag => `<span class="pivot-add">+ ${UI.escapeHtml(tag)}</span>`).join('') || ''}
          ${pivot.removeTags?.map(tag => `<span class="pivot-remove">- ${UI.escapeHtml(tag)}</span>`).join('') || ''}
        </div>
        <div class="pivot-concept">${UI.escapeHtml(pivot.concept || '')}</div>
        <div class="pivot-reason">${UI.escapeHtml(pivot.reason || '')}</div>
        <div class="pivot-pitch">"${UI.escapeHtml(pivot.pitch || '')}"</div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="pivot-section">
        <h3 class="competitors-title">
          <span>💡</span>
          ${isJa ? '空席のピボット提案' : 'Pivot Suggestions'}
        </h3>
        ${pivotCards}
      </div>
    `;
  },

  renderVerdict(analysis) {
    const container = document.getElementById('verdict-section');
    const isJa = Lang.current === 'ja';

    const verdict = analysis?.verdict || (isJa ? '市場分析に基づいて、コンセプトの調整を検討してください。' : 'Consider adjusting your concept based on the market analysis.');

    // モックビルダーCTAを追加（Pro機能）
    const mockBuilderCTA = UserPlan.canUse('mockBuilder') ? `
      <div class="mock-builder-cta">
        <h4>${isJa ? 'アイデアをモックで確認！' : 'Visualize Your Idea!'}</h4>
        <p>${isJa ? 'このコンセプトを即座にプレイ可能なゲームモックに変換' : 'Convert this concept into a playable game mock instantly'}</p>
        <button class="btn btn-primary" onclick="MockBuilder.showRequirementsForm({ title: '${UI.escapeHtml(this.selectedMainGenre || '')} Game', concept: '${UI.escapeHtml(document.getElementById('free-text')?.value || '')}' })">
          <span>🎮</span>
          ${isJa ? 'モックを作成' : 'Create Mock'}
        </button>
      </div>
    ` : `
      <div class="mock-builder-cta pro-locked">
        <h4>${isJa ? 'アイデアをモックで確認！' : 'Visualize Your Idea!'}</h4>
        <p>${isJa ? 'このコンセプトを即座にプレイ可能なゲームモックに変換' : 'Convert this concept into a playable game mock instantly'}</p>
        <button class="btn btn-secondary" onclick="UserPlan.showPricingModal()">
          <span>🔒</span>
          ${isJa ? 'Proにアップグレード' : 'Upgrade to Pro'}
        </button>
      </div>
    `;

    container.innerHTML = `
      <div class="verdict-section">
        <div class="verdict-title">📋 ${isJa ? '最終判定' : 'Final Verdict'}</div>
        <div class="verdict-text">${UI.escapeHtml(verdict)}</div>
      </div>
      ${mockBuilderCTA}
    `;
  },

  exportCSV() {
    if (!UserPlan.canUse('exportCSV')) {
      UserPlan.showPricingModal();
      return;
    }

    const isJa = Lang.current === 'ja';
    const result = this.currentResult;

    if (!result) {
      UI.showToast(isJa ? 'エクスポートするデータがありません' : 'No data to export', 'error');
      return;
    }

    let csv = '\uFEFF';
    csv += `${isJa ? 'メインジャンル' : 'Main Genre'},${this.selectedMainGenre || ''}\n`;
    csv += `${isJa ? 'サブジャンル' : 'Sub Genres'},"${this.selectedSubGenres.join(', ')}"\n`;
    csv += `${isJa ? 'テーマ' : 'Themes'},"${this.selectedThemes.join(', ')}"\n`;
    csv += `${isJa ? 'オーシャンカラー' : 'Ocean Color'},${result.oceanColor || ''}\n\n`;

    csv += `${isJa ? '市場統計' : 'Market Stats'}\n`;
    const stats = result.stats || {};
    csv += `${isJa ? '競合数' : 'Competitors'},${stats.competitorCount || 0}\n`;
    csv += `${isJa ? '平均レビュー数' : 'Avg Reviews'},${stats.avgReviews || 0}\n`;
    csv += `${isJa ? '平均好評率' : 'Avg Rating'},${stats.avgRating || 0}%\n`;
    csv += `${isJa ? '需要レベル' : 'Demand Level'},${stats.demandLevel || ''}\n\n`;

    csv += `${isJa ? '競合ゲーム' : 'Competitors'}\n`;
    csv += `${isJa ? '名前' : 'Name'},${isJa ? 'レビュー数' : 'Reviews'},${isJa ? '好評率' : 'Rating'}\n`;
    (result.topCompetitors || []).forEach(c => {
      csv += `"${c.name}",${c.reviewCount || 0},${c.positiveRate || 0}%\n`;
    });

    csv += `\n${isJa ? 'AI分析' : 'AI Analysis'}\n`;
    const ai = result.aiAnalysis || {};
    csv += `\n${isJa ? '市場の強み' : 'Market Strengths'}\n`;
    (ai.marketStrengths || []).forEach(s => csv += `"${s}"\n`);
    csv += `\n${isJa ? '市場のリスク' : 'Market Risks'}\n`;
    (ai.marketRisks || []).forEach(r => csv += `"${r}"\n`);
    csv += `\n${isJa ? '差別化ポイント' : 'Differentiation Points'}\n`;
    (ai.differentiationPoints || []).forEach(d => csv += `"${d}"\n`);
    csv += `\n${isJa ? '勝ち筋' : 'Winning Strategy'}\n`;
    csv += `"${ai.winningStrategy || ''}"\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `blue-ocean-${this.selectedMainGenre || 'analysis'}.csv`;
    link.click();

    UI.showToast(isJa ? 'CSVをダウンロードしました' : 'CSV downloaded', 'success');
  }
};

// Global Launch Commander ツール
const LaunchCommander = {
  currentStrategy: null,
  selectedYear: null,
  selectedMonth: null,
  selectedDay: null,
  selectedGenre: null,
  selectedCompletion: null,
  selectedBudget: 'low',

  // 年リスト（現在年から+3年）
  getYears() {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];
  },

  // 月リスト
  months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

  // 日リスト（月によって変動）
  getDays(year, month) {
    if (!year || !month) return Array.from({ length: 31 }, (_, i) => i + 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  },

  // ジャンルリスト
  genres: [
    'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation',
    'Puzzle', 'Horror', 'Platformer', 'Roguelike', 'Visual Novel',
    'Shooter', 'Fighting', 'Racing', 'Sports', 'Casual'
  ],

  // 完成度リスト
  completionLevels: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],

  // 予算リスト
  budgetLevels: [
    { value: 'low', labelJa: '〜50万円', labelEn: '< $5K' },
    { value: 'medium', labelJa: '50〜200万円', labelEn: '$5K-$20K' },
    { value: 'high', labelJa: '200万円〜', labelEn: '$20K+' }
  ],

  init() {
    // 選択状態をリセット
    this.selectedYear = null;
    this.selectedMonth = null;
    this.selectedDay = null;
    this.selectedGenre = null;
    this.selectedCompletion = 50;
    this.selectedBudget = 'low';
    this.renderPage();
    this.bindEvents();
  },

  renderPage() {
    const page = document.getElementById('launch-commander-page');
    const isJa = Lang.current === 'ja';

    page.innerHTML = `
      <header class="tool-header">
        <div class="tool-header-left">
          <button class="back-button" onclick="navigateTo('home')" title="${isJa ? 'ホームに戻る' : 'Back to Home'}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="tool-title">${Lang.get('toolLaunchCommander')}</h1>
        </div>
        ${UI.getLanguageSwitcher()}
      </header>

      ${AdManager.getToolHeaderAd()}

      <div id="lc-input-view">
        <section class="search-section">
          <h2 class="search-title">${isJa ? 'グローバル・ローンチ・コマンダー' : 'Global Launch Commander'}</h2>
          <p class="search-subtitle">${isJa ? 'リリース戦略を自動生成し、グローバル展開を最適化します' : 'Auto-generate release strategy and optimize global launch'}</p>

          <form class="concept-form" id="lc-form">
            <!-- リリース予定日 -->
            <div class="form-section">
              <h3 class="form-section-title">
                ${isJa ? 'リリース予定日' : 'Release Date'}
                <span class="required">${isJa ? '必須' : 'Required'}</span>
              </h3>
              <div class="date-selector-group">
                <div class="date-selector-row">
                  <div class="date-selector-label">${isJa ? '年' : 'Year'}</div>
                  <div class="tag-selector compact" id="year-selector">
                    ${this.getYears().map(year => `
                      <span class="tag-option" data-value="${year}">${year}</span>
                    `).join('')}
                  </div>
                </div>
                <div class="date-selector-row">
                  <div class="date-selector-label">${isJa ? '月' : 'Month'}</div>
                  <div class="tag-selector compact" id="month-selector">
                    ${this.months.map(month => `
                      <span class="tag-option" data-value="${month}">${month}${isJa ? '月' : ''}</span>
                    `).join('')}
                  </div>
                </div>
                <div class="date-selector-row">
                  <div class="date-selector-label">${isJa ? '日' : 'Day'}</div>
                  <div class="tag-selector compact" id="day-selector">
                    ${this.getDays().map(day => `
                      <span class="tag-option" data-value="${day}">${day}</span>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>

            <!-- メインジャンル -->
            <div class="form-section">
              <h3 class="form-section-title">
                ${isJa ? 'メインジャンル' : 'Main Genre'}
                <span class="required">${isJa ? '必須' : 'Required'}</span>
              </h3>
              <div class="tag-selector" id="genre-selector">
                ${this.genres.map(genre => `
                  <span class="tag-option" data-value="${genre}">${Lang.getTag('mainGenres', genre)}</span>
                `).join('')}
              </div>
            </div>

            <!-- 完成度 -->
            <div class="form-section">
              <h3 class="form-section-title">
                ${isJa ? '現在の完成度' : 'Completion'}
                <span class="optional">${isJa ? '任意' : 'Optional'}</span>
              </h3>
              <div class="tag-selector" id="completion-selector">
                ${this.completionLevels.map(level => `
                  <span class="tag-option ${level === 50 ? 'selected' : ''}" data-value="${level}">${level}%</span>
                `).join('')}
              </div>
            </div>

            <!-- 予算規模 -->
            <div class="form-section">
              <h3 class="form-section-title">
                ${isJa ? 'マーケティング予算' : 'Marketing Budget'}
                <span class="optional">${isJa ? '任意' : 'Optional'}</span>
              </h3>
              <div class="tag-selector" id="budget-selector">
                ${this.budgetLevels.map(budget => `
                  <span class="tag-option ${budget.value === 'low' ? 'selected' : ''}" data-value="${budget.value}">${isJa ? budget.labelJa : budget.labelEn}</span>
                `).join('')}
              </div>
            </div>

            <!-- 保有アセット -->
            <div class="form-section">
              <h3 class="form-section-title">
                ${isJa ? '保有アセット' : 'Available Assets'}
                <span class="optional">${isJa ? '複数可' : 'Multiple'}</span>
              </h3>
              <div class="tag-selector" id="asset-selector">
                <span class="tag-option" data-value="storePage">${isJa ? 'Steamストアページ' : 'Steam Store Page'}</span>
                <span class="tag-option" data-value="trailer">${isJa ? 'トレーラー' : 'Trailer'}</span>
                <span class="tag-option" data-value="demo">${isJa ? 'デモ版' : 'Demo'}</span>
                <span class="tag-option" data-value="pressKit">${isJa ? 'プレスキット' : 'Press Kit'}</span>
                <span class="tag-option" data-value="socialMedia">${isJa ? 'SNSアカウント' : 'Social Media'}</span>
              </div>
            </div>

            <!-- ターゲット地域 -->
            <div class="form-section">
              <h3 class="form-section-title">
                ${isJa ? 'ターゲット地域' : 'Target Regions'}
                <span class="required">${isJa ? '1つ以上選択' : 'Select at least 1'}</span>
              </h3>
              <div class="tag-selector" id="region-selector">
                <span class="tag-option selected" data-value="US">🇺🇸 ${isJa ? 'アメリカ' : 'US'}</span>
                <span class="tag-option selected" data-value="Japan">🇯🇵 ${isJa ? '日本' : 'Japan'}</span>
                <span class="tag-option" data-value="China">🇨🇳 ${isJa ? '中国' : 'China'}</span>
                <span class="tag-option" data-value="EU">🇪🇺 ${isJa ? '欧州' : 'Europe'}</span>
              </div>
            </div>

            <!-- ゲーム概要 -->
            <div class="form-section">
              <h3 class="form-section-title">
                ${isJa ? 'ゲームの概要' : 'Game Description'}
                <span class="optional">${isJa ? '任意・AIがより精度の高い戦略を生成' : 'Optional - helps AI generate better strategy'}</span>
              </h3>
              <textarea id="lc-game-description" class="concept-textarea"
                placeholder="${isJa ? 'ゲームの特徴、ストーリー、ユニークセリングポイントを記入してください（例：2Dドット絵のメトロイドヴァニア。ダークファンタジー世界で...' : 'Describe your game features, story, unique selling points (e.g., A 2D pixel-art metroidvania in a dark fantasy world...'}"
                rows="4"></textarea>
            </div>

            <!-- Steam ストアURL -->
            <div class="form-section">
              <h3 class="form-section-title">
                ${isJa ? 'Steam ストアURL' : 'Steam Store URL'}
                <span class="optional">${isJa ? '任意' : 'Optional'}</span>
              </h3>
              <input type="url" id="lc-steam-url" class="concept-input"
                placeholder="${isJa ? 'https://store.steampowered.com/app/xxxxxx/' : 'https://store.steampowered.com/app/xxxxxx/'}">
            </div>

            <!-- SNS アカウント -->
            <div class="form-section">
              <h3 class="form-section-title">
                ${isJa ? 'SNSアカウント' : 'Social Media Accounts'}
                <span class="optional">${isJa ? '任意・プロモーション戦略に活用' : 'Optional - used for promotion strategy'}</span>
              </h3>
              <div class="sns-inputs">
                <div class="sns-input-row">
                  <label class="sns-label">X (Twitter)</label>
                  <input type="text" id="lc-sns-twitter" class="concept-input sns-input"
                    placeholder="${isJa ? '@yourhandle' : '@yourhandle'}">
                </div>
                <div class="sns-input-row">
                  <label class="sns-label">Discord</label>
                  <input type="text" id="lc-sns-discord" class="concept-input sns-input"
                    placeholder="${isJa ? 'https://discord.gg/xxxxx' : 'https://discord.gg/xxxxx'}">
                </div>
                <div class="sns-input-row">
                  <label class="sns-label">YouTube</label>
                  <input type="text" id="lc-sns-youtube" class="concept-input sns-input"
                    placeholder="${isJa ? 'チャンネルURL' : 'Channel URL'}">
                </div>
              </div>
            </div>

            <button type="submit" class="btn btn-primary analyze-button" id="lc-generate-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              ${isJa ? '戦略を生成する' : 'Generate Strategy'}
            </button>
          </form>
        </section>
      </div>

      <div id="lc-results-view" class="hidden">
        <section class="results-section">
          <div class="results-header">
            <button class="csv-export-btn ${UserPlan.canUse('exportCSV') ? '' : 'pro-only'}" onclick="LaunchCommander.exportCSV()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              ${isJa ? 'CSV出力' : 'Export CSV'}
            </button>
          </div>
          <div id="lc-results">
            <!-- 動的に生成 -->
          </div>
        </section>
      </div>

      ${AdManager.getToolFooterAd()}
    `;
  },

  bindEvents() {
    const form = document.getElementById('lc-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.generateStrategy();
      });
    }

    // 年選択（単一）
    document.getElementById('year-selector')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-option')) {
        document.querySelectorAll('#year-selector .tag-option').forEach(el => el.classList.remove('selected'));
        e.target.classList.add('selected');
        this.selectedYear = parseInt(e.target.dataset.value);
        this.updateDaySelector();
      }
    });

    // 月選択（単一）
    document.getElementById('month-selector')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-option')) {
        document.querySelectorAll('#month-selector .tag-option').forEach(el => el.classList.remove('selected'));
        e.target.classList.add('selected');
        this.selectedMonth = parseInt(e.target.dataset.value);
        this.updateDaySelector();
      }
    });

    // 日選択（単一）
    document.getElementById('day-selector')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-option')) {
        document.querySelectorAll('#day-selector .tag-option').forEach(el => el.classList.remove('selected'));
        e.target.classList.add('selected');
        this.selectedDay = parseInt(e.target.dataset.value);
      }
    });

    // ジャンル選択（単一）
    document.getElementById('genre-selector')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-option')) {
        document.querySelectorAll('#genre-selector .tag-option').forEach(el => el.classList.remove('selected'));
        e.target.classList.add('selected');
        this.selectedGenre = e.target.dataset.value;
      }
    });

    // 完成度選択（単一）
    document.getElementById('completion-selector')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-option')) {
        document.querySelectorAll('#completion-selector .tag-option').forEach(el => el.classList.remove('selected'));
        e.target.classList.add('selected');
        this.selectedCompletion = parseInt(e.target.dataset.value);
      }
    });

    // 予算選択（単一）
    document.getElementById('budget-selector')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-option')) {
        document.querySelectorAll('#budget-selector .tag-option').forEach(el => el.classList.remove('selected'));
        e.target.classList.add('selected');
        this.selectedBudget = e.target.dataset.value;
      }
    });

    // アセット選択（複数可）
    document.getElementById('asset-selector')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-option')) {
        e.target.classList.toggle('selected');
      }
    });

    // 地域選択（複数可）
    document.getElementById('region-selector')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-option')) {
        e.target.classList.toggle('selected');
      }
    });

    // 言語切り替え
    UI.bindLanguageSwitcher();
  },

  updateDaySelector() {
    const days = this.getDays(this.selectedYear, this.selectedMonth);
    const daySelector = document.getElementById('day-selector');
    if (daySelector) {
      // 現在選択中の日が新しい月で無効なら解除
      if (this.selectedDay && this.selectedDay > days.length) {
        this.selectedDay = null;
      }
      daySelector.innerHTML = days.map(day => `
        <span class="tag-option ${this.selectedDay === day ? 'selected' : ''}" data-value="${day}">${day}</span>
      `).join('');
    }
  },

  async generateStrategy() {
    const isJa = Lang.current === 'ja';

    // 日付を組み立て
    if (!this.selectedYear || !this.selectedMonth || !this.selectedDay) {
      UI.showToast(isJa ? 'リリース日（年・月・日）を選択してください' : 'Please select release date (year, month, day)', 'error');
      return;
    }

    const releaseDate = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}-${String(this.selectedDay).padStart(2, '0')}`;

    if (!this.selectedGenre) {
      UI.showToast(isJa ? 'メインジャンルを選択してください' : 'Please select main genre', 'error');
      return;
    }

    // 選択された地域
    const targetRegions = [];
    document.querySelectorAll('#region-selector .tag-option.selected').forEach(el => {
      targetRegions.push(el.dataset.value);
    });

    if (targetRegions.length === 0) {
      UI.showToast(isJa ? '少なくとも1つの地域を選択してください' : 'Select at least one region', 'error');
      return;
    }

    // アセット
    const assets = {};
    document.querySelectorAll('#asset-selector .tag-option.selected').forEach(el => {
      assets[el.dataset.value] = true;
    });

    // 追加情報を取得
    const gameDescription = document.getElementById('lc-game-description')?.value?.trim() || '';
    const steamUrl = document.getElementById('lc-steam-url')?.value?.trim() || '';
    const snsAccounts = {
      twitter: document.getElementById('lc-sns-twitter')?.value?.trim() || '',
      discord: document.getElementById('lc-sns-discord')?.value?.trim() || '',
      youtube: document.getElementById('lc-sns-youtube')?.value?.trim() || ''
    };

    // ローディング表示
    UI.showLoading(isJa ? 'ローンチ戦略を生成中...' : 'Generating launch strategy...');

    try {
      const response = await fetch('/api/launch-commander/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          releaseDate,
          genre: this.selectedGenre,
          completionPercent: this.selectedCompletion || 50,
          assets,
          budget: this.selectedBudget || 'low',
          targetRegions,
          language: Lang.current,
          gameDescription,
          steamUrl,
          snsAccounts
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Strategy generation failed');
      }

      const result = await response.json();
      console.log('Launch Commander結果:', result);

      this.currentStrategy = result;

      // 結果ビューを表示
      document.getElementById('lc-input-view').classList.add('hidden');
      document.getElementById('lc-results-view').classList.remove('hidden');

      this.renderResults(result);
      UI.hideLoading();

    } catch (error) {
      console.error('戦略生成エラー:', error);
      UI.hideLoading();
      UI.showToast(isJa ? `エラー: ${error.message}` : `Error: ${error.message}`, 'error');
    }
  },

  renderResults(result) {
    const isJa = Lang.current === 'ja';
    const container = document.getElementById('lc-results');

    const daysUntil = result.daysUntilRelease ?? 0;
    const summary = result.aiStrategy?.executiveSummary || (isJa ? '戦略サマリを生成中...' : 'Generating strategy summary...');

    // 警告を生成
    const warningsHtml = (result.warnings || []).map(w => `
      <div class="lc-warning-item ${w.level}">
        <span class="lc-warning-icon">${w.level === 'critical' ? '🚨' : w.level === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <span class="lc-warning-text">${UI.escapeHtml(w.message)}</span>
      </div>
    `).join('');

    container.innerHTML = `
      <!-- サマリー -->
      <div class="lc-summary-card">
        <div class="lc-summary-header">
          <div class="lc-summary-text">
            <h4>${isJa ? '戦略サマリー' : 'Strategy Summary'}</h4>
            <p>${UI.escapeHtml(summary)}</p>
          </div>
          <div class="lc-days-counter">
            <div class="lc-days-number">${daysUntil}</div>
            <div class="lc-days-label">${isJa ? 'リリースまで' : 'days until'}</div>
          </div>
        </div>
      </div>

      <!-- 警告 -->
      ${warningsHtml ? `<div class="lc-warnings">${warningsHtml}</div>` : ''}

      <!-- タブ -->
      <div class="lc-tabs">
        <button class="lc-tab active" data-tab="gantt">${isJa ? 'スケジュール' : 'Schedule'}</button>
        <button class="lc-tab" data-tab="cases">${isJa ? '成功事例' : 'Case Studies'}</button>
        <button class="lc-tab" data-tab="regions">${isJa ? '地域戦略' : 'Regions'}</button>
        <button class="lc-tab" data-tab="events">${isJa ? 'イベント' : 'Events'}</button>
        <button class="lc-tab" data-tab="todo">${isJa ? 'To-Do' : 'To-Do'}</button>
      </div>

      <!-- ガントチャート -->
      <div class="lc-tab-content active" id="tab-gantt">
        ${this.renderGanttChart(result.ganttData)}
      </div>

      <!-- 成功事例 -->
      <div class="lc-tab-content" id="tab-cases">
        ${this.renderSuccessCases(result.successCases || [])}
      </div>

      <!-- 地域戦略 -->
      <div class="lc-tab-content" id="tab-regions">
        ${this.renderRegionalStrategies(result.regionalStrategies || [])}
      </div>

      <!-- イベント -->
      <div class="lc-tab-content" id="tab-events">
        ${this.renderEvents(result.relevantEvents || [])}
      </div>

      <!-- To-Do -->
      <div class="lc-tab-content" id="tab-todo">
        ${this.renderTodoList(result.todoList || [])}
      </div>

      <!-- Plan B セクション -->
      <div class="lc-planb-section">
        <h4>${isJa ? '遅延が発生した場合' : 'If Delay Occurs'}</h4>
        <p>${isJa ? '新しいリリース日を入力して戦略を再計算できます' : 'Enter a new release date to recalculate strategy'}</p>
        <button class="lc-planb-btn" onclick="LaunchCommander.showPlanBModal()">
          ${isJa ? 'Plan B を計算' : 'Calculate Plan B'}
        </button>
      </div>
    `;

    container.classList.add('active');
    this.bindTabEvents();
  },

  renderTimeline(timeline) {
    const isJa = Lang.current === 'ja';

    if (!timeline || timeline.length === 0) {
      return `<p>${isJa ? 'タイムラインデータがありません' : 'No timeline data'}</p>`;
    }

    const categoryLabels = {
      store: isJa ? 'ストア' : 'Store',
      marketing: isJa ? 'マーケ' : 'Marketing',
      pr: 'PR',
      event: isJa ? 'イベント' : 'Event',
      development: isJa ? '開発' : 'Dev',
      release: isJa ? 'リリース' : 'Release',
      support: isJa ? 'サポート' : 'Support'
    };

    const items = timeline.map(item => {
      const date = new Date(item.date);
      const dateStr = date.toLocaleDateString(isJa ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' });

      return `
        <div class="lc-timeline-item ${item.priority} ${item.isUrgent ? 'urgent' : ''} ${item.status === 'completed' ? 'completed' : ''}">
          <div class="lc-timeline-date">${dateStr} (${item.weeksFromNow > 0 ? `${item.weeksFromNow}${isJa ? '週後' : 'w'}` : isJa ? '過去' : 'past'})</div>
          <div class="lc-timeline-task">${UI.escapeHtml(item.task)}</div>
          <span class="lc-timeline-category">${categoryLabels[item.category] || item.category}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="lc-timeline">
        <div class="lc-timeline-header">
          <h4>${isJa ? 'ローンチタイムライン' : 'Launch Timeline'}</h4>
          <div class="lc-timeline-legend">
            <div class="lc-legend-item"><span class="lc-legend-dot critical"></span> ${isJa ? '必須' : 'Critical'}</div>
            <div class="lc-legend-item"><span class="lc-legend-dot high"></span> ${isJa ? '重要' : 'High'}</div>
            <div class="lc-legend-item"><span class="lc-legend-dot medium"></span> ${isJa ? '推奨' : 'Recommended'}</div>
          </div>
        </div>
        <div class="lc-timeline-items">
          ${items}
        </div>
      </div>
    `;
  },

  renderRegionalStrategies(strategies) {
    const isJa = Lang.current === 'ja';

    if (!strategies || strategies.length === 0) {
      return `<p>${isJa ? '地域戦略データがありません' : 'No regional strategy data'}</p>`;
    }

    const flags = { US: '🇺🇸', Japan: '🇯🇵', China: '🇨🇳', EU: '🇪🇺' };

    const cards = strategies.map(s => {
      const tipsHtml = (s.customTips || []).map(tip => `
        <div class="lc-region-tip">
          <span class="lc-region-tip-icon">💡</span>
          <span>${UI.escapeHtml(tip)}</span>
        </div>
      `).join('');

      return `
        <div class="lc-region-card">
          <div class="lc-region-header">
            <span class="flag">${flags[s.region] || '🌍'}</span>
            <h4>${isJa ? s.name : s.nameEn}</h4>
          </div>

          <div class="lc-region-section">
            <h5>${isJa ? 'プラットフォーム' : 'Platforms'}</h5>
            <div class="lc-region-tags">
              ${(s.platforms || []).map(p => `<span class="lc-region-tag">${UI.escapeHtml(p)}</span>`).join('')}
            </div>
          </div>

          <div class="lc-region-section">
            <h5>${isJa ? 'SNS' : 'Social Media'}</h5>
            <div class="lc-region-tags">
              ${(s.socialMedia || []).slice(0, 4).map(p => `<span class="lc-region-tag">${UI.escapeHtml(p)}</span>`).join('')}
            </div>
          </div>

          <div class="lc-region-section">
            <h5>${isJa ? 'インフルエンサー' : 'Influencers'}</h5>
            <div class="lc-region-tags">
              ${(s.influencerTypes || []).map(p => `<span class="lc-region-tag">${UI.escapeHtml(p)}</span>`).join('')}
            </div>
          </div>

          <div class="lc-region-section">
            <h5>${isJa ? '価格帯' : 'Price Range'}</h5>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">
              ${s.priceRange?.currency} ${s.priceRange?.min} - ${s.priceRange?.max}
            </p>
          </div>

          ${tipsHtml}
        </div>
      `;
    }).join('');

    return `<div class="lc-region-cards">${cards}</div>`;
  },

  renderEvents(events) {
    const isJa = Lang.current === 'ja';

    if (!events || events.length === 0) {
      return `<p>${isJa ? '関連イベントがありません' : 'No relevant events'}</p>`;
    }

    const items = events.filter(e => !e.isPast).slice(0, 10).map(event => {
      const date = new Date(event.startDate);
      const month = date.toLocaleDateString(isJa ? 'ja-JP' : 'en-US', { month: 'short' });
      const day = date.getDate();

      const actionLabels = {
        recommended: isJa ? '参加推奨' : 'Recommended',
        consider: isJa ? '検討' : 'Consider',
        prepare: isJa ? '準備' : 'Prepare',
        skip: isJa ? 'スキップ' : 'Skip',
        optional: isJa ? '任意' : 'Optional'
      };

      return `
        <div class="lc-event-item">
          <div class="lc-event-date-box">
            <div class="lc-event-month">${month}</div>
            <div class="lc-event-day">${day}</div>
          </div>
          <div class="lc-event-info">
            <div class="lc-event-name">${UI.escapeHtml(event.name)}</div>
            <span class="lc-event-importance ${event.importance}">${event.importance}</span>
            <p class="lc-event-recommendation">
              <span class="lc-event-action">${actionLabels[event.recommendation?.action] || ''}</span>
              - ${UI.escapeHtml(event.recommendation?.reason || '')}
            </p>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="lc-events-list">
        <h4>${isJa ? '関連イベント・セール' : 'Relevant Events & Sales'}</h4>
        ${items}
      </div>
    `;
  },

  renderTodoList(todos) {
    const isJa = Lang.current === 'ja';

    if (!todos || todos.length === 0) {
      return `<p>${isJa ? 'To-Doがありません' : 'No to-do items'}</p>`;
    }

    const priorityLabels = {
      critical: isJa ? '必須' : 'Critical',
      high: isJa ? '重要' : 'High',
      medium: isJa ? '推奨' : 'Medium',
      low: isJa ? '任意' : 'Low'
    };

    const items = todos.slice(0, 15).map((todo, index) => {
      const dueDate = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString(isJa ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' }) : '';

      return `
        <div class="lc-todo-item ${todo.isUrgent ? 'urgent' : ''}">
          <div class="lc-todo-checkbox" data-index="${index}"></div>
          <div class="lc-todo-content">
            <div class="lc-todo-task">${UI.escapeHtml(todo.task)}</div>
            <div class="lc-todo-meta">
              <span class="lc-todo-priority ${todo.priority}">${priorityLabels[todo.priority] || todo.priority}</span>
              ${dueDate ? `<span>${dueDate}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="lc-todo-list">
        <h4>${isJa ? '優先To-Doリスト' : 'Priority To-Do List'}</h4>
        ${items}
      </div>
    `;
  },

  renderGanttChart(ganttData) {
    const isJa = Lang.current === 'ja';

    if (!ganttData) {
      return `<p>${isJa ? 'スケジュールデータがありません' : 'No schedule data'}</p>`;
    }

    // 月ヘッダー
    const monthsHtml = ganttData.months.map(m => `
      <div class="lc-gantt-month ${m.isCurrent ? 'current' : ''} ${m.isRelease ? 'release' : ''}">
        ${m.label}
      </div>
    `).join('');

    // タスク行
    const taskRows = ganttData.tasks.map(task => `
      <div class="lc-gantt-row">
        <div class="lc-gantt-task-name">${UI.escapeHtml(task.name.substring(0, 20))}${task.name.length > 20 ? '...' : ''}</div>
        <div class="lc-gantt-bar-container">
          <div class="lc-gantt-bar ${task.priority} ${task.isCompleted ? 'completed' : ''}"
               style="left: ${task.startPercent}%; width: ${task.widthPercent}%;"
               title="${UI.escapeHtml(task.name)}">
          </div>
        </div>
      </div>
    `).join('');

    // イベント行
    const eventRows = ganttData.events.map(event => `
      <div class="lc-gantt-row">
        <div class="lc-gantt-task-name">🎯 ${UI.escapeHtml(event.name.substring(0, 18))}${event.name.length > 18 ? '...' : ''}</div>
        <div class="lc-gantt-bar-container">
          <div class="lc-gantt-bar event"
               style="left: ${event.startPercent}%; width: ${event.widthPercent}%;"
               title="${UI.escapeHtml(event.name)}">
          </div>
        </div>
      </div>
    `).join('');

    return `
      <div class="lc-gantt">
        <div class="lc-gantt-header">
          <h4>${isJa ? 'ローンチスケジュール' : 'Launch Schedule'}</h4>
          <div class="lc-timeline-legend">
            <div class="lc-legend-item"><span class="lc-legend-dot critical"></span> ${isJa ? '必須' : 'Critical'}</div>
            <div class="lc-legend-item"><span class="lc-legend-dot high"></span> ${isJa ? '重要' : 'High'}</div>
            <div class="lc-legend-item"><span class="lc-legend-dot event"></span> ${isJa ? 'イベント' : 'Event'}</div>
          </div>
        </div>
        <div class="lc-gantt-months">
          ${monthsHtml}
        </div>
        <div class="lc-gantt-rows" style="position: relative;">
          ${ganttData.todayPercent > 0 && ganttData.todayPercent < 100 ? `
            <div class="lc-gantt-today" style="left: ${ganttData.todayPercent}%;"></div>
          ` : ''}
          ${ganttData.releasePercent > 0 && ganttData.releasePercent < 100 ? `
            <div class="lc-gantt-release" style="left: ${ganttData.releasePercent}%;"></div>
          ` : ''}
          ${taskRows}
          ${eventRows}
        </div>
      </div>
    `;
  },

  renderSuccessCases(cases) {
    const isJa = Lang.current === 'ja';

    if (!cases || cases.length === 0) {
      return `<p>${isJa ? '成功事例データがありません' : 'No case study data'}</p>`;
    }

    const caseCards = cases.map(c => {
      const tacticsHtml = c.tactics.map(t => `<li>${UI.escapeHtml(t)}</li>`).join('');

      return `
        <div class="lc-case-card">
          <div class="lc-case-header">
            <div class="lc-case-image"></div>
            <div class="lc-case-info">
              <h5>${UI.escapeHtml(c.name)}</h5>
              <div class="lc-case-meta">${UI.escapeHtml(c.developer)} | ${c.releaseYear}</div>
            </div>
          </div>
          <div class="lc-case-stats">
            <div class="lc-case-stat">
              <div class="lc-case-stat-value">${(c.wishlists / 1000).toFixed(0)}K</div>
              <div class="lc-case-stat-label">${isJa ? 'ウィッシュリスト' : 'Wishlists'}</div>
            </div>
            <div class="lc-case-stat">
              <div class="lc-case-stat-value">${(c.firstWeekSales / 1000).toFixed(0)}K</div>
              <div class="lc-case-stat-label">${isJa ? '初週販売' : '1st Week'}</div>
            </div>
            <div class="lc-case-stat">
              <div class="lc-case-stat-value">${(c.totalSales / 1000000).toFixed(1)}M</div>
              <div class="lc-case-stat-label">${isJa ? '累計販売' : 'Total Sales'}</div>
            </div>
          </div>
          <div class="lc-case-tactics">
            <h6>${isJa ? 'マーケティング戦術' : 'Marketing Tactics'}</h6>
            <ul>${tacticsHtml}</ul>
          </div>
          <div class="lc-region-tip" style="margin-top: 12px;">
            <span class="lc-region-tip-icon">💡</span>
            <span>${UI.escapeHtml(c.lessonsLearned)}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="lc-marketing-cases">
        <h4>📊 ${isJa ? '同ジャンル成功事例' : 'Genre Success Cases'}</h4>
        <div class="lc-case-cards">
          ${caseCards}
        </div>
      </div>
    `;
  },

  bindTabEvents() {
    document.querySelectorAll('.lc-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        // タブのアクティブ状態を更新
        document.querySelectorAll('.lc-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // コンテンツの表示切り替え
        document.querySelectorAll('.lc-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      });
    });
  },

  showPlanBModal() {
    const isJa = Lang.current === 'ja';
    const newDate = prompt(isJa ? '新しいリリース日を入力 (YYYY-MM-DD):' : 'Enter new release date (YYYY-MM-DD):');

    if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      this.recalculateStrategy(newDate);
    } else if (newDate) {
      UI.showToast(isJa ? '日付形式が正しくありません' : 'Invalid date format', 'error');
    }
  },

  async recalculateStrategy(newDate) {
    const isJa = Lang.current === 'ja';
    UI.showLoading(isJa ? '戦略を再計算中...' : 'Recalculating strategy...');

    try {
      const response = await fetch('/api/launch-commander/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalStrategy: this.currentStrategy,
          newReleaseDate: newDate,
          reason: 'User requested delay'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Recalculation failed');
      }

      const result = await response.json();
      this.currentStrategy = result;
      this.renderResults(result);
      UI.hideLoading();
      UI.showToast(isJa ? '戦略を再計算しました' : 'Strategy recalculated', 'success');

    } catch (error) {
      console.error('再計算エラー:', error);
      UI.hideLoading();
      UI.showToast(isJa ? `エラー: ${error.message}` : `Error: ${error.message}`, 'error');
    }
  },

  exportCSV() {
    if (!UserPlan.canUse('exportCSV')) {
      UserPlan.showPricingModal();
      return;
    }

    const isJa = Lang.current === 'ja';
    const result = this.currentStrategy;

    if (!result) {
      UI.showToast(isJa ? 'エクスポートするデータがありません' : 'No data to export', 'error');
      return;
    }

    let csv = '\uFEFF';
    csv += `${isJa ? '発売予定日' : 'Target Launch Date'},${this.selectedYear}-${this.selectedMonth}-${this.selectedDay}\n`;
    csv += `${isJa ? 'ジャンル' : 'Genre'},${this.selectedGenre}\n`;
    csv += `${isJa ? '完成度' : 'Completion'},${this.selectedCompletion}%\n\n`;

    csv += `${isJa ? 'ローンチ戦略' : 'Launch Strategy'}\n`;
    csv += `${isJa ? '推奨発売日' : 'Recommended Date'},${result.launchStrategy?.recommendedDate || ''}\n`;
    csv += `${isJa ? '競争度' : 'Competition'},${result.launchStrategy?.competitionLevel || ''}\n\n`;

    csv += `${isJa ? 'マイルストーン' : 'Milestones'}\n`;
    csv += `${isJa ? '日付' : 'Date'},${isJa ? 'イベント' : 'Event'},${isJa ? 'タスク' : 'Tasks'}\n`;
    (result.milestones || []).forEach(m => {
      const tasks = (m.tasks || []).join('; ');
      csv += `${m.date},"${m.title}","${tasks}"\n`;
    });

    csv += `\n${isJa ? '地域別戦略' : 'Regional Strategies'}\n`;
    csv += `${isJa ? '地域' : 'Region'},${isJa ? '戦略' : 'Strategy'}\n`;
    Object.entries(result.regionalStrategies || {}).forEach(([region, strategy]) => {
      csv += `${region},"${strategy.summary || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `launch-commander-${this.selectedGenre}-${this.selectedYear}-${this.selectedMonth}.csv`;
    link.click();

    UI.showToast(isJa ? 'CSVをダウンロードしました' : 'CSV downloaded', 'success');
  }
};

// ==========================================
// Visual Trend Hunter
// ==========================================
const VisualTrend = {
  selectedGenre: 'Indie',
  selectedSourceType: 'coming_soon',
  trendingCapsules: [],
  trendAnalysis: null,
  userImage: null,
  currentTab: 'gallery',

  // 拡張されたジャンルリスト
  genres: ['Indie', 'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Horror', 'Roguelike', 'Platformer', 'Puzzle', 'Visual Novel'],

  // データソースタイプ
  sourceTypes: {
    coming_soon: { ja: '近日登場', en: 'Coming Soon' },
    new_releases: { ja: '新作リリース', en: 'New Releases' },
    popular_upcoming: { ja: '注目の近日登場', en: 'Popular Upcoming' }
  },

  init() {
    this.selectedGenre = 'Indie';
    this.selectedSourceType = 'coming_soon';
    this.trendingCapsules = [];
    this.trendAnalysis = null;
    this.userImage = null;
    this.currentTab = 'gallery';
    this.renderPage();
    this.bindEvents();
    this.loadTrendingCapsules();
  },

  renderPage() {
    const page = document.getElementById('visual-trend-page');
    const isJa = Lang.current === 'ja';

    page.innerHTML = `
      <header class="tool-header">
        <div class="tool-header-left">
          <button class="back-button" onclick="navigateTo('home')" title="${isJa ? 'ホームに戻る' : 'Back to Home'}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="tool-title">${Lang.get('toolVisualTrend')}</h1>
        </div>
        ${UI.getLanguageSwitcher()}
      </header>

      ${AdManager.getToolHeaderAd()}

      <div class="vt-container">
        <!-- ツール説明 -->
        <section class="vt-intro">
          <p class="vt-intro-text">
            ${isJa
              ? '近日登場・新作ゲームのバナー画像を純粋なビジュアルデザインの観点から分析します。既存の人気度やセール状況は考慮せず、バナー単体の品質を評価します。'
              : 'Analyze banner images of upcoming and new games from a pure visual design perspective. Popularity and sales status are not considered - only the banner quality itself.'}
          </p>
        </section>

        <!-- フィルターセクション -->
        <section class="vt-filter-section">
          <!-- ソースタイプ選択 -->
          <div class="vt-filter-row">
            <h3 class="vt-filter-label">${isJa ? 'データソース' : 'Data Source'}</h3>
            <div class="tag-selector" id="vt-source-selector">
              ${Object.entries(this.sourceTypes).map(([key, label]) => `
                <span class="tag-option ${key === this.selectedSourceType ? 'selected' : ''}" data-value="${key}">
                  ${isJa ? label.ja : label.en}
                </span>
              `).join('')}
            </div>
          </div>

          <!-- ジャンル選択 -->
          <div class="vt-filter-row">
            <h3 class="vt-filter-label">${isJa ? 'ジャンル' : 'Genre'}</h3>
            <div class="tag-selector" id="vt-genre-selector">
              ${this.genres.map(g => `
                <span class="tag-option ${g === this.selectedGenre ? 'selected' : ''}" data-value="${g}">${g}</span>
              `).join('')}
            </div>
          </div>
        </section>

        <!-- タブ切り替え -->
        <div class="vt-tabs">
          <button class="vt-tab active" data-tab="gallery">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            ${isJa ? 'バナーギャラリー' : 'Banner Gallery'}
          </button>
          <button class="vt-tab" data-tab="ranked">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            ${isJa ? 'AIスコアランキング' : 'AI Score Ranking'}
          </button>
          <button class="vt-tab" data-tab="analysis">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            ${isJa ? 'トレンド分析' : 'Trend Analysis'}
          </button>
          <button class="vt-tab" data-tab="compare">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
            </svg>
            ${isJa ? 'My画像と比較' : 'Compare My Image'}
          </button>
        </div>

        <!-- ギャラリータブ -->
        <div class="vt-tab-content active" id="vt-gallery-tab">
          <div class="vt-gallery" id="vt-capsule-gallery">
            <div class="vt-loading">${isJa ? '読み込み中...' : 'Loading...'}</div>
          </div>
        </div>

        <!-- AIスコアランキングタブ -->
        <div class="vt-tab-content" id="vt-ranked-tab">
          <div class="vt-ranked-container">
            <button class="btn btn-primary vt-analyze-btn" id="vt-load-ranked-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              ${isJa ? 'AIでバナーをスコアリング' : 'Score Banners with AI'}
            </button>
            <p class="vt-hint">${isJa ? '※ 上位6件をAIが純粋なビジュアル品質でスコアリングします' : '※ AI will score the top 6 banners by pure visual quality'}</p>
            <div id="vt-ranked-result"></div>
          </div>
        </div>

        <!-- トレンド分析タブ -->
        <div class="vt-tab-content" id="vt-analysis-tab">
          <div class="vt-analysis-container" id="vt-trend-analysis">
            <div class="vt-action-row">
              <button class="btn btn-primary vt-analyze-btn" id="vt-analyze-trends-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                ${isJa ? 'AI でトレンドを分析' : 'Analyze Trends with AI'}
              </button>
              <button class="csv-export-btn ${UserPlan.canUse('exportCSV') ? '' : 'pro-only'}" onclick="VisualTrend.exportCSV()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                ${isJa ? 'CSV出力' : 'Export CSV'}
              </button>
            </div>
            <div id="vt-analysis-result"></div>
          </div>
        </div>

        <!-- 比較タブ -->
        <div class="vt-tab-content" id="vt-compare-tab">
          <div class="vt-compare-container">
            <div class="vt-upload-area" id="vt-upload-area">
              <input type="file" id="vt-image-input" accept="image/*" hidden>
              <div class="vt-upload-placeholder" id="vt-upload-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
                <p>${isJa ? 'カプセル画像をドロップ または クリックして選択' : 'Drop capsule image or click to select'}</p>
                <span class="vt-upload-hint">${isJa ? '推奨: 616x353 または 231x87' : 'Recommended: 616x353 or 231x87'}</span>
              </div>
              <div class="vt-preview-container hidden" id="vt-preview-container">
                <img id="vt-preview-image" src="" alt="Preview">
                <button class="vt-remove-btn" id="vt-remove-image">×</button>
              </div>
            </div>
            <button class="btn btn-primary vt-compare-btn" id="vt-compare-btn" disabled>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
              </svg>
              ${isJa ? 'トレンドと比較する' : 'Compare with Trends'}
            </button>
            <div id="vt-compare-result"></div>
          </div>
        </div>
      </div>

      <!-- 画像詳細モーダル -->
      <div class="vt-modal hidden" id="vt-image-modal">
        <div class="vt-modal-overlay"></div>
        <div class="vt-modal-content">
          <button class="vt-modal-close" id="vt-modal-close">×</button>
          <div class="vt-modal-body" id="vt-modal-body"></div>
        </div>
      </div>

      ${AdManager.getToolFooterAd()}
    `;
  },

  bindEvents() {
    // ソースタイプ選択
    document.getElementById('vt-source-selector')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-option')) {
        document.querySelectorAll('#vt-source-selector .tag-option').forEach(el => el.classList.remove('selected'));
        e.target.classList.add('selected');
        this.selectedSourceType = e.target.dataset.value;
        this.loadTrendingCapsules();
      }
    });

    // ジャンル選択
    document.getElementById('vt-genre-selector')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-option')) {
        document.querySelectorAll('#vt-genre-selector .tag-option').forEach(el => el.classList.remove('selected'));
        e.target.classList.add('selected');
        this.selectedGenre = e.target.dataset.value;
        this.loadTrendingCapsules();
      }
    });

    // タブ切り替え
    document.querySelectorAll('.vt-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.vt-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.vt-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.dataset.tab;
        document.getElementById(`vt-${tabName}-tab`)?.classList.add('active');
        this.currentTab = tabName;
      });
    });

    // AIスコアランキングボタン
    document.getElementById('vt-load-ranked-btn')?.addEventListener('click', () => {
      this.loadRankedCapsules();
    });

    // トレンド分析ボタン
    document.getElementById('vt-analyze-trends-btn')?.addEventListener('click', () => {
      this.analyzeTrends();
    });

    // 画像アップロード
    const uploadArea = document.getElementById('vt-upload-area');
    const imageInput = document.getElementById('vt-image-input');

    uploadArea?.addEventListener('click', () => imageInput?.click());
    uploadArea?.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    uploadArea?.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });
    uploadArea?.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.handleImageUpload(file);
      }
    });

    imageInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleImageUpload(file);
    });

    document.getElementById('vt-remove-image')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearUserImage();
    });

    // 比較ボタン
    document.getElementById('vt-compare-btn')?.addEventListener('click', () => {
      this.compareWithTrends();
    });

    // モーダル閉じる
    document.getElementById('vt-modal-close')?.addEventListener('click', () => this.closeModal());
    document.querySelector('.vt-modal-overlay')?.addEventListener('click', () => this.closeModal());

    // 言語切り替え
    UI.bindLanguageSwitcher();
  },

  async loadTrendingCapsules() {
    const gallery = document.getElementById('vt-capsule-gallery');
    const isJa = Lang.current === 'ja';
    gallery.innerHTML = `<div class="vt-loading">${isJa ? '読み込み中...' : 'Loading...'}</div>`;

    try {
      const response = await fetch(
        `/api/visual-trend/trending?genre=${this.selectedGenre}&sourceType=${this.selectedSourceType}&limit=12`
      );
      const data = await response.json();

      if (!data.success) throw new Error(data.error);

      this.trendingCapsules = data.capsules;
      this.renderGallery();

    } catch (error) {
      console.error('データ取得エラー:', error);
      gallery.innerHTML = `<div class="vt-error">${isJa ? 'データの取得に失敗しました' : 'Failed to load data'}</div>`;
    }
  },

  async loadRankedCapsules() {
    const container = document.getElementById('vt-ranked-result');
    const isJa = Lang.current === 'ja';
    container.innerHTML = `<div class="vt-loading">${isJa ? 'AIがバナーを分析中...' : 'AI is analyzing banners...'}</div>`;

    try {
      const response = await fetch(
        `/api/visual-trend/ranked?genre=${this.selectedGenre}&sourceType=${this.selectedSourceType}&topN=6`
      );
      const data = await response.json();

      if (!data.success) throw new Error(data.error);

      this.renderRankedCapsules(data.capsules);

    } catch (error) {
      console.error('ランキング取得エラー:', error);
      container.innerHTML = `<div class="vt-error">${isJa ? 'スコアリングに失敗しました' : 'Failed to score banners'}</div>`;
    }
  },

  renderRankedCapsules(capsules) {
    const container = document.getElementById('vt-ranked-result');
    const isJa = Lang.current === 'ja';

    if (capsules.length === 0) {
      container.innerHTML = `<div class="vt-empty">${isJa ? 'データがありません' : 'No data available'}</div>`;
      return;
    }

    container.innerHTML = `
      <div class="vt-ranked-list">
        ${capsules.map((capsule, idx) => `
          <div class="vt-ranked-item" data-index="${idx}">
            <div class="vt-rank-badge">#${idx + 1}</div>
            <div class="vt-ranked-image">
              <img src="${capsule.capsuleUrl}" alt="${UI.escapeHtml(capsule.name)}" loading="lazy" onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22460%22 height=%22215%22><rect fill=%22%231a1a2e%22 width=%22100%25%22 height=%22100%25%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%236366f1%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2216%22>No Image</text></svg>';">
            </div>
            <div class="vt-ranked-info">
              <h3 class="vt-ranked-name">
                <a href="https://store.steampowered.com/app/${capsule.appId}" target="_blank" rel="noopener noreferrer" class="vt-game-link" onclick="event.stopPropagation();">
                  ${UI.escapeHtml(capsule.name)} <span class="vt-link-icon">↗</span>
                </a>
              </h3>
              <div class="vt-ranked-meta">
                <span class="vt-release-date">${capsule.releaseDate || 'TBD'}</span>
              </div>
              ${capsule.visualAnalysis ? `
                <div class="vt-score-bar">
                  <div class="vt-score-label">${isJa ? 'ビジュアルスコア' : 'Visual Score'}</div>
                  <div class="vt-score-track">
                    <div class="vt-score-fill" style="width: ${capsule.visualScore}%"></div>
                  </div>
                  <div class="vt-score-value">${capsule.visualScore}</div>
                </div>
                <div class="vt-score-breakdown">
                  <span title="${isJa ? '色使い' : 'Color'}">🎨 ${capsule.visualAnalysis.visualScore?.colorImpact || '-'}</span>
                  <span title="${isJa ? '構図' : 'Composition'}">📐 ${capsule.visualAnalysis.visualScore?.compositionBalance || '-'}</span>
                  <span title="${isJa ? '可読性' : 'Readability'}">👁 ${capsule.visualAnalysis.visualScore?.readability || '-'}</span>
                  <span title="${isJa ? '独自性' : 'Uniqueness'}">✨ ${capsule.visualAnalysis.visualScore?.uniqueness || '-'}</span>
                </div>
                <p class="vt-first-impression">"${capsule.visualAnalysis.firstImpression || ''}"</p>
              ` : `
                <div class="vt-no-analysis">${isJa ? '分析失敗' : 'Analysis failed'}</div>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // クリックで詳細表示
    container.querySelectorAll('.vt-ranked-item').forEach((item, idx) => {
      item.addEventListener('click', () => {
        this.showCapsuleDetail(capsules[idx]);
      });
    });
  },

  renderGallery() {
    const gallery = document.getElementById('vt-capsule-gallery');
    const isJa = Lang.current === 'ja';

    if (this.trendingCapsules.length === 0) {
      gallery.innerHTML = `<div class="vt-empty">${isJa ? 'データがありません' : 'No data available'}</div>`;
      return;
    }

    gallery.innerHTML = this.trendingCapsules.map((capsule, idx) => `
      <div class="vt-capsule-card" data-index="${idx}">
        <div class="vt-capsule-image">
          <img src="${capsule.capsuleUrl}" alt="${UI.escapeHtml(capsule.name)}" loading="lazy" onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22460%22 height=%22215%22><rect fill=%22%231a1a2e%22 width=%22100%25%22 height=%22100%25%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%236366f1%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2216%22>No Image</text></svg>';">
          <div class="vt-capsule-overlay">
            <span class="vt-analyze-icon" title="${isJa ? 'AI分析' : 'AI Analysis'}">🔍</span>
          </div>
        </div>
        <div class="vt-capsule-info">
          <h3 class="vt-capsule-name">
            <a href="https://store.steampowered.com/app/${capsule.appId}" target="_blank" rel="noopener noreferrer" class="vt-game-link" onclick="event.stopPropagation();">
              ${UI.escapeHtml(capsule.name)} <span class="vt-link-icon">↗</span>
            </a>
          </h3>
          <div class="vt-capsule-meta">
            <span class="vt-release-date">${capsule.releaseDate || 'TBD'}</span>
            <span class="vt-price">${capsule.price || ''}</span>
          </div>
        </div>
      </div>
    `).join('');

    // カードクリックイベント
    gallery.querySelectorAll('.vt-capsule-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.index);
        this.showCapsuleDetail(this.trendingCapsules[idx]);
      });
    });
  },

  formatNumber(num) {
    if (!num) return '-';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  },

  async showCapsuleDetail(capsule) {
    const modal = document.getElementById('vt-image-modal');
    const body = document.getElementById('vt-modal-body');
    const isJa = Lang.current === 'ja';

    const imgUrl = capsule.capsuleLargeUrl || capsule.capsuleUrl;
    const fallbackImg = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22616%22 height=%22353%22><rect fill=%22%231a1a2e%22 width=%22100%25%22 height=%22100%25%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%236366f1%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2220%22>No Image</text></svg>";

    body.innerHTML = `
      <div class="vt-modal-loading">
        <img src="${imgUrl}" alt="${UI.escapeHtml(capsule.name)}" onerror="this.onerror=null;this.src='${fallbackImg}';">
        <h2>${UI.escapeHtml(capsule.name)}</h2>
        <p>${isJa ? 'AI分析中...' : 'Analyzing with AI...'}</p>
        <div class="loading-spinner"></div>
      </div>
    `;
    modal.classList.remove('hidden');

    try {
      const response = await fetch('/api/visual-trend/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: capsule.capsuleUrl })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message || data.error);

      this.renderCapsuleAnalysis(capsule, data.analysis);

    } catch (error) {
      console.error('分析エラー:', error);
      body.innerHTML = `
        <div class="vt-modal-error">
          <img src="${imgUrl}" alt="${UI.escapeHtml(capsule.name)}" onerror="this.onerror=null;this.src='${fallbackImg}';">
          <h2>${UI.escapeHtml(capsule.name)}</h2>
          <p class="error">${isJa ? '分析に失敗しました' : 'Analysis failed'}: ${error.message}</p>
          <p class="error-hint">${isJa ? '※ 画像が正しく取得できない場合があります。他のゲームをお試しください。' : 'The image may not be retrievable. Please try another game.'}</p>
        </div>
      `;
    }
  },

  renderCapsuleAnalysis(capsule, analysis) {
    const body = document.getElementById('vt-modal-body');
    const isJa = Lang.current === 'ja';

    // v2: visualScore.overall を使用
    const score = analysis.visualScore?.overall || 0;
    const scoreClass = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';
    const storeUrl = `https://store.steampowered.com/app/${capsule.appId}`;
    const fallbackImg = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22616%22 height=%22353%22><rect fill=%22%231a1a2e%22 width=%22100%25%22 height=%22100%25%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%236366f1%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2220%22>No Image</text></svg>";

    body.innerHTML = `
      <div class="vt-detail-header">
        <img src="${capsule.capsuleLargeUrl || capsule.capsuleUrl}" alt="${UI.escapeHtml(capsule.name)}" onerror="this.onerror=null;this.src='${fallbackImg}';">
        <div class="vt-detail-meta">
          <h2>
            <a href="${storeUrl}" target="_blank" rel="noopener noreferrer" class="vt-store-link">
              ${UI.escapeHtml(capsule.name)}
              <span class="vt-external-icon">↗</span>
            </a>
          </h2>
          <div class="vt-detail-stats">
            <span>${capsule.releaseDate || 'TBD'}</span>
            <span>${capsule.price || ''}</span>
          </div>
          <a href="${storeUrl}" target="_blank" rel="noopener noreferrer" class="vt-steam-btn">
            🎮 ${isJa ? 'Steamで見る' : 'View on Steam'}
          </a>
        </div>
      </div>

      <div class="vt-clickability-score ${scoreClass}">
        <div class="vt-score-label">${isJa ? 'ビジュアルスコア' : 'Visual Score'}</div>
        <div class="vt-score-value">${score}<span>/100</span></div>
      </div>

      <!-- スコア内訳 -->
      <div class="vt-score-details">
        <div class="vt-score-item">
          <span class="vt-score-item-label">🎨 ${isJa ? '色彩' : 'Color'}</span>
          <div class="vt-mini-bar"><div class="vt-mini-fill" style="width: ${analysis.visualScore?.colorImpact || 0}%"></div></div>
          <span class="vt-score-item-value">${analysis.visualScore?.colorImpact || 0}</span>
        </div>
        <div class="vt-score-item">
          <span class="vt-score-item-label">📐 ${isJa ? '構図' : 'Composition'}</span>
          <div class="vt-mini-bar"><div class="vt-mini-fill" style="width: ${analysis.visualScore?.compositionBalance || 0}%"></div></div>
          <span class="vt-score-item-value">${analysis.visualScore?.compositionBalance || 0}</span>
        </div>
        <div class="vt-score-item">
          <span class="vt-score-item-label">👁 ${isJa ? '可読性' : 'Readability'}</span>
          <div class="vt-mini-bar"><div class="vt-mini-fill" style="width: ${analysis.visualScore?.readability || 0}%"></div></div>
          <span class="vt-score-item-value">${analysis.visualScore?.readability || 0}</span>
        </div>
        <div class="vt-score-item">
          <span class="vt-score-item-label">✨ ${isJa ? '独自性' : 'Uniqueness'}</span>
          <div class="vt-mini-bar"><div class="vt-mini-fill" style="width: ${analysis.visualScore?.uniqueness || 0}%"></div></div>
          <span class="vt-score-item-value">${analysis.visualScore?.uniqueness || 0}</span>
        </div>
        <div class="vt-score-item">
          <span class="vt-score-item-label">💖 ${isJa ? '感情訴求' : 'Emotional'}</span>
          <div class="vt-mini-bar"><div class="vt-mini-fill" style="width: ${analysis.visualScore?.emotionalAppeal || 0}%"></div></div>
          <span class="vt-score-item-value">${analysis.visualScore?.emotionalAppeal || 0}</span>
        </div>
      </div>

      <!-- 第一印象 -->
      ${analysis.firstImpression ? `
        <div class="vt-first-impression-box">
          <h4>💭 ${isJa ? '第一印象' : 'First Impression'}</h4>
          <p>"${UI.escapeHtml(analysis.firstImpression)}"</p>
        </div>
      ` : ''}

      <div class="vt-analysis-tags">
        <div class="vt-tag-group">
          <span class="vt-tag-label">${isJa ? 'アートスタイル' : 'Art Style'}</span>
          <span class="vt-tag" style="background: var(--accent)">${analysis.artStyle || '-'}</span>
        </div>
        <div class="vt-tag-group">
          <span class="vt-tag-label">${isJa ? '色使い' : 'Color Scheme'}</span>
          <span class="vt-tag" style="background: var(--secondary)">${analysis.colorScheme || '-'}</span>
        </div>
        <div class="vt-tag-group">
          <span class="vt-tag-label">${isJa ? '構図' : 'Composition'}</span>
          <span class="vt-tag" style="background: #8b5cf6">${analysis.composition || '-'}</span>
        </div>
      </div>

      ${analysis.appeals?.length ? `
        <div class="vt-appeals">
          <h4>${isJa ? 'アピール要素' : 'Appeal Factors'}</h4>
          <div class="vt-appeal-tags">
            ${analysis.appeals.map(a => `<span class="vt-appeal-tag">#${a}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <div class="vt-analysis-section">
        <h4>✓ ${isJa ? 'デザインの強み' : 'Design Strengths'}</h4>
        <ul class="vt-strengths">
          ${(analysis.designStrengths || []).map(s => `<li>✓ ${UI.escapeHtml(s)}</li>`).join('')}
        </ul>
      </div>

      ${analysis.designWeaknesses?.length ? `
        <div class="vt-analysis-section">
          <h4>△ ${isJa ? '改善点' : 'Areas for Improvement'}</h4>
          <ul class="vt-weaknesses">
            ${analysis.designWeaknesses.map(w => `<li>△ ${UI.escapeHtml(w)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${analysis.designTips?.length ? `
        <div class="vt-analysis-section">
          <h4>💡 ${isJa ? 'デザインアドバイス' : 'Design Tips'}</h4>
          <ul class="vt-tips">
            ${analysis.designTips.map(t => `<li>→ ${UI.escapeHtml(t)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${analysis.targetGenreMatch ? `
        <div class="vt-analysis-section">
          <h4>🎯 ${isJa ? 'マッチするジャンル' : 'Matching Genres'}</h4>
          <p>${UI.escapeHtml(analysis.targetGenreMatch)}</p>
        </div>
      ` : ''}

      ${analysis.similarVisualStyle?.length ? `
        <div class="vt-analysis-section">
          <h4>🎮 ${isJa ? '似たビジュアルスタイルの作品' : 'Similar Visual Style'}</h4>
          <div class="vt-similar-games">
            ${analysis.similarVisualStyle.map(g => `<span class="vt-similar-tag">${UI.escapeHtml(g)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    `;
  },

  closeModal() {
    document.getElementById('vt-image-modal')?.classList.add('hidden');
  },

  async analyzeTrends() {
    const resultDiv = document.getElementById('vt-analysis-result');
    const isJa = Lang.current === 'ja';

    resultDiv.innerHTML = `
      <div class="vt-analyzing">
        <div class="loading-spinner"></div>
        <p>${isJa ? 'AI がトレンドパターンを分析中...' : 'AI is analyzing trend patterns...'}</p>
      </div>
    `;

    try {
      const response = await fetch('/api/visual-trend/analyze-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: this.selectedGenre })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      this.trendAnalysis = data.trendAnalysis;
      this.renderTrendAnalysis(data);

    } catch (error) {
      console.error('トレンド分析エラー:', error);
      resultDiv.innerHTML = `<div class="vt-error">${isJa ? '分析に失敗しました' : 'Analysis failed'}: ${error.message}</div>`;
    }
  },

  renderTrendAnalysis(data) {
    const resultDiv = document.getElementById('vt-analysis-result');
    const isJa = Lang.current === 'ja';
    const analysis = data.trendAnalysis;

    resultDiv.innerHTML = `
      <div class="vt-trend-summary">
        <h3>${isJa ? `${this.selectedGenre} ジャンルのトレンド` : `${this.selectedGenre} Genre Trends`}</h3>

        <div class="vt-trend-cards">
          <div class="vt-trend-card">
            <div class="vt-trend-card-label">${isJa ? '主流アートスタイル' : 'Dominant Art Style'}</div>
            <div class="vt-trend-card-value">${analysis.dominantArtStyle || '-'}</div>
          </div>
          <div class="vt-trend-card">
            <div class="vt-trend-card-label">${isJa ? '主流カラー' : 'Dominant Colors'}</div>
            <div class="vt-trend-card-value">${analysis.dominantColorScheme || '-'}</div>
          </div>
          <div class="vt-trend-card">
            <div class="vt-trend-card-label">${isJa ? '主流構図' : 'Dominant Composition'}</div>
            <div class="vt-trend-card-value">${analysis.dominantComposition || '-'}</div>
          </div>
          <div class="vt-trend-card">
            <div class="vt-trend-card-label">${isJa ? '平均クリック率' : 'Avg Clickability'}</div>
            <div class="vt-trend-card-value score">${analysis.avgClickability || 0}<span>/100</span></div>
          </div>
        </div>

        ${analysis.popularAppeals?.length ? `
          <div class="vt-popular-appeals">
            <h4>${isJa ? '人気のアピール要素' : 'Popular Appeal Factors'}</h4>
            <div class="vt-appeal-tags">
              ${analysis.popularAppeals.map(a => `<span class="vt-appeal-tag hot">#${a}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="vt-individual-analyses">
          <h4>${isJa ? '分析済みカプセル' : 'Analyzed Capsules'}</h4>
          <div class="vt-mini-gallery">
            ${data.capsules.slice(0, 5).map((c, i) => `
              <div class="vt-mini-capsule">
                <img src="${c.capsuleSmallUrl}" alt="${UI.escapeHtml(c.name)}">
                <span class="vt-mini-score">${analysis.individualAnalyses?.[i]?.clickability?.score || '?'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.userImage = e.target.result;
      document.getElementById('vt-upload-placeholder')?.classList.add('hidden');
      const previewContainer = document.getElementById('vt-preview-container');
      const previewImage = document.getElementById('vt-preview-image');
      previewContainer?.classList.remove('hidden');
      if (previewImage) previewImage.src = this.userImage;
      document.getElementById('vt-compare-btn').disabled = false;
    };
    reader.readAsDataURL(file);
  },

  clearUserImage() {
    this.userImage = null;
    document.getElementById('vt-upload-placeholder')?.classList.remove('hidden');
    document.getElementById('vt-preview-container')?.classList.add('hidden');
    document.getElementById('vt-compare-btn').disabled = true;
    document.getElementById('vt-compare-result').innerHTML = '';
  },

  async compareWithTrends() {
    if (!this.userImage) return;

    const resultDiv = document.getElementById('vt-compare-result');
    const isJa = Lang.current === 'ja';

    resultDiv.innerHTML = `
      <div class="vt-analyzing">
        <div class="loading-spinner"></div>
        <p>${isJa ? 'AI が画像を分析してトレンドと比較中...' : 'AI is comparing your image with trends...'}</p>
      </div>
    `;

    try {
      const response = await fetch('/api/visual-trend/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userImage: this.userImage,
          genre: this.selectedGenre
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      this.renderComparisonResult(data);

    } catch (error) {
      console.error('比較エラー:', error);
      resultDiv.innerHTML = `<div class="vt-error">${isJa ? '比較に失敗しました' : 'Comparison failed'}: ${error.message}</div>`;
    }
  },

  renderComparisonResult(data) {
    const resultDiv = document.getElementById('vt-compare-result');
    const isJa = Lang.current === 'ja';
    const comparison = data.comparison;
    const userAnalysis = comparison.userAnalysis;
    const comp = comparison.comparison;

    const alignScore = comp?.trendAlignment || 0;
    const alignClass = alignScore >= 70 ? 'high' : alignScore >= 40 ? 'mid' : 'low';

    resultDiv.innerHTML = `
      <div class="vt-comparison-result">
        <h3>${isJa ? 'あなたのカプセル分析結果' : 'Your Capsule Analysis'}</h3>

        <div class="vt-your-analysis">
          <div class="vt-score-row">
            <div class="vt-clickability-score ${userAnalysis?.clickabilityScore >= 70 ? 'high' : userAnalysis?.clickabilityScore >= 40 ? 'mid' : 'low'}">
              <div class="vt-score-label">${isJa ? 'クリック率スコア' : 'Clickability'}</div>
              <div class="vt-score-value">${userAnalysis?.clickabilityScore || 0}<span>/100</span></div>
            </div>
            <div class="vt-clickability-score ${alignClass}">
              <div class="vt-score-label">${isJa ? 'トレンド一致度' : 'Trend Alignment'}</div>
              <div class="vt-score-value">${alignScore}<span>/100</span></div>
            </div>
          </div>

          <div class="vt-analysis-tags">
            <div class="vt-tag-group">
              <span class="vt-tag-label">${isJa ? 'アートスタイル' : 'Art Style'}</span>
              <span class="vt-tag">${userAnalysis?.artStyle || '-'}</span>
            </div>
            <div class="vt-tag-group">
              <span class="vt-tag-label">${isJa ? '色使い' : 'Color Scheme'}</span>
              <span class="vt-tag">${userAnalysis?.colorScheme || '-'}</span>
            </div>
            <div class="vt-tag-group">
              <span class="vt-tag-label">${isJa ? '構図' : 'Composition'}</span>
              <span class="vt-tag">${userAnalysis?.composition || '-'}</span>
            </div>
          </div>
        </div>

        <div class="vt-trend-match ${comp?.matchesTrend ? 'match' : 'no-match'}">
          <span class="vt-match-icon">${comp?.matchesTrend ? '✓' : '△'}</span>
          <span>${comp?.matchesTrend ? (isJa ? 'トレンドに沿っています' : 'Matches current trends') : (isJa ? 'トレンドと異なる方向性' : 'Different from trends')}</span>
        </div>

        ${comp?.standoutFactor ? `
          <div class="vt-standout">
            <h4>${isJa ? '独自性ポイント' : 'Standout Factor'}</h4>
            <p>${UI.escapeHtml(comp.standoutFactor)}</p>
          </div>
        ` : ''}

        <div class="vt-recommendations">
          <h4>${isJa ? '改善提案' : 'Recommendations'}</h4>
          <ul>
            ${(comparison.recommendations || []).map(r => `<li>${UI.escapeHtml(r)}</li>`).join('')}
          </ul>
        </div>

        <div class="vt-verdict">
          <h4>${isJa ? '総合評価' : 'Verdict'}</h4>
          <p>${UI.escapeHtml(comparison.verdict || '')}</p>
        </div>
      </div>
    `;
  },

  exportCSV() {
    if (!UserPlan.canUse('exportCSV')) {
      UserPlan.showPricingModal();
      return;
    }

    const isJa = Lang.current === 'ja';
    const analysis = this.trendAnalysis;

    if (!analysis && this.trendingCapsules.length === 0) {
      UI.showToast(isJa ? 'エクスポートするデータがありません' : 'No data to export', 'error');
      return;
    }

    let csv = '\uFEFF';
    csv += `${isJa ? 'ジャンル' : 'Genre'},${this.selectedGenre}\n`;
    csv += `${isJa ? 'データソース' : 'Data Source'},${this.selectedSourceType}\n\n`;

    // カプセル画像リスト
    csv += `${isJa ? 'バナー画像一覧' : 'Banner Images'}\n`;
    csv += `${isJa ? 'ゲーム名' : 'Game Name'},${isJa ? 'スコア' : 'Score'},URL\n`;
    (this.trendingCapsules || []).forEach(cap => {
      csv += `"${cap.name || ''}",${cap.score || 'N/A'},"${cap.imageUrl || ''}"\n`;
    });

    // トレンド分析
    if (analysis) {
      csv += `\n${isJa ? 'トレンド分析' : 'Trend Analysis'}\n`;
      csv += `\n${isJa ? '共通パターン' : 'Common Patterns'}\n`;
      (analysis.commonPatterns || []).forEach(p => csv += `"${p}"\n`);
      csv += `\n${isJa ? 'カラートレンド' : 'Color Trends'}\n`;
      (analysis.colorTrends || []).forEach(c => csv += `"${c}"\n`);
      csv += `\n${isJa ? 'スタイルトレンド' : 'Style Trends'}\n`;
      (analysis.styleTrends || []).forEach(s => csv += `"${s}"\n`);
      csv += `\n${isJa ? '推奨事項' : 'Recommendations'}\n`;
      (analysis.recommendations || []).forEach(r => csv += `"${r}"\n`);
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `visual-trend-${this.selectedGenre}-${this.selectedSourceType}.csv`;
    link.click();

    UI.showToast(isJa ? 'CSVをダウンロードしました' : 'CSV downloaded', 'success');
  }
};

// Steamlytic（Steam市場分析ツール）
const Steamlytic = {
  initialized: false,
  iframe: null,

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.renderPage();
    this.bindEvents();
  },

  renderPage() {
    const page = document.getElementById('steamlytic-page');
    const isJa = Lang.current === 'ja';

    page.innerHTML = `
      <header class="tool-header steamlytic-header">
        <div class="tool-header-left">
          <button class="back-button" onclick="navigateTo('home')" title="${isJa ? 'ホームに戻る' : 'Back to Home'}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="tool-title">${Lang.get('toolSteamlytic')}</h1>
        </div>
        ${UI.getLanguageSwitcher()}
      </header>

      ${AdManager.getToolHeaderAd()}

      <div id="steamlytic-search-view">
        <section class="search-section">
          <h2 class="search-title">${isJa ? 'Steamゲーム分析' : 'Steam Game Analysis'}</h2>
          <p class="search-subtitle">${isJa ? 'SteamストアのURLを入力して、ゲームをプールリストに追加します' : 'Enter a Steam store URL to add the game to your pool list'}</p>

          <form class="search-form" id="steamlytic-search-form">
            <input
              type="text"
              class="input-field"
              id="steamlytic-url"
              placeholder="https://store.steampowered.com/app/12345/..."
              autocomplete="off"
            >
            <button type="submit" class="btn btn-primary" id="steamlytic-add-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" x2="12" y1="5" y2="19"/>
                <line x1="5" x2="19" y1="12" y2="12"/>
              </svg>
              ${isJa ? '追加' : 'Add'}
            </button>
          </form>
        </section>
      </div>

      <div class="steamlytic-container">
        <iframe
          id="steamlytic-iframe"
          src="/steamlytic_v8.html?embed=true&lang=${Lang.current}"
          class="steamlytic-iframe"
          frameborder="0"
          allowfullscreen>
        </iframe>
      </div>
    `;

    this.iframe = document.getElementById('steamlytic-iframe');
  },

  bindEvents() {
    const form = document.getElementById('steamlytic-search-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('steamlytic-url');
        const url = input.value.trim();

        if (!url) return;

        // AppIDを抽出
        const appIdMatch = url.match(/\/app\/(\d+)/);
        if (!appIdMatch) {
          UI.showToast(Lang.current === 'ja' ? '有効なSteam URLを入力してください' : 'Please enter a valid Steam URL', 'error');
          return;
        }

        const appId = appIdMatch[1];

        // iframeにメッセージを送信
        if (this.iframe && this.iframe.contentWindow) {
          this.iframe.contentWindow.postMessage({ type: 'ADD_GAME', appId: appId }, '*');
          input.value = '';
          UI.showToast(Lang.current === 'ja' ? `AppID ${appId} を追加中...` : `Adding AppID ${appId}...`, 'success');
        }
      });
    }

    // 言語切り替え
    UI.bindLanguageSwitcher();

    // Listen for view changes from iframe
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'VIEW_CHANGE') {
        const searchView = document.getElementById('steamlytic-search-view');
        if (searchView) {
          // Hide search section when viewing detail, show otherwise
          searchView.style.display = event.data.view === 'detail' ? 'none' : 'block';
        }
      }
    });
  },

  toggleFullscreen() {
    const container = document.querySelector('.steamlytic-container');
    const header = document.querySelector('.steamlytic-header');
    const searchView = document.getElementById('steamlytic-search-view');

    if (container.classList.contains('fullscreen')) {
      container.classList.remove('fullscreen');
      header.style.display = '';
      if (searchView) searchView.style.display = '';
    } else {
      container.classList.add('fullscreen');
      if (searchView) searchView.style.display = 'none';
    }
  },

  openInNewWindow() {
    window.open('/steamlytic_v8.html', '_blank', 'width=1400,height=900');
  },

  // 言語切り替え時にヘッダーと検索セクションを更新（iframeはリロードしない）
  updateHeader() {
    const isJa = Lang.current === 'ja';

    // ヘッダータイトルを更新
    const toolTitle = document.querySelector('#steamlytic-page .tool-title');
    if (toolTitle) {
      toolTitle.textContent = Lang.get('toolSteamlytic');
    }

    // 戻るボタンのtitleを更新
    const backButton = document.querySelector('#steamlytic-page .back-button');
    if (backButton) {
      backButton.title = isJa ? 'ホームに戻る' : 'Back to Home';
    }

    // 検索セクションのテキストを更新
    const searchTitle = document.querySelector('#steamlytic-search-view .search-title');
    if (searchTitle) {
      searchTitle.textContent = isJa ? 'Steamゲーム分析' : 'Steam Game Analysis';
    }

    const searchSubtitle = document.querySelector('#steamlytic-search-view .search-subtitle');
    if (searchSubtitle) {
      searchSubtitle.textContent = isJa ? 'SteamストアのURLを入力して、ゲームをプールリストに追加します' : 'Enter a Steam store URL to add the game to your pool list';
    }

    // 追加ボタンのテキストを更新
    const addBtn = document.getElementById('steamlytic-add-btn');
    if (addBtn) {
      // SVG + テキストなので、テキストノードだけを更新
      const textNode = Array.from(addBtn.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (textNode) {
        textNode.textContent = isJa ? '追加' : 'Add';
      } else {
        // テキストノードがない場合、SVGの後に追加
        addBtn.innerHTML = addBtn.innerHTML.replace(/追加|Add/g, '') + (isJa ? '追加' : 'Add');
      }
    }

    // 言語ボタンを更新
    const langSwitcher = document.querySelector('#steamlytic-page .language-switcher');
    if (langSwitcher) {
      langSwitcher.innerHTML = `
        <button class="lang-btn ${isJa ? 'active' : ''}" data-lang="ja">日本語</button>
        <button class="lang-btn ${!isJa ? 'active' : ''}" data-lang="en">EN</button>
      `;
      // 新しいボタンにイベントを再設定
      UI.bindLanguageSwitcher();
    }
  }
};

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  // サーバー状態確認
  try {
    const status = await API.checkStatus();
    if (!status.aiEnabled) {
      console.warn('AI機能が無効です。.envファイルにAPIキーを設定してください。');
    }
  } catch (error) {
    console.error('サーバー接続エラー:', error);
  }
});
