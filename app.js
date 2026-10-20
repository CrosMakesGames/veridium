'use strict';

const TMDB_API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const IMG_ORIGINAL = 'https://image.tmdb.org/t/p/original';
const EMBED_BASE = 'https://tvserver-1.crosmakesgames.com';
const POSTER_FALLBACK = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="300" height="450" fill="#0a0a0a"/><text x="150" y="225" fill="#8B5CF6" font-family="monospace" font-size="20" text-anchor="middle">NO POSTER</text></svg>'
);

const state = {
    show: null,
    season: 1,
    episode: null,
    serverIndex: 0
};

// All server data lives in servers.js - there is no hardcoded fallback
// here. If servers.js is missing or broken, the player shows a notice
// pointing at it, so a bad edit is never silently masked by old data.
const HOST_DATA_CACHE_KEY = 'veridium_host_data_cache_v1';

function readJSONCache(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        return null;
    }
}

function writeJSONCache(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) {}
}

// Waits (up to timeoutMs) for a global that instance-host-data.js / servers.js
// set. They dispatch a ready event the moment they execute; polling is a
// belt-and-braces fallback so fast page switching can never outrun the files.
function waitForGlobal(name, eventName, timeoutMs) {
    return new Promise(function (resolve) {
        if (window[name]) { resolve(window[name]); return; }
        let settled = false;
        const finish = function (value) {
            if (settled) return;
            settled = true;
            window.removeEventListener(eventName, check);
            clearInterval(pollTimer);
            clearTimeout(giveUpTimer);
            resolve(value || null);
        };
        const check = function () { finish(window[name]); };
        window.addEventListener(eventName, check);
        const pollTimer = setInterval(function () {
            if (window[name]) finish(window[name]);
        }, 15);
            const giveUpTimer = setTimeout(function () { finish(window[name]); }, timeoutMs);
    });
}

let serversPromise = null;

function loadServers() {
    if (!serversPromise) {
        serversPromise = waitForGlobal('VERIDIUM_SERVERS', 'veridium-servers-ready', 3000).then(function () {
            // Straight from servers.js, nothing cached: every edit to that
            // file shows up in the selector on the very next page load.
            const raw = Array.isArray(window.VERIDIUM_SERVERS) ? window.VERIDIUM_SERVERS : [];
            const list = raw.filter(s => s && s.title && s.serverMovieLink && s.serverTvLink);
            window.__veridiumServers = list;
            return list;
        });
    }
    return serversPromise;
}

function normalizeLink(link) {
    const raw = String(link || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
        return 'https://' + raw;
}

function fillTemplate(template, values) {
    let url = normalizeLink(template);
    Object.keys(values).forEach(key => {
        url = url.split('${' + key + '}').join(encodeURIComponent(String(values[key])));
    });
    return url;
}

const HOST_DATA_FALLBACK = {
    siteTitle: 'Veridium',
    useCustomTopPoster: false,
    topPoster: { id: 1434, type: 'tv' },
    superFeaturedShows: [],
    superFeaturedRotationMs: 8000,
    instanceHostFont: 'Veridium title font',
    instanceHostText: 'CrosMakesGames',
    instanceHostClickable: true,
    instanceHostLink: 'https://crosmakesgames.com',
    customFavicon: '',
    customColorScheme: '',
    footerLinks: [
        { title: 'Discord', url: 'https://discord.gg/5dTP5SbafH' }
    ],
    featuredShows: [
        { id: 1434, type: 'tv' },
        { id: 66732, type: 'tv' },
        { id: 1396, type: 'tv' },
        { id: 97546, type: 'tv' },
        { id: 507089, type: 'movie' },
        { id: 1405, type: 'tv' },
        { id: 95557, type: 'tv' },
        { id: 2604, type: 'tv' },
        { id: 1408, type: 'tv' },
        { id: 1402, type: 'tv' },
        { id: 245927, type: 'tv' },
        { id: 1317288, type: 'movie' },
        { id: 100088, type: 'tv' },
        { id: 76479, type: 'tv' },
        { id: 60059, type: 'tv' },
        { id: 106379, type: 'tv' },
        { id: 105248, type: 'tv' },
        { id: 60625, type: 'tv' },
        { id: 1100, type: 'tv' },
        { id: 71694, type: 'tv' },
        { id: 63174, type: 'tv' },
        { id: 198178, type: 'tv' },
        { id: 250307, type: 'tv' },
        { id: 687163, type: 'movie' },
        { id: 124364, type: 'tv' },
        { id: 93405, type: 'tv' },
        { id: 119051, type: 'tv' },
        { id: 246, type: 'tv' },
        { id: 1339713, type: 'movie' },
        { id: 1083381, type: 'movie' },
        { id: 604079, type: 'movie' }
    ]
};

let hostDataPromise = null;

function normalizeFooterLinks(list) {
    if (!Array.isArray(list)) return [];
    return list
    .filter(l => l && typeof l.title === 'string' && l.title.trim() && typeof l.url === 'string' && l.url.trim())
    .slice(0, 3)
    .map(l => ({ title: l.title.trim(), url: l.url.trim() }));
}

function loadHostData() {
    if (!hostDataPromise) {
        hostDataPromise = waitForGlobal('VERIDIUM_HOST_DATA', 'veridium-host-data-ready', 3000).then(function () {
            const data = window.VERIDIUM_HOST_DATA || readJSONCache(HOST_DATA_CACHE_KEY) || {};
            const merged = {
                siteTitle: (typeof data.siteTitle === 'string' && data.siteTitle.trim())
                ? data.siteTitle.trim()
                : HOST_DATA_FALLBACK.siteTitle,
                useCustomTopPoster: data.useCustomTopPoster === true,
                topPoster: data.topPoster || null,
                superFeaturedShows: (Array.isArray(data.superFeaturedShows) ? data.superFeaturedShows : [])
                .filter(function (item) { return item && Number(item.id) > 0 && (item.type === 'tv' || item.type === 'movie'); })
                .slice(0, 10),
                                                                                                     superFeaturedRotationMs: Number(data.superFeaturedRotationMs) >= 2000 ? Number(data.superFeaturedRotationMs) : HOST_DATA_FALLBACK.superFeaturedRotationMs,
                                                                                                     instanceHostFont: data.instanceHostFont || HOST_DATA_FALLBACK.instanceHostFont,
                                                                                                     instanceHostText: data.instanceHostText || HOST_DATA_FALLBACK.instanceHostText,
                                                                                                     instanceHostClickable: !!data.instanceHostClickable,
                                                                                                     instanceHostLink: data.instanceHostLink || data.instanceHostUrl || '',
                                                                                                     customFavicon: data.customFavicon === false ? false : (data.customFavicon || data['custom-favicon'] || false),
                                                                                                     customFaviconLink: data.customFaviconLink || data['custom-favicon-link'] || '',
                                                                                                     customColorScheme: data.customColorScheme || data['custom-colorscheme'] || '',
                                                                                                     footerLinks: normalizeFooterLinks(data.footerLinks),
                                                                                                     showFlags: Array.isArray(data.showFlags)
                                                                                                     ? data.showFlags.filter(function (f) {
                                                                                                         return ['recent', 'featured', 'acclaimed'].indexOf(f) !== -1;
                                                                                                     })
                                                                                                     : ['recent', 'featured', 'acclaimed'],
                                                                                                     featuredShows: (data.featuredShows || [])
                                                                                                     .filter(item => item && item.id && (item.type === 'tv' || item.type === 'movie'))
            };
            const finalData = (merged.featuredShows.length || merged.superFeaturedShows.length) ? merged : HOST_DATA_FALLBACK;
            window.__veridiumHostData = finalData;
            return finalData;
        });
    }
    return hostDataPromise;
}

const DEFAULT_COLOR_SCHEME = '#8B5CF6';

function normalizeHexColor(hex) {
    if (!hex) return null;
    const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!match) return null;
    let short = match[1];
    if (short.length === 3) {
        short = short[0] + short[0] + short[1] + short[1] + short[2] + short[2];
    }
    return '#' + short.toLowerCase();
}

function applyColorScheme(hex) {
    const color = normalizeHexColor(hex);
    if (!color || color === DEFAULT_COLOR_SCHEME.toLowerCase()) return;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const mix = function (channel, target, t) { return Math.round(channel + (target - channel) * t); };
    const bright = 'rgb(' + mix(r, 255, 0.35) + ', ' + mix(g, 255, 0.35) + ', ' + mix(b, 255, 0.35) + ')';
    const neon = 'rgb(' + mix(r, 255, 0.6) + ', ' + mix(g, 255, 0.6) + ', ' + mix(b, 255, 0.6) + ')';
    const deep = 'rgb(' + mix(r, 0, 0.3) + ', ' + mix(g, 0, 0.3) + ', ' + mix(b, 0, 0.3) + ')';
    const root = document.documentElement;
    root.style.setProperty('--purple', color);
    root.style.setProperty('--purple-rgb', r + ', ' + g + ', ' + b);
    root.style.setProperty('--purple-bright', bright);
    root.style.setProperty('--purple-neon', neon);
    root.style.setProperty('--purple-deep', deep);
    window.__veridiumRgb = [r, g, b];
}

