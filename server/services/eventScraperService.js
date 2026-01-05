/**
 * Event Scraper Service
 * Steam/ゲーム業界イベントを複数ソースから収集・統合
 *
 * データソース:
 * 1. Steamworks公式 - Upcoming Steam Events (HTMLスクレイピング)
 * 2. SteamDB - セール/イベントトラッキング
 * 3. Events for Gamers - ICS/iCalフィード
 * 4. dev.events - RSSフィード
 */

const axios = require('axios');
const cheerio = require('cheerio');

// タイムゾーン変換 (PT → JST)
const PT_TO_JST_HOURS = 17; // PT + 17時間 = JST

/**
 * PT時刻をJSTに変換
 */
function convertPTtoJST(dateStr, timeStr = '10:00') {
  const date = new Date(dateStr);
  const [hours, minutes] = timeStr.split(':').map(Number);
  date.setUTCHours(hours + 8, minutes, 0, 0); // PT = UTC-8
  return date;
}

/**
 * 日付をYYYY-MM-DD形式に
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// ===========================================
// Steam公式イベント（手動更新のフォールバック）
// ===========================================
const STEAM_EVENTS_FALLBACK = {
  2025: [
    // Q1
    { name: 'Steam春節セール', startDate: '2025-01-23', endDate: '2025-01-30', type: 'sale', importance: 'high', source: 'steam_official' },
    { name: 'Steam Next Fest (2月)', startDate: '2025-02-24', endDate: '2025-03-03', type: 'fest', importance: 'critical', deadline: '2025-01-24', source: 'steam_official' },
    { name: 'Steam春セール', startDate: '2025-03-13', endDate: '2025-03-20', type: 'sale', importance: 'high', source: 'steam_official' },
    // Q2
    { name: 'Steam Puzzle Fest', startDate: '2025-04-28', endDate: '2025-05-05', type: 'genre_fest', importance: 'medium', source: 'steam_official' },
    { name: 'Steam Next Fest (6月)', startDate: '2025-06-09', endDate: '2025-06-16', type: 'fest', importance: 'critical', deadline: '2025-05-09', source: 'steam_official' },
    { name: 'Steamサマーセール', startDate: '2025-06-26', endDate: '2025-07-10', type: 'sale', importance: 'critical', source: 'steam_official' },
    // Q3
    { name: 'Steam Survival Fest', startDate: '2025-07-21', endDate: '2025-07-28', type: 'genre_fest', importance: 'medium', source: 'steam_official' },
    { name: 'Steam Horror Fest', startDate: '2025-08-04', endDate: '2025-08-11', type: 'genre_fest', importance: 'high', source: 'steam_official' },
    { name: 'Steam Visual Novel Fest', startDate: '2025-09-08', endDate: '2025-09-15', type: 'genre_fest', importance: 'medium', source: 'steam_official' },
    // Q4
    { name: 'Steam Next Fest (10月)', startDate: '2025-10-13', endDate: '2025-10-20', type: 'fest', importance: 'critical', deadline: '2025-09-13', source: 'steam_official' },
    { name: 'Steam Scream Fest', startDate: '2025-10-27', endDate: '2025-11-03', type: 'sale', importance: 'high', source: 'steam_official' },
    { name: 'Steamオータムセール', startDate: '2025-11-27', endDate: '2025-12-04', type: 'sale', importance: 'high', source: 'steam_official' },
    { name: 'The Game Awards セール', startDate: '2025-12-11', endDate: '2025-12-15', type: 'sale', importance: 'medium', source: 'steam_official' },
    { name: 'Steamウィンターセール', startDate: '2025-12-19', endDate: '2026-01-02', type: 'sale', importance: 'critical', source: 'steam_official' }
  ],
  2026: [
    { name: 'Steam春節セール', startDate: '2026-02-12', endDate: '2026-02-19', type: 'sale', importance: 'high', source: 'steam_official' },
    { name: 'Steam Next Fest (2月)', startDate: '2026-02-23', endDate: '2026-03-02', type: 'fest', importance: 'critical', deadline: '2026-01-23', source: 'steam_official' },
    { name: 'Steam春セール', startDate: '2026-03-12', endDate: '2026-03-19', type: 'sale', importance: 'high', source: 'steam_official' },
    { name: 'Steam Next Fest (6月)', startDate: '2026-06-08', endDate: '2026-06-15', type: 'fest', importance: 'critical', deadline: '2026-05-08', source: 'steam_official' },
    { name: 'Steamサマーセール', startDate: '2026-06-25', endDate: '2026-07-09', type: 'sale', importance: 'critical', source: 'steam_official' },
    { name: 'Steam Next Fest (10月)', startDate: '2026-10-12', endDate: '2026-10-19', type: 'fest', importance: 'critical', deadline: '2026-09-12', source: 'steam_official' },
    { name: 'Steamウィンターセール', startDate: '2026-12-17', endDate: '2027-01-03', type: 'sale', importance: 'critical', source: 'steam_official' }
  ]
};

// ===========================================
// ゲーム業界イベント（外部）
// ===========================================
const GAME_INDUSTRY_EVENTS = {
  2025: [
    // メジャーイベント
    { name: 'GDC 2025', startDate: '2025-03-17', endDate: '2025-03-21', type: 'conference', importance: 'critical', location: 'San Francisco, USA', source: 'industry' },
    { name: 'PAX East 2025', startDate: '2025-05-08', endDate: '2025-05-11', type: 'expo', importance: 'high', location: 'Boston, USA', source: 'industry' },
    { name: 'Summer Game Fest 2025', startDate: '2025-06-06', endDate: '2025-06-06', type: 'showcase', importance: 'critical', location: 'Online', source: 'industry' },
    { name: 'BitSummit 2025', startDate: '2025-07-18', endDate: '2025-07-20', type: 'expo', importance: 'high', location: 'Kyoto, Japan', source: 'industry' },
    { name: 'Gamescom 2025', startDate: '2025-08-20', endDate: '2025-08-24', type: 'expo', importance: 'critical', location: 'Cologne, Germany', source: 'industry' },
    { name: 'Tokyo Game Show 2025', startDate: '2025-09-25', endDate: '2025-09-28', type: 'expo', importance: 'critical', location: 'Tokyo, Japan', source: 'industry' },
    { name: 'PAX West 2025', startDate: '2025-08-29', endDate: '2025-09-01', type: 'expo', importance: 'high', location: 'Seattle, USA', source: 'industry' },
    { name: 'PAX Aus 2025', startDate: '2025-10-10', endDate: '2025-10-12', type: 'expo', importance: 'medium', location: 'Melbourne, Australia', source: 'industry' },
    { name: 'The Game Awards 2025', startDate: '2025-12-11', endDate: '2025-12-11', type: 'awards', importance: 'critical', location: 'Los Angeles, USA', source: 'industry' },

    // インディー向け
    { name: 'Day of the Devs 2025', startDate: '2025-06-06', endDate: '2025-06-06', type: 'showcase', importance: 'medium', location: 'Online', source: 'industry' },
    { name: 'Indie World Showcase (推定)', startDate: '2025-05-15', endDate: '2025-05-15', type: 'showcase', importance: 'high', location: 'Online', source: 'industry' },
    { name: 'ID@Xbox Showcase (推定)', startDate: '2025-06-09', endDate: '2025-06-09', type: 'showcase', importance: 'high', location: 'Online', source: 'industry' },

    // 地域別
    { name: 'CEDEC 2025', startDate: '2025-08-26', endDate: '2025-08-28', type: 'conference', importance: 'medium', location: 'Yokohama, Japan', source: 'industry' },
    { name: 'Nordic Game 2025', startDate: '2025-05-27', endDate: '2025-05-30', type: 'conference', importance: 'medium', location: 'Malmö, Sweden', source: 'industry' },
    { name: 'Devcom 2025', startDate: '2025-08-17', endDate: '2025-08-18', type: 'conference', importance: 'medium', location: 'Cologne, Germany', source: 'industry' },
    { name: 'G-STAR 2025', startDate: '2025-11-13', endDate: '2025-11-16', type: 'expo', importance: 'high', location: 'Busan, South Korea', source: 'industry' },
    { name: 'ChinaJoy 2025', startDate: '2025-07-25', endDate: '2025-07-28', type: 'expo', importance: 'high', location: 'Shanghai, China', source: 'industry' }
  ],
  2026: [
    { name: 'GDC 2026', startDate: '2026-03-16', endDate: '2026-03-20', type: 'conference', importance: 'critical', location: 'San Francisco, USA', source: 'industry' },
    { name: 'Summer Game Fest 2026', startDate: '2026-06-05', endDate: '2026-06-05', type: 'showcase', importance: 'critical', location: 'Online', source: 'industry' },
    { name: 'Gamescom 2026', startDate: '2026-08-19', endDate: '2026-08-23', type: 'expo', importance: 'critical', location: 'Cologne, Germany', source: 'industry' },
    { name: 'Tokyo Game Show 2026', startDate: '2026-09-24', endDate: '2026-09-27', type: 'expo', importance: 'critical', location: 'Tokyo, Japan', source: 'industry' },
    { name: 'The Game Awards 2026', startDate: '2026-12-10', endDate: '2026-12-10', type: 'awards', importance: 'critical', location: 'Los Angeles, USA', source: 'industry' }
  ]
};

// キャッシュ
let cachedEvents = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24時間

/**
 * SteamDBからセール/イベント情報をスクレイピング
 */
