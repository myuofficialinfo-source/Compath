/**
 * Steamゲーム検索ツール
 * iframeでReactアプリを埋め込む
 */

const GameSearch = {
  initialized: false,
  iframe: null,

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

    page.innerHTML = `
      <header class="tool-header game-search-header">
        <div class="tool-header-left">
          <button class="back-button" onclick="navigateTo('home')" title="${lang === 'ja' ? 'ホームに戻る' : 'Back to Home'}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="tool-title">${lang === 'ja' ? 'Steamゲーム検索' : 'Steam Game Search'}</h1>
        </div>
        ${UI.getLanguageSwitcher()}
      </header>

      ${AdManager.getToolHeaderAd()}

      <div class="game-search-container">
        <iframe
          id="game-search-iframe"
          src="/game-search.html?embed=true&lang=${lang}"
          class="game-search-iframe"
          frameborder="0">
        </iframe>
      </div>
    `;

    this.iframe = document.getElementById('game-search-iframe');
  },

  bindEvents() {
    // 言語切り替え
    UI.bindLanguageSwitcher();
  },

  updateHeader() {
    const lang = Lang.current || 'ja';
    const title = document.querySelector('.game-search-header .tool-title');
    if (title) {
      title.textContent = lang === 'ja' ? 'Steamゲーム検索' : 'Steam Game Search';
    }

    // iframe言語更新
    if (this.iframe) {
      this.iframe.src = `/game-search.html?embed=true&lang=${lang}`;
    }
  }
};
