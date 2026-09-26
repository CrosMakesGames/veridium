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

const SERVERS_FALLBACK = [
    {
        title: 'CMG Default',
        serverMovieLink: 'tvserver-1.crosmakesgames.com/embed/${movieId}',
        serverTvLink: 'tvserver-1.crosmakesgames.com/embed/${tvId}/${season}/${episode}'
    }
];

const HOST_DATA_CACHE_KEY = 'veridium_host_data_cache_v1';
const SERVERS_CACHE_KEY = 'veridium_servers_cache_v1';

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
            const raw = Array.isArray(window.VERIDIUM_SERVERS) ? window.VERIDIUM_SERVERS : [];
            const list = raw.filter(s => s && s.title && s.serverMovieLink && s.serverTvLink);
            let finalList = null;
            if (list.length) {
                finalList = list;
            } else {
                // File didn't make it in time - fall back to the cached copy
                // instead of breaking the player.
                const cached = readJSONCache(SERVERS_CACHE_KEY);
                const cachedList = (Array.isArray(cached) ? cached : [])
                    .filter(s => s && s.title && s.serverMovieLink && s.serverTvLink);
                if (cachedList.length) finalList = cachedList;
            }
            if (!finalList) finalList = SERVERS_FALLBACK;
            window.__veridiumServers = finalList;
            return finalList;
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
    if (typeof data.customFavicon === 'string' && data.customFavicon.trim()) faviconUrl = data.customFavicon.trim();
    else if (data.customFavicon === true && data.customFaviconLink) faviconUrl = data.customFaviconLink;
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
        backdrop: item.backdrop_path ? IMG_ORIGINAL + item.backdrop_path : POSTER_FALLBACK
    };
}

function showUrl(id, type, season, episode) {
    let url = 'player.html?id=' + encodeURIComponent(id) + '&type=' + encodeURIComponent(type);
    if (season) url += '&season=' + encodeURIComponent(season);
    if (episode) url += '&episode=' + encodeURIComponent(episode);
    return url;
}

function posterCard(item) {
    return '<a class="poster-card" href="' + showUrl(item.id, item.type) + '">' +
        '<img src="' + escapeHtml(item.poster) + '" loading="lazy" alt="" onerror=\'this.onerror=null;this.src=' + JSON.stringify(POSTER_FALLBACK) + ';\'>' +
        '</a>';
}

