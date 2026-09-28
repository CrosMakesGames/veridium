// Select the servers for your instance.
// Up to 10 stream slots. Each filled slot shows up in the SERVER SELECTOR
// on the player page. Empty slots stay hidden.
// Variables: ${movieId}, ${tvId}, ${season}, ${episode}

window.VERIDIUM_SERVERS = [
    {
        "title": "viduki-1",
        "serverMovieLink": "viduki.net/1/movie/${movieId}",
        "serverTvLink": "viduki.net/1/tv/${tvId}/${season}/${episode}"
    },
    //https://www.viduki.net/1/tv/95350/1/1
    {
        "title": "tvserver-1",
        "serverMovieLink": "tvserver-1.crosmakesgames.com/embed/${movieId}",
        "serverTvLink": "tvserver-1.crosmakesgames.com/embed/${tvId}/${season}/${episode}"
    },
    {
        "title": "vidsrcme-1",
        "serverMovieLink": "vidsrcme.sh/embed/${movieId}",
        "serverTvLink": "vidsrcme.sh/embed/${tvId}/${season}/${episode}"
    },
    {
        "title": "vidsrcme-2",
        "serverMovieLink": "vidsrcme.ru/embed/${movieId}",
        "serverTvLink": "vidsrcme.ru/embed/${tvId}/${season}/${episode}"
    },
    null,
    null,
    null,
    null,
    null,
    null,
    null
];


// ==== BOOT: makes this file available instantly on every page. Don't edit. ====
(function () {
    try {
        localStorage.setItem('veridium_servers_cache_v1', JSON.stringify(window.VERIDIUM_SERVERS));
    } catch (err) {}
    try {
        window.dispatchEvent(new CustomEvent('veridium-servers-ready'));
    } catch (err) {}
})();