function defaultFaviconHref(color) {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
    "<rect width='32' height='32' fill='#000000'></rect>" +
    "<path d='M8 6 L16 26 L24 6 L20 6 L16 17 L12 6 Z' fill='" + color + "'></path></svg>";
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function applyFavicon(url) {
    if (!url) return;
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = url;
}

function applySiteTitle(data) {
    const title = String((data && data.siteTitle) || 'Veridium').trim() || 'Veridium';
    document.querySelectorAll('.nav-logo').forEach(function (el) {
        const caps = title.toUpperCase();
        el.innerHTML = '<span>' + escapeHtml(caps.charAt(0)) + '</span>' + escapeHtml(caps.slice(1));
    });
}

function applyHostData() {
    const data = window.__veridiumHostData || HOST_DATA_FALLBACK;
    applySiteTitle(data);
    document.querySelectorAll('.instance-host').forEach(function (el) {
        const value = el.querySelector('span');
        if (value) value.textContent = data.instanceHostText;
        if (data.instanceHostFont && data.instanceHostFont !== 'Veridium title font') {
            el.style.fontFamily = data.instanceHostFont;
        }
        if (data.instanceHostClickable && data.instanceHostLink) {
            el.classList.add('instance-host-link');
            el.title = data.instanceHostLink;
            el.addEventListener('click', function () {
                window.open(data.instanceHostLink, '_blank');
            });
        }
    });
    applyColorScheme(data.customColorScheme);
    const scheme = normalizeHexColor(data.customColorScheme) || DEFAULT_COLOR_SCHEME;
    let faviconUrl = '';
    // Guard against config values like the string "false" slipping through
    // as truthy - that would make every page request a file named "false".
    const faviconSetting = String(data.customFavicon === true ? 'true' : (data.customFavicon || '')).trim();
    const faviconEnabled = faviconSetting !== '' && faviconSetting.toLowerCase() !== 'false';
    if (faviconEnabled && typeof data.customFavicon === 'string' && data.customFavicon.trim()) faviconUrl = data.customFavicon.trim();
    else if (faviconEnabled && data.customFaviconLink) faviconUrl = data.customFaviconLink;
    applyFavicon(faviconUrl || defaultFaviconHref(scheme));

    const linksWrap = document.getElementById('footer-links');
    if (linksWrap) {
        const FIXED_LINK = { title: 'crosmakesgames.com', url: 'https://crosmakesgames.com' };
        const custom = (data.footerLinks || []).filter(l => normalizeLink(l.url) !== FIXED_LINK.url);
        linksWrap.innerHTML = custom.concat([FIXED_LINK]).map(l =>
        '<a href="' + escapeHtml(normalizeLink(l.url)) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(l.title) + '</a>'
        ).join('<span class="sep">|</span>');
    }
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shuffleList(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ============ UPCOMING DETECTION ============

function parseReleaseDate(value) {
    if (!value || typeof value !== 'string') return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return isNaN(date.getTime()) ? null : date;
}

// A title counts as released from the start of its release date onwards,
// so it only stays "upcoming" while the date is still in the future.
function isUpcomingDate(value) {
    const date = parseReleaseDate(value);
    return !!(date && date.getTime() > Date.now());
}

function formatReleaseDate(value) {
    const date = parseReleaseDate(value);
    if (!date) return '';
    // Parsed as UTC midnight, so also format in UTC: without this, users in
    // negative-UTC timezones would see the release date shift back a day.
    return date.toLocaleDateString([], { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
}

function daysUntilRelease(value) {
    const date = parseReleaseDate(value);
    if (!date) return null;
    const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
    return days > 0 ? days : null;
}

// Decides if a title is still unreleased. Movies need a future release date
// (or no date while still Planned / In Production). TV titles are upcoming
// for as long as not a single episode has aired yet.
function computeUpcoming(info) {
    if (!info) return false;
    const futureRelease = isUpcomingDate(info.releaseDate);
    if (info.type === 'movie') {
        return futureRelease ||
        (!info.releaseDate && (info.status === 'Planned' || info.status === 'In Production'));
    }
    if (info.hasAired) return false;
    // Undated TV only counts as upcoming while still officially in the works -
    // a canceled or ended show with no dates and no aired episodes is not.
    return futureRelease || isUpcomingDate(info.nextAirDate) ||
    info.status === 'Planned' || info.status === 'In Production';
}

function normalizeTMDB(item) {
    if (item.media_type !== 'movie' && item.media_type !== 'tv') return null;
    const rawDate = item.release_date || item.first_air_date || '';
    const year = rawDate.split('-')[0] || '';
    const hasRating = typeof item.vote_average === 'number' && item.vote_average > 0;
    return {
        id: item.id,
        type: item.media_type,
        title: item.title || item.name,
        year,
        rating: hasRating ? item.vote_average.toFixed(1) : '',
        summary: item.overview,
        poster: item.poster_path ? IMG_BASE + item.poster_path : POSTER_FALLBACK,
        backdrop: item.backdrop_path ? IMG_ORIGINAL + item.backdrop_path : POSTER_FALLBACK,
        releaseDate: rawDate,
        upcoming: isUpcomingDate(rawDate)
    };
}

function showUrl(id, type, season, episode) {
    let url = 'player.html?id=' + encodeURIComponent(id) + '&type=' + encodeURIComponent(type);
    if (season) url += '&season=' + encodeURIComponent(season);
    if (episode) url += '&episode=' + encodeURIComponent(episode);
    return url;
}

// ============ POSTER FLAGS ("showFlags" in instance host) ============
// Small pills in the top-right corner of every poster.
//   recent    - new episode or release within the last 20 days
//   featured  - in this instance's featured list
//   acclaimed - high rating on TMDB
const ACCLAIMED_MIN_RATING = 8;
const RECENT_WINDOW_DAYS = 20;

function enabledShowFlags() {
    const hd = window.__veridiumHostData;
    if (!hd || !Array.isArray(hd.showFlags)) return ['recent', 'featured', 'acclaimed'];
    return hd.showFlags;
}

function isInFeaturedList(item) {
    const hd = window.__veridiumHostData;
    if (!hd || !Array.isArray(hd.featuredShows) || !item) return false;
    const id = Number(item.id), type = item.type;
    return hd.featuredShows.some(function (f) {
        return Number(f.id) === id && f.type === type;
    });
}

function isRecentRelease(item) {
    if (!item) return false;
    const date = (item.type === 'tv' && item.lastAirDate) ? item.lastAirDate : (item.releaseDate || '');
    const parsed = parseReleaseDate(date);
    if (!parsed) return false;
    const days = (Date.now() - parsed.getTime()) / 86400000;
    return days >= -1 && days <= RECENT_WINDOW_DAYS;
}

function isAcclaimed(item) {
    return !!(item && item.rating && Number(item.rating) >= ACCLAIMED_MIN_RATING);
}

function posterFlagsHtml(item) {
    const enabled = enabledShowFlags();
    if (!enabled.length || !item || !item.id) return '';
    const flags = [];
    if (enabled.indexOf('recent') !== -1 && isRecentRelease(item)) flags.push('recent');
    if (enabled.indexOf('featured') !== -1 && isInFeaturedList(item)) flags.push('featured');
    if (enabled.indexOf('acclaimed') !== -1 && isAcclaimed(item)) flags.push('acclaimed');
    if (!flags.length) return '';
    return '<div class="poster-flags">' + flags.map(function (f) {
        return '<span class="poster-flag poster-flag-' + f + '">' + f.toUpperCase() + '</span>';
    }).join('') + '</div>';
}

function posterCard(item) {
    const upcoming = !!(item && item.upcoming);
    return '<a class="poster-card' + (upcoming ? ' poster-upcoming' : '') + '" href="' + showUrl(item.id, item.type) + '">' +
    '<img src="' + escapeHtml(item.poster) + '" loading="lazy" alt="" onerror=\'this.onerror=null;this.src=' + JSON.stringify(POSTER_FALLBACK) + ';\'>' +
    posterFlagsHtml(item) +
    (upcoming ? '<span class="poster-upcoming-badge">UPCOMING</span>' : '') +
    '</a>';
}

function databasePosterCard(item) {
    const href = showUrl(item.id, item.type);
    const upcoming = !!(item && item.upcoming);
    return '<a class="poster-card db-poster-card' + (upcoming ? ' poster-upcoming' : '') + '" href="' + href + '" aria-label="' + escapeHtml(item.title + (item.year ? ' (' + item.year + ')' : '')) + '">' +
    '<div class="db-poster-missing"><strong>' + escapeHtml(item.title || 'Untitled') + '</strong>' +
    (item.year ? '<small>' + escapeHtml(item.year) + '</small>' : '') + '</div>' +
    (item.poster && item.poster !== POSTER_FALLBACK
    ? '<img src="' + escapeHtml(item.poster) + '" loading="lazy" alt="" onerror="this.onerror=null;this.style.display=&quot;none&quot;;">'
    : '') +
    (upcoming ? '<span class="poster-upcoming-badge">UPCOMING</span>' : '') +
    '</a>';
}

function renderDatabaseGrid(container, items) {
    container.innerHTML = items.map(databasePosterCard).join('');
}

function renderStrip(container, items) {
    container.innerHTML = items.map(posterCard).join('');
}

function renderGrid(container, items) {
    container.innerHTML = items.map(posterCard).join('');
}

const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

// TMDB details cache: the featured list is static, so after one good load
// every page visit is instant and costs zero API calls (no rate-limit storms).
const TMDB_CACHE_PREFIX = 'veridium_show_v5:';
const TMDB_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function readShowCache(id, type) {
    try {
        const raw = localStorage.getItem(TMDB_CACHE_PREFIX + type + ':' + id);
        if (!raw) return null;
        const entry = JSON.parse(raw);
        if (!entry || !entry.t || Date.now() - entry.t > TMDB_CACHE_TTL) return null;
        return entry.d || null;
    } catch (err) {
        return null;
    }
}

function writeShowCache(id, type, details) {
    if (!details) return;
    try {
        localStorage.setItem(TMDB_CACHE_PREFIX + type + ':' + id,
                             JSON.stringify({ t: Date.now(), d: details }));
    } catch (err) {}
}


// Collection cache: franchise parts are static, so one fetch lasts a week.
const COLLECTION_CACHE_PREFIX = 'veridium_collection_v1:';

function readCollectionCache(collectionId) {
    try {
        const raw = localStorage.getItem(COLLECTION_CACHE_PREFIX + collectionId);
        if (!raw) return null;
        const entry = JSON.parse(raw);
        if (!entry || !entry.t || Date.now() - entry.t > TMDB_CACHE_TTL) return null;
        return entry.d || null;
    } catch (err) {
        return null;
    }
}

function writeCollectionCache(collectionId, collection) {
    if (!collection) return;
    try {
        localStorage.setItem(COLLECTION_CACHE_PREFIX + collectionId,
                             JSON.stringify({ t: Date.now(), d: collection }));
    } catch (err) {}
}

const ShowService = {
    fetchTrending: async () => {
        const promises = [1, 2, 3].map(page =>
        fetch(TMDB_BASE + '/trending/all/week?api_key=' + TMDB_API_KEY + '&page=' + page).then(r => r.json())
        );
        const results = await Promise.all(promises);
        const combined = results.flatMap(res => res.results || []);
        const seenIds = new Set(), seenPosters = new Set();
        return combined.map(normalizeTMDB).filter(function (item) {
            if (!item || !item.id) return false;
            const key = item.type + ':' + item.id;
            if (seenIds.has(key) || (item.poster !== POSTER_FALLBACK && seenPosters.has(item.poster))) return false;
            seenIds.add(key);
            if (item.poster !== POSTER_FALLBACK) seenPosters.add(item.poster);
            return true;
        }).slice(0, 50);
    },

    fetchFeatured: async () => {
        const hostData = await loadHostData();
        const list = hostData.featuredShows;
        const shuffled = shuffleList(list);

        const fetchItem = function (item) {
            return ShowService.getDetails(item.id, item.type).catch(function () { return null; });
        };

        // Fire in small staggered batches so TMDB's rate limit never trips
        // (the old code fired every request at once, which could rate-limit
        // the whole list into an empty page).
        const results = [];
        const BATCH_SIZE = 8;
        for (let i = 0; i < shuffled.length; i += BATCH_SIZE) {
            if (i > 0) await sleep(60);
            const chunk = shuffled.slice(i, i + BATCH_SIZE);
            const chunkResults = await Promise.all(chunk.map(fetchItem));
            results.push(...chunkResults);
        }

        // One retry pass for anything that came back empty (hiccup, rate-limit).
        const missingIndexes = [];
        results.forEach(function (r, i) { if (!r) missingIndexes.push(i); });
        if (missingIndexes.length) {
            await sleep(600);
            const retried = await Promise.all(missingIndexes.map(function (i) {
                return fetchItem(shuffled[i]);
            }));
            missingIndexes.forEach(function (resultIndex, k) {
                results[resultIndex] = retried[k];
            });
        }

        return results.filter(item => item && item.id);
    },

    getDetails: async (id, type) => {
        const cached = readShowCache(id, type);
        if (cached) {
            // "Upcoming" is time-based, so it is re-derived on every read:
            // a title must flip back to watchable the day it premieres.
            cached.upcoming = computeUpcoming(cached);
            return cached;
        }
        let data = null;
        try {
            const res = await fetch(TMDB_BASE + '/' + type + '/' + id + '?api_key=' + TMDB_API_KEY + '&append_to_response=credits,keywords');
            if (!res.ok) return null;
            data = await res.json();
        } catch (err) {
            return null;
        }
        if (!data || data.success === false || !data.id) return null;
        const year = (data.release_date || data.first_air_date || '').split('-')[0] || '';
        const hasRating = typeof data.vote_average === 'number' && data.vote_average > 0;
        const details = {
            id: data.id,
            type: type,
            tmdbId: data.id,
            title: data.title || data.name,
            rating: hasRating ? data.vote_average.toFixed(1) : '',
            year,
            description: data.overview || 'No description available.',
            poster: data.poster_path ? IMG_BASE + data.poster_path : POSTER_FALLBACK,
            backdrop: data.backdrop_path ? IMG_ORIGINAL + data.backdrop_path : POSTER_FALLBACK,
            totalSeasons: data.number_of_seasons || 1,
            genres: Array.isArray(data.genres) ? data.genres.map(g => g.id) : [],
            // TMDB movie keywords live in .keywords, TV keywords in .results.
            keywords: (data.keywords && (data.keywords.keywords || data.keywords.results) || []).map(function (k) { return k.id; }).filter(Boolean),
            writers: (data.credits && data.credits.crew || []).filter(function (p) {
                return p.department === 'Writing' || /^(Writer|Screenplay|Story|Creator)$/.test(p.job || '');
            }).map(function (p) { return p.id; }).concat((data.created_by || []).map(function (p) { return p.id; })).filter(Boolean)
            .filter(function (id, i, list) { return list.indexOf(id) === i; }).slice(0, 16),
            collectionId: (data.belongs_to_collection && data.belongs_to_collection.id) || null,
            collectionName: (data.belongs_to_collection && data.belongs_to_collection.name) || '',
            releaseDate: data.release_date || data.first_air_date || '',
            hasAired: type === 'tv' ? !!(data.last_episode_to_air && data.last_episode_to_air.air_date) : false,
            lastAirDate: (data.last_episode_to_air && data.last_episode_to_air.air_date) || '',
            nextAirDate: (data.next_episode_to_air && data.next_episode_to_air.air_date) || '',
            nextAir: (data.next_episode_to_air && data.next_episode_to_air.air_date) ? {
                season: data.next_episode_to_air.season_number,
                episode: data.next_episode_to_air.episode_number,
                title: data.next_episode_to_air.name || '',
                overview: data.next_episode_to_air.overview || '',
                date: data.next_episode_to_air.air_date
            } : null,
            status: data.status || '',
            episodes: {}
        };
        details.upcoming = computeUpcoming(details);
        writeShowCache(id, type, details);
        return details;
    },

    getCollection: async (collectionId) => {
        const cached = readCollectionCache(collectionId);
        if (cached) {
            // Time-based like getDetails: re-derive upcoming on every read so
            // a part that premieres flips back to a normal card immediately.
            (cached.items || []).forEach(function (item) {
                item.upcoming = isUpcomingDate(item.releaseDate || '');
            });
            return cached;
        }
        let data = null;
        try {
            const res = await fetch(TMDB_BASE + '/collection/' + collectionId + '?api_key=' + TMDB_API_KEY);
            if (!res.ok) return null;
            data = await res.json();
        } catch (err) {
            return null;
        }
        if (!data || !data.id || !Array.isArray(data.parts)) return null;
        const items = data.parts.map(function (part) {
            return {
                id: part.id,
                type: 'movie',
                title: part.title || part.name || '',
                year: (part.release_date || '').split('-')[0] || '',
                                     poster: part.poster_path ? IMG_BASE + part.poster_path : POSTER_FALLBACK,
                                     releaseDate: part.release_date || '',
                                     upcoming: isUpcomingDate(part.release_date || '')
            };
        }).filter(function (item) { return item.id && item.title; })
        .filter(function (item, i, list) {
            return !list.slice(0, i).some(function (other) { return other.id === item.id; });
        })
        .sort(function (a, b) { return String(a.year).localeCompare(String(b.year)); });
        const collection = { id: data.id, name: data.name || 'Collection', items: items };
        writeCollectionCache(collectionId, collection);
        return collection;
    },

    getSeasonEpisodes: async (tvId, seasonNumber) => {
        const res = await fetch(TMDB_BASE + '/tv/' + tvId + '/season/' + seasonNumber + '?api_key=' + TMDB_API_KEY);
        const data = await res.json();
        if (!data.episodes) return [];
        return data.episodes.map(ep => ({
            number: ep.episode_number,
            title: ep.name,
            overview: ep.overview,
            airDate: ep.air_date || ''
        }));
    },

    getRecommendations: async (id, type) => {
        try {
            const res = await fetch(TMDB_BASE + '/' + type + '/' + id + '/recommendations?api_key=' + TMDB_API_KEY);
            const data = await res.json();
            if (!data.results || !data.results.length) return [];
            return data.results.map(normalizeTMDB).filter(i => i !== null).slice(0, 20);
        } catch (err) {
            return [];
        }
    }
};

function getEmbedUrl(server, tmdbId, type, season, episode) {
    const slot = server;
    if (!slot || !tmdbId) return '';
    if (type === 'movie') {
        return fillTemplate(slot.serverMovieLink, { movieId: tmdbId });
    }
    return fillTemplate(slot.serverTvLink, {
        tvId: tmdbId,
        season: season || 1,
        episode: episode || 1
    });
}

function setPlayerSrc(url) {
    const frame = document.getElementById('video-player');
    if (!frame || !url) return;
    // Never reload a stream we are already showing.
    if (frame.getAttribute('src') === url) return;
    frame.src = url;
    // If the stream later navigates itself (its own Next Episode button),
    // check on load so the episode list can follow along.
    frame.addEventListener('load', playerSyncCheck);
}

async function getCurrentEmbedUrl() {
    if (!state.show) return '';
    const servers = await loadServers();
    const slot = servers[state.serverIndex] || servers[0];
    if (!slot) return '';
    state.playerSlot = slot;
    if (state.show.type === 'movie') {
        return getEmbedUrl(slot, state.show.tmdbId, 'movie');
    }
    return getEmbedUrl(slot, state.show.tmdbId, 'tv', state.season, state.episode ? state.episode.number : 1);
}

function syncSeasonSelect() {
    const select = document.getElementById('season-select');
    if (select) select.value = String(state.season);
}

// Follows the embedded player when it moves on its own (its built-in Next
// Episode button, or a postMessage from the server): updates the highlighted
// episode, the season dropdown and the URL WITHOUT reloading the stream.
async function adoptEpisode(season, episode) {
    season = parseInt(season, 10);
    episode = parseInt(episode, 10);
    if (!state.show || !season || !episode) return;
    const showId = state.show.id;
    if (season !== state.season) {
        state.season = season;
        await ensureSeasonEpisodes(season);
        if (!state.show || state.show.id !== showId) return;
    }
    const eps = state.show.episodes[season] || [];
    state.episode = eps.find(function (x) { return x.number === episode; }) || { number: episode, title: 'Episode ' + episode };
    renderEpisodeList();
    syncSeasonSelect();
    updateShowUrl();
}

function playerSyncCheck() {
    if (!state.show || state.show.type !== 'tv' || !state.playerSlot) return;
    const frame = document.getElementById('video-player');
    if (!frame) return;
    let href = '';
    try { href = frame.contentWindow.location.href; } catch (err) { return; }
    if (!href || href === 'about:blank') return;
    const id = state.show.tmdbId;
    if (!id) return;
    const strip = function (u) { return String(u).split('#')[0].split('?')[0]; };
    // Candidates the embedded server might have moved to: every loaded
    // episode, the next few of this season, and the first of the neighbors.
    const candidates = [];
    const loaded = state.show.episodes || {};
    Object.keys(loaded).forEach(function (sn) {
        (loaded[sn] || []).forEach(function (ep) { candidates.push([Number(sn), ep.number]); });
    });
    const cur = state.episode ? Number(state.episode.number) : 0;
    for (let e = cur + 1; e <= cur + 3; e++) candidates.push([state.season, e]);
    for (let e = 1; e <= 3; e++) { candidates.push([state.season + 1, e]); candidates.push([state.season - 1, e]); }
    for (let i = 0; i < candidates.length; i++) {
        if (strip(getEmbedUrl(state.playerSlot, id, 'tv', candidates[i][0], candidates[i][1])) === strip(href)) {
            if (candidates[i][0] === state.season && state.episode && candidates[i][1] === state.episode.number) return;
            adoptEpisode(candidates[i][0], candidates[i][1]);
            return;
        }
    }
}

let playerSyncTimer = null;
function startPlayerSync() {
    stopPlayerSync();
    playerSyncTimer = setInterval(playerSyncCheck, 1500);
}
function stopPlayerSync() {
    if (playerSyncTimer) { clearInterval(playerSyncTimer); playerSyncTimer = null; }
}

// Cooperative servers can also drive us: postMessage {type:'next-episode'} or
// {season, episode} from inside the player. Only the player frame is trusted.
window.addEventListener('message', function (event) {
    if (!state.show || state.show.type !== 'tv') return;
    const frame = document.getElementById('video-player');
    if (!frame || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'next-episode' || data.type === 'next' || data.next === true) { playNextEpisode(); return; }
    if (Number(data.season) > 0 && Number(data.episode) > 0) { adoptEpisode(Number(data.season), Number(data.episode)); }
});

function playerFullscreen() {
    const frame = document.getElementById('video-player');
    if (!frame) return;
    const el = frame.parentElement || frame;
    if (el.requestFullscreen) {
        el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
    }
}

function playerRefresh() {
    getCurrentEmbedUrl().then(setPlayerSrc);
}

function playerOpenLink() {
    getCurrentEmbedUrl().then(function (url) {
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
}

function playerAboutBlank() {
    getCurrentEmbedUrl().then(function (url) {
        if (!url) return;
        const win = window.open('about:blank', '_blank');
        if (!win) return;
        win.document.write(
            '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
            '<title>Veridium</title>' +
            '<style>html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden}' +
            'iframe{border:0;width:100%;height:100%;display:block;background:#000}</style></head>' +
            '<body><iframe src="' + url + '" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe></body></html>'
        );
        win.document.close();
    });
}

const HISTORY_KEY = 'veridium_history';

// Storage probe with fallbacks so Continue Watching survives contexts where
// localStorage is unavailable (sandboxed embeds, blob windows, strict privacy).
const historyStorage = (function () {
    function probe(store) {
        try {
            const k = '__veridium_probe__';
            store.setItem(k, '1');
            store.removeItem(k);
            return store;
        } catch (err) {
            return null;
        }
    }
    function cookieStore() {
        const store = {
            isCookie: true,
            getItem: function (key) {
                try {
                    const m = document.cookie.match(new RegExp('(?:^|; )' + key + '=([^;]*)'));
                    return m ? decodeURIComponent(m[1]) : null;
                } catch (err) {
                    return null;
                }
            },
            setItem: function (key, value) {
                try {
                    document.cookie = key + '=' + encodeURIComponent(value) + ';path=/;max-age=31536000;SameSite=Lax';
                } catch (err) { }
            },
            removeItem: function (key) {
                try {
                    document.cookie = key + '=;path=/;max-age=0';
                } catch (err) { }
            }
        };
        return probe(store);
    }
    try {
        return probe(window.localStorage) || probe(window.sessionStorage) || cookieStore();
    } catch (err) {
        return null;
    }
})();
const HISTORY_LIMIT = 28;

function loadHistory() {
    if (!historyStorage) return [];
    try {
        const raw = historyStorage.getItem(HISTORY_KEY);
        const list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) return [];
        return list
        .map(function (e) {
            if (!e) return null;
            const id = Number(e.id);
            const type = e.type === 'movie' ? 'movie' : (e.type === 'tv' ? 'tv' : null);
            if (!id || !type) return null;
            const isTv = type === 'tv';
            return {
                id: id,
                type: type,
                title: typeof e.title === 'string' ? e.title : '',
                poster: (typeof e.poster === 'string' && e.poster) ? e.poster : POSTER_FALLBACK,
             genres: Array.isArray(e.genres)
             ? e.genres.map(function (g) { return Number(g); }).filter(function (g) { return g > 0; })
             : [],
             keywords: Array.isArray(e.keywords) ? e.keywords.map(Number).filter(function (v) { return v > 0; }).slice(0, 20) : [],
             writers: Array.isArray(e.writers) ? e.writers.map(Number).filter(function (v) { return v > 0; }).slice(0, 16) : [],
             season: isTv ? (Number(e.season) || null) : null,
             episode: isTv ? (Number(e.episode) || null) : null,
             ts: Number(e.ts) || 0
            };
        })
        .filter(function (e) { return e !== null; });
    } catch (err) {
        return [];
    }
}

function saveHistoryList(list) {
    if (!historyStorage) return;
    const limit = historyStorage.isCookie ? 4 : HISTORY_LIMIT;
    try {
        historyStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, limit)));
    } catch (err) {
        // Cookie size overflow: keep shrinking until it fits.
        for (var n = limit - 1; n > 0; n--) {
            try {
                historyStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, n)));
                return;
            } catch (err2) { }
        }
    }
}

