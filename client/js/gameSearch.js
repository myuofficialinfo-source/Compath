/**
 * Steamゲーム検索ツール
 * タグを選択してSteamゲームを検索
 */

const GameSearch = {
  initialized: false,
  selectedTags: [],
  searchResults: [],
  isLoading: false,

  // Steamタグ一覧（人気順）
  tags: {
    genres: [
      'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation',
      'Puzzle', 'Platformer', 'Shooter', 'Racing', 'Sports',
      'Fighting', 'Horror', 'Survival', 'Roguelike', 'Roguelite',
      'Metroidvania', 'Visual Novel', 'JRPG', 'Tactical', 'Tower Defense'
    ],
    themes: [
      'Fantasy', 'Sci-fi', 'Anime', 'Pixel Graphics', 'Retro',
      'Dark', 'Cute', 'Atmospheric', 'Comedy', 'Mystery',
      'Post-apocalyptic', 'Cyberpunk', 'Medieval', 'Historical', 'Western'
    ],
    features: [
      'Singleplayer', 'Multiplayer', 'Co-op', 'Online Co-Op', 'Local Co-Op',
      'PvP', 'Open World', 'Sandbox', 'Procedural Generation', 'Crafting',
      'Base Building', 'Character Customization', 'Controller', 'VR', 'Early Access'
    ],
    playerStyle: [
      'Casual', 'Difficult', 'Relaxing', 'Fast-Paced', 'Turn-Based',
      'Real Time', 'Story Rich', 'Choices Matter', 'Exploration', 'Hack and Slash'
    ]
  },

  // 日本語タグ名
  tagTranslations: {
    'Action': 'アクション', 'Adventure': 'アドベンチャー', 'RPG': 'RPG',
    'Strategy': 'ストラテジー', 'Simulation': 'シミュレーション',
    'Puzzle': 'パズル', 'Platformer': 'プラットフォーマー', 'Shooter': 'シューター',
    'Racing': 'レース', 'Sports': 'スポーツ', 'Fighting': '格闘',
    'Horror': 'ホラー', 'Survival': 'サバイバル', 'Roguelike': 'ローグライク',
    'Roguelite': 'ローグライト', 'Metroidvania': 'メトロイドヴァニア',
    'Visual Novel': 'ビジュアルノベル', 'JRPG': 'JRPG', 'Tactical': 'タクティカル',
    'Tower Defense': 'タワーディフェンス',
    'Fantasy': 'ファンタジー', 'Sci-fi': 'SF', 'Anime': 'アニメ',
    'Pixel Graphics': 'ピクセルグラフィック', 'Retro': 'レトロ', 'Dark': 'ダーク',
    'Cute': 'キュート', 'Atmospheric': '雰囲気', 'Comedy': 'コメディ',
    'Mystery': 'ミステリー', 'Post-apocalyptic': 'ポストアポカリプス',
    'Cyberpunk': 'サイバーパンク', 'Medieval': '中世', 'Historical': '歴史',
    'Western': '西部劇',
    'Singleplayer': 'シングルプレイ', 'Multiplayer': 'マルチプレイ',
    'Co-op': '協力プレイ', 'Online Co-Op': 'オンライン協力', 'Local Co-Op': 'ローカル協力',
    'PvP': 'PvP', 'Open World': 'オープンワールド', 'Sandbox': 'サンドボックス',
    'Procedural Generation': '自動生成', 'Crafting': 'クラフト',
    'Base Building': '拠点構築', 'Character Customization': 'キャラメイク',
    'Controller': 'コントローラー対応', 'VR': 'VR', 'Early Access': '早期アクセス',
    'Casual': 'カジュアル', 'Difficult': '高難易度', 'Relaxing': 'リラックス',
    'Fast-Paced': 'スピーディ', 'Turn-Based': 'ターン制', 'Real Time': 'リアルタイム',
    'Story Rich': 'ストーリー重視', 'Choices Matter': '選択重要',
    'Exploration': '探索', 'Hack and Slash': 'ハクスラ'
  },

  // カテゴリ名
  categoryNames: {
    ja: { genres: 'ジャンル', themes: 'テーマ', features: '機能', playerStyle: 'プレイスタイル' },
    en: { genres: 'Genres', themes: 'Themes', features: 'Features', playerStyle: 'Play Style' }
  },

  init() {
    if (this.initialized) {
      this.updateHeader();
      return;
    }
    this.renderPage();
    this.bindEvents();
    this.initialized = true;
  },

  renderPage() {
    const page = document.getElementById('game-search-page');
    if (!page) return;

    const lang = Lang.current || 'ja';
    const t = this.getTranslations(lang);

    page.innerHTML = `
      <header class="tool-header game-search-header">
        <div class="tool-header-left">
          <button class="back-button" onclick="navigateTo('home')">← Back</button>
          <h1 class="tool-title">${t.title}</h1>
        </div>
        ${UI.getLanguageSwitcher()}
      </header>

      ${AdManager.getToolHeaderAd()}

      <div class="game-search-container">
        <div class="game-search-sidebar">
          <div class="sidebar-header">
            <h2>${t.selectTags}</h2>
            <button class="clear-tags-btn" id="clear-tags-btn">${t.clearAll}</button>
          </div>

          <div class="selected-tags-area" id="selected-tags-area">
            <p class="no-tags-text">${t.noTagsSelected}</p>
          </div>

          <div class="tag-categories" id="tag-categories">
            ${this.renderTagCategories(lang)}
          </div>

          <button class="search-btn" id="search-btn" disabled>
            <span class="search-icon">🔍</span>
            ${t.searchButton}
          </button>
        </div>

        <div class="game-search-results">
          <div class="results-header">
            <h2 id="results-title">${t.resultsTitle}</h2>
            <span class="results-count" id="results-count"></span>
          </div>

          <div class="results-grid" id="results-grid">
            <div class="empty-state">
              <div class="empty-icon">🎮</div>
              <p>${t.emptyState}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderTagCategories(lang) {
    const catNames = this.categoryNames[lang] || this.categoryNames.ja;
    let html = '';

    for (const [category, tags] of Object.entries(this.tags)) {
      html += `
        <div class="tag-category">
          <h3 class="category-title" data-category="${category}">
            <span class="category-arrow">▶</span>
            ${catNames[category]}
          </h3>
          <div class="category-tags" id="category-${category}">
            ${tags.map(tag => {
              const displayName = lang === 'ja' ? (this.tagTranslations[tag] || tag) : tag;
              return `<button class="tag-btn" data-tag="${tag}">${displayName}</button>`;
            }).join('')}
          </div>
        </div>
      `;
    }

    return html;
  },

  getTranslations(lang) {
    const translations = {
      ja: {
        title: 'Steamゲーム検索',
        selectTags: 'タグを選択',
        clearAll: 'クリア',
        noTagsSelected: 'タグを選択してください',
        searchButton: '検索する',
        resultsTitle: '検索結果',
        emptyState: 'タグを選んで検索してください',
        loading: '検索中...',
        noResults: '該当するゲームが見つかりませんでした',
        error: '検索中にエラーが発生しました',
        viewOnSteam: 'Steamで見る',
        reviews: 'レビュー',
        price: '価格',
        free: '無料'
      },
      en: {
        title: 'Steam Game Search',
        selectTags: 'Select Tags',
        clearAll: 'Clear',
        noTagsSelected: 'Please select tags',
        searchButton: 'Search',
        resultsTitle: 'Search Results',
        emptyState: 'Select tags and search',
        loading: 'Searching...',
        noResults: 'No games found',
        error: 'An error occurred during search',
        viewOnSteam: 'View on Steam',
        reviews: 'Reviews',
        price: 'Price',
        free: 'Free'
      }
    };
    return translations[lang] || translations.ja;
  },

  bindEvents() {
    const page = document.getElementById('game-search-page');
    if (!page) return;

    // カテゴリの折りたたみ
    page.querySelectorAll('.category-title').forEach(title => {
      title.addEventListener('click', () => {
        const category = title.dataset.category;
        const tagsEl = document.getElementById(`category-${category}`);
        const arrow = title.querySelector('.category-arrow');

        tagsEl.classList.toggle('collapsed');
        arrow.textContent = tagsEl.classList.contains('collapsed') ? '▶' : '▼';
      });
    });

    // タグ選択
    page.querySelectorAll('.tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        this.toggleTag(tag, btn);
      });
    });

    // クリアボタン
    const clearBtn = document.getElementById('clear-tags-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearTags());
    }

    // 検索ボタン
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.search());
    }
  },

  toggleTag(tag, btnElement) {
    const index = this.selectedTags.indexOf(tag);

    if (index > -1) {
      this.selectedTags.splice(index, 1);
      btnElement.classList.remove('selected');
    } else {
      if (this.selectedTags.length >= 5) {
        return; // 最大5つまで
      }
      this.selectedTags.push(tag);
      btnElement.classList.add('selected');
    }

    this.updateSelectedTagsDisplay();
    this.updateSearchButton();
  },

  updateSelectedTagsDisplay() {
    const area = document.getElementById('selected-tags-area');
    if (!area) return;

    const lang = Lang.current || 'ja';
    const t = this.getTranslations(lang);

    if (this.selectedTags.length === 0) {
      area.innerHTML = `<p class="no-tags-text">${t.noTagsSelected}</p>`;
    } else {
      area.innerHTML = this.selectedTags.map(tag => {
        const displayName = lang === 'ja' ? (this.tagTranslations[tag] || tag) : tag;
        return `<span class="selected-tag">${displayName}<button class="remove-tag" data-tag="${tag}">×</button></span>`;
      }).join('');

      // 削除ボタンのイベント
      area.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tag = btn.dataset.tag;
          const tagBtn = document.querySelector(`.tag-btn[data-tag="${tag}"]`);
          if (tagBtn) {
            this.toggleTag(tag, tagBtn);
          }
        });
      });
    }
  },

  updateSearchButton() {
    const btn = document.getElementById('search-btn');
    if (btn) {
      btn.disabled = this.selectedTags.length === 0;
    }
  },

  clearTags() {
    this.selectedTags = [];
    document.querySelectorAll('.tag-btn.selected').forEach(btn => {
      btn.classList.remove('selected');
    });
    this.updateSelectedTagsDisplay();
    this.updateSearchButton();
  },

  async search() {
    if (this.selectedTags.length === 0 || this.isLoading) return;

    const lang = Lang.current || 'ja';
    const t = this.getTranslations(lang);
    const resultsGrid = document.getElementById('results-grid');
    const resultsCount = document.getElementById('results-count');

    this.isLoading = true;
    resultsGrid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>${t.loading}</p></div>`;

    try {
      // Steam検索APIを使用
      const results = await this.searchSteamGames();

      this.searchResults = results;
      this.isLoading = false;

      if (results.length === 0) {
        resultsGrid.innerHTML = `<div class="empty-state"><div class="empty-icon">😕</div><p>${t.noResults}</p></div>`;
        resultsCount.textContent = '';
      } else {
        resultsCount.textContent = `(${results.length}件)`;
        resultsGrid.innerHTML = results.map(game => this.renderGameCard(game, lang)).join('');
      }
    } catch (error) {
      console.error('Search error:', error);
      this.isLoading = false;
      resultsGrid.innerHTML = `<div class="empty-state error"><div class="empty-icon">⚠️</div><p>${t.error}</p></div>`;
    }
  },

  async searchSteamGames() {
    // Steam Store検索APIを使用
    const CORS_PROXY = 'https://corsproxy.io/?';
    const tags = this.selectedTags.join(',');

    // SteamSpyのタグ検索APIを使用
    const url = `${CORS_PROXY}${encodeURIComponent(`https://steamspy.com/api.php?request=tag&tag=${encodeURIComponent(this.selectedTags[0])}`)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('API error');

      const data = await response.json();

      // オブジェクトを配列に変換してフィルタリング
      let games = Object.values(data);

      // 複数タグが選択されている場合、全てのタグを含むゲームをフィルタリング
      if (this.selectedTags.length > 1) {
        games = games.filter(game => {
          const gameTags = game.tags ? Object.keys(game.tags) : [];
          return this.selectedTags.every(tag =>
            gameTags.some(gt => gt.toLowerCase().includes(tag.toLowerCase()))
          );
        });
      }

      // 人気順（オーナー数）でソートして上位50件
      games = games
        .sort((a, b) => (b.owners_estimate || 0) - (a.owners_estimate || 0))
        .slice(0, 50);

      return games.map(game => ({
        appid: game.appid,
        name: game.name,
        price: game.price ? game.price / 100 : 0,
        positive: game.positive || 0,
        negative: game.negative || 0,
        owners: game.owners || 'N/A',
        tags: game.tags ? Object.keys(game.tags).slice(0, 5) : []
      }));
    } catch (error) {
      console.error('SteamSpy API error:', error);

      // フォールバック: Steam Store Search API
      return this.searchSteamStoreFallback();
    }
  },

  async searchSteamStoreFallback() {
    const CORS_PROXY = 'https://corsproxy.io/?';
    const searchTerm = this.selectedTags[0];
    const url = `${CORS_PROXY}${encodeURIComponent(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(searchTerm)}&l=japanese&cc=JP`)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Store API error');

      const data = await response.json();

      if (!data.items) return [];

      return data.items.map(item => ({
        appid: item.id,
        name: item.name,
        price: item.price ? item.price.final / 100 : 0,
        positive: 0,
        negative: 0,
        owners: 'N/A',
        tags: [],
        tiny_image: item.tiny_image
      }));
    } catch (error) {
      console.error('Steam Store API error:', error);
      return [];
    }
  },

  renderGameCard(game, lang) {
    const t = this.getTranslations(lang);
    const reviewScore = game.positive + game.negative > 0
      ? Math.round((game.positive / (game.positive + game.negative)) * 100)
      : null;

    const priceText = game.price === 0 ? t.free : `¥${game.price.toLocaleString()}`;
    const steamUrl = `https://store.steampowered.com/app/${game.appid}/`;
    const imageUrl = game.tiny_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/capsule_184x69.jpg`;

    return `
      <div class="game-card">
        <img class="game-image" src="${imageUrl}" alt="${game.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 184 69%22><rect fill=%22%23333%22 width=%22184%22 height=%2269%22/><text x=%2292%22 y=%2240%22 fill=%22%23666%22 text-anchor=%22middle%22>No Image</text></svg>'">
        <div class="game-info">
          <h3 class="game-title">${game.name}</h3>
          <div class="game-meta">
            ${reviewScore !== null ? `<span class="game-score ${reviewScore >= 70 ? 'positive' : reviewScore >= 40 ? 'mixed' : 'negative'}">${reviewScore}%</span>` : ''}
            <span class="game-price">${priceText}</span>
          </div>
          ${game.tags && game.tags.length > 0 ? `
            <div class="game-tags">
              ${game.tags.slice(0, 3).map(tag => `<span class="game-tag">${lang === 'ja' ? (this.tagTranslations[tag] || tag) : tag}</span>`).join('')}
            </div>
          ` : ''}
          <a href="${steamUrl}" target="_blank" rel="noopener" class="steam-link">${t.viewOnSteam} →</a>
        </div>
      </div>
    `;
  },

  updateHeader() {
    const lang = Lang.current || 'ja';
    const t = this.getTranslations(lang);

    const title = document.querySelector('.game-search-header .tool-title');
    if (title) title.textContent = t.title;

    // 再描画
    this.renderPage();
    this.bindEvents();

    // 選択状態を復元
    this.selectedTags.forEach(tag => {
      const btn = document.querySelector(`.tag-btn[data-tag="${tag}"]`);
      if (btn) btn.classList.add('selected');
    });
    this.updateSelectedTagsDisplay();
    this.updateSearchButton();
  }
};