async function fetchSteamDBEvents() {
  try {
    const response = await axios.get('https://steamdb.info/sales/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const events = [];

    // 進行中のセールを取得
    $('.sale-section').each((i, section) => {
      const title = $(section).find('h2').text().trim();
      const dates = $(section).find('.sale-dates').text().trim();

      if (title && dates) {
        // 日付をパース（例: "January 23 – January 30"）
        const dateMatch = dates.match(/(\w+ \d+)\s*[–-]\s*(\w+ \d+)/);
        if (dateMatch) {
          const year = new Date().getFullYear();
          const startDate = new Date(`${dateMatch[1]}, ${year}`);
          const endDate = new Date(`${dateMatch[2]}, ${year}`);

          events.push({
            name: title,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            type: title.toLowerCase().includes('fest') ? 'fest' : 'sale',
            importance: title.toLowerCase().includes('summer') || title.toLowerCase().includes('winter') ? 'critical' : 'high',
            source: 'steamdb'
          });
        }
      }
    });

    console.log(`SteamDB: ${events.length}件のイベント取得`);
    return events;

  } catch (error) {
    console.log('SteamDB取得エラー（フォールバック使用）:', error.message);
    return [];
  }
}

/**
 * ICSフィード (Events for Gamers) をパース
 */
async function fetchICSEvents(url = 'https://www.eventsforgamers.com/events/?ical=1') {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const events = parseICS(response.data);
    console.log(`ICS: ${events.length}件のイベント取得`);
    return events;

  } catch (error) {
    console.log('ICS取得エラー:', error.message);
    return [];
  }
}