function recordWatch(show, season, episode) {
    const isTv = show.type === 'tv';
    const existing = loadHistory().find(function (e) {
        return e.id === Number(show.id) && e.type === show.type;
    });
    let finalSeason = Number(season) || null;
    let finalEpisode = Number(episode) || null;
    if (isTv) {
        if (!finalSeason) finalSeason = existing ? existing.season : null;
        if (!finalEpisode) finalEpisode = existing ? existing.episode : null;
        finalSeason = finalSeason || 1;
        finalEpisode = finalEpisode || 1;
    } else {
        finalSeason = null;
        finalEpisode = null;
    }
    const entry = {
        id: Number(show.id),
        type: show.type,
        title: show.title || (existing ? existing.title : ''),
        poster: show.poster || (existing ? existing.poster : POSTER_FALLBACK),
        genres: (Array.isArray(show.genres) && show.genres.length)
        ? show.genres.slice()
        : (existing ? existing.genres : []),
        keywords: (Array.isArray(show.keywords) && show.keywords.length) ? show.keywords.slice(0, 20) : (existing ? existing.keywords : []),
        writers: (Array.isArray(show.writers) && show.writers.length) ? show.writers.slice(0, 16) : (existing ? existing.writers : []),
        season: finalSeason,
        episode: finalEpisode,
        ts: Date.now()
    };
    const list = loadHistory().filter(function (e) {
        return !(e.id === entry.id && e.type === entry.type);
    });
    list.unshift(entry);
    saveHistoryList(list);
}

function updateWatchEpisode(id, type, season, episode) {
    const list = loadHistory();
    const entry = list.find(function (e) { return e.id === Number(id) && e.type === type; });
    if (entry) {
        if (type === 'tv') {
            if (season) entry.season = Number(season);
            if (episode) entry.episode = Number(episode);
        }
        entry.ts = Date.now();
        saveHistoryList(list);
    }
}

function removeWatch(id, type) {
    const numId = Number(id);
    saveHistoryList(loadHistory().filter(function (e) {
        return !(e.id === numId && e.type === type);
    }));
}

function renderContinueWatching(container, history) {
    container.innerHTML = history.map(function (entry) {
        const season = entry.type === 'tv' ? entry.season : null;
        const episode = entry.type === 'tv' ? entry.episode : null;
        return '<div class="cw-card">' +
        '<a class="poster-card" href="' + showUrl(entry.id, entry.type, season, episode) + '">' +
        '<img src="' + escapeHtml(entry.poster) + '" loading="lazy" alt="" onerror=\'this.onerror=null;this.src=' + JSON.stringify(POSTER_FALLBACK) + ';\'>' +
        '</a>' +
        '<button class="cw-remove" title="Remove" data-id="' + entry.id + '" data-type="' + entry.type + '">X</button>' +
        '</div>';
    }).join('');
    container.querySelectorAll('.cw-remove').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt(btn.getAttribute('data-id'), 10);
            const type = btn.getAttribute('data-type');
            removeWatch(id, type);
            const list = loadHistory();
            if (list.length) {
                renderContinueWatchingSection(list);
            } else {
                cwPage = 0;
                const section = container.closest('.content-section');
                if (section) section.style.display = 'none';
            }
        });
    });
}

// Shared renderer: shows the bar (or a clear warning) on any page that has it.
const CW_PAGE_SIZE = 7;
let cwPage = 0;
let cwPageSize = 0;
const REC_STATE = { items: [], page: 0, per: 0 };

function renderSectionPager(pagerEl, page, pageCount, nav) {
    if (!pagerEl) return;
    pagerEl.innerHTML = '';
    const mk = function (label, targetPage) {
        const disabled = targetPage < 0 || targetPage > pageCount - 1;
        const btn = document.createElement('div');
        btn.className = 'pager-btn' + (disabled ? ' disabled' : '');
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');
        btn.textContent = label;
        if (!disabled) {
            btn.addEventListener('click', function () { nav(targetPage); });
        }
        pagerEl.appendChild(btn);
    };
    mk('<', page - 1);
    mk('>', page + 1);
}

function renderRecommendedSection(items, grid, pageSize) {
    const pager = document.getElementById('rec-pager');
    REC_STATE.items = items;
    if (pageSize) REC_STATE.per = pageSize;
    const per = REC_STATE.per || REC_PAGE_SIZE;
    const pageCount = Math.max(1, Math.ceil(items.length / per));
    if (REC_STATE.page > pageCount - 1) REC_STATE.page = pageCount - 1;
    renderGrid(grid, items.slice(REC_STATE.page * per, REC_STATE.page * per + per));
    renderSectionPager(pager, REC_STATE.page, pageCount, function (p) {
        REC_STATE.page = p;
        renderRecommendedSection(REC_STATE.items, grid);
    });
}

function renderContinueWatchingSection(history, pageSize) {
    const section = document.getElementById('continue-watching-section');
    const grid = document.getElementById('continue-watching-grid');
    if (!section || !grid) return;
    if (!historyStorage) {
        section.style.display = '';
        grid.innerHTML = '<div class="ad-warning">Continue Watching is unavailable - this browser is blocking site storage.</div>';
        return;
    }
    const pager = document.getElementById('cw-pager');
    if (!history.length) { cwPage = 0; if (pager) pager.innerHTML = ''; return; }
    if (pageSize) cwPageSize = pageSize;
    const per = cwPageSize || CW_PAGE_SIZE;
    section.style.display = '';
    const pageCount = Math.max(1, Math.ceil(history.length / per));
    if (cwPage > pageCount - 1) cwPage = pageCount - 1;
    renderContinueWatching(grid, history.slice(cwPage * per, cwPage * per + per));
    renderSectionPager(pager, cwPage, pageCount, function (p) {
        cwPage = p;
        renderContinueWatchingSection(loadHistory());
    });
}

