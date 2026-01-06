/**
 * Compath - Steam開発者向けアシスタントツール
 * メインサーバーファイル
 *
 * セキュリティ設計:
 * - APIキーはサーバーサイドでのみ保持
 * - クライアントには一切公開しない
 * - レート制限で悪用を防止
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

// ルーターのインポート
const reviewRoutes = require('./routes/reviews');
const analyzeRoutes = require('./routes/analyze');
const storeDoctorRoutes = require('./routes/storeDoctor');
const blueOceanRoutes = require('./routes/blueOcean');
const launchCommanderRoutes = require('./routes/launchCommander');
const visualTrendRoutes = require('./routes/visualTrend');
const eventsRoutes = require('./routes/events');
const mockBuilderRoutes = require('./routes/mockBuilder');

const app = express();
const PORT = process.env.PORT || 3000;

// セキュリティミドルウェア（開発環境ではCSPを無効化）
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "https://cdn.cloudflare.steamstatic.com", "data:"],
      },
    },
  }));
} else {
  // 開発環境ではHelmetを使わない
  console.log('開発モード: セキュリティヘッダー無効');
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// レート制限（悪用防止）
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1分
  max: parseInt(process.env.RATE_LIMIT_MAX) || 10, // 1分あたり10リクエスト
  message: {
    error: 'リクエスト制限を超えました。しばらくお待ちください。',
    retryAfter: '1分後に再試行してください'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 1日あたりのリクエスト制限（グローバル）
const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT) || 1000;
let dailyRequestCount = 0;
let lastResetDate = new Date().toDateString();

// 日付が変わったらカウントをリセット
const dailyLimiter = (req, res, next) => {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyRequestCount = 0;
    lastResetDate = today;
    console.log(`[${new Date().toISOString()}] 日次リクエストカウントをリセット`);
  }

  if (dailyRequestCount >= DAILY_LIMIT) {
    console.log(`[${new Date().toISOString()}] 日次制限到達: ${dailyRequestCount}/${DAILY_LIMIT}`);
    return res.status(429).json({
      error: '本日のリクエスト上限に達しました',
      message: '明日また利用してください',
      dailyLimit: DAILY_LIMIT,
      resetTime: '日本時間0時にリセットされます'
    });
  }

  dailyRequestCount++;
  next();
};

app.use('/api', dailyLimiter);
app.use('/api', limiter);

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, '../client')));

// APIルート
app.use('/api/reviews', reviewRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/store-doctor', storeDoctorRoutes);
app.use('/api/blue-ocean', blueOceanRoutes);
app.use('/api/launch-commander', launchCommanderRoutes);
app.use('/api/visual-trend', visualTrendRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/mock-builder', mockBuilderRoutes);

// APIキーの存在確認エンドポイント（キー自体は返さない）
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    aiEnabled: !!process.env.GEMINI_API_KEY,
    version: '1.0.0'
  });
});

// SEO: robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, '../client/robots.txt'));
});

// SEO: sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(__dirname, '../client/sitemap.xml'));
});

// ホームページ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ツールページ
app.get('/tools/:toolName', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// 404ハンドラ
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// エラーハンドラ
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'サーバーエラーが発生しました',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Vercel環境ではサーバー起動しない（サーバーレス関数として動作）
if (process.env.VERCEL !== '1') {
  // 0.0.0.0 で全インターフェースからの接続を許可（社内LAN対応）
  const HOST = '0.0.0.0';

  // ローカルIPアドレスを取得
  function getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }

  app.listen(PORT, HOST, () => {
    const localIP = getLocalIP();
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   Compath - Steam開発者向けアシスタントツール              ║
║                                                            ║
║   ローカル: http://localhost:${PORT}                          ║
║   社内LAN: http://${localIP}:${PORT}                     ║
║   AI機能: ${process.env.GEMINI_API_KEY ? '有効 (Gemini)' : '無効'}                                    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
}

// Vercel用にエクスポート
module.exports = app;