/**
 * ICSデータをパース
 */
function parseICS(icsData) {
  const events = [];
  const lines = icsData.split('\n');

  let currentEvent = null;

  for (let line of lines) {
    line = line.trim();

    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.name && currentEvent.startDate) {
        events.push({
          name: currentEvent.name,
          startDate: currentEvent.startDate,
          endDate: currentEvent.endDate || currentEvent.startDate,
          type: categorizeEvent(currentEvent.name),
          importance: determineImportance(currentEvent.name),
          location: currentEvent.location || '',
          source: 'ics_feed'
        });
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.name = line.substring(8).replace(/\\,/g, ',');
      } else if (line.startsWith('DTSTART')) {
        currentEvent.startDate = parseICSDate(line);
      } else if (line.startsWith('DTEND')) {
        currentEvent.endDate = parseICSDate(line);
      } else if (line.startsWith('LOCATION:')) {
        currentEvent.location = line.substring(9).replace(/\\,/g, ',');
      }
    }
  }

  return events;
}

/**
 * ICS日付形式をパース
 */
function parseICSDate(line) {
  const match = line.match(/(\d{4})(\d{2})(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return null;
}

/**
 * イベント名からカテゴリを判定
 */
function categorizeEvent(name) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('sale') || lowerName.includes('セール')) return 'sale';
  if (lowerName.includes('fest')) return 'fest';
  if (lowerName.includes('gdc') || lowerName.includes('cedec') || lowerName.includes('conference')) return 'conference';
  if (lowerName.includes('expo') || lowerName.includes('show') || lowerName.includes('pax') || lowerName.includes('gamescom')) return 'expo';
  if (lowerName.includes('showcase')) return 'showcase';
  if (lowerName.includes('award')) return 'awards';
  return 'other';
}