const TV_ONLY_GENRE_IDS = [10759, 10762, 10763, 10764, 10765, 10766, 10767, 10768];
const MOVIE_ONLY_GENRE_IDS = [28, 12, 14, 27, 36, 53, 878, 10402, 10749, 10752];

function genresForType(genreIds, type) {
    const exclude = type === 'movie' ? TV_ONLY_GENRE_IDS : MOVIE_ONLY_GENRE_IDS;
    return (genreIds || []).filter(function (g) {
        return exclude.indexOf(Number(g)) === -1;
    });
}

async function backfillHistoryGenres(history) {
    const missing = history.filter(function (e) {
        return !e.genres.length || !e.keywords.length || !e.writers.length;
    });
    if (!missing.length) return history;
    const details = [];
    for (let i = 0; i < missing.length; i += 5) {
        if (i) await sleep(80);
        const batch = await Promise.all(missing.slice(i, i + 5).map(function (e) {
            return ShowService.getDetails(e.id, e.type).catch(function () { return null; });
        }));
        details.push(...batch);
    }
    const list = loadHistory();
    let changed = false;
    details.forEach(function (d, i) {
        const target = missing[i];
        const entry = list.find(function (x) { return x.id === target.id && x.type === target.type; });
        if (!entry) return;
        if (d) {
            ['genres', 'keywords', 'writers'].forEach(function (field) {
                if (Array.isArray(d[field]) && d[field].length && JSON.stringify(entry[field]) !== JSON.stringify(d[field])) {
                    entry[field] = d[field].slice();
                    changed = true;
                }
            });
        }
        if ((!entry.poster || entry.poster === POSTER_FALLBACK) && d && d.poster) {
            entry.poster = d.poster;
            changed = true;
        }
        if (!entry.title && d && d.title) {
            entry.title = d.title;
            changed = true;
        }
    });
    if (changed) saveHistoryList(list);
    return loadHistory();
}

const REC_PAGE_SIZE = 7;

let recommendationMemo = { key: '', items: null, until: 0 };
async function fetchHomeRecommended(history) {
    if (!history.length) return [];
    // A short-lived session cache prevents repeated discover bursts when switching views.
    const memoKey = JSON.stringify(history.map(function (e) { return [e.type, e.id, e.ts, e.genres, e.keywords, e.writers]; }));
    if (recommendationMemo.key === memoKey && recommendationMemo.items && Date.now() < recommendationMemo.until) {
        return recommendationMemo.items;
    }
    // Aggregate signals across all watched titles. Recent watches contribute more.
    const weights = { genres: {}, keywords: {}, writers: {} };
    history.forEach(function (entry, index) {
        const recency = 0.35 + 0.65 * (history.length - index) / history.length;
        ['genres', 'keywords', 'writers'].forEach(function (field) {
            (entry[field] || []).forEach(function (id) {
                weights[field][id] = (weights[field][id] || 0) + recency;
            });
        });
    });
    function top(field, count) {
        return Object.keys(weights[field]).sort(function (a, b) {
            return weights[field][b] - weights[field][a];
        }).slice(0, count).map(Number);
    }
    const topGenres = top('genres', 3);
    const topKeywords = top('keywords', 2);
    const watched = new Set(history.map(function (e) { return e.type + ':' + e.id; }));
    const pool = new Map();
    function add(raw, type) {
        if (!raw || !raw.id || watched.has(type + ':' + raw.id)) return;
        const key = type + ':' + raw.id;
        if (!pool.has(key)) pool.set(key, { raw: raw, type: type });
    }
    const requests = [];
    ['tv', 'movie'].forEach(function (type) {
        const genres = genresForType(topGenres, type);
        const filters = [];
        if (genres.length) filters.push('&with_genres=' + genres.join('|'));
        if (topKeywords.length) filters.push('&with_keywords=' + topKeywords.join('|'));
        filters.forEach(function (filter) {
            [1, 2].forEach(function (page) {
                requests.push(fetch(TMDB_BASE + '/discover/' + type + '?api_key=' + TMDB_API_KEY +
                '&sort_by=popularity.desc&vote_count.gte=100&vote_average.gte=6&page=' + page + filter)
                .then(function (r) { if (!r.ok) throw new Error('Discover failed'); return r.json(); })
                .then(function (res) { (res.results || []).forEach(function (raw) { add(raw, type); }); })
                .catch(function () {}));
            });
        });
    });
    await Promise.all(requests);
    if (pool.size < REC_PAGE_SIZE * 4) {
        try {
            const trending = await ShowService.fetchTrending();
            trending.forEach(function (item) { add(item, item.type); });
        } catch (err) {}
    }
    // Pre-rank by genre and popularity, then enrich a bounded shortlist with
    // full TMDB details so keyword/theme and writer matches actually count.
    function overlap(ids, field) {
        return (ids || []).reduce(function (sum, id) { return sum + (weights[field][id] || 0); }, 0);
    }
    const shortlist = Array.from(pool.values()).sort(function (a, b) {
        const aScore = overlap(a.raw.genre_ids, 'genres') * 2 + (a.raw.popularity || 0) * 0.005;
        const bScore = overlap(b.raw.genre_ids, 'genres') * 2 + (b.raw.popularity || 0) * 0.005;
        return bScore - aScore;
    }).slice(0, 40);
    const ranked = [];
    for (let i = 0; i < shortlist.length; i += 5) {
        if (i) await sleep(80);
        const batch = await Promise.all(shortlist.slice(i, i + 5).map(async function (candidate) {
            const raw = candidate.raw;
            const details = await ShowService.getDetails(raw.id, candidate.type).catch(function () { return null; });
            const genres = details ? details.genres : (raw.genre_ids || []);
            const score = overlap(genres, 'genres') * 2 +
            overlap(details && details.keywords, 'keywords') * 3 +
            overlap(details && details.writers, 'writers') * 4;
            const item = raw.poster && raw.title && raw.type ? raw : normalizeTMDB(Object.assign({}, raw, { media_type: candidate.type }));
            if (!item) return null;
            return { item: item, score: score, popularity: raw.popularity || 0 };
        }));
        ranked.push(...batch.filter(Boolean));
    }
    ranked.sort(function (a, b) { return (b.score - a.score) || (b.popularity - a.popularity); });
    const picks = ranked.slice(0, 28).map(function (entry) { return entry.item; });
    if (picks.length) recommendationMemo = { key: memoKey, items: picks, until: Date.now() + 20 * 60 * 1000 };
    return picks;
}

async function chooseTopPoster(featured) {
    const config = await loadHostData();
    if (config.useCustomTopPoster && config.topPoster &&
        ['tv', 'movie'].indexOf(config.topPoster.type) !== -1 &&
        Number.isSafeInteger(Number(config.topPoster.id)) && Number(config.topPoster.id) > 0) {
        const id = Number(config.topPoster.id);
    const existing = featured.find(function (item) {
        return item.id === id && item.type === config.topPoster.type;
    });
    if (existing) return existing;
    const selected = await ShowService.getDetails(id, config.topPoster.type).catch(function () { return null; });
        if (selected) return selected;
        }
        return featured.length ? featured[Math.floor(Math.random() * featured.length)] : null;
}

// ============ SUPER FEATURED HERO CAROUSEL ============

let heroRotationTimer = null;

function stopHeroRotation() {
    if (heroRotationTimer) {
        clearInterval(heroRotationTimer);
        heroRotationTimer = null;
    }
}

async function renderHeroSelection(container, featured) {
    if (!container) return;
    stopHeroRotation();
    const config = await loadHostData();
    const picks = [];
    (config.superFeaturedShows || []).forEach(function (pick) {
        const id = Number(pick.id);
        if (id > 0 && (pick.type === 'tv' || pick.type === 'movie') &&
            !picks.some(function (existing) { return existing.id === id && existing.type === pick.type; })) {
            picks.push({ id: id, type: pick.type });
            }
    });
    const shows = [];
    for (const pick of picks) {
        const show = await ShowService.getDetails(pick.id, pick.type).catch(function () { return null; });
        if (show) shows.push(show);
    }
    // Nothing configured (or nothing loadable): normal hero behavior.
    if (!shows.length) {
        renderHero(container, await chooseTopPoster(featured));
        return;
    }
    // A single super featured title is just a fixed hero, no dots needed.
    if (shows.length === 1) {
        renderHero(container, shows[0]);
        return;
    }
    const rotationMs = Math.max(2000, Number(config.superFeaturedRotationMs) || 8000);
    container.innerHTML =
    '<div class="hero-slide">' +
    '<div class="hero-track">' + shows.map(function (show) { return '<div class="hero-cell">' + heroBannerHtml(show) + '</div>'; }).join('') + '</div>' +
    '</div>' +
    '<div class="hero-dots">' +
    shows.map(function (show, i) {
        return '<button type="button" class="hero-dot' + (i === 0 ? ' active' : '') +
        '" data-hero-index="' + i + '" aria-label="' + escapeHtml(show.title || 'Featured') + '"></button>';
    }).join('') +
    '</div>';
        const track = container.querySelector('.hero-track');
        const dots = container.querySelectorAll('.hero-dot');
        let heroIndex = 0;
        // Swipe the whole track across: one slide per step, instantly on first paint.
        const goToHero = function (index, animate) {
            heroIndex = (index + shows.length) % shows.length;
            track.style.transition = animate === false ? 'none' : '';
            // step = one full cell (100%) plus the 1.5% slide gap from .hero-cell
            track.style.transform = 'translateX(-' + (heroIndex * 101.5) + '%)';
            dots.forEach(function (dot, i) { dot.classList.toggle('active', i === heroIndex); });
        };
        const startRotation = function () {
            stopHeroRotation();
            heroRotationTimer = setInterval(function () { goToHero(heroIndex + 1); }, rotationMs);
        };
        dots.forEach(function (dot, i) {
            dot.addEventListener('click', function (e) {
                e.stopPropagation();
                goToHero(i);
                startRotation();
            });
        });
        goToHero(0, false);
        startRotation();
}


// ============ HOME PAGE LAYOUT (layout.conf) ============
// The home page is built from layout.conf, written like CSS: each block is
// a section, blocks render top to bottom, and properties cascade:
//   * { ... }        - defaults for every block (blocks override them)
//   :root { rl: 7 }  - site-wide values. rl = row length: posters per row
//                      on your screen. A size of 2rl = two rows' worth.
// Section names: hero, continuewatching, recommended, featured, recent,
// top, database, backtotop. Any other block name is a custom section and
// takes title / display / size / content. An empty block = all defaults.
// rl (row length = posters per row) is auto-detected per viewer's screen
// from the live grid CSS, so 2rl means "two rows' worth" on any device.
// If layout.conf can't be loaded the page falls back to a built-in order,
// so the site never renders empty.
const HOME_ROW_PAGE_SIZE = 7;
const DEFAULT_ROW_LENGTH = 7;

// Detect how many posters fit in one row on this viewer's screen: render a
// hidden throwaway grid with the real .tv-grid CSS and count its columns.
let detectedRowLength = null;
function detectRowLength() {
    if (detectedRowLength) return detectedRowLength;
    try {
        const host = document.getElementById('home-layout') ||
        document.querySelector('.content-container') || document.body;
        const probe = document.createElement('div');
        probe.className = 'tv-grid';
        probe.style.cssText = 'visibility:hidden;margin-top:0;';
        for (let i = 0; i < 48; i++) probe.appendChild(document.createElement('div'));
        host.appendChild(probe);
        const cols = (getComputedStyle(probe).gridTemplateColumns || '')
        .split(' ').filter(function (t) { return t && t !== '0px'; }).length;
        host.removeChild(probe);
        if (cols >= 1) {
            detectedRowLength = Math.min(24, Math.max(1, cols));
            return detectedRowLength;
        }
    } catch (err) { /* keep the default below */ }
    detectedRowLength = DEFAULT_ROW_LENGTH;
    return detectedRowLength;
}
const LAYOUT_FALLBACK = [
    { type: 'super_featured' },
{ type: 'continue_watching' },
{ type: 'recommended', display: 'row' },
{ type: 'featured', display: 'group' }
];

function canonSectionName(id) {
    if (id === 'hero' || id === 'superfeatured' || id === 'super') return 'super_featured';
    if (id === 'continuewatching' || id === 'cw') return 'continue_watching';
    if (id === 'recommended' || id === 'recommendations') return 'recommended';
    if (id === 'featured') return 'featured';
    if (id === 'recent' || id === 'newreleases') return 'recent';
    if (id === 'top' || id === 'toprated') return 'top';
    if (id === 'database' || id === 'databasebutton' || id === 'search') return 'database_button';
    if (id === 'backtotop' || id === 'btt') return 'backtotop';
    return 'custom';
}

function parseConfProps(body) {
    const props = {};
    String(body || '').split(';').forEach(function (chunk) {
        const idx = chunk.indexOf(':');
        if (idx < 1) return;
        const key = chunk.slice(0, idx).trim().toLowerCase().replace(/[^a-z-]/g, '');
        const value = chunk.slice(idx + 1).trim();
        if (key && value) props[key] = value;
    });
        return props;
}

// size takes a plain poster count (14) or rl units (2rl = 2 rows' worth).
// rl sizes are stored raw and resolved against the viewer's detected row
// length when the section renders.
function parseConfSize(value) {
    if (!value) return null;
    const m = /^(\d+(?:\.\d+)?)(rl)?$/i.exec(String(value).trim());
    if (!m) return null;
    const n = parseFloat(m[1]);
    if (!(n > 0 && n <= 200)) return null;
    return { n: n, rl: !!m[2] };
}

function resolveConfSize(size, rl) {
    if (!size) return null;
    let n = size.rl ? size.n * rl : size.n;
    n = Math.round(n);
    return (n >= 1 && n <= 200) ? n : null;
}

