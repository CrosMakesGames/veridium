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

let serversPromise = null;

function loadServers() {
    if (!serversPromise) {
        serversPromise = Promise.resolve().then(function () {
            const raw = Array.isArray(window.VERIDIUM_SERVERS) ? window.VERIDIUM_SERVERS : [];
            const list = raw.filter(s => s && s.title && s.serverMovieLink && s.serverTvLink);
            const finalList = list.length ? list : SERVERS_FALLBACK;
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
        hostDataPromise = Promise.resolve().then(function () {
            const data = window.VERIDIUM_HOST_DATA || {};
            const merged = {
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
            const finalData = merged.featuredShows.length ? merged : HOST_DATA_FALLBACK;
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

function applyHostData() {
    const data = window.__veridiumHostData || HOST_DATA_FALLBACK;
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

function renderStrip(container, items) {
    container.innerHTML = items.map(posterCard).join('');
}

function renderGrid(container, items) {
    container.innerHTML = items.map(posterCard).join('');
}

const ShowService = {
    fetchTrending: async () => {
        const promises = [1, 2, 3].map(page =>
            fetch(TMDB_BASE + '/trending/all/week?api_key=' + TMDB_API_KEY + '&page=' + page).then(r => r.json())
        );
        const results = await Promise.all(promises);
        const combined = results.flatMap(res => res.results || []);
        return combined.map(normalizeTMDB).filter(i => i !== null).slice(0, 49);
    },

    fetchFeatured: async () => {
        const hostData = await loadHostData();
        const list = hostData.featuredShows;
        const promises = shuffleList(list).map(item => ShowService.getDetails(item.id, item.type));
        const results = await Promise.all(promises);
        return results.filter(item => item && item.id);
    },

    getDetails: async (id, type) => {
        const res = await fetch(TMDB_BASE + '/' + type + '/' + id + '?api_key=' + TMDB_API_KEY);
        const data = await res.json();
        if (!data || data.success === false) return null;
        const year = (data.release_date || data.first_air_date || '').split('-')[0] || '';
        const hasRating = typeof data.vote_average === 'number' && data.vote_average > 0;
        return {
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
            episodes: {}
        };
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
    frame.src = url;
}

async function getCurrentEmbedUrl() {
    if (!state.show) return '';
    const servers = await loadServers();
    const slot = servers[state.serverIndex] || servers[0];
    if (!slot) return '';
    if (state.show.type === 'movie') {
        return getEmbedUrl(slot, state.show.tmdbId, 'movie');
    }
    return getEmbedUrl(slot, state.show.tmdbId, 'tv', state.season, state.episode ? state.episode.number : 1);
}

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
const HISTORY_LIMIT = 7;

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
            const card = btn.closest('.cw-card');
            if (card) card.remove();
            if (!container.querySelector('.cw-card')) {
                const section = container.closest('.content-section');
                if (section) section.style.display = 'none';
            }
        });
    });
}

// Shared renderer: shows the bar (or a clear warning) on any page that has it.
function renderContinueWatchingSection(history) {
    const section = document.getElementById('continue-watching-section');
    const grid = document.getElementById('continue-watching-grid');
    if (!section || !grid) return;
    if (!historyStorage) {
        section.style.display = '';
        grid.innerHTML = '<div class="ad-warning">Continue Watching is unavailable - this browser is blocking site storage.</div>';
        return;
    }
    if (!history.length) return;
    section.style.display = '';
    renderContinueWatching(grid, history);
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
    const missing = history.filter(function (e) { return !e.genres || !e.genres.length; });
    if (!missing.length) return history;
    const details = await Promise.all(missing.map(function (e) {
        return ShowService.getDetails(e.id, e.type).catch(function () { return null; });
    }));
    const list = loadHistory();
    let changed = false;
    details.forEach(function (d, i) {
        const target = missing[i];
        const entry = list.find(function (x) { return x.id === target.id && x.type === target.type; });
        if (!entry) return;
        if (d && Array.isArray(d.genres) && d.genres.length) {
            entry.genres = d.genres.slice();
            changed = true;
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

async function fetchHomeRecommended(history) {
    history = await backfillHistoryGenres(history);
    const counts = {};
    history.forEach(e => (e.genres || []).forEach(g => { counts[g] = (counts[g] || 0) + 1; }));
    const topGenres = Object.keys(counts)
        .map(Number)
        .sort((a, b) => counts[b] - counts[a])
        .slice(0, 2);
    const watched = new Set(history.map(e => e.type + ':' + e.id));
    const pool = [];
    const push = function (item) {
        if (!item) return;
        if (watched.has(item.type + ':' + item.id)) return;
        if (pool.some(p => p.id === item.id && p.type === item.type)) return;
        pool.push(item);
    };
    const requests = [];
    const requestTypes = [];
    ['tv', 'movie'].forEach(function (t) {
        const genreList = genresForType(topGenres, t);
        if (!genreList.length) return;
        requestTypes.push(t);
        requests.push(
            fetch(TMDB_BASE + '/discover/' + t + '?api_key=' + TMDB_API_KEY +
                    '&sort_by=popularity.desc&with_genres=' + genreList.join('|') +
                    '&vote_count.gte=50&page=1')
                .then(r => r.json())
                .catch(function () { return {}; })
        );
    });
    const results = await Promise.all(requests);
    results.forEach(function (res, idx) {
        const type = requestTypes[idx];
        (res.results || []).forEach(function (raw) {
            push(normalizeTMDB(Object.assign({}, raw, { media_type: type })));
        });
    });
    if (pool.length < 7) {
        try {
            const trending = await ShowService.fetchTrending();
            trending.forEach(push);
        } catch (err) { }
    }
    return shuffleList(pool).slice(0, 7);
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
                renderGrid(recGrid, picks);
            }
        }
        const featured = await ShowService.fetchFeatured();
        const heroContainer = document.getElementById('hero-container');
        if (heroContainer && featured.length) {
            renderHero(heroContainer, featured[Math.floor(Math.random() * featured.length)]);
        }
        if (featuredGrid) renderGrid(featuredGrid, featured);
    } catch (err) {
        if (featuredGrid) {
            featuredGrid.innerHTML = '<div class="ad-warning">Failed to load content. Refresh the page.</div>';
        }
    }
}

function renderHero(container, show) {
    if (!show) return;
    const metaBits = [];
    if (show.rating) metaBits.push('<span class="gold">RATING ' + escapeHtml(show.rating) + '</span>');
    if (show.year) metaBits.push('<span>' + escapeHtml(show.year) + '</span>');
    container.innerHTML =
        '<div class="hero-banner">' +
            '<div class="hero-bg" style="background-image: url(\'' + escapeHtml(show.backdrop) + '\')"></div>' +
            '<div class="hero-fade"></div>' +
            '<div class="hero-content">' +
                '<div class="hero-tag">FEATURED ' + (show.type === 'movie' ? 'MOVIE' : 'TV SHOW') + '</div>' +
                '<h1 class="hero-title">' + escapeHtml(show.title) + '</h1>' +
                (metaBits.length ? '<div class="hero-meta">' + metaBits.join('<span>|</span>') + '</div>' : '') +
                '<p class="hero-desc">' + escapeHtml(show.summary ? show.summary.substring(0, 200) + '...' : '') + '</p>' +
                '<a class="btn-action" href="' + showUrl(show.id, show.type) + '">WATCH NOW</a>' +
            '</div>' +
        '</div>';
}

async function initPopular() {
    const grid = document.getElementById('popular-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="ad-warning">LOADING...</div>';
    try {
        const items = await ShowService.fetchTrending();
        renderGrid(grid, items);
    } catch (err) {
        grid.innerHTML = '<div class="ad-warning">Failed to load content. Refresh the page.</div>';
    }
}

async function initFeatured() {
    const heroContainer = document.getElementById('hero-container');
    const grid = document.getElementById('featured-grid');
    if (!grid) return;
    try {
        const items = await ShowService.fetchFeatured();
        if (heroContainer && items.length) {
            const hero = items[Math.floor(Math.random() * items.length)];
            renderHero(heroContainer, hero);
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
                    '<select id="season-select" class="season-select" onchange="changeSeason(this.value)">' +
                        Array.from({ length: show.totalSeasons }, function (_, i) { return i + 1; }).map(function (s) {
                            return '<option value="' + s + '"' + (s === state.season ? ' selected' : '') + '>SEASON ' + s + '</option>';
                        }).join('') +
                    '</select>' +
                '</div>' +
                '<div id="episodes-scroll" class="episodes-scroll"></div>' +
            '</div>') +
        '</div>' +

        '<h2 class="section-title toned">Recommended</h2>' +
        '<div id="recommended-grid" class="tv-grid rec-grid"></div>';

    playerRefresh();
    if (!isMovie) renderEpisodeList();
}

function switchServer(value) {
    state.serverIndex = parseInt(value) || 0;
    playerRefresh();
}

async function changeSeason(season) {
    state.season = parseInt(season);
    if (!state.show.episodes[state.season]) {
        const container = document.getElementById('episodes-scroll');
        if (container) container.innerHTML = '<div style="padding:20px; color:var(--purple-neon); text-align:center; font-family:\'JetBrains Mono\', monospace;">LOADING...</div>';
        const eps = await ShowService.getSeasonEpisodes(state.show.id, state.season);
        state.show.episodes[state.season] = eps;
    }
    state.episode = state.show.episodes[state.season][0] || { number: 1, title: 'Unavailable' };
    renderEpisodeList();
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
    loadHostData().then(applyHostData);
    renderNavbar();
    if (page === 'home') initHome();
    else if (page === 'popular') initPopular();
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
    'Popular': { href: 'popular.html', page: 'popular' },
    'Featured': { href: 'featured.html', page: 'featured' },
    'Live Sports': { href: 'livesports.html', page: 'livesports' }
};
const NAV_DEFAULT_LAYOUT = ['Popular', 'Featured', 'Live Sports'];

function renderNavbar() {
    const navRight = document.getElementById('nav-right');
    if (!navRight) return;
    const raw = (window.VERIDIUM_HOST_DATA && Array.isArray(window.VERIDIUM_HOST_DATA.navbarLayout))
        ? window.VERIDIUM_HOST_DATA.navbarLayout
        : NAV_DEFAULT_LAYOUT;
    const layout = raw.filter(function (name) {
        return typeof name === 'string' && Object.prototype.hasOwnProperty.call(NAV_ITEMS, name.trim());
    }).map(function (name) { return name.trim(); });

    const currentPage = document.body.getAttribute('data-page');
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
        '<a href="index.html" class="back-link">&lt; BACK</a>' +

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
