/**
 * Compath - プラン・課金管理モジュール
 *
 * 注意: 決済処理（Stripe等）は後から実装
 * 現時点ではUIとプランの状態管理のみ
 */

const UserPlan = {
  // プラン定義（FreeとProの2つのみ）
  PLANS: {
    FREE: {
      id: 'free',
      name: 'Free',
      nameJa: '無料プラン',
      price: 0,
      priceDisplay: '¥0',
      priceDisplayEn: 'Free',
      features: {
        unlimitedSearch: true,   // 検索は無制限
        advancedAI: false,       // 高度AI分析なし
        exportPDF: false,        // PDF出力なし
        prioritySupport: false,  // 優先サポートなし
        noAds: false             // 広告あり
      },
      featuresText: {
        ja: [
          '全ツール利用可能',
          '検索・分析は無制限',
          '基本的な分析',
          'コミュニティサポート'
        ],
        en: [
          'Access to all tools',
          'Unlimited search & analysis',
          'Basic analysis',
          'Community support'
        ]
      }
    },
    PRO: {
      id: 'pro',
      name: 'Pro',
      nameJa: 'Proプラン',
      price: 500,
      priceDisplay: '¥500/月',
      priceDisplayEn: '$5/mo',
      features: {
        unlimitedSearch: true,   // 検索は無制限
        advancedAI: true,        // 高度AI分析
        exportCSV: true,         // CSV出力
        mockBuilder: true,       // モックビルダー
        toolIntegration: true,   // ツール連携
        prioritySupport: true,   // 優先サポート
        noAds: true              // 広告なし
      },
      featuresText: {
        ja: [
          '全ツール利用可能',
          'CSV/データエクスポート',
          'ゲームモック作成ツール',
          'ツール間データ連携',
          '広告非表示',
          '優先サポート'
        ],
        en: [
          'Access to all tools',
          'CSV/Data export',
          'Game Mock Builder',
          'Cross-tool data sync',
          'No ads',
          'Priority support'
        ]
      }
    }
  },

  // 現在のプラン（localStorageから取得、デフォルトはFREE）
  _currentPlan: null,

  // 初期化
  init() {
    const saved = localStorage.getItem('compath_plan');
    this._currentPlan = saved || 'free';

    // UIを更新
    this.updateUI();
  },

  // 現在のプランを取得
  get current() {
    return this.PLANS[this._currentPlan?.toUpperCase()] || this.PLANS.FREE;
  },

  // Proかどうか
  get isPro() {
    return this._currentPlan === 'pro';
  },

  // 機能が使えるかチェック
  canUse(feature) {
    return this.current.features[feature] === true;
  },

  // プランを変更（いつでも切り替え可能）
  async changePlan(planId) {
    // TODO: Stripe決済処理を実装
    // 現在はモック：プランを直接変更
    console.log(`[Mock] Changing plan to ${planId}...`);

    // モック: 成功したと仮定
    this._currentPlan = planId;
    localStorage.setItem('compath_plan', planId);
    this.updateUI();

    const lang = AppState.language || 'ja';
    const message = planId === 'pro'
      ? (lang === 'ja' ? '（デモ）Proプランに変更しました' : '(Demo) Changed to Pro plan')
      : (lang === 'ja' ? '（デモ）無料プランに変更しました' : '(Demo) Changed to Free plan');

    return { success: true, message };
  },

  // UIを更新
  updateUI() {
    // ヘッダーのProバッジ
    const proBadge = document.querySelector('.pro-badge');
    if (proBadge) {
      proBadge.style.display = this.isPro ? 'flex' : 'none';
    }

    // アップグレードボタン
    const upgradeBtn = document.querySelector('.upgrade-btn');
    if (upgradeBtn) {
      upgradeBtn.style.display = this.isPro ? 'none' : 'flex';
    }

    // 使用回数表示（無制限なので非表示）
    const usageDisplay = document.querySelector('.usage-counter');
    if (usageDisplay) {
      usageDisplay.style.display = 'none';
    }

    // 広告表示/非表示
    document.querySelectorAll('.ad-placeholder').forEach(ad => {
      ad.style.display = this.isPro ? 'none' : 'block';
    });

    // 広告コンテナも非表示
    document.querySelectorAll('.ad-container').forEach(container => {
      container.style.display = this.isPro ? 'none' : 'flex';
    });
  },

  // 料金モーダルを表示
  showPricingModal() {
    const lang = AppState.language || 'ja';
    const modal = document.createElement('div');
    modal.className = 'pricing-modal-overlay';
    modal.innerHTML = `
      <div class="pricing-modal">
        <button class="pricing-modal-close">&times;</button>
        <h2 class="pricing-title">${lang === 'ja' ? 'プランを選択' : 'Choose Your Plan'}</h2>
        <p class="pricing-subtitle">${lang === 'ja' ? 'いつでもプラン変更可能' : 'Change your plan anytime'}</p>

        <div class="pricing-cards pricing-cards-two">
          ${this._renderPlanCard('FREE', lang)}
          ${this._renderPlanCard('PRO', lang, true)}
        </div>

        <p class="pricing-note">
          ${lang === 'ja'
            ? '※ 決済機能は現在準備中です。リリースまでお待ちください。'
            : '※ Payment processing is coming soon.'}
        </p>
      </div>
    `;

    document.body.appendChild(modal);

    // 閉じるボタン
    modal.querySelector('.pricing-modal-close').addEventListener('click', () => {
      modal.remove();
    });

    // オーバーレイクリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // プラン選択ボタン
    modal.querySelectorAll('.plan-select-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const planId = btn.dataset.plan;
        const isCurrent = this._currentPlan === planId;
        if (isCurrent) {
          modal.remove();
          return;
        }
        // TODO: Stripe決済フローを開始（Proの場合）
        const result = await this.changePlan(planId);
        if (result.success) {
          this.showToast(result.message, 'success');
          modal.remove();
        }
      });
    });
  },

  // プランカードをレンダリング
  _renderPlanCard(planKey, lang, recommended = false) {
    const plan = this.PLANS[planKey];
    const isCurrent = this._currentPlan === plan.id;
    const features = plan.featuresText[lang] || plan.featuresText.ja;

    let buttonText;
    if (isCurrent) {
      buttonText = lang === 'ja' ? '現在のプラン' : 'Current Plan';
    } else if (planKey === 'FREE') {
      buttonText = lang === 'ja' ? '無料プランに変更' : 'Switch to Free';
    } else {
      buttonText = lang === 'ja' ? 'Proにアップグレード' : 'Upgrade to Pro';
    }

    return `
      <div class="pricing-card ${recommended ? 'recommended' : ''} ${isCurrent ? 'current' : ''}">
        ${recommended ? `<div class="recommended-badge">${lang === 'ja' ? 'おすすめ' : 'Recommended'}</div>` : ''}
        <h3 class="plan-name">${plan.name}</h3>
        <div class="plan-price">
          ${lang === 'ja' ? plan.priceDisplay : plan.priceDisplayEn}
        </div>
        <ul class="plan-features">
          ${features.map(f => `<li><span class="check-icon">✓</span>${f}</li>`).join('')}
        </ul>
        <button class="plan-select-btn ${isCurrent ? 'current' : ''}" data-plan="${plan.id}">
          ${buttonText}
        </button>
      </div>
    `;
  },

  // トースト通知
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `plan-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
};

// 広告管理（将来的にAdSense等と連携）
const AdManager = {
  // デモモード: trueで広告・PRO UIを非表示
  DEMO_MODE: true,

  // 広告スロット定義
  SLOTS: {
    HEADER: { id: 'ad-header', size: '728x90', name: 'ヘッダーバナー' },
    SIDEBAR: { id: 'ad-sidebar', size: '300x250', name: 'サイドバー' },
    INLINE: { id: 'ad-inline', size: '336x280', name: 'インライン' },
    FOOTER: { id: 'ad-footer', size: '728x90', name: 'フッターバナー' }
  },

  // 初期化
  init() {
    // デモモードまたはProユーザーは広告非表示
    if (this.DEMO_MODE || UserPlan.isPro) {
      this.hideAll();
      return;
    }

    // 広告プレースホルダーを挿入
    this.renderPlaceholders();
  },

  // すべての広告を非表示
  hideAll() {
    document.querySelectorAll('.ad-placeholder').forEach(ad => {
      ad.style.display = 'none';
    });
    document.querySelectorAll('.ad-container').forEach(container => {
      container.style.display = 'none';
    });
  },

  // プレースホルダーを描画
  renderPlaceholders() {
    // 実際の広告コード挿入は後で実装
    // 現在はプレースホルダーのみ
  },

  // 広告プレースホルダーHTML生成
  createPlaceholder(slotKey, customClass = '') {
    const slot = this.SLOTS[slotKey];
    if (!slot) return '';

    const [width, height] = slot.size.split('x');
    const lang = AppState.language || 'ja';

    return `
      <div class="ad-placeholder ${customClass}" id="${slot.id}" style="width:${width}px; max-width:100%;">
        <div class="ad-placeholder-inner" style="padding-bottom: ${(height/width)*100}%;">
          <div class="ad-placeholder-content">
            <span class="ad-label">AD</span>
            <span class="ad-text">${lang === 'ja' ? '広告スペース' : 'Ad Space'}</span>
            <span class="ad-size">${slot.size}</span>
          </div>
        </div>
        <a href="#" class="ad-remove-link" onclick="UserPlan.showPricingModal(); return false;">
          ${lang === 'ja' ? '広告を非表示にする' : 'Remove ads'}
        </a>
      </div>
    `;
  },

  // ツールページ用のヘッダー広告HTML（デモモードまたはProなら空文字を返す）
  getToolHeaderAd() {
    if (this.DEMO_MODE || UserPlan.isPro) return '';
    const lang = AppState.language || 'ja';
    return `
      <div class="ad-container ad-tool-header">
        <div class="ad-placeholder" id="ad-tool-header">
          <div class="ad-placeholder-inner">
            <div class="ad-placeholder-content">
              <span class="ad-label">AD</span>
              <span class="ad-text">${lang === 'ja' ? '広告スペース' : 'Ad Space'}</span>
              <span class="ad-size">728x90</span>
            </div>
          </div>
          <a href="#" class="ad-remove-link" onclick="UserPlan.showPricingModal(); return false;">
            ${lang === 'ja' ? '広告を非表示にする' : 'Remove ads'}
          </a>
        </div>
      </div>
    `;
  },

  // ツールページ用のフッター広告HTML（デモモードまたはProなら空文字を返す）
  getToolFooterAd() {
    if (this.DEMO_MODE || UserPlan.isPro) return '';
    const lang = AppState.language || 'ja';
    return `
      <div class="ad-container ad-tool-footer">
        <div class="ad-placeholder" id="ad-tool-footer">
          <div class="ad-placeholder-inner">
            <div class="ad-placeholder-content">
              <span class="ad-label">AD</span>
              <span class="ad-text">${lang === 'ja' ? '広告スペース' : 'Ad Space'}</span>
              <span class="ad-size">728x90</span>
            </div>
          </div>
          <a href="#" class="ad-remove-link" onclick="UserPlan.showPricingModal(); return false;">
            ${lang === 'ja' ? '広告を非表示にする' : 'Remove ads'}
          </a>
        </div>
      </div>
    `;
  }
};

// DOMContentLoadedで初期化
document.addEventListener('DOMContentLoaded', () => {
  UserPlan.init();
  AdManager.init();
});