function parseConfContent(value) {
    return String(value || '').split(',').map(function (entry) {
        const m = /^\s*(\d+)\s*\.\s*(movie|tv)\s*$/i.exec(entry);
        return m ? { id: parseInt(m[1], 10), type: m[2].toLowerCase() } : null;
    }).filter(Boolean);
}

function parseLayoutConf(text) {
    const out = { sections: [], customs: {}, rl: DEFAULT_ROW_LENGTH, rowPageSize: DEFAULT_ROW_LENGTH };
    // Note: rl is auto-detected from the viewer's screen at load time
    // (detectRowLength), not defined here. :root blocks are allowed and
    // ignored so old files keep parsing.
    let src = String(text || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')      /* CSS-style comments */
    .replace(/(^|\n)\s*#[^\n]*/g, '\n');     /* # comments still tolerated */
    const blocks = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(src))) {
        m[1].split(',').forEach(function (rawName) {
            const name = rawName.trim().toLowerCase();
            if (!name) return;
            blocks.push({ name: name, props: parseConfProps(m[2]) });
        });
    }
    // Cascade pass: * sets defaults, named blocks override, order wins.
    let starProps = {};
    const seen = {};
    for (let i = 0; i < blocks.length; i++) {
        const blk = blocks[i];
        if (blk.name === ':root') continue;
        if (blk.name === '*') {
            Object.keys(blk.props).forEach(function (k) { starProps[k] = blk.props[k]; });
            continue;
        }
        const id = blk.name.replace(/[^a-z0-9_-]+/g, '');
        if (!id) continue;
        const canon = canonSectionName(id);
        const props = {};
        Object.keys(starProps).forEach(function (k) { props[k] = starProps[k]; });
        Object.keys(blk.props).forEach(function (k) { props[k] = blk.props[k]; });
        const display = String(props.display || '').toLowerCase() === 'group' ? 'group' : 'row';
        const size = parseConfSize(props.size);
        const title = props.title || '';
        const content = parseConfContent(props.content);

        if (canon === 'custom') {
            const prev = out.customs[id];
            if (prev) {
                // A repeated name updates the earlier definition (cascade),
                // but the section keeps its original position on the page.
                out.customs[id] = {
                    id: id,
                    title: title || prev.title,
                    display: blk.props.display !== undefined ? display : prev.display,
                    size: blk.props.size !== undefined ? size : prev.size,
                    content: content.length ? content : prev.content
                };
                continue;
            }
            if (!content.length) continue;
            out.customs[id] = { id: id, title: title, display: display, size: size, content: content };
            if (seen[canon + '/' + id]) continue;
            seen[canon + '/' + id] = true;
            out.sections.push({ type: canon, id: id });
            continue;
        }
        if (seen[canon]) continue;
        seen[canon] = true;
        const section = { type: canon, display: display, size: size };
        // Per-section defaults; the conf's own values always win.
        if (props.display === undefined) section.display = (canon === 'top') ? 'group' : 'row';
        if (canon === 'recent') section.size = size || { n: 2, rl: true };
        if (canon === 'top') section.size = size || { n: 3, rl: true };
        out.sections.push(section);
    }
    return out;
}

let layoutConfPromise = null;
function loadLayoutConf() {
    if (!layoutConfPromise) {
        layoutConfPromise = (async function () {
            let text = '';
            // Embed/override hook (also used by self-contained test builds):
            if (typeof window.__VERIDIUM_LAYOUT_CONF === 'string' && window.__VERIDIUM_LAYOUT_CONF.trim()) {
                text = window.__VERIDIUM_LAYOUT_CONF;
            } else {
                try {
                    const res = await fetch('layout.conf', { cache: 'no-cache' });
                    if (res.ok) text = await res.text();
                } catch (err) { /* fall back to the built-in order */ }
            }
            const layout = parseLayoutConf(text);
            if (!layout.sections.length) layout.sections = LAYOUT_FALLBACK.slice();
            // Auto-detect this viewer's row length (posters per row).
            layout.rl = detectRowLength();
            layout.rowPageSize = layout.rl;
            return layout;
        })();
    }
    return layoutConfPromise;
}

// Recent releases: newest movie releases + shows with a fresh episode,
// newest first. Cached for 12 hours so repeat visits cost nothing.
const RECENT_CACHE_PREFIX = 'veridium_recent_v1:';
const RECENT_CACHE_TTL = 12 * 60 * 60 * 1000;

function readRecentCache(count) {
    try {
        const raw = localStorage.getItem(RECENT_CACHE_PREFIX + count);
        if (!raw) return null;
        const entry = JSON.parse(raw);
        if (!entry || !entry.t || Date.now() - entry.t > RECENT_CACHE_TTL) return null;
        return entry.d || null;
    } catch (err) {
        return null;
    }
}

function writeRecentCache(count, items) {
    if (!items) return;
    try {
        localStorage.setItem(RECENT_CACHE_PREFIX + count, JSON.stringify({ t: Date.now(), d: items }));
    } catch (err) {}
}

