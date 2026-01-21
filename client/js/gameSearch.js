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
        <div class="tool-header-right">
          <button class="game-search-fullscreen-btn" title="フルスクリーン">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </button>
          <button class="game-search-newwindow-btn" title="新しいウィンドウで開く">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
          </button>
          ${UI.getLanguageSwitcher()}
        </div>
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
    const page = document.getElementById('game-search-page');
    if (!page) return;

    // フルスクリーンボタン
    const fullscreenBtn = page.querySelector('.game-search-fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    // 新しいウィンドウで開くボタン
    const newWindowBtn = page.querySelector('.game-search-newwindow-btn');
    if (newWindowBtn) {
      newWindowBtn.addEventListener('click', () => this.openInNewWindow());
    }

    // ESCキーでフルスクリーン解除
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const container = document.querySelector('.game-search-container');
        if (container && container.classList.contains('fullscreen')) {
          this.toggleFullscreen();
        }
      }
    });
  },

  toggleFullscreen() {
    const container = document.querySelector('.game-search-container');
    if (container) {
      container.classList.toggle('fullscreen');
    }
  },

  openInNewWindow() {
    const lang = Lang.current || 'ja';
    window.open(`/game-search.html?lang=${lang}`, '_blank', 'width=1400,height=900');
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
