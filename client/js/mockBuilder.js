/**
 * Compath - ゲームモックビルダー（Pro機能）
 *
 * AIがユーザーのゲーム説明を理解して、
 * UI要素・ゲームシステムを含むモックを自動生成
 */

const MockBuilder = {
  // ゲームタイプ定義
  GAME_TYPES: {
    platformer: {
      id: 'platformer',
      name: { ja: '2D横スクロール/プラットフォーマー', en: '2D Side-Scroller/Platformer' },
      icon: '🎮',
      dimensions: '2D',
      defaultControls: ['left', 'right', 'jump']
    },
    topdown: {
      id: 'topdown',
      name: { ja: 'トップダウン/見下ろし型', en: 'Top-Down View' },
      icon: '🗺️',
      dimensions: '2D',
      defaultControls: ['up', 'down', 'left', 'right', 'action']
    },
    shooter: {
      id: 'shooter',
      name: { ja: 'シューティング', en: 'Shooter' },
      icon: '🚀',
      dimensions: '2D',
      defaultControls: ['move', 'aim', 'shoot']
    },
    puzzle: {
      id: 'puzzle',
      name: { ja: 'パズル/マッチング', en: 'Puzzle/Match' },
      icon: '🧩',
      dimensions: '2D',
      defaultControls: ['click', 'drag']
    },
    cardgame: {
      id: 'cardgame',
      name: { ja: 'カードゲーム/ボードゲーム', en: 'Card/Board Game' },
      icon: '🃏',
      dimensions: '2D',
      defaultControls: ['click', 'drag']
    },
    survival: {
      id: 'survival',
      name: { ja: 'サバイバル/収集系', en: 'Survival/Collection' },
      icon: '🎒',
      dimensions: '2D',
      defaultControls: ['move', 'action', 'inventory']
    },
    roguelike: {
      id: 'roguelike',
      name: { ja: 'ローグライク/ローグライト', en: 'Roguelike/Roguelite' },
      icon: '⚔️',
      dimensions: '2D',
      defaultControls: ['move', 'attack', 'skill']
    },
    simulation: {
      id: 'simulation',
      name: { ja: 'シミュレーション/経営', en: 'Simulation/Management' },
      icon: '🏗️',
      dimensions: '2D',
      defaultControls: ['click', 'drag', 'menu']
    }
  },

  // アートスタイル
  ART_STYLES: {
    pixel: { id: 'pixel', name: { ja: 'ピクセルアート', en: 'Pixel Art' }, icon: '👾' },
    flat: { id: 'flat', name: { ja: 'フラットデザイン', en: 'Flat Design' }, icon: '🎨' },
    neon: { id: 'neon', name: { ja: 'ネオン/サイバー', en: 'Neon/Cyber' }, icon: '💜' },
    minimal: { id: 'minimal', name: { ja: 'ミニマル', en: 'Minimal' }, icon: '⚪' },
    retro: { id: 'retro', name: { ja: 'レトロ', en: 'Retro' }, icon: '📺' },
    cartoon: { id: 'cartoon', name: { ja: 'カートゥーン', en: 'Cartoon' }, icon: '🎪' },
    dark: { id: 'dark', name: { ja: 'ダーク/ゴシック', en: 'Dark/Gothic' }, icon: '🌑' },
    cute: { id: 'cute', name: { ja: 'かわいい系', en: 'Cute/Kawaii' }, icon: '🌸' }
  },

  // カラーパレット
  COLOR_PALETTES: {
    warm: { id: 'warm', name: { ja: '暖色系', en: 'Warm' }, colors: ['#FF6B6B', '#FFA07A', '#FFD93D', '#FF8C42'] },
    cool: { id: 'cool', name: { ja: '寒色系', en: 'Cool' }, colors: ['#4ECDC4', '#45B7D1', '#96CEB4', '#6C5CE7'] },
    mono: { id: 'mono', name: { ja: 'モノクロ', en: 'Monochrome' }, colors: ['#2C3E50', '#34495E', '#7F8C8D', '#BDC3C7'] },
    neon: { id: 'neon', name: { ja: 'ネオン', en: 'Neon' }, colors: ['#FF00FF', '#00FFFF', '#FF006E', '#8338EC'] },
    nature: { id: 'nature', name: { ja: '自然', en: 'Nature' }, colors: ['#2ECC71', '#27AE60', '#F39C12', '#D35400'] },
    pastel: { id: 'pastel', name: { ja: 'パステル', en: 'Pastel' }, colors: ['#FFB6C1', '#DDA0DD', '#98D8C8', '#F7DC6F'] },
    dark: { id: 'dark', name: { ja: 'ダーク', en: 'Dark' }, colors: ['#1A1A2E', '#16213E', '#0F3460', '#E94560'] },
    custom: { id: 'custom', name: { ja: 'カスタム', en: 'Custom' }, colors: [] }
  },

  // 現在のモック設定
  currentMock: null,
  currentGame: null,
  mockCanvas: null,
  isPlaying: false,
  aiParsedConfig: null, // AIが解析した設定

  // 要件定義フォームを表示
  showRequirementsForm(prefilledData = null) {
    if (!UserPlan.canUse('mockBuilder')) {
      UserPlan.showPricingModal();
      return;
    }

    const lang = AppState.language || 'ja';
    const isJa = lang === 'ja';

    const modal = document.createElement('div');
    modal.className = 'mock-builder-overlay';
    modal.id = 'mock-builder-modal';
    modal.innerHTML = `
      <div class="mock-builder-modal">
        <button class="mock-builder-close">&times;</button>

        <div class="mock-builder-header">
          <h2>${isJa ? 'AIゲームモック・ビルダー' : 'AI Game Mock Builder'}</h2>
          <p class="mock-builder-subtitle">${isJa ? 'ゲームの詳細を入力すると、AIが理解してモックを生成します' : 'Describe your game in detail, AI will understand and generate a mock'}</p>
        </div>

        <div class="mock-builder-content">
          <form id="mock-requirements-form" class="mock-form">

            <!-- ゲーム基本情報 -->
            <div class="mock-form-section">
              <h3><span class="section-num">1</span>${isJa ? 'ゲーム基本情報' : 'Basic Game Info'}</h3>
              <div class="mock-input-group">
                <label>${isJa ? 'ゲームタイトル' : 'Game Title'}</label>
                <input type="text" id="game-title" class="mock-input"
                  placeholder="${isJa ? '例：バグハンター' : 'e.g., Bug Hunter'}"
                  value="${prefilledData?.title || ''}">
              </div>
              <div class="mock-input-group">
                <label>${isJa ? 'ジャンル/ゲームタイプ' : 'Genre/Game Type'}</label>
                <div class="mock-type-grid" id="mock-type-selector">
                  ${Object.entries(this.GAME_TYPES).map(([key, type]) => `
                    <div class="mock-type-card ${prefilledData?.gameType === key ? 'selected' : ''}" data-type="${key}">
                      <span class="mock-type-icon">${type.icon}</span>
                      <span class="mock-type-name">${isJa ? type.name.ja : type.name.en}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- ゲームの詳細説明（重要！） -->
            <div class="mock-form-section">
              <h3><span class="section-num">2</span>${isJa ? 'ゲームの詳細説明（AIが理解します）' : 'Detailed Game Description (AI will understand)'}</h3>
              <p class="mock-form-hint">${isJa
                ? '具体的に書くほど、モックに反映されます。UI要素、ゲームシステム、操作方法など自由に記述してください。'
                : 'The more specific you are, the better the mock will be. Describe UI elements, game systems, controls, etc.'}</p>

              <div class="mock-input-group">
                <label>${isJa ? 'ゲームの目的・ゴール' : 'Game Objective/Goal'}</label>
                <textarea id="game-objective" class="mock-textarea" rows="2"
                  placeholder="${isJa ? '例：虫を倒してたくさん捕まえる。捕まえた虫の組み合わせで能力が上がる。' : 'e.g., Defeat bugs and collect them. Combining bugs increases your abilities.'}">${prefilledData?.objective || ''}</textarea>
              </div>

              <div class="mock-input-group">
                <label>${isJa ? '操作方法・アクション' : 'Controls/Actions'}</label>
                <textarea id="game-controls" class="mock-textarea" rows="2"
                  placeholder="${isJa ? '例：左右移動、ジャンプ、攻撃で虫を倒す。倒した虫をクリックでキャプチャ。' : 'e.g., Move left/right, jump, attack bugs. Click fallen bugs to capture.'}">${prefilledData?.controls || ''}</textarea>
              </div>

              <div class="mock-input-group">
                <label>${isJa ? 'UI要素・画面レイアウト' : 'UI Elements/Screen Layout'}</label>
                <textarea id="game-ui" class="mock-textarea" rows="3"
                  placeholder="${isJa ? '例：画面下部に正方形のバックパックUI（3x3マス）。捕まえた虫がここに格納される。隣接した虫の組み合わせで効果発動。画面上部にHP、スコア表示。' : 'e.g., 3x3 backpack grid at bottom. Captured bugs stored here. Adjacent bug combos trigger effects. HP and score at top.'}">${prefilledData?.ui || ''}</textarea>
              </div>

              <div class="mock-input-group">
                <label>${isJa ? '敵・障害物・アイテム' : 'Enemies/Obstacles/Items'}</label>
                <textarea id="game-entities" class="mock-textarea" rows="2"
                  placeholder="${isJa ? '例：虫の敵が地面を歩いている。倒すと地面に落ちて、回収可能になる。虫の種類は3種類。' : 'e.g., Bug enemies walk on ground. Defeated bugs drop and become collectible. 3 bug types.'}">${prefilledData?.entities || ''}</textarea>
              </div>

              <div class="mock-input-group">
                <label>${isJa ? 'ユニークなシステム・ギミック' : 'Unique Systems/Mechanics'}</label>
                <textarea id="game-systems" class="mock-textarea" rows="2"
                  placeholder="${isJa ? '例：バックパックで虫を隣接させると「隣接効果」が発動。赤虫と青虫を隣接させると攻撃力UP。' : 'e.g., Adjacent bugs in backpack trigger "adjacency effects". Red+Blue bug = Attack UP.'}">${prefilledData?.systems || ''}</textarea>
              </div>
            </div>

            <!-- ビジュアル設定 -->
            <div class="mock-form-section">
              <h3><span class="section-num">3</span>${isJa ? 'ビジュアル設定' : 'Visual Settings'}</h3>

              <div class="mock-input-group">
                <label>${isJa ? 'アートスタイル' : 'Art Style'}</label>
                <div class="mock-style-grid" id="mock-style-selector">
                  ${Object.entries(this.ART_STYLES).map(([key, style]) => `
                    <div class="mock-style-card ${prefilledData?.artStyle === key ? 'selected' : ''}" data-style="${key}">
                      <span class="mock-style-icon">${style.icon}</span>
                      <span class="mock-style-name">${isJa ? style.name.ja : style.name.en}</span>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div class="mock-input-group">
                <label>${isJa ? 'カラーパレット' : 'Color Palette'}</label>
                <div class="mock-palette-grid" id="mock-palette-selector">
                  ${Object.entries(this.COLOR_PALETTES).map(([key, palette]) => `
                    <div class="mock-palette-card ${prefilledData?.colorPalette === key ? 'selected' : ''}" data-palette="${key}">
                      <div class="palette-preview">
                        ${palette.colors.length > 0
                          ? palette.colors.map(c => `<span class="palette-color" style="background:${c}"></span>`).join('')
                          : '<span class="palette-custom">?</span>'}
                      </div>
                      <span class="palette-name">${isJa ? palette.name.ja : palette.name.en}</span>
                    </div>
                  `).join('')}
                </div>
                <div id="custom-colors-input" class="custom-colors hidden">
                  <label>${isJa ? 'カスタムカラー（4色）' : 'Custom Colors (4)'}</label>
                  <div class="color-inputs">
                    <input type="color" class="custom-color" value="#FF6B6B">
                    <input type="color" class="custom-color" value="#4ECDC4">
                    <input type="color" class="custom-color" value="#45B7D1">
                    <input type="color" class="custom-color" value="#96CEB4">
                  </div>
                </div>
              </div>

              <div class="mock-input-row">
                <div class="mock-input-group">
                  <label>${isJa ? '背景テーマ' : 'Background Theme'}</label>
                  <select id="bg-theme" class="mock-select">
                    <option value="gradient">${isJa ? 'グラデーション' : 'Gradient'}</option>
                    <option value="starfield">${isJa ? '星空' : 'Starfield'}</option>
                    <option value="grid">${isJa ? 'グリッド' : 'Grid'}</option>
                    <option value="forest">${isJa ? '森/自然' : 'Forest/Nature'}</option>
                    <option value="dungeon">${isJa ? 'ダンジョン' : 'Dungeon'}</option>
                    <option value="city">${isJa ? '都市' : 'City'}</option>
                  </select>
                </div>
                <div class="mock-input-group">
                  <label>${isJa ? '画面サイズ' : 'Screen Size'}</label>
                  <select id="stage-size" class="mock-select">
                    <option value="small">Small (800x450)</option>
                    <option value="medium" selected>Medium (960x540)</option>
                    <option value="large">Large (1280x720)</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="mock-form-actions">
              <button type="submit" class="btn btn-primary" id="mock-generate-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                ${isJa ? 'AIでモック生成' : 'Generate with AI'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.bindFormEvents(modal);
  },

  // フォームイベントをバインド
  bindFormEvents(modal) {
    // 閉じるボタン
    modal.querySelector('.mock-builder-close').addEventListener('click', () => {
      modal.remove();
    });

    // オーバーレイクリック
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // ゲームタイプ選択
    modal.querySelectorAll('.mock-type-card').forEach(card => {
      card.addEventListener('click', () => {
        modal.querySelectorAll('.mock-type-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });

    // アートスタイル選択
    modal.querySelectorAll('.mock-style-card').forEach(card => {
      card.addEventListener('click', () => {
        modal.querySelectorAll('.mock-style-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });

    // カラーパレット選択
    modal.querySelectorAll('.mock-palette-card').forEach(card => {
      card.addEventListener('click', () => {
        modal.querySelectorAll('.mock-palette-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const customInput = modal.querySelector('#custom-colors-input');
        if (card.dataset.palette === 'custom') {
          customInput.classList.remove('hidden');
        } else {
          customInput.classList.add('hidden');
        }
      });
    });

    // 生成ボタン
    modal.querySelector('#mock-requirements-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const config = this.getFormConfig(modal);
      modal.remove();
      await this.generateMockWithAI(config);
    });
  },

  // フォームから設定を取得
  getFormConfig(modal) {
    const selectedType = modal.querySelector('.mock-type-card.selected')?.dataset.type || 'platformer';
    const selectedStyle = modal.querySelector('.mock-style-card.selected')?.dataset.style || 'pixel';
    const selectedPalette = modal.querySelector('.mock-palette-card.selected')?.dataset.palette || 'cool';

    let colors = this.COLOR_PALETTES[selectedPalette]?.colors || [];
    if (selectedPalette === 'custom') {
      colors = Array.from(modal.querySelectorAll('.custom-color')).map(input => input.value);
    }

    return {
      title: modal.querySelector('#game-title').value || 'My Game',
      gameType: selectedType,
      objective: modal.querySelector('#game-objective').value || '',
      controls: modal.querySelector('#game-controls').value || '',
      ui: modal.querySelector('#game-ui').value || '',
      entities: modal.querySelector('#game-entities').value || '',
      systems: modal.querySelector('#game-systems').value || '',
      artStyle: selectedStyle,
      colorPalette: selectedPalette,
      colors: colors,
      bgTheme: modal.querySelector('#bg-theme').value,
      stageSize: modal.querySelector('#stage-size').value
    };
  },

  // AIでモック生成
  async generateMockWithAI(config) {
    const isJa = Lang.current === 'ja';

    // ローディング表示
    UI.showLoading(isJa ? 'AIがゲーム内容を解析中...' : 'AI is analyzing your game...');

    try {
      // AIにゲーム内容を送信して解析
      const response = await fetch('/api/mock-builder/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: config.title,
          gameType: config.gameType,
          objective: config.objective,
          controls: config.controls,
          ui: config.ui,
          entities: config.entities,
          systems: config.systems,
          language: Lang.current
        })
      });

      if (!response.ok) {
        throw new Error('AI解析に失敗しました');
      }

      const aiResult = await response.json();
      console.log('AI解析結果:', aiResult);

      this.aiParsedConfig = aiResult.gameConfig;

      // AIの解析結果とユーザー設定をマージ
      const mergedConfig = {
        ...config,
        ...aiResult.gameConfig,
        colors: config.colors,
        artStyle: config.artStyle,
        bgTheme: config.bgTheme
      };

      UI.hideLoading();
      this.currentMock = mergedConfig;
      this.showMockPlayer(mergedConfig);

    } catch (error) {
      console.error('AI解析エラー:', error);
      UI.hideLoading();

      // フォールバック: AIなしでローカル解析
      console.log('フォールバック: ローカル解析を使用');
      const localConfig = this.parseGameConfigLocally(config);
      this.currentMock = { ...config, ...localConfig };
      this.showMockPlayer(this.currentMock);
    }
  },

  // ローカルでゲーム設定を解析（AIが使えない場合のフォールバック）
  parseGameConfigLocally(config) {
    const fullText = `${config.objective} ${config.controls} ${config.ui} ${config.entities} ${config.systems}`.toLowerCase();

    // UI要素の検出
    const uiElements = [];

    // バックパック/インベントリ検出
    if (fullText.includes('バックパック') || fullText.includes('backpack') ||
        fullText.includes('インベントリ') || fullText.includes('inventory') ||
        fullText.includes('格納') || fullText.includes('収集')) {
      const gridMatch = fullText.match(/(\d+)\s*[x×]\s*(\d+)/);
      uiElements.push({
        type: 'inventory',
        position: 'bottom',
        gridSize: gridMatch ? { cols: parseInt(gridMatch[1]), rows: parseInt(gridMatch[2]) } : { cols: 3, rows: 3 },
        label: 'バックパック'
      });
    }

    // HP/体力検出
    if (fullText.includes('hp') || fullText.includes('体力') || fullText.includes('health') || fullText.includes('ライフ')) {
      uiElements.push({ type: 'healthBar', position: 'top-left' });
    }

    // スコア検出
    if (fullText.includes('スコア') || fullText.includes('score') || fullText.includes('ポイント')) {
      uiElements.push({ type: 'score', position: 'top-right' });
    }

    // 敵の種類を検出
    const enemyTypes = [];
    if (fullText.includes('虫') || fullText.includes('bug') || fullText.includes('insect')) {
      enemyTypes.push({ type: 'bug', emoji: '🐛', dropsItem: true });
      if (fullText.includes('種類') || fullText.includes('type')) {
        enemyTypes.push({ type: 'bug2', emoji: '🐜', dropsItem: true });
        enemyTypes.push({ type: 'bug3', emoji: '🦗', dropsItem: true });
      }
    } else {
      enemyTypes.push({ type: 'enemy', emoji: '👾', dropsItem: false });
    }

    // アクション検出
    const actions = {
      canShoot: fullText.includes('射撃') || fullText.includes('shoot') || fullText.includes('撃つ'),
      canJump: fullText.includes('ジャンプ') || fullText.includes('jump'),
      canAttack: fullText.includes('攻撃') || fullText.includes('attack') || fullText.includes('倒す'),
      canCapture: fullText.includes('キャプチャ') || fullText.includes('capture') || fullText.includes('捕まえ') || fullText.includes('回収'),
      hasGravity: config.gameType === 'platformer' || fullText.includes('重力') || fullText.includes('落ち')
    };

    // 特殊システム検出
    const specialSystems = [];
    if (fullText.includes('隣接') || fullText.includes('adjacent') || fullText.includes('組み合わせ')) {
      specialSystems.push({
        type: 'adjacencyBonus',
        description: '隣接効果システム'
      });
    }

    return {
      uiElements,
      enemyTypes,
      actions,
      specialSystems,
      playerEmoji: '🧙',
      playerSize: 40
    };
  },

  // モックプレイヤー画面を表示
  showMockPlayer(config) {
    const isJa = Lang.current === 'ja';
    const sizes = { small: [800, 450], medium: [960, 540], large: [1280, 720] };
    const [width, height] = sizes[config.stageSize] || sizes.medium;

    const modal = document.createElement('div');
    modal.className = 'mock-player-overlay';
    modal.id = 'mock-player-modal';
    modal.innerHTML = `
      <div class="mock-player-container">
        <div class="mock-player-header">
          <h2>${config.title}</h2>
          <div class="mock-player-controls">
            <button class="mock-ctrl-btn" id="mock-restart-btn" title="${isJa ? 'リスタート' : 'Restart'}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>
            <button class="mock-ctrl-btn" id="mock-edit-btn" title="${isJa ? '編集' : 'Edit'}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="mock-ctrl-btn mock-close-btn" id="mock-close-btn">×</button>
          </div>
        </div>
        <div class="mock-player-body">
          <div class="mock-game-area" id="mock-game-area" style="width:${width}px;height:${height}px;">
            <canvas id="mock-canvas" width="${width}" height="${height}"></canvas>
            <div class="mock-ui-overlay" id="mock-ui-overlay"></div>
          </div>
        </div>
        <div class="mock-player-footer">
          <div class="mock-controls-hint">
            ${this.getControlsHint(config)}
          </div>
          <div class="mock-stats" id="mock-stats"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // ゲームエンジン初期化
    this.initGameEngine(config, width, height);

    // イベントバインド
    modal.querySelector('#mock-close-btn').addEventListener('click', () => {
      this.stopGame();
      modal.remove();
    });

    modal.querySelector('#mock-restart-btn').addEventListener('click', () => {
      this.restartGame();
    });

    modal.querySelector('#mock-edit-btn').addEventListener('click', () => {
      this.stopGame();
      modal.remove();
      this.showRequirementsForm(config);
    });
  },

  // 操作ヒントを取得
  getControlsHint(config) {
    const isJa = Lang.current === 'ja';
    const actions = config.actions || {};

    let hints = [];

    if (config.gameType === 'platformer' || config.gameType === 'survival') {
      hints.push(isJa ? '← → 移動' : '← → Move');
      if (actions.canJump !== false) hints.push(isJa ? 'Space ジャンプ' : 'Space Jump');
      if (actions.canAttack) hints.push(isJa ? 'Z 攻撃' : 'Z Attack');
      if (actions.canShoot) hints.push(isJa ? 'X or クリック 射撃' : 'X or Click Shoot');
      if (actions.canCapture) hints.push(isJa ? 'C キャプチャ' : 'C Capture');
    } else if (config.gameType === 'topdown') {
      hints.push(isJa ? '↑↓←→ 移動' : '↑↓←→ Move');
      hints.push(isJa ? 'Space アクション' : 'Space Action');
    } else if (config.gameType === 'shooter') {
      hints.push(isJa ? 'マウス 照準' : 'Mouse Aim');
      hints.push(isJa ? 'クリック 射撃' : 'Click Shoot');
      hints.push(isJa ? '← → 移動' : '← → Move');
    }

    return hints.join(' ｜ ') || (isJa ? '← → 移動 ｜ Space ジャンプ' : '← → Move | Space Jump');
  },

  // ゲームエンジン初期化
  initGameEngine(config, width, height) {
    const canvas = document.getElementById('mock-canvas');
    const ctx = canvas.getContext('2d');
    const uiOverlay = document.getElementById('mock-ui-overlay');

    this.mockCanvas = canvas;
    this.isPlaying = true;

    const actions = config.actions || { canJump: true, hasGravity: true, canAttack: true, canCapture: true };
    const uiElements = config.uiElements || [];
    const enemyTypes = config.enemyTypes || [{ type: 'enemy', emoji: '👾', dropsItem: false }];

    // ゲーム状態
    const game = {
      player: {
        x: 100,
        y: height - 150,
        vx: 0,
        vy: 0,
        size: config.playerSize || 40,
        onGround: false,
        facingRight: true
      },
      platforms: this.generatePlatforms(config, width, height),
      enemies: this.generateEnemies(config, width, height, enemyTypes),
      droppedItems: [], // 倒した敵が落とすアイテム
      projectiles: [],
      inventory: this.createInventory(uiElements),
      score: 0,
      health: 100,
      keys: {},
      mouse: { x: 0, y: 0, clicked: false }
    };

    // UI要素を生成
    this.renderUIOverlay(uiOverlay, uiElements, game, config);

    // キー入力
    const handleKeyDown = (e) => {
      game.keys[e.key] = true;
      game.keys[e.code] = true;

      // キャプチャアクション
      if ((e.key === 'c' || e.key === 'C') && actions.canCapture) {
        this.tryCapture(game, config);
      }

      // 攻撃アクション
      if ((e.key === 'z' || e.key === 'Z') && actions.canAttack) {
        this.playerAttack(game, config);
      }

      // 射撃アクション
      if ((e.key === 'x' || e.key === 'X') && actions.canShoot) {
        this.playerShoot(game, config, width);
      }
    };
    const handleKeyUp = (e) => {
      game.keys[e.key] = false;
      game.keys[e.code] = false;
    };

    // マウス入力
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      game.mouse.x = e.clientX - rect.left;
      game.mouse.y = e.clientY - rect.top;
    };
    const handleMouseDown = (e) => {
      game.mouse.clicked = true;
      if (actions.canShoot) {
        this.playerShoot(game, config, width);
      }
    };
    const handleMouseUp = () => {
      game.mouse.clicked = false;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    // ゲームループ
    const gameLoop = () => {
      if (!this.isPlaying) {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mouseup', handleMouseUp);
        return;
      }

      // 更新
      this.updateGame(game, config, width, height, actions);

      // 描画
      this.renderGame(ctx, game, config, width, height);

      // UI更新
      this.updateUI(game, config, uiOverlay);

      requestAnimationFrame(gameLoop);
    };

    gameLoop();
    this.currentGame = game;
  },

  // インベントリ作成
  createInventory(uiElements) {
    const inventoryUI = uiElements.find(ui => ui.type === 'inventory');
    if (!inventoryUI) return null;

    const { cols, rows } = inventoryUI.gridSize || { cols: 3, rows: 3 };
    return {
      cols,
      rows,
      items: Array(cols * rows).fill(null),
      position: inventoryUI.position || 'bottom'
    };
  },

  // UIオーバーレイを描画
  renderUIOverlay(overlay, uiElements, game, config) {
    overlay.innerHTML = '';

    for (const ui of uiElements) {
      if (ui.type === 'inventory') {
        const { cols, rows } = ui.gridSize || { cols: 3, rows: 3 };
        const inventoryEl = document.createElement('div');
        inventoryEl.className = 'mock-inventory';
        inventoryEl.id = 'mock-inventory';
        inventoryEl.style.cssText = `
          position: absolute;
          ${ui.position === 'bottom' ? 'bottom: 10px; left: 50%; transform: translateX(-50%);' : 'top: 10px; right: 10px;'}
          display: grid;
          grid-template-columns: repeat(${cols}, 40px);
          gap: 4px;
          padding: 8px;
          background: rgba(0,0,0,0.7);
          border-radius: 8px;
          border: 2px solid ${config.colors[0] || '#4ECDC4'};
        `;

        for (let i = 0; i < cols * rows; i++) {
          const slot = document.createElement('div');
          slot.className = 'inventory-slot';
          slot.dataset.index = i;
          slot.style.cssText = `
            width: 40px;
            height: 40px;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
          `;
          inventoryEl.appendChild(slot);
        }

        // ラベル
        const label = document.createElement('div');
        label.style.cssText = `
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          color: ${config.colors[0] || '#4ECDC4'};
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 4px;
          white-space: nowrap;
        `;
        label.textContent = ui.label || 'Inventory';
        inventoryEl.appendChild(label);

        overlay.appendChild(inventoryEl);
      }

      if (ui.type === 'healthBar') {
        const healthEl = document.createElement('div');
        healthEl.id = 'mock-health';
        healthEl.style.cssText = `
          position: absolute;
          ${ui.position === 'top-left' ? 'top: 10px; left: 10px;' : 'top: 10px; right: 10px;'}
          display: flex;
          align-items: center;
          gap: 8px;
          color: white;
          font-weight: bold;
        `;
        healthEl.innerHTML = `
          <span>❤️</span>
          <div style="width: 100px; height: 16px; background: rgba(0,0,0,0.5); border-radius: 8px; overflow: hidden;">
            <div id="health-bar-fill" style="width: 100%; height: 100%; background: linear-gradient(90deg, #E94560, #FF6B6B); transition: width 0.3s;"></div>
          </div>
          <span id="health-text">100</span>
        `;
        overlay.appendChild(healthEl);
      }

      if (ui.type === 'score') {
        const scoreEl = document.createElement('div');
        scoreEl.id = 'mock-score';
        scoreEl.style.cssText = `
          position: absolute;
          ${ui.position === 'top-right' ? 'top: 10px; right: 10px;' : 'top: 10px; left: 10px;'}
          color: ${config.colors[3] || '#FFD93D'};
          font-size: 18px;
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        `;
        scoreEl.textContent = 'Score: 0';
        overlay.appendChild(scoreEl);
      }
    }
  },

  // プラットフォーム生成
  generatePlatforms(config, width, height) {
    const platforms = [];

    // 地面
    platforms.push({ x: 0, y: height - 30, w: width, h: 30, type: 'ground' });

    // ランダムプラットフォーム
    const count = 5;
    for (let i = 0; i < count; i++) {
      platforms.push({
        x: 50 + (width - 200) * (i / count) + Math.random() * 50,
        y: height - 100 - Math.random() * (height - 250),
        w: 80 + Math.random() * 80,
        h: 15,
        type: 'platform'
      });
    }

    return platforms;
  },

  // 敵生成
  generateEnemies(config, width, height, enemyTypes) {
    const enemies = [];
    const count = 5;

    for (let i = 0; i < count; i++) {
      const enemyType = enemyTypes[i % enemyTypes.length];
      enemies.push({
        x: Math.random() * (width - 150) + 75,
        y: height - 70,
        size: 30,
        vx: (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random()),
        active: true,
        type: enemyType.type,
        emoji: enemyType.emoji,
        dropsItem: enemyType.dropsItem,
        health: 1
      });
    }

    return enemies;
  },

  // 攻撃処理
  playerAttack(game, config) {
    const player = game.player;
    const attackRange = 60;

    for (const enemy of game.enemies) {
      if (!enemy.active) continue;

      const dx = (enemy.x + enemy.size/2) - (player.x + player.size/2);
      const dy = (enemy.y + enemy.size/2) - (player.y + player.size/2);
      const dist = Math.sqrt(dx*dx + dy*dy);

      // 向いている方向の敵のみ攻撃
      const isInFront = player.facingRight ? dx > 0 : dx < 0;

      if (dist < attackRange && isInFront) {
        enemy.health--;
        if (enemy.health <= 0) {
          enemy.active = false;
          game.score += 50;

          // アイテムドロップ
          if (enemy.dropsItem) {
            game.droppedItems.push({
              x: enemy.x,
              y: enemy.y,
              size: 25,
              emoji: enemy.emoji,
              type: enemy.type,
              timer: 300 // 5秒で消える
            });
          }
        }
      }
    }
  },

  // 射撃処理
  playerShoot(game, config, width) {
    const player = game.player;
    game.projectiles.push({
      x: player.x + player.size/2,
      y: player.y + player.size/2,
      vx: player.facingRight ? 10 : -10,
      vy: 0,
      size: 8,
      active: true
    });
  },

  // キャプチャ処理
  tryCapture(game, config) {
    if (!game.inventory) return;

    const player = game.player;
    const captureRange = 80;

    for (let i = game.droppedItems.length - 1; i >= 0; i--) {
      const item = game.droppedItems[i];
      const dx = (item.x + item.size/2) - (player.x + player.size/2);
      const dy = (item.y + item.size/2) - (player.y + player.size/2);
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist < captureRange) {
        // インベントリに空きがあるか確認
        const emptySlot = game.inventory.items.findIndex(slot => slot === null);
        if (emptySlot !== -1) {
          game.inventory.items[emptySlot] = {
            emoji: item.emoji,
            type: item.type
          };
          game.droppedItems.splice(i, 1);
          game.score += 100;

          // 隣接効果チェック
          this.checkAdjacencyBonus(game, emptySlot, config);
        }
        break;
      }
    }
  },

  // 隣接効果チェック
  checkAdjacencyBonus(game, slotIndex, config) {
    if (!game.inventory) return;

    const { cols, items } = game.inventory;
    const currentItem = items[slotIndex];
    if (!currentItem) return;

    // 隣接スロットのインデックス
    const row = Math.floor(slotIndex / cols);
    const col = slotIndex % cols;
    const adjacentIndices = [];

    if (col > 0) adjacentIndices.push(slotIndex - 1); // 左
    if (col < cols - 1) adjacentIndices.push(slotIndex + 1); // 右
    if (row > 0) adjacentIndices.push(slotIndex - cols); // 上
    if (row < Math.floor(items.length / cols) - 1) adjacentIndices.push(slotIndex + cols); // 下

    // 隣接するアイテムがあれば効果発動
    for (const idx of adjacentIndices) {
      if (items[idx]) {
        game.score += 25; // ボーナススコア
        // ここで特殊効果を追加できる
      }
    }
  },

  // ゲーム更新
  updateGame(game, config, width, height, actions) {
    const player = game.player;
    const gravity = actions.hasGravity ? 0.5 : 0;
    const jumpPower = actions.canJump ? -12 : 0;
    const moveSpeed = 5;

    // 入力処理
    if (game.keys['ArrowLeft'] || game.keys['KeyA']) {
      player.vx = -moveSpeed;
      player.facingRight = false;
    } else if (game.keys['ArrowRight'] || game.keys['KeyD']) {
      player.vx = moveSpeed;
      player.facingRight = true;
    } else {
      player.vx *= 0.8;
    }

    // ジャンプ
    if ((game.keys['ArrowUp'] || game.keys['Space'] || game.keys['KeyW']) && actions.canJump) {
      if (player.onGround) {
        player.vy = jumpPower;
        player.onGround = false;
      }
      game.keys['Space'] = false;
      game.keys['ArrowUp'] = false;
      game.keys['KeyW'] = false;
    }

    // 重力
    player.vy += gravity;

    // 移動
    player.x += player.vx;
    player.y += player.vy;

    // プラットフォーム衝突
    player.onGround = false;
    for (const plat of game.platforms) {
      if (player.x + player.size > plat.x &&
          player.x < plat.x + plat.w &&
          player.y + player.size > plat.y &&
          player.y + player.size < plat.y + plat.h + 10 &&
          player.vy > 0) {
        player.y = plat.y - player.size;
        player.vy = 0;
        player.onGround = true;
      }
    }

    // 画面端
    if (player.x < 0) player.x = 0;
    if (player.x > width - player.size) player.x = width - player.size;
    if (player.y > height) {
      player.y = height - 150;
      player.x = 100;
      game.health -= 20;
    }

    // 敵更新
    for (const enemy of game.enemies) {
      if (!enemy.active) continue;
      enemy.x += enemy.vx;
      if (enemy.x < 0 || enemy.x > width - enemy.size) {
        enemy.vx *= -1;
      }

      // プレイヤーとの衝突
      if (this.checkCollision(player, enemy)) {
        if (player.vy > 0 && player.y < enemy.y) {
          enemy.health--;
          player.vy = -8;
          if (enemy.health <= 0) {
            enemy.active = false;
            game.score += 50;
            if (enemy.dropsItem) {
              game.droppedItems.push({
                x: enemy.x,
                y: enemy.y,
                size: 25,
                emoji: enemy.emoji,
                type: enemy.type,
                timer: 300
              });
            }
          }
        } else {
          game.health -= 10;
          player.x = player.x < enemy.x ? player.x - 50 : player.x + 50;
        }
      }
    }

    // 弾更新
    for (const proj of game.projectiles) {
      if (!proj.active) continue;
      proj.x += proj.vx;
      proj.y += proj.vy;

      // 画面外で消える
      if (proj.x < 0 || proj.x > width) {
        proj.active = false;
        continue;
      }

      // 敵との衝突
      for (const enemy of game.enemies) {
        if (!enemy.active) continue;
        if (this.checkCollision(proj, enemy)) {
          proj.active = false;
          enemy.health--;
          if (enemy.health <= 0) {
            enemy.active = false;
            game.score += 50;
            if (enemy.dropsItem) {
              game.droppedItems.push({
                x: enemy.x,
                y: enemy.y,
                size: 25,
                emoji: enemy.emoji,
                type: enemy.type,
                timer: 300
              });
            }
          }
        }
      }
    }

    // ドロップアイテム更新
    for (let i = game.droppedItems.length - 1; i >= 0; i--) {
      game.droppedItems[i].timer--;
      if (game.droppedItems[i].timer <= 0) {
        game.droppedItems.splice(i, 1);
      }
    }

    // 弾のクリーンアップ
    game.projectiles = game.projectiles.filter(p => p.active);
  },

  // 衝突判定
  checkCollision(a, b) {
    return a.x < b.x + b.size &&
           a.x + a.size > b.x &&
           a.y < b.y + b.size &&
           a.y + a.size > b.y;
  },

  // 描画
  renderGame(ctx, game, config, width, height) {
    const colors = config.colors.length > 0 ? config.colors : ['#4ECDC4', '#45B7D1', '#96CEB4', '#6C5CE7'];

    // 背景
    this.renderBackground(ctx, config, width, height, colors);

    // プラットフォーム
    ctx.fillStyle = colors[2] || '#96CEB4';
    for (const plat of game.platforms) {
      if (config.artStyle === 'pixel') {
        this.drawPixelRect(ctx, plat.x, plat.y, plat.w, plat.h, colors[2]);
      } else {
        ctx.fillStyle = plat.type === 'ground' ? this.adjustColor(colors[2], -30) : colors[2];
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      }
    }

    // ドロップアイテム
    for (const item of game.droppedItems) {
      ctx.font = `${item.size}px Arial`;
      ctx.fillText(item.emoji, item.x, item.y + item.size);

      // キャプチャ可能を示すハイライト
      const blinkAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 200);
      ctx.fillStyle = `rgba(255, 255, 100, ${blinkAlpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(item.x + item.size/2, item.y + item.size/2, item.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 敵
    for (const enemy of game.enemies) {
      if (!enemy.active) continue;
      ctx.font = `${enemy.size}px Arial`;
      ctx.fillText(enemy.emoji, enemy.x, enemy.y + enemy.size);
    }

    // 弾
    ctx.fillStyle = colors[3] || '#FFD93D';
    for (const proj of game.projectiles) {
      if (!proj.active) continue;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // プレイヤー
    this.renderPlayer(ctx, game.player, config, colors);
  },

  // 背景描画
  renderBackground(ctx, config, width, height, colors) {
    switch (config.bgTheme) {
      case 'gradient':
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, this.adjustColor(colors[0], -50));
        grad.addColorStop(1, this.adjustColor(colors[0], -100));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        break;
      case 'starfield':
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 100; i++) {
          const x = (Date.now() / 50 + i * 37) % width;
          const y = (i * 53) % height;
          ctx.fillRect(x, y, 2, 2);
        }
        break;
      case 'grid':
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = colors[3] || '#333';
        ctx.lineWidth = 0.5;
        for (let x = 0; x < width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        break;
      case 'forest':
        const forestGrad = ctx.createLinearGradient(0, 0, 0, height);
        forestGrad.addColorStop(0, '#1a3a2e');
        forestGrad.addColorStop(1, '#0d1f16');
        ctx.fillStyle = forestGrad;
        ctx.fillRect(0, 0, width, height);
        // 木のシルエット
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for (let i = 0; i < 10; i++) {
          const tx = (i * 120 + 50) % width;
          const th = 80 + Math.random() * 60;
          ctx.beginPath();
          ctx.moveTo(tx, height - 30);
          ctx.lineTo(tx + 30, height - 30 - th);
          ctx.lineTo(tx + 60, height - 30);
          ctx.closePath();
          ctx.fill();
        }
        break;
      case 'dungeon':
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);
        // レンガ模様
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let y = 0; y < height; y += 30) {
          const offset = (Math.floor(y / 30) % 2) * 30;
          for (let x = -30 + offset; x < width; x += 60) {
            ctx.strokeRect(x, y, 60, 30);
          }
        }
        break;
      default:
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);
    }
  },

  // プレイヤー描画
  renderPlayer(ctx, player, config, colors) {
    const x = player.x;
    const y = player.y;
    const size = player.size;

    ctx.fillStyle = colors[0] || '#4ECDC4';

    // プレイヤーの絵文字（デフォルト）
    const playerEmoji = config.playerEmoji || '🧙';
    ctx.font = `${size}px Arial`;
    ctx.save();
    if (!player.facingRight) {
      ctx.scale(-1, 1);
      ctx.fillText(playerEmoji, -x - size, y + size);
    } else {
      ctx.fillText(playerEmoji, x, y + size);
    }
    ctx.restore();
  },

  // ピクセル風四角形
  drawPixelRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = this.adjustColor(color, 30);
    ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = this.adjustColor(color, -30);
    ctx.fillRect(x, y + h - 3, w, 3);
  },

  // 色調整
  adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `rgb(${r},${g},${b})`;
  },

  // UI更新
  updateUI(game, config, uiOverlay) {
    // ヘルスバー更新
    const healthFill = document.getElementById('health-bar-fill');
    const healthText = document.getElementById('health-text');
    if (healthFill && healthText) {
      const hp = Math.max(0, game.health);
      healthFill.style.width = hp + '%';
      healthText.textContent = Math.floor(hp);
    }

    // スコア更新
    const scoreEl = document.getElementById('mock-score');
    if (scoreEl) {
      scoreEl.textContent = 'Score: ' + game.score;
    }

    // インベントリ更新
    if (game.inventory) {
      const slots = document.querySelectorAll('.inventory-slot');
      game.inventory.items.forEach((item, idx) => {
        if (slots[idx]) {
          slots[idx].textContent = item ? item.emoji : '';
        }
      });
    }

    // フッターのスタッツ
    const statsEl = document.getElementById('mock-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <span class="stat-item">Score: ${game.score}</span>
        <span class="stat-item">HP: ${Math.max(0, Math.floor(game.health))}%</span>
        ${game.inventory ? `<span class="stat-item">Items: ${game.inventory.items.filter(i => i).length}/${game.inventory.items.length}</span>` : ''}
      `;
    }
  },

  // ゲーム停止
  stopGame() {
    this.isPlaying = false;
  },

  // リスタート
  restartGame() {
    this.stopGame();
    setTimeout(() => {
      if (this.currentMock) {
        const sizes = { small: [800, 450], medium: [960, 540], large: [1280, 720] };
        const [width, height] = sizes[this.currentMock.stageSize] || sizes.medium;

        // 既存のプレイヤーモーダルを削除
        const existingModal = document.getElementById('mock-player-modal');
        if (existingModal) existingModal.remove();

        this.showMockPlayer(this.currentMock);
      }
    }, 100);
  }
};

// グローバルに公開
window.MockBuilder = MockBuilder;