async function fetchRecentReleases(limit) {
    limit = limit || 14;
    const cached = readRecentCache(limit);
    if (cached && cached.length) return cached;

    const sinceStr = new Date(Date.now() - RECENT_WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
    const tvCutoff = Date.now() - (RECENT_WINDOW_DAYS + 1) * 86400000;

    const movieProm = fetch(TMDB_BASE + '/discover/movie?api_key=' + TMDB_API_KEY +
    '&primary_release_date.gte=' + sinceStr + '&sort_by=primary_release_date.desc&vote_count.gte=10&include_adult=false&page=1')
    .then(function (r) { return r.json(); })
    .then(function (d) {
        return (d.results || []).map(function (m) {
            return normalizeTMDB(Object.assign({}, m, { media_type: 'movie' }));
        }).filter(Boolean);
    })
    .catch(function () { return []; });

    const tvProm = (async function () {
        const trending = await ShowService.fetchTrending().catch(function () { return []; });
        const candidates = trending.filter(function (i) { return i.type === 'tv' && !i.upcoming; }).slice(0, 26);
        const details = [];
        for (let i = 0; i < candidates.length; i += 6) {
            if (i) await sleep(70);
            const chunk = await Promise.all(candidates.slice(i, i + 6).map(function (c) {
                return ShowService.getDetails(c.id, 'tv').catch(function () { return null; });
            }));
            details.push(...chunk);
        }
        return details.filter(function (d) {
            if (!d) return false;
            const date = parseReleaseDate(d.lastAirDate || d.releaseDate);
            return date && date.getTime() >= tvCutoff;
        });
    })();

    const [movies, tvShows] = await Promise.all([movieProm, tvProm]);
    const byNewest = {};
    movies.forEach(function (m) {
        const t = parseReleaseDate(m.releaseDate);
        if (t) byNewest['movie:' + m.id] = { item: m, t: t.getTime() };
    });
    tvShows.forEach(function (s) {
        const t = parseReleaseDate(s.lastAirDate || s.releaseDate);
        if (t) byNewest['tv:' + s.id] = { item: s, t: t.getTime() };
    });
    const list = Object.keys(byNewest).map(function (k) { return byNewest[k]; })
    .sort(function (a, b) { return b.t - a.t; })
    .map(function (e) { return e.item; })
    .slice(0, limit);
    if (list.length) writeRecentCache(limit, list);
    return list;
}

// Top rated: the N highest rated titles on TMDB (movies + shows).
const TOP_CACHE_PREFIX = 'veridium_toprated_v1:';
const TOP_CACHE_TTL = 24 * 60 * 60 * 1000;

function readTopCache(count) {
    try {
        const raw = localStorage.getItem(TOP_CACHE_PREFIX + count);
        if (!raw) return null;
        const entry = JSON.parse(raw);
        if (!entry || !entry.t || Date.now() - entry.t > TOP_CACHE_TTL) return null;
        return entry.d || null;
    } catch (err) {
        return null;
    }
}

function writeTopCache(count, items) {
    if (!items) return;
    try {
        localStorage.setItem(TOP_CACHE_PREFIX + count, JSON.stringify({ t: Date.now(), d: items }));
    } catch (err) {}
}

async function fetchTopRated(count) {
    const cached = readTopCache(count);
    if (cached && cached.length) return cached;
    const req = function (type) {
        return fetch(TMDB_BASE + '/discover/' + type + '?api_key=' + TMDB_API_KEY +
        '&sort_by=vote_average.desc&vote_count.gte=300&include_adult=false&page=1')
        .then(function (r) { return r.json(); })
        .then(function (d) {
            return (d.results || []).map(function (raw) {
                return normalizeTMDB(Object.assign({}, raw, { media_type: type }));
            }).filter(Boolean);
        })
        .catch(function () { return []; });
    };
    const [movies, tvShows] = await Promise.all([req('movie'), req('tv')]);
    const list = movies.concat(tvShows)
    .sort(function (a, b) { return Number(b.rating || 0) - Number(a.rating || 0); })
    .slice(0, count);
    if (list.length) writeTopCache(count, list);
    return list;
}

// Custom sections load their content by TMDB id, in small staggered
// batches like the featured list so TMDB's rate limit never trips.
async function fetchCustomItems(def) {
    const fetchItem = function (entry) {
        return ShowService.getDetails(entry.id, entry.type).catch(function () { return null; });
    };
    const results = [];
    const BATCH_SIZE = 8;
    for (let i = 0; i < def.content.length; i += BATCH_SIZE) {
        if (i) await sleep(60);
        const chunk = await Promise.all(def.content.slice(i, i + BATCH_SIZE).map(fetchItem));
        results.push(...chunk);
    }
    return results.filter(function (item) { return item && item.id; });
}

function buildHomeSectionShell(titleText, idSuffix) {
    const section = document.createElement('section');
    section.className = 'content-section';
    section.id = 'home-section-' + idSuffix;
    const head = document.createElement('div');
    head.className = 'section-head';
    if (titleText) {
        const h2 = document.createElement('h2');
        h2.className = 'section-heading';
        h2.textContent = titleText;
        head.appendChild(h2);
    }
    const pager = document.createElement('div');
    pager.className = 'section-pager';
    pager.id = 'home-pager-' + idSuffix;
    head.appendChild(pager);
    section.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'tv-grid';
    grid.id = 'home-grid-' + idSuffix;
    section.appendChild(grid);
    return { section: section, grid: grid, pager: pager };
}

function renderPagedRow(state, items, grid, pager, pageSize) {
    const per = Math.max(1, pageSize || HOME_ROW_PAGE_SIZE);
    const pageCount = Math.max(1, Math.ceil(items.length / per));
    if (state.page > pageCount - 1) state.page = 0;
    renderGrid(grid, items.slice(state.page * per, (state.page + 1) * per));
    renderSectionPager(pager, state.page, pageCount, function (p) {
        state.page = p;
        renderPagedRow(state, items, grid, pager, per);
    });
}

function buildDatabaseButton() {
    const el = document.createElement('div');
    el.className = 'home-db-button';
    el.innerHTML =
    '<span class="home-db-text">Can\'t find something?</span>' +
    '<a class="home-db-link" href="database.html">' +
    '<svg class="home-db-icon" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M10 2a8 8 0 105.29 15.04l4.84 4.84a1 1 0 001.41-1.41l-4.83-4.84A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/>' +
    '</svg>' +
    'Search Database</a>';
    return el;
}

function buildBackToTop() {
    const el = document.createElement('div');
    el.className = 'home-back-to-top';
    el.innerHTML =
    '<span class="home-db-text">Couldn\'t find anything?</span>' +
    '<a class="home-btt-link" href="javascript:void(0)">Back To Top</a>';
    el.querySelector('.home-btt-link').addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return el;
}

async function renderHomeSection(root, section, layout, history, suffixCounter) {
    if (section.type === 'super_featured') {
        const hero = document.createElement('div');
        hero.id = 'hero-container';
        root.appendChild(hero);
        const featured = await ShowService.fetchFeatured();
        await renderHeroSelection(hero, featured);
        return;
    }
    if (section.type === 'continue_watching') {
        const shell = buildHomeSectionShell('CONTINUE WATCHING', 'cw');
        shell.section.id = 'continue-watching-section';
        shell.grid.id = 'continue-watching-grid';
        shell.pager.id = 'cw-pager';
        root.appendChild(shell.section);
        const cwCount = resolveConfSize(section.size, layout.rl);
        const cwHistory = cwCount ? history.slice(0, cwCount) : history;
        renderContinueWatchingSection(cwHistory, layout.rowPageSize);
        return;
    }
    if (section.type === 'recommended') {
        const shell = buildHomeSectionShell('RECOMMENDED', 'rec');
        shell.section.id = 'recommended-section';
        shell.section.style.display = 'none';
        shell.grid.id = 'recommended-home-grid';
        shell.pager.id = 'rec-pager';
        root.appendChild(shell.section);
        const picks = await fetchHomeRecommended(history);
        if (!picks.length) return;
        const recCount = resolveConfSize(section.size, layout.rl);
        const items = recCount ? picks.slice(0, recCount) : picks;
        if (items.length) {
            shell.section.style.display = '';
            renderRecommendedSection(items, shell.grid, layout.rowPageSize);
        }
        return;
    }
    if (section.type === 'featured') {
        const shell = buildHomeSectionShell('FEATURED', 'featured-' + (++suffixCounter.n));
        root.appendChild(shell.section);
        const all = await ShowService.fetchFeatured();
        if (!all.length) {
            shell.grid.innerHTML = '<div class="ad-warning">Failed to load content. Refresh the page.</div>';
            return;
        }
        const featCount = resolveConfSize(section.size, layout.rl);
        const items = featCount ? all.slice(0, featCount) : all;
        if (section.display === 'group') renderGrid(shell.grid, items);
        else renderPagedRow({ page: 0 }, items, shell.grid, shell.pager, layout.rowPageSize);
        return;
    }
    if (section.type === 'recent') {
        const shell = buildHomeSectionShell('NEW RELEASES', 'recent-' + (++suffixCounter.n));
        root.appendChild(shell.section);
        const count = resolveConfSize(section.size, layout.rl) || 2 * layout.rl;
        const items = await fetchRecentReleases(count);
        if (!items.length) {
            shell.section.remove();
            return;
        }
        if (section.display === 'group') renderGrid(shell.grid, items);
        else renderPagedRow({ page: 0 }, items, shell.grid, shell.pager, layout.rowPageSize);
        return;
    }
    if (section.type === 'top') {
        const count = Math.min(100, Math.max(1, resolveConfSize(section.size, layout.rl) || 3 * layout.rl));
        const shell = buildHomeSectionShell('TOP ' + count, 'top-' + count);
        root.appendChild(shell.section);
        const items = await fetchTopRated(count);
        if (!items.length) {
            shell.grid.innerHTML = '<div class="ad-warning">Failed to load content. Refresh the page.</div>';
            return;
        }
        if (section.display === 'row') renderPagedRow({ page: 0 }, items, shell.grid, shell.pager, layout.rowPageSize);
        else renderGrid(shell.grid, items);
        return;
    }
    if (section.type === 'custom') {
        const def = layout.customs[section.id];
        if (!def || !def.content.length) return;
        const shell = buildHomeSectionShell(def.title || section.id.toUpperCase(), 'custom-' + section.id);
        root.appendChild(shell.section);
        const all = await fetchCustomItems(def);
        if (!all.length) {
            shell.section.remove();
            return;
        }
        const custCount = resolveConfSize(def.size, layout.rl);
        const items = custCount ? all.slice(0, custCount) : all;
        if (def.display === 'group') renderGrid(shell.grid, items);
        else renderPagedRow({ page: 0 }, items, shell.grid, shell.pager, layout.rowPageSize);
        return;
    }
    if (section.type === 'database_button') {
        root.appendChild(buildDatabaseButton());
        return;
    }
    if (section.type === 'backtotop') {
        root.appendChild(buildBackToTop());
        return;
    }
}

async function initHome() {
    // Build from layout.conf. If the page predates the layout engine (no
    // #home-layout container), create one so the home page still renders.
    let layoutRoot = document.getElementById('home-layout');
    if (!layoutRoot) {
        const container = document.querySelector('.content-container');
        if (!container) return;
        layoutRoot = document.createElement('div');
        layoutRoot.id = 'home-layout';
        container.appendChild(layoutRoot);
    }
    const layout = await loadLayoutConf();
    const history = await backfillHistoryGenres(loadHistory()).catch(function () { return loadHistory(); });
    const seen = {};
    const suffixCounter = { n: 0 };
    for (let i = 0; i < layout.sections.length; i++) {
        const section = layout.sections[i];
        const key = section.type + (section.id ? '/' + section.id : '');
        if (seen[key]) continue; // each section renders once
        seen[key] = true;
        try {
            await renderHomeSection(layoutRoot, section, layout, history, suffixCounter);
        } catch (err) {
            // One broken section must never kill the rest of the page.
        }
    }
}

function heroBannerHtml(show) {
    const upcoming = !!show.upcoming;
    const metaBits = [];
    if (show.rating) metaBits.push('<span class="gold">RATING ' + escapeHtml(show.rating) + '</span>');
    if (upcoming && show.releaseDate && isUpcomingDate(show.releaseDate)) {
        metaBits.push('<span>' + escapeHtml(formatReleaseDate(show.releaseDate).toUpperCase()) + '</span>');
    } else if (show.year) {
        metaBits.push('<span>' + escapeHtml(show.year) + '</span>');
    }
    return (
        '<div class="hero-banner' + (upcoming ? ' hero-upcoming' : '') + '">' +
        '<div class="hero-bg" style="background-image: url(\'' + escapeHtml(show.backdrop) + '\')"></div>' +
        '<div class="hero-fade"></div>' +
        '<div class="hero-content">' +
        '<div class="hero-tag">' + (upcoming ? 'UPCOMING ' : 'FEATURED ') + (show.type === 'movie' ? 'MOVIE' : 'TV SHOW') + '</div>' +
        '<h1 class="hero-title">' + escapeHtml(show.title) + '</h1>' +
        (metaBits.length ? '<div class="hero-meta">' + metaBits.join('<span>|</span>') + '</div>' : '') +
        '<p class="hero-desc">' + escapeHtml((show.summary || show.description) ? (show.summary || show.description).substring(0, 200) + '...' : '') + '</p>' +
        '<a class="btn-action' + (upcoming ? ' btn-upcoming' : '') + '" href="' + showUrl(show.id, show.type) + '">' + (upcoming ? 'COMING SOON' : 'WATCH NOW') + '</a>' +
        '</div>' +
        '</div>'
    );
}

function renderHero(container, show) {
    if (!show) return;
    container.innerHTML = heroBannerHtml(show);
}

// ============ DATABASE (searchable catalog) ============

let dbTrendingCache = null;
let dbSearchTimer = null;
let dbSearchVersion = 0;

async function dbShowTrending(grid, status) {
    const version = ++dbSearchVersion;
    if (status) status.textContent = 'TRENDING';
    try {
        if (!dbTrendingCache) dbTrendingCache = await ShowService.fetchTrending();
        if (grid && version === dbSearchVersion) renderDatabaseGrid(grid, dbTrendingCache);
    } catch (err) {
        if (grid && version === dbSearchVersion) grid.innerHTML = '<div class="ad-warning">Failed to load content. Refresh the page.</div>';
    }
}

function dbSearch(query) {
    const url = TMDB_BASE + '/search/multi?api_key=' + TMDB_API_KEY +
    '&include_adult=false&query=' + encodeURIComponent(query);
    return fetch(url).then(function (res) { if (!res.ok) throw new Error('Search failed'); return res.json(); }).then(function (data) {
        return (data.results || [])
        .map(normalizeTMDB)
        .filter(function (i) { return i !== null && i.title; })
        .slice(0, 40);
    });
}

async function dbRunSearch(q, grid, status) {
    const version = ++dbSearchVersion;
    if (status) status.textContent = 'SEARCHING...';
    try {
        const results = await dbSearch(q);
        const input = document.getElementById('db-search-input');
        if (version !== dbSearchVersion || (input && input.value.trim() !== q)) return; // stale response, user kept typing
        if (status) status.textContent = 'RESULTS FOR "' + q.toUpperCase() + '"';
        if (results.length) renderDatabaseGrid(grid, results);
        else grid.innerHTML = '<div class="ad-warning">NO RESULTS FOUND FOR "' + escapeHtml(q) + '".</div>';
    } catch (err) {
        if (version !== dbSearchVersion) return;
        if (status) status.textContent = 'SEARCH FAILED';
        grid.innerHTML = '<div class="ad-warning">Search failed. Try again.</div>';
    }
}

async function initDatabase() {
    const grid = document.getElementById('database-grid');
    const input = document.getElementById('db-search-input');
    const status = document.getElementById('db-status');
    if (!grid) return;

    await dbShowTrending(grid, status);
    if (!input) return;

    input.addEventListener('input', function () {
        const q = input.value.trim();
        clearTimeout(dbSearchTimer);
        if (!q) {
            dbSearchVersion++;
            dbSearchTimer = setTimeout(function () {
                if (!input.value.trim()) dbShowTrending(grid, status);
            }, 250);
                return;
        }
        dbSearchVersion++;
        if (status) status.textContent = 'SEARCHING...';
        dbSearchTimer = setTimeout(function () { dbRunSearch(q, grid, status); }, 170);
    });

    input.addEventListener('keydown', function (e) {
        const q = input.value.trim();
        if (e.key === 'Enter' && q) {
            clearTimeout(dbSearchTimer);
            dbRunSearch(q, grid, status);
        }
    });
}

async function initFeatured() {
    const heroContainer = document.getElementById('hero-container');
    const grid = document.getElementById('featured-grid');
    if (!grid) return;
    try {
        const items = await ShowService.fetchFeatured();
        if (!items.length) {
            grid.innerHTML = '<div class="ad-warning">Failed to load content. Refresh the page.</div>';
            return;
        }
        if (heroContainer) {
            await renderHeroSelection(heroContainer, items);
        }
        renderGrid(grid, items);
    } catch (err) {
        grid.innerHTML = '<div class="ad-warning">Failed to load content. Refresh the page.</div>';
    }
}

async function initShow() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const type = params.get('type') === 'movie' ? 'movie' : 'tv';
    const seasonParam = params.get('season') !== null ? parseInt(params.get('season'), 10) : null;
    const episodeParam = params.get('episode') !== null ? parseInt(params.get('episode'), 10) : null;

    const layout = document.getElementById('show-root');
    if (!id) {
        layout.innerHTML = '<div class="ad-warning">No show specified. <a href="index.html">Back to home</a></div>';
        return;
    }

    layout.innerHTML = '<div class="ad-warning">ACCESSING DATA...</div>';

    try {
        await loadServers();
        const show = await ShowService.getDetails(id, type);
        if (!show) {
            layout.innerHTML = '<div class="ad-warning">Show not found. <a href="index.html">Back to home</a></div>';
            return;
        }
        state.show = show;

        // Upcoming title: dedicated release-info page. No player, no
        // episodes, no Continue Watching entry until it premieres.
        if (show.upcoming) {
            state.season = 1;
            state.episode = null;
            renderShowPage();
            document.title = show.title + ' - Veridium';
            renderRecommended(id, type);
            renderCollection(show);
            return;
        }

        // Where to start: explicit URL params win, then saved progress, then S1E1.
        const saved = loadHistory().find(function (e) {
            return e.id === Number(show.id) && e.type === type;
        });
        const totalSeasons = show.totalSeasons || 1;
        let startSeason = null;
        if (seasonParam && seasonParam >= 1 && seasonParam <= totalSeasons) {
            startSeason = seasonParam;
        } else if (saved && saved.season && saved.season >= 1 && saved.season <= totalSeasons) {
            startSeason = saved.season;
        }
        startSeason = startSeason || 1;
        state.season = startSeason;
        state.episode = null;

        if (type === 'tv') {
            const eps = await ShowService.getSeasonEpisodes(id, startSeason);
            show.episodes[startSeason] = eps;
            let startEpisode = null;
            if (episodeParam && episodeParam >= 1) {
                startEpisode = eps.find(function (e) { return e.number === episodeParam; }) || null;
            }
            if (!startEpisode && saved && saved.season === startSeason && saved.episode) {
                startEpisode = eps.find(function (e) { return e.number === saved.episode; }) || null;
            }
            // Never auto-start on an unaired episode: fall back to the
            // first episode that has actually aired.
            const firstAired = eps.find(function (e) { return !isUpcomingDate(e.airDate); }) || null;
            if (startEpisode && isUpcomingDate(startEpisode.airDate)) startEpisode = null;
            if (!startEpisode) startEpisode = firstAired;
            state.episode = startEpisode || eps[0] || { number: 1, title: 'Unavailable' };
        }

        renderShowPage();
        document.title = show.title + ' - Veridium';
        recordWatch(
            show,
            type === 'tv' ? state.season : null,
            type === 'tv' && state.episode ? state.episode.number : null
        );
        renderRecommended(id, type);
        renderCollection(show);
    } catch (err) {
        layout.innerHTML = '<div class="ad-warning">DATA CORRUPTED. RETRY.</div>';
    }
}


// Ad-block advice, device-aware. Desktop gets the uBlock Origin link;
// phones can't install extensions, so they get the routes that actually
// work there: the AdGuard app, the Brave browser, or AdGuard DNS set as
// the system's Private DNS (blocks ads in every app, including these
// embedded players).
function adBlockAdviceHtml(intro) {
    const lead = intro || 'Streams are embedded from outside sources and may include ads. ';
    let touch = false;
    try { touch = window.matchMedia('(hover: none)').matches; } catch (err) {}
    if (!touch) {
        return lead +
        'Use an ad blocker for the best experience. ' +
        '<a href="https://ublockorigin.com/" target="_blank" rel="noopener noreferrer">Get uBlock Origin</a>';
    }
    return lead +
    'Phones can\'t install uBlock, but these block ads everywhere, including in these players: ' +
    'the <a href="https://adguard.com/" target="_blank" rel="noopener noreferrer">AdGuard app</a>, the ' +
    '<a href="https://brave.com/" target="_blank" rel="noopener noreferrer">Brave browser</a>, or ' +
    '<a href="https://adguard-dns.io/" target="_blank" rel="noopener noreferrer">AdGuard DNS</a> ' +
    'set as your Private DNS (dns.adguard.com).';
}

