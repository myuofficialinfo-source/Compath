/**
 * Upstash Redis レート制限サービス
 * ツミナビと同じRedisインスタンスを使用（prefixで分離）
 */

const { Ratelimit } = require('@upstash/ratelimit');
const { Redis } = require('@upstash/redis');

// Upstash Redisの設定（環境変数から取得）
let redis = null;
let isUpstashConfigured = false;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    isUpstashConfigured = true;
    console.log('[RateLimit] Upstash Redis 接続設定完了');
  } else {
    console.log('[RateLimit] Upstash未設定 - インメモリフォールバックを使用');
  }
} catch (error) {
  console.error('[RateLimit] Upstash初期化エラー:', error);
}

// IPベースのレート制限（1時間あたり20回）- Steam Compass用
const ipHourlyLimiter = isUpstashConfigured
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 h'),
      prefix: 'steamcompass:ip:hourly',
    })
  : null;

// IPベースのレート制限（1日あたり100回）- Steam Compass用
const ipDailyLimiter = isUpstashConfigured
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '24 h'),
      prefix: 'steamcompass:ip:daily',
    })
  : null;

// グローバルAPIレート制限（1日あたり5000回）- Steam Compass用
const globalDailyLimiter = isUpstashConfigured
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5000, '24 h'),
      prefix: 'steamcompass:global',
    })
  : null;

// ===== インメモリフォールバック用 =====
const DAILY_LIMIT = 5000;
const IP_HOURLY_LIMIT = 20;
const IP_DAILY_LIMIT = 100;

const rateLimitStore = new Map();
const ipRateLimitStore = new Map();

function getJSTMidnight() {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);
  const jstMidnight = new Date(
    jstNow.getFullYear(),
    jstNow.getMonth(),
    jstNow.getDate(),
    0, 0, 0, 0
  );
  const nextMidnightJST = new Date(jstMidnight.getTime() + 24 * 60 * 60 * 1000);
  return nextMidnightJST.getTime() - jstOffset;
}

/**
 * クライアントIPを取得
 */