/**
 * イベント名から重要度を判定
 */
function determineImportance(name) {
  const criticalEvents = ['gdc', 'e3', 'gamescom', 'tokyo game show', 'tgs', 'summer game fest', 'game awards', 'next fest', 'summer sale', 'winter sale', 'サマーセール', 'ウィンターセール'];
  const highEvents = ['pax', 'bitsummit', 'indie', 'cedec', 'devcom', 'horror fest', 'autumn', 'spring', 'オータム', '春'];

  const lowerName = name.toLowerCase();

  for (const keyword of criticalEvents) {
    if (lowerName.includes(keyword)) return 'critical';
  }
  for (const keyword of highEvents) {
    if (lowerName.includes(keyword)) return 'high';
  }
  return 'medium';
}

/**
 * 全ソースからイベントを取得・統合
 */
async function fetchAllEvents(forceRefresh = false) {
  // キャッシュチェック
  if (!forceRefresh && cachedEvents && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    console.log('キャッシュからイベント取得');
    return cachedEvents;
  }

  console.log('イベントデータを取得中...');

  const allEvents = [];

  // 1. Steamフォールバックデータ（確実）
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year <= currentYear + 1; year++) {
    const steamEvents = STEAM_EVENTS_FALLBACK[year] || [];
    allEvents.push(...steamEvents);
  }

  // 2. ゲーム業界イベント
  for (let year = currentYear; year <= currentYear + 1; year++) {
    const industryEvents = GAME_INDUSTRY_EVENTS[year] || [];
    allEvents.push(...industryEvents);
  }

  // 3. SteamDBからライブデータ取得（補助）
  try {
    const steamdbEvents = await fetchSteamDBEvents();
    // 重複を避けてマージ
    for (const event of steamdbEvents) {
      const isDuplicate = allEvents.some(e =>
        e.name.toLowerCase().includes(event.name.toLowerCase().substring(0, 10)) &&
        Math.abs(new Date(e.startDate) - new Date(event.startDate)) < 7 * 24 * 60 * 60 * 1000
      );
      if (!isDuplicate) {
        allEvents.push(event);
      }
    }
  } catch (error) {
    console.log('SteamDB取得スキップ:', error.message);
  }

  // 4. ICSフィード取得（オプション）
  try {
    const icsEvents = await fetchICSEvents();
    // ゲーム関連のみフィルタ
    const gameEvents = icsEvents.filter(e => {
      const lowerName = e.name.toLowerCase();
      return lowerName.includes('game') || lowerName.includes('pax') ||
        lowerName.includes('gdc') || lowerName.includes('indie') ||
        lowerName.includes('dev');
    });
    for (const event of gameEvents) {
      const isDuplicate = allEvents.some(e =>
        e.name.toLowerCase() === event.name.toLowerCase()
      );
      if (!isDuplicate) {
        allEvents.push(event);
      }
    }
  } catch (error) {
    console.log('ICS取得スキップ:', error.message);
  }

  // 日付でソート
  allEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  // キャッシュ更新
  cachedEvents = allEvents;
  cacheTimestamp = Date.now();

  console.log(`合計: ${allEvents.length}件のイベント`);
  return allEvents;
}