function databasePosterCard(item) {
    const href = showUrl(item.id, item.type);
    return '<a class="poster-card db-poster-card" href="' + href + '" aria-label="' + escapeHtml(item.title + (item.year ? ' (' + item.year + ')' : '')) + '">' +
        '<div class="db-poster-missing"><strong>' + escapeHtml(item.title || 'Untitled') + '</strong>' +
            (item.year ? '<small>' + escapeHtml(item.year) + '</small>' : '') + '</div>' +
        (item.poster && item.poster !== POSTER_FALLBACK
            ? '<img src="' + escapeHtml(item.poster) + '" loading="lazy" alt="" onerror="this.onerror=null;this.style.display=&quot;none&quot;;">'
            : '') +
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
const TMDB_CACHE_PREFIX = 'veridium_show_v3:';
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
        if (cached) return cached;
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
            episodes: {}
        };
        writeShowCache(id, type, details);
        return details;
    },

    getCollection: async (collectionId) => {
        const cached = readCollectionCache(collectionId);
        if (cached) return cached;
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
                poster: part.poster_path ? IMG_BASE + part.poster_path : POSTER_FALLBACK
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
            overview: ep.overview
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
    const slot = server || SERVERS_FALLBACK[0];
    if (!tmdbId) return '';
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
const REC_STATE = { items: [], page: 0 };

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

function renderRecommendedSection(items, grid) {
    const pager = document.getElementById('rec-pager');
    REC_STATE.items = items;
    const pageCount = Math.max(1, Math.ceil(items.length / REC_PAGE_SIZE));
    if (REC_STATE.page > pageCount - 1) REC_STATE.page = pageCount - 1;
    renderGrid(grid, items.slice(REC_STATE.page * REC_PAGE_SIZE, REC_STATE.page * REC_PAGE_SIZE + REC_PAGE_SIZE));
    renderSectionPager(pager, REC_STATE.page, pageCount, function (p) {
        REC_STATE.page = p;
        renderRecommendedSection(REC_STATE.items, grid);
    });
}

function renderContinueWatchingSection(history) {
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
    section.style.display = '';
    const pageCount = Math.max(1, Math.ceil(history.length / CW_PAGE_SIZE));
    if (cwPage > pageCount - 1) cwPage = pageCount - 1;
    renderContinueWatching(grid, history.slice(cwPage * CW_PAGE_SIZE, cwPage * CW_PAGE_SIZE + CW_PAGE_SIZE));
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


async function initHome() {
    const cwSection = document.getElementById('continue-watching-section');
    const cwGrid = document.getElementById('continue-watching-grid');
    const recSection = document.getElementById('recommended-section');
    const recGrid = document.getElementById('recommended-home-grid');
    const featuredGrid = document.getElementById('featured-grid');

    try {
        const history = await backfillHistoryGenres(loadHistory());
        renderContinueWatchingSection(history);
        if (history.length && recSection && recGrid) {
            const picks = await fetchHomeRecommended(history);
            if (picks.length) {
                recSection.style.display = '';
                renderRecommendedSection(picks, recGrid);
            }
        }
        const featured = await ShowService.fetchFeatured();
        const heroContainer = document.getElementById('hero-container');
        if (heroContainer) {
            await renderHeroSelection(heroContainer, featured);
        }
        if (featuredGrid) {
            if (featured.length) renderGrid(featuredGrid, featured);
            else featuredGrid.innerHTML = '<div class="ad-warning">Failed to load content. Refresh the page.</div>';
        }
    } catch (err) {
        if (featuredGrid) {
            featuredGrid.innerHTML = '<div class="ad-warning">Failed to load content. Refresh the page.</div>';
        }
    }
}

function heroBannerHtml(show) {
    const metaBits = [];
    if (show.rating) metaBits.push('<span class="gold">RATING ' + escapeHtml(show.rating) + '</span>');
    if (show.year) metaBits.push('<span>' + escapeHtml(show.year) + '</span>');
    return (
        '<div class="hero-banner">' +
            '<div class="hero-bg" style="background-image: url(\'' + escapeHtml(show.backdrop) + '\')"></div>' +
            '<div class="hero-fade"></div>' +
            '<div class="hero-content">' +
                '<div class="hero-tag">FEATURED ' + (show.type === 'movie' ? 'MOVIE' : 'TV SHOW') + '</div>' +
                '<h1 class="hero-title">' + escapeHtml(show.title) + '</h1>' +
                (metaBits.length ? '<div class="hero-meta">' + metaBits.join('<span>|</span>') + '</div>' : '') +
                '<p class="hero-desc">' + escapeHtml((show.summary || show.description) ? (show.summary || show.description).substring(0, 200) + '...' : '') + '</p>' +
                '<a class="btn-action" href="' + showUrl(show.id, show.type) + '">WATCH NOW</a>' +
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

function renderShowPage() {
    const show = state.show;
    const isMovie = show.type === 'movie';
    const layout = document.getElementById('show-root');

    const metaBits = [];
    if (show.rating) metaBits.push('<span class="gold">RATING ' + escapeHtml(show.rating) + '</span>');
    if (show.year) metaBits.push('<span>' + escapeHtml(show.year) + '</span>');
    if (!isMovie) metaBits.push('<span>' + escapeHtml(show.totalSeasons) + ' SEASONS</span>');

    const serverOptions = window.__veridiumServers.map(function (slot, i) {
        return '<option value="' + i + '"' + (i === state.serverIndex ? ' selected' : '') + '>' + escapeHtml(slot.title) + '</option>';
    }).join('');

    layout.innerHTML =
        '<a href="index.html" class="back-link">&lt; BACK</a>' +

        '<div class="ad-warning" style="margin-top:0;">' +
            'Streams are embedded from outside sources and may include ads. ' +
            'Use an ad blocker for the best experience. ' +
            '<a href="https://ublockorigin.com/" target="_blank" rel="noopener noreferrer">Get uBlock Origin</a>' +
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
                    '<button type="button" class="btn-secondary" onclick="playerAboutBlank()">OPEN IN ABOUT:BLANK</button>' +
                    '<div class="server-select-wrap">' +
                        '<span class="server-select-label">SERVER SELECTOR:</span>' +
                        '<select id="server-select" class="server-select" onchange="switchServer(this.value)">' + serverOptions + '</select>' +
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

function switchServer(value) {
    state.serverIndex = parseInt(value) || 0;
    playerRefresh();
}

function playNextEpisode() {
    const show = state.show;
    if (!show || show.type !== 'tv') return;
    const eps = show.episodes[state.season] || [];
    const current = state.episode ? Number(state.episode.number) : 0;
    const next = eps.find(function (ep) { return Number(ep.number) > current; });
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
            btn.textContent = 'END OF SERIES';
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
    state.episode = state.show.episodes[state.season][0] || { number: 1, title: 'Unavailable' };
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
        return '<div class="episode-item' + (isActive ? ' active' : '') + '" onclick="playEpisode(' + state.season + ', ' + idx + ')">' +
            '<div class="ep-num">' + ep.number + '</div>' +
            '<div class="ep-title">' + escapeHtml(ep.title) + '</div>' +
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
    renderStrip(grid, items);
}

// ============ COLLECTION (movie franchise) ============

function collectionCard(item, isCurrent) {
    const card = posterCard(item);
    return isCurrent ? card.replace('class="poster-card"', 'class="poster-card current"') : card;
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
            'Live sports streams are embedded from outside sources and may include ads. ' +
            'Use an ad blocker for the best experience. ' +
            '<a href="https://ublockorigin.com/" target="_blank" rel="noopener noreferrer">Get uBlock Origin</a>' +
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