function getClientIp(req) {
  // Vercelの場合は x-forwarded-for ヘッダーを使用
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

/**
 * IPベースのレート制限チェック（Upstash Redis対応）
 */
async function checkIpRateLimit(ip) {
  // Upstashが設定されている場合
  if (isUpstashConfigured && ipHourlyLimiter && ipDailyLimiter) {
    try {
      const [hourlyResult, dailyResult] = await Promise.all([
        ipHourlyLimiter.limit(ip),
        ipDailyLimiter.limit(ip),
      ]);

      if (!hourlyResult.success) {
        return {
          allowed: false,
          reason: 'hourly',
          message: '短時間にリクエストが多すぎます。1時間後に再度お試しください。',
          hourlyRemaining: 0,
          dailyRemaining: dailyResult.remaining,
        };
      }

      if (!dailyResult.success) {
        return {
          allowed: false,
          reason: 'daily',
          message: '本日の利用上限に達しました。明日またお試しください。',
          hourlyRemaining: hourlyResult.remaining,
          dailyRemaining: 0,
        };
      }

      return {
        allowed: true,
        hourlyRemaining: hourlyResult.remaining,
        dailyRemaining: dailyResult.remaining,
      };
    } catch (error) {
      console.error('[RateLimit] Upstash IP制限エラー:', error);
      // Upstashエラー時はインメモリにフォールバック
    }
  }

  // インメモリフォールバック
  return checkIpRateLimitMemory(ip);
}

/**
 * グローバルレート制限チェック（Upstash Redis対応）
 */
async function checkGlobalRateLimit() {
  if (isUpstashConfigured && globalDailyLimiter) {
    try {
      const result = await globalDailyLimiter.limit('global');
      return {
        allowed: result.success,
        remaining: result.remaining,
        message: result.success ? null : 'サーバーが混雑しています。しばらく待ってから再度お試しください。',
      };
    } catch (error) {
      console.error('[RateLimit] Upstashグローバル制限エラー:', error);
    }
  }

  // インメモリフォールバック
  return checkGlobalRateLimitMemory();
}

/**
 * インメモリ版IPレート制限
 */
function checkIpRateLimitMemory(ip) {
  const now = Date.now();
  const data = ipRateLimitStore.get(ip);

  const hourlyReset = now + 60 * 60 * 1000;
  const dailyReset = getJSTMidnight();

  if (!data) {
    ipRateLimitStore.set(ip, {
      hourlyCount: 1,
      hourlyResetAt: hourlyReset,
      dailyCount: 1,
      dailyResetAt: dailyReset
    });
    return {
      allowed: true,
      hourlyRemaining: IP_HOURLY_LIMIT - 1,
      dailyRemaining: IP_DAILY_LIMIT - 1,
    };
  }

  // 時間リセット
  if (now >= data.hourlyResetAt) {
    data.hourlyCount = 0;
    data.hourlyResetAt = hourlyReset;
  }

  // 日次リセット
  if (now >= data.dailyResetAt) {
    data.dailyCount = 0;
    data.dailyResetAt = dailyReset;
  }

  data.hourlyCount += 1;
  data.dailyCount += 1;
  ipRateLimitStore.set(ip, data);

  const hourlyRemaining = IP_HOURLY_LIMIT - data.hourlyCount;
  const dailyRemaining = IP_DAILY_LIMIT - data.dailyCount;

  if (hourlyRemaining < 0) {
    return {
      allowed: false,
      reason: 'hourly',
      message: '短時間にリクエストが多すぎます。1時間後に再度お試しください。',
      hourlyRemaining: 0,
      dailyRemaining: Math.max(0, dailyRemaining),
    };
  }

  if (dailyRemaining < 0) {
    return {
      allowed: false,
      reason: 'daily',
      message: '本日の利用上限に達しました。明日またお試しください。',
      hourlyRemaining: Math.max(0, hourlyRemaining),
      dailyRemaining: 0,
    };
  }

  return {
    allowed: true,
    hourlyRemaining,
    dailyRemaining,
  };
}

/**
 * インメモリ版グローバルレート制限
 */
function checkGlobalRateLimitMemory() {
  const now = Date.now();
  const key = 'global';
  const data = rateLimitStore.get(key);

  if (!data || now >= data.resetAt) {
    const resetAt = getJSTMidnight();
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: DAILY_LIMIT - 1 };
  }

  data.count += 1;
  rateLimitStore.set(key, data);

  const remaining = DAILY_LIMIT - data.count;
  return {
    allowed: remaining >= 0,
    remaining: Math.max(0, remaining),
    message: remaining < 0 ? 'サーバーが混雑しています。しばらく待ってから再度お試しください。' : null,
  };
}

/**
 * Expressミドルウェア: Upstashレート制限
 */
function upstashRateLimitMiddleware() {
  return async (req, res, next) => {
    try {
      const ip = getClientIp(req);

      // IPベースのレート制限
      const ipResult = await checkIpRateLimit(ip);
      if (!ipResult.allowed) {
        console.log(`[RateLimit] IP制限: ${ip} - ${ipResult.reason}`);
        return res.status(429).json({
          error: ipResult.message,
          reason: ipResult.reason,
          retryAfter: ipResult.reason === 'hourly' ? '1時間後' : '明日',
        });
      }

      // グローバルレート制限
      const globalResult = await checkGlobalRateLimit();
      if (!globalResult.allowed) {
        console.log(`[RateLimit] グローバル制限到達`);
        return res.status(429).json({
          error: globalResult.message,
          reason: 'global',
        });
      }

      // 残り回数をヘッダーに追加
      res.set('X-RateLimit-IP-Hourly-Remaining', ipResult.hourlyRemaining);
      res.set('X-RateLimit-IP-Daily-Remaining', ipResult.dailyRemaining);
      res.set('X-RateLimit-Global-Remaining', globalResult.remaining);

      next();
    } catch (error) {
      console.error('[RateLimit] ミドルウェアエラー:', error);
      // エラー時は通過させる（サービス停止を避ける）
      next();
    }
  };
}

module.exports = {
  checkIpRateLimit,
  checkGlobalRateLimit,
  getClientIp,
  upstashRateLimitMiddleware,
  isUpstashConfigured,
};