function renderShowPage() {
    const show = state.show;
    if (show.upcoming) {
        renderUpcomingPage();
        return;
    }
    const isMovie = show.type === 'movie';
    const layout = document.getElementById('show-root');

    const metaBits = [];
    if (show.rating) metaBits.push('<span class="gold">RATING ' + escapeHtml(show.rating) + '</span>');
    if (show.year) metaBits.push('<span>' + escapeHtml(show.year) + '</span>');
    if (!isMovie) metaBits.push('<span>' + escapeHtml(show.totalSeasons) + ' SEASONS</span>');

    const serverCount = window.__veridiumServers.length;
    const serverOptions = serverCount
    ? window.__veridiumServers.map(function (slot, i) {
        return '<option value="' + i + '"' + (i === state.serverIndex ? ' selected' : '') + '>' + escapeHtml(slot.title) + '</option>';
    }).join('')
    : '<option value="0">NO SERVERS - CHECK servers.js</option>';

    layout.innerHTML =
    '<a href="index.html" class="back-link">&lt; BACK</a>' +

    '<div class="ad-warning" style="margin-top:0;">' +
    adBlockAdviceHtml() +
    '</div>' +

    '<div class="details-layout' + (isMovie ? ' movie-layout' : '') + '">' +
    '<div>' +
    '<div class="video-container">' +
    '<iframe id="video-player" src="about:blank" frameborder="0" allowfullscreen ' +
    'allow="autoplay; fullscreen; encrypted-media; picture-in-picture" ' +
    'referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
    '</div>' +
    '<div class="player-buttons">' +
    '<button type="button" class="btn-secondary" onclick="playerFullscreen()">FULLSCREEN</button>' +
    '<button type="button" class="btn-secondary" onclick="playerRefresh()">REFRESH</button>' +
    '<button type="button" class="btn-secondary" onclick="playerOpenLink()">OPEN LINK</button>' +
    '<div class="server-select-wrap">' +
    '<span class="server-select-label"><b> Broken or Weird? -></b> </span>' +
    '<select id="server-select" class="server-select"' + (serverCount ? ' onchange="switchServer(this.value)"' : ' disabled') + '>' + serverOptions + '</select>' +
    '</div>' +
    '</div>' +

    '<div class="show-info">' +
    '<div class="show-type-tag">' + (isMovie ? 'MOVIE' : 'TV SERIES') + '</div>' +
    '<h1 class="show-title">' + escapeHtml(show.title) + '</h1>' +
    (metaBits.length ? '<div class="show-meta">' + metaBits.join('<span>|</span>') + '</div>' : '') +
    '<p class="show-desc">' + escapeHtml(show.description) + '</p>' +
    '</div>' +
    '</div>' +
    (isMovie ? '' :
    '<div class="episode-list-container">' +
    '<div class="season-header">' +
    '<span>EPISODES</span>' +
    '<button type="button" class="btn-secondary next-episode-btn" id="next-episode-btn" onclick="playNextEpisode()">NEXT EPISODE</button>' +
    '<select id="season-select" class="season-select" onchange="changeSeason(this.value)">' +
    Array.from({ length: show.totalSeasons }, function (_, i) { return i + 1; }).map(function (s) {
        return '<option value="' + s + '"' + (s === state.season ? ' selected' : '') + '>SEASON ' + s + '</option>';
    }).join('') +
    '</select>' +
    '</div>' +
    '<div id="episodes-scroll" class="episodes-scroll"></div>' +
    '</div>') +
    '</div>' +

    (isMovie && show.collectionId ?
    '<h2 class="section-title toned">' + escapeHtml((show.collectionName || 'Collection').toUpperCase()) + '</h2>' +
    '<div id="collection-grid" class="tv-grid rec-grid"></div>'
    : '') +

    '<h2 class="section-title toned">Recommended</h2>' +
    '<div id="recommended-grid" class="tv-grid rec-grid"></div>';

    playerRefresh();
    if (!isMovie) { renderEpisodeList(); startPlayerSync(); }
}

// ============ UPCOMING PLAYER PAGE ============
// The player is replaced by a greyed-out, unclickable panel that says
// Upcoming plus the release dates and details.

function upcomingDateBits(show) {
    const bits = { date: '', label: '', countdown: '', ep: '' };
    if (show.type === 'movie') {
        bits.label = show.releaseDate
        ? 'PREMIERING ' + formatReleaseDate(show.releaseDate).toUpperCase()
        : 'RELEASE DATE NOT YET ANNOUNCED';
        bits.date = show.releaseDate || '';
    } else if (isUpcomingDate(show.releaseDate)) {
        bits.label = 'SERIES PREMIERE ' + formatReleaseDate(show.releaseDate).toUpperCase();
        bits.date = show.releaseDate;
    } else if (show.nextAir && isUpcomingDate(show.nextAir.date)) {
        bits.label = 'NEXT EPISODE ' + formatReleaseDate(show.nextAir.date).toUpperCase();
        bits.date = show.nextAir.date;
        if (show.nextAir.title) {
            bits.ep = 'NEXT EPISODE: S' + show.nextAir.season + 'E' + show.nextAir.episode + ' - ' + show.nextAir.title;
        }
    } else {
        bits.label = 'AIR DATE NOT YET ANNOUNCED';
    }
    const days = daysUntilRelease(bits.date);
    if (days) bits.countdown = 'IN ' + days + ' DAY' + (days === 1 ? '' : 'S');
    return bits;
}

function renderUpcomingPage() {
    const show = state.show;
    const layout = document.getElementById('show-root');
    const isMovie = show.type === 'movie';
    const bits = upcomingDateBits(show);

    const metaBits = [];
    if (show.rating) metaBits.push('<span class="gold">RATING ' + escapeHtml(show.rating) + '</span>');
    if (bits.date) metaBits.push('<span>' + escapeHtml(formatReleaseDate(bits.date).toUpperCase()) + '</span>');
    if (!isMovie && show.totalSeasons) metaBits.push('<span>' + escapeHtml(show.totalSeasons) + ' SEASONS</span>');

    layout.innerHTML =
    '<a href="index.html" class="back-link">&lt; BACK</a>' +

    '<div class="details-layout movie-layout upcoming-layout">' +
    '<div>' +
    '<div class="video-container upcoming-container">' +
    '<div class="upcoming-bg" style="background-image: url(\'' + escapeHtml(show.backdrop) + '\')"></div>' +
    '<div class="upcoming-fade"></div>' +
    '<div class="upcoming-panel">' +
    '<div class="upcoming-label">UPCOMING</div>' +
    '<div class="upcoming-date">' + escapeHtml(bits.label) + '</div>' +
    (bits.countdown ? '<div class="upcoming-countdown">' + escapeHtml(bits.countdown) + '</div>' : '') +
    (show.status ? '<div class="upcoming-status">STATUS: ' + escapeHtml(String(show.status).toUpperCase()) + '</div>' : '') +
    (bits.ep ? '<div class="upcoming-ep">' + escapeHtml(bits.ep) + '</div>' : '') +
    '<div class="upcoming-note">This title has not been released yet, so playback is unavailable. It will open here once it premieres.</div>' +
    '</div>' +
    '</div>' +
    '<div class="show-info">' +
    '<div class="show-type-tag">' + (isMovie ? 'MOVIE' : 'TV SERIES') + '</div>' +
    '<h1 class="show-title">' + escapeHtml(show.title) + '</h1>' +
    (metaBits.length ? '<div class="show-meta">' + metaBits.join('<span>|</span>') + '</div>' : '') +
    '<p class="show-desc">' + escapeHtml(show.description) + '</p>' +
    '</div>' +
    '</div>' +
    '</div>' +

    (isMovie && show.collectionId ?
    '<h2 class="section-title toned">' + escapeHtml((show.collectionName || 'Collection').toUpperCase()) + '</h2>' +
    '<div id="collection-grid" class="tv-grid rec-grid"></div>'
    : '') +

    '<h2 class="section-title toned">Recommended</h2>' +
    '<div id="recommended-grid" class="tv-grid rec-grid"></div>';
}

function switchServer(value) {
    state.serverIndex = parseInt(value) || 0;
    playerRefresh();
}

function playNextEpisode() {
    const show = state.show;
    if (!show || show.type !== 'tv') return;
    const eps = show.episodes[state.season] || [];
    const current = state.episode ? Number(state.episode.number) : 0;
    const next = eps.find(function (ep) { return Number(ep.number) > current && !isUpcomingDate(ep.airDate); });
    if (next) {
        state.episode = next;
        renderEpisodeList();
        playerRefresh();
        updateShowUrl();
        window.scrollTo(0, 0);
    } else if (state.season < (show.totalSeasons || 1)) {
        // Last episode of the season: roll into the next season's first episode.
        changeSeason(state.season + 1).then(function () { window.scrollTo(0, 0); });
    } else {
        const btn = document.getElementById('next-episode-btn');
        if (btn) {
            const label = btn.textContent;
            const onlyUnaired = eps.some(function (ep) { return Number(ep.number) > current; });
            btn.textContent = onlyUnaired ? 'NO AIRED EPISODES YET' : 'END OF SERIES';
            setTimeout(function () { btn.textContent = label; }, 1500);
        }
    }
}

async function ensureSeasonEpisodes(season) {
    if (!state.show.episodes[season]) {
        const container = document.getElementById('episodes-scroll');
        if (container) container.innerHTML = '<div style="padding:20px; color:var(--purple-neon); text-align:center; font-family:\'JetBrains Mono\', monospace;">LOADING...</div>';
        const eps = await ShowService.getSeasonEpisodes(state.show.id, season);
        state.show.episodes[season] = eps;
    }
    return state.show.episodes[season];
}

async function changeSeason(season) {
    state.season = parseInt(season);
    await ensureSeasonEpisodes(state.season);
    const seasonEps = state.show.episodes[state.season] || [];
    state.episode = seasonEps.find(function (e) { return !isUpcomingDate(e.airDate); }) ||
    seasonEps[0] || { number: 1, title: 'Unavailable' };
    renderEpisodeList();
    syncSeasonSelect();
    playerRefresh();
    updateShowUrl();
}

function renderEpisodeList() {
    const container = document.getElementById('episodes-scroll');
    if (!container) return;
    const episodes = state.show.episodes[state.season] || [];
    if (!episodes.length) {
        container.innerHTML = '<div style="padding:20px; color:grey; text-align:center;">NO DATA AVAILABLE</div>';
        return;
    }
    container.innerHTML = episodes.map(function (ep, idx) {
        const isActive = state.episode && ep.number === state.episode.number;
        // Unaired episodes are greyed out and inert - no stream exists yet.
        const upcoming = isUpcomingDate(ep.airDate);
        return '<div class="episode-item' + (isActive ? ' active' : '') + (upcoming ? ' episode-upcoming' : '') + '"' +
        (upcoming ? '' : ' onclick="playEpisode(' + state.season + ', ' + idx + ')"') + '>' +
        '<div class="ep-num">' + ep.number + '</div>' +
        '<div class="ep-title">' + escapeHtml(ep.title) +
        (upcoming ? ' <span class="ep-upcoming-tag">(UPCOMING)</span>' : '') + '</div>' +
        '</div>';
    }).join('');
}

function playEpisode(season, index) {
    state.season = season;
    state.episode = state.show.episodes[season][index];
    renderEpisodeList();
    syncSeasonSelect();
    playerRefresh();
    updateShowUrl();
    window.scrollTo(0, 0);
}

function updateShowUrl() {
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('season', state.season);
        url.searchParams.set('episode', state.episode ? state.episode.number : 1);
        window.history.replaceState({}, '', url);
        if (state.show && state.show.type === 'tv') {
            updateWatchEpisode(state.show.id, 'tv', state.season, state.episode ? state.episode.number : null);
        }
    } catch (err) {  }
}

async function renderRecommended(id, type) {
    const grid = document.getElementById('recommended-grid');
    if (!grid) return;
    const currentId = Number(id);
    const notCurrent = function (item) { return !(item && Number(item.id) === currentId); };
    let items = await ShowService.getRecommendations(id, type);
    items = items.filter(notCurrent);
    if (!items.length) {
        try {
            items = (await ShowService.fetchTrending()).filter(notCurrent).slice(0, 20);
        } catch (err) {
            grid.innerHTML = '';
            return;
        }
    }
    // Always two rows' worth of similar titles (2rl, auto-detected).
    renderStrip(grid, items.slice(0, 2 * detectRowLength()));
}

// ============ COLLECTION (movie franchise) ============

function collectionCard(item, isCurrent) {
    const card = posterCard(item);
    // Works for both normal and upcoming cards (the upcoming variant has a
    // longer class list, so match on the class prefix, not the full string).
    return isCurrent ? card.replace('class="poster-card', 'class="poster-card current') : card;
}

async function renderCollection(show) {
    const grid = document.getElementById('collection-grid');
    if (!grid || !show || !show.collectionId) return;
    grid.innerHTML = '<div class="ad-warning">LOADING...</div>';
    const collection = await ShowService.getCollection(show.collectionId);
    // The user may have navigated away while the parts were loading.
    if (!grid.isConnected) return;
    if (!collection || !collection.items.length) {
        const heading = grid.previousElementSibling;
        if (heading && heading.tagName === 'H2') heading.remove();
        grid.remove();
        return;
    }
    grid.innerHTML = collection.items.map(function (item) {
        return collectionCard(item, Number(item.id) === Number(show.id));
    }).join('');
}


function initParticles() {
    try {
        const canvas = document.getElementById('particle-canvas');
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0, height = 0;
        const particles = [];
        const mouse = { x: -9999, y: -9999 };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        function spawn() {
            particles.length = 0;
            const count = Math.min(90, Math.floor(window.innerWidth / 18));
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * width,
                               y: Math.random() * height,
                               vx: (Math.random() - 0.5) * 0.4,
                               vy: (Math.random() - 0.5) * 0.4,
                               r: Math.random() * 1.8 + 0.6
                });
            }
        }

        function step() {
            ctx.clearRect(0, 0, width, height);
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = width; else if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height; else if (p.y > height) p.y = 0;

                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 12000) {
                    const dist = Math.sqrt(distSq) || 1;
                    const push = (12000 - distSq) / 12000;
                    p.x += (dx / dist) * push * 3;
                    p.y += (dy / dist) * push * 3;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                const particleRgb = window.__veridiumRgb || [139, 92, 246];
                ctx.fillStyle = 'rgba(' + particleRgb[0] + ', ' + particleRgb[1] + ', ' + particleRgb[2] + ', 0.5)';
                ctx.fill();
            }
            requestAnimationFrame(step);
        }

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', function (e) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });

        resize();
        spawn();
        step();
    } catch (err) {

    }
}

// ============ POPULAR (cross-type popularity grid) ============