/**
 * 特定期間のイベントを取得
 */
async function getEventsInRange(startDate, endDate) {
  const allEvents = await fetchAllEvents();
  const start = new Date(startDate);
  const end = new Date(endDate);

  return allEvents.filter(event => {
    const eventStart = new Date(event.startDate);
    return eventStart >= start && eventStart <= end;
  });
}

/**
 * リリース日に関連するイベントを取得
 */
async function getEventsForRelease(releaseDate, monthsBefore = 6, monthsAfter = 3) {
  const allEvents = await fetchAllEvents();
  const release = new Date(releaseDate);

  const start = new Date(release);
  start.setMonth(start.getMonth() - monthsBefore);

  const end = new Date(release);
  end.setMonth(end.getMonth() + monthsAfter);

  return allEvents
    .filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate >= start && eventDate <= end;
    })
    .map(event => {
      const eventDate = new Date(event.startDate);
      const daysFromRelease = Math.ceil((eventDate - release) / (24 * 60 * 60 * 1000));
      return {
        ...event,
        daysFromRelease,
        isBeforeRelease: daysFromRelease < 0,
        weeksFromRelease: Math.round(daysFromRelease / 7)
      };
    });
}

/**
 * 今後のSteamセールを取得
 */
async function getUpcomingSteamSales(limit = 10) {
  const allEvents = await fetchAllEvents();
  const today = new Date();

  return allEvents
    .filter(event =>
      (event.source === 'steam_official' || event.source === 'steamdb') &&
      new Date(event.startDate) >= today
    )
    .slice(0, limit);
}

/**
 * 今後の業界イベントを取得
 */
async function getUpcomingIndustryEvents(limit = 10) {
  const allEvents = await fetchAllEvents();
  const today = new Date();

  return allEvents
    .filter(event =>
      event.source === 'industry' &&
      new Date(event.startDate) >= today
    )
    .slice(0, limit);
}

/**
 * イベントをカテゴリ別に分類
 */
async function getEventsByCategory() {
  const allEvents = await fetchAllEvents();

  return {
    sales: allEvents.filter(e => e.type === 'sale'),
    fests: allEvents.filter(e => e.type === 'fest' || e.type === 'genre_fest'),
    conferences: allEvents.filter(e => e.type === 'conference'),
    expos: allEvents.filter(e => e.type === 'expo'),
    showcases: allEvents.filter(e => e.type === 'showcase'),
    awards: allEvents.filter(e => e.type === 'awards'),
    other: allEvents.filter(e => e.type === 'other')
  };
}

/**
 * 特定地域に関連するイベントを取得
 */
async function getEventsByRegion(regions = []) {
  const allEvents = await fetchAllEvents();

  const regionKeywords = {
    'Japan': ['japan', 'tokyo', 'kyoto', 'yokohama', '日本'],
    'US': ['usa', 'san francisco', 'los angeles', 'boston', 'seattle', 'america'],
    'Europe': ['germany', 'cologne', 'sweden', 'malmö', 'europe'],
    'Korea': ['korea', 'busan', 'seoul'],
    'China': ['china', 'shanghai', 'beijing'],
    'Australia': ['australia', 'melbourne']
  };

  return allEvents.filter(event => {
    if (!event.location) return false;
    const lowerLocation = event.location.toLowerCase();

    for (const region of regions) {
      const keywords = regionKeywords[region] || [];
      for (const keyword of keywords) {
        if (lowerLocation.includes(keyword)) return true;
      }
    }
    return false;
  });
}

module.exports = {
  fetchAllEvents,
  getEventsInRange,
  getEventsForRelease,
  getUpcomingSteamSales,
  getUpcomingIndustryEvents,
  getEventsByCategory,
  getEventsByRegion,
  fetchSteamDBEvents,
  fetchICSEvents
};
