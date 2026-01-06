/**
 * Compath - シンプルルーター
 */

// ページ遷移
function navigateTo(pageName) {
  console.log('navigateTo:', pageName);

  // 全ページを非表示
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
    console.log('Removed active from:', page.id);
  });

  // 対象ページを表示
  const targetPage = document.getElementById(`${pageName}-page`);
  console.log('Target page:', targetPage);

  if (targetPage) {
    targetPage.classList.add('active');
    console.log('Added active to:', targetPage.id);

    // ツール初期化
    if (pageName === 'review-insight') {
      ToolAccessTracker.recordAccess('review-insight');
      ReviewInsight.init();
    } else if (pageName === 'store-doctor') {
      ToolAccessTracker.recordAccess('store-doctor');
      StoreDoctor.init();
    } else if (pageName === 'blue-ocean') {
      ToolAccessTracker.recordAccess('blue-ocean');
      BlueOcean.init();
    } else if (pageName === 'launch-commander') {
      ToolAccessTracker.recordAccess('launch-commander');
      LaunchCommander.init();
    } else if (pageName === 'visual-trend') {
      ToolAccessTracker.recordAccess('visual-trend');
      VisualTrend.init();
    } else if (pageName === 'steamlytic') {
      ToolAccessTracker.recordAccess('steamlytic');
      Steamlytic.init();
    } else if (pageName === 'home') {
      // ホーム画面表示時にツールカードを人気順に並べ替え
      ToolAccessTracker.sortToolCards();
    }
  } else {
    // ホームにフォールバック
    document.getElementById('home-page').classList.add('active');
    console.log('Fallback to home');
    // フォールバック時も並べ替え
    ToolAccessTracker.sortToolCards();
  }

  // 状態更新
  AppState.currentPage = pageName;

  // URLを更新（履歴に追加）
  const url = pageName === 'home' ? '/' : `/tools/${pageName}`;
  history.pushState({ page: pageName }, '', url);

  // スクロールをトップに
  window.scrollTo(0, 0);
}

// ブラウザの戻る/進むボタン対応
window.addEventListener('popstate', (event) => {
  if (event.state && event.state.page) {
    navigateTo(event.state.page);
  } else {
    navigateTo('home');
  }
});

// 初期ページ判定
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');

  // 言語設定を初期化
  Lang.init();

  const path = window.location.pathname;

  if (path.startsWith('/tools/')) {
    const toolName = path.replace('/tools/', '');
    navigateTo(toolName);
  } else {
    // 初期状態をhistoryに追加
    history.replaceState({ page: 'home' }, '', '/');
    // ホームページ初期表示時にツールカードを人気順に並べ替え
    ToolAccessTracker.sortToolCards();
  }

  // ツールカードのクリックイベントを設定
  const reviewInsightBtn = document.getElementById('btn-review-insight');
  if (reviewInsightBtn) {
    reviewInsightBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigateTo('review-insight');
    });
  }

  const storeDoctorBtn = document.getElementById('btn-store-doctor');
  if (storeDoctorBtn) {
    storeDoctorBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigateTo('store-doctor');
    });
  }

  // Blue Ocean Scout
  const blueOceanBtn = document.getElementById('btn-blue-ocean');
  if (blueOceanBtn) {
    blueOceanBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigateTo('blue-ocean');
    });
  }

  // Coming Soon ツール（クリック無効）
  // const launchCommanderBtn = document.getElementById('btn-launch-commander');
  // const visualTrendBtn = document.getElementById('btn-visual-trend');

  const steamlyticBtn = document.getElementById('btn-steamlytic');
  if (steamlyticBtn) {
    steamlyticBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigateTo('steamlytic');
    });
  }

  // 言語切り替えボタンのイベント
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      Lang.set(lang);
      // 現在のページを再描画
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
      } else if (AppState.currentPage === 'steamlytic') {
        Steamlytic.init();
      }
      // ホームページの場合はLang.set内のupdateHomeUIで更新される
    });
  });
});