async function initPopular() {
    const grid = document.getElementById('popular-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="ad-warning">LOADING...</div>';
    const load = async function (type) {
        try {
            const res = await fetch(TMDB_BASE + '/discover/' + type + '?api_key=' + TMDB_API_KEY +
            '&sort_by=popularity.desc&vote_count.gte=200&include_adult=false&page=1');
            const data = await res.json();
            // /discover results carry no media_type field - add it back so
            // normalizeTMDB (and its upcoming flag) accepts each item.
            return (data.results || []).map(function (r) { return normalizeTMDB(Object.assign({}, r, { media_type: type })); }).filter(Boolean);
        } catch (err) {
            return [];
        }
    };
    const [movies, shows] = await Promise.all([load('movie'), load('tv')]);
    // Interleave the two lists so the page is not just a wall of one type.
    const merged = [];
    const maxLen = Math.max(movies.length, shows.length);
    for (let i = 0; i < maxLen; i++) {
        if (shows[i]) merged.push(shows[i]);
        if (movies[i]) merged.push(movies[i]);
    }
    if (!merged.length) {
        grid.innerHTML = '<div class="ad-warning">Failed to load content. Refresh the page.</div>';
        return;
    }
    renderGrid(grid, merged.slice(0, 40));
}

document.addEventListener('DOMContentLoaded', function () {
    initParticles();
    const page = document.body.getAttribute('data-page');
    loadHostData().then(function () {
        applyHostData();
        renderNavbar();
    });
    if (page === 'home') initHome();
    else if (page === 'database') initDatabase();
    else if (page === 'featured') initFeatured();
    else if (page === 'popular') initPopular();
    else if (page === 'show') initShow();
    else if (page === 'livesports') initLiveSports();
});

window.addEventListener('pageshow', function (event) {
    if (event.persisted && document.body.getAttribute('data-page') === 'home') {
        initHome();
    }
});

// ============ NAVBAR (bubble layout, driven by instance-host-data.js) ============

const NAV_ITEMS = {
    'Database': { href: 'database.html', page: 'database' },
    'Featured': { href: 'featured.html', page: 'featured' },
    'Live Sports': { href: 'livesports.html', page: 'livesports' }
};
// Old instances that still list "Popular" get the Database page instead.
const NAV_ALIASES = { 'Popular': 'Database' };
const NAV_DEFAULT_LAYOUT = ['Database', 'Featured', 'Live Sports'];

function renderNavbar() {
    const navRight = document.getElementById('nav-right');
    if (!navRight) return;
    const raw = (window.__veridiumHostData && Array.isArray(window.__veridiumHostData.navbarLayout))
    ? window.__veridiumHostData.navbarLayout
    : NAV_DEFAULT_LAYOUT;
    const layout = raw.map(function (name) {
        const trimmed = typeof name === 'string' ? name.trim() : '';
        return NAV_ALIASES[trimmed] || trimmed;
    }).filter(function (name) {
        return Object.prototype.hasOwnProperty.call(NAV_ITEMS, name);
    });

    let currentPage = document.body.getAttribute('data-page');
    // The player belongs to no nav section; keep the section the viewer came
    // from lit so the navbar looks the same as every other page.
    if (currentPage === 'show') {
        try {
            const refFile = new URL(document.referrer, window.location.href).pathname.split('/').pop();
            const refMap = { 'database.html': 'database', 'featured.html': 'featured', 'livesports.html': 'livesports' };
            if (refMap[refFile]) currentPage = refMap[refFile];
        } catch (err) {}
    }
    navRight.innerHTML = '';

    const bubble = document.createElement('div');
    bubble.className = 'nav-bubble';
    const indicator = document.createElement('div');
    indicator.className = 'nav-bubble-indicator';
    bubble.appendChild(indicator);

    const links = [];
    layout.forEach(function (name) {
        const item = NAV_ITEMS[name];
        const a = document.createElement('a');
        a.className = 'nav-item' + (currentPage === item.page ? ' active' : '');
        a.href = item.href;
        a.textContent = name.toUpperCase();
        bubble.appendChild(a);
        links.push(a);
    });
    navRight.appendChild(bubble);

    const activeEl = bubble.querySelector('.nav-item.active');
    function moveIndicator(el) {
        if (!el) {
            indicator.classList.remove('visible');
            return;
        }
        indicator.classList.add('visible');
        indicator.style.width = el.offsetWidth + 'px';
        indicator.style.transform = 'translateX(' + el.offsetLeft + 'px)';
    }
    links.forEach(function (a) {
        a.addEventListener('mouseenter', function () { moveIndicator(a); });
    });
    bubble.addEventListener('mouseleave', function () { moveIndicator(activeEl); });
    function settle() { moveIndicator(activeEl); }
    window.addEventListener('load', settle);
    window.addEventListener('resize', settle);
    requestAnimationFrame(function () { setTimeout(settle, 80); });
}

// ============ LIVE SPORTS (streamed.pk) ============

const STREAMED_API = 'https://streamed.pk/api';
const lsState = { sports: [], matches: [], sportId: 'live', match: null, streams: [], streamIndex: 0 };

function lsFetchJSON(url) {
    return fetch(url).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    });
}

function lsBadgeUrl(id) {
    return STREAMED_API + '/images/badge/' + encodeURIComponent(id) + '.webp';
}

function lsEscape(value) { return escapeHtml(value); }

function lsFormatTime(ts) {
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

async function initLiveSports() {
    const root = document.getElementById('livesports-root');
    if (!root) return;
    root.innerHTML = '<div class="ad-warning">ACCESSING DATA...</div>';
    try {
        const sports = await lsFetchJSON(STREAMED_API + '/sports');
        lsState.sports = (Array.isArray(sports) ? sports : []).filter(function (sp) { return sp && sp.id && sp.name; });
    } catch (err) {
        lsState.sports = [];
    }
    lsState.match = null;
    lsState.streams = [];
    renderLiveSportsPage();
    loadMatches(lsState.sportId);
}

function renderLiveSportsPage() {
    const root = document.getElementById('livesports-root');
    if (!root) return;

    const sportOptions = '<option value="live"' + (lsState.sportId === 'live' ? ' selected' : '') + '>LIVE NOW</option>' +
    lsState.sports.map(function (sp) {
        return '<option value="' + lsEscape(sp.id) + '"' + (lsState.sportId === sp.id ? ' selected' : '') + '>' + lsEscape(sp.name.toUpperCase()) + '</option>';
    }).join('');

    root.innerHTML =
    '<div class="ad-warning" style="margin-top:0;">' +
    adBlockAdviceHtml('Live sports streams are embedded from outside sources and may include ads. ') +
    '</div>' +

    '<div class="details-layout">' +
    '<div>' +
    '<div class="video-container">' +
    '<iframe id="video-player" src="about:blank" frameborder="0" allowfullscreen ' +
    'allow="autoplay; fullscreen; encrypted-media; picture-in-picture" ' +
    'referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
    '</div>' +
    '<div class="player-buttons">' +
    '<button type="button" class="btn-secondary" onclick="playerFullscreen()">FULLSCREEN</button>' +
    '<button type="button" class="btn-secondary" onclick="lsRefresh()">REFRESH</button>' +
    '<button type="button" class="btn-secondary" onclick="lsOpenLink()">OPEN LINK</button>' +
    '<div class="server-select-wrap">' +
    '<span class="server-select-label">STREAM SELECTOR:</span>' +
    '<select id="stream-select" class="server-select" onchange="switchLiveStream(parseInt(this.value, 10))">' +
    '<option value="0">SELECT A MATCH</option>' +
    '</select>' +
    '</div>' +
    '</div>' +

    '<div id="ls-match-info" class="ls-match-info"></div>' +
    '</div>' +
    '<div class="episode-list-container">' +
    '<div class="season-header">' +
    '<span>MATCHES</span>' +
    '<select id="sport-select" class="season-select" onchange="changeSport(this.value)">' + sportOptions + '</select>' +
    '</div>' +
    '<div id="matches-scroll" class="episodes-scroll sport-match-list"></div>' +
    '</div>' +
    '</div>';
}

async function loadMatches(sportId) {
    lsState.sportId = sportId || 'live';
    const listEl = document.getElementById('matches-scroll');
    if (!listEl) return;
    listEl.innerHTML = '<div class="ad-warning">LOADING...</div>';
    try {
        const endpoint = lsState.sportId === 'live'
        ? '/matches/live'
        : '/matches/' + encodeURIComponent(lsState.sportId);
        const matches = await lsFetchJSON(STREAMED_API + endpoint);
        lsState.matches = Array.isArray(matches) ? matches : [];
        renderMatchList();
    } catch (err) {
        lsState.matches = [];
        listEl.innerHTML = '<div class="ad-warning">Failed to load matches. Refresh the page.</div>';
    }
}

function changeSport(sportId) {
    loadMatches(sportId);
}

function renderMatchList() {
    const listEl = document.getElementById('matches-scroll');
    if (!listEl) return;
    if (!lsState.matches.length) {
        listEl.innerHTML = '<div class="ad-warning">No matches found. Check back later.</div>';
        return;
    }
    const now = Date.now();
    const sorted = lsState.matches.slice().sort(function (a, b) { return (a.date || 0) - (b.date || 0); });
    listEl.innerHTML = sorted.map(function (m, idx) {
        const isLiveRow = lsState.sportId === 'live';
        const active = lsState.match && lsState.match.id === m.id;
        const home = m.teams && m.teams.home;
        const away = m.teams && m.teams.away;
        let teamsHtml = '';
        if (home || away) {
            teamsHtml =
            '<div class="match-team-line">' +
            (home ? '<img src="' + lsEscape(lsBadgeUrl(home.badge)) + '" onerror="this.style.display=\'none\'">' : '') +
            '<span>' + lsEscape(home ? home.name : '') + '</span>' +
            '</div>' +
            '<div class="match-team-line">' +
            (away ? '<img src="' + lsEscape(lsBadgeUrl(away.badge)) + '" onerror="this.style.display=\'none\'">' : '') +
            '<span>' + lsEscape(away ? away.name : '') + '</span>' +
            '</div>';
        } else {
            teamsHtml = '<div class="match-team-line"><span>' + lsEscape(m.title || 'Match') + '</span></div>';
        }
        return '<div class="match-row' + (isLiveRow ? ' is-live' : '') + (active ? ' active' : '') + '" onclick="selectMatch(' + idx + ')">' +
        '<div class="match-teams">' + teamsHtml + '</div>' +
        '<div class="match-time">' +
        (isLiveRow ? '<span class="match-live-dot"></span>LIVE' : lsEscape(lsFormatTime(m.date))) +
        '</div>' +
        '</div>';
    }).join('');
}

async function selectMatch(idx) {
    const match = lsState.matches[idx];
    if (!match) return;
    lsState.match = match;
    lsState.streams = [];
    lsState.streamIndex = 0;
    renderMatchList();
    renderMatchInfo(match);

    const infoEl = document.getElementById('ls-match-info');
    const selectEl = document.getElementById('stream-select');
    if (selectEl) selectEl.innerHTML = '<option value="0">LOADING STREAMS...</option>';
    setPlayerSrc('about:blank');
    if (infoEl) infoEl.insertAdjacentHTML('beforeend', '<div class="ad-warning" id="ls-stream-warning">LOADING STREAMS...</div>');

    let streams = [];
    const sources = (match.sources || []).slice();
    for (let i = 0; i < sources.length; i++) {
        try {
            const res = await lsFetchJSON(STREAMED_API + '/stream/' + encodeURIComponent(sources[i].source) + '/' + encodeURIComponent(sources[i].id));
            if (Array.isArray(res) && res.length) {
                streams = res;
                break;
            }
        } catch (err) { }
    }
    lsState.streams = streams;
    const warnEl = document.getElementById('ls-stream-warning');
    if (warnEl) warnEl.remove();

    if (selectEl) {
        if (!streams.length) {
            selectEl.innerHTML = '<option value="0">NO STREAMS</option>';
        } else {
            selectEl.innerHTML = streams.map(function (st, i) {
                return '<option value="' + i + '">STREAM ' + st.streamNo + ' - ' + lsEscape((st.language || 'UNKNOWN').toUpperCase()) + (st.hd ? ' (HD)' : '') + '</option>';
            }).join('');
        }
    }
    if (streams.length) {
        switchLiveStream(0);
    } else if (infoEl) {
        infoEl.insertAdjacentHTML('beforeend', '<div class="ad-warning">No streams available for this match yet. Try another source or check back later.</div>');
    }
}

function renderMatchInfo(match) {
    const infoEl = document.getElementById('ls-match-info');
    if (!infoEl || !match) return;
    const home = match.teams && match.teams.home;
    const away = match.teams && match.teams.away;
    const isLiveRow = lsState.sportId === 'live';
    infoEl.innerHTML =
    '<div class="ls-match-headline">' +
    (home ? '<img src="' + lsEscape(lsBadgeUrl(home.badge)) + '" onerror="this.style.display=\'none\'">' : '') +
    '<h1 class="ls-match-title">' + lsEscape(match.title || 'Live Match') + '</h1>' +
    (away ? '<img src="' + lsEscape(lsBadgeUrl(away.badge)) + '" onerror="this.style.display=\'none\'">' : '') +
    '</div>' +
    '<div class="ls-match-meta">' +
    (isLiveRow ? '<span class="match-live-dot"></span><span>LIVE</span><span>|</span>' : '') +
    '<span>' + lsEscape((match.category || '').toUpperCase()) + '</span>' +
    '<span>|</span>' +
    '<span>' + lsEscape(lsFormatTime(match.date)) + '</span>' +
    '</div>';
}

function lsCurrentEmbedUrl() {
    const st = lsState.streams[lsState.streamIndex];
    return st ? st.embedUrl : '';
}

function switchLiveStream(i) {
    lsState.streamIndex = Number(i) || 0;
    const url = lsCurrentEmbedUrl();
    if (url) setPlayerSrc(url);
}

function lsRefresh() {
    const url = lsCurrentEmbedUrl();
    if (url) setPlayerSrc(url);
}

function lsOpenLink() {
    const url = lsCurrentEmbedUrl();
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

