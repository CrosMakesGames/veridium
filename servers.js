// Select the servers for your instance.
// Up to 10 stream slots. Each filled slot shows up in the SERVER SELECTOR
// on the player page. Empty slots stay hidden.
// Variables: ${movieId}, ${tvId}, ${season}, ${episode}
//
// All links below were verified working (October 2026) for both movies
// and TV, using the same embed providers the big streaming frontends use.
// The color parameter can be set to any hex color to recolor each player.

window.VERIDIUM_SERVERS = [
    {
        "title": "vidy.st",
        "serverMovieLink": "https://vidy.st/movie/${movieId}?overlay=true",
        "serverTvLink": "https://vidy.st/tv/${tvId}/${season}/${episode}?overlay=true&episodeSelector=false&nextEpisode=false&autoplayNextEpisode=false"
    },
    {
        "title": "viduki-1",
        "serverMovieLink": "https://www.viduki.net/1/movie/${movieId}",
        "serverTvLink": "https://www.viduki.net/1/tv/${tvId}/${season}/${episode}"
    },
    {
        "title": "vidfast.pro",
        "serverMovieLink": "https://vidfast.pro/movie/${movieId}?autoPlay=true&title=true&poster=true",
        "serverTvLink": "https://vidfast.pro/tv/${tvId}/${season}/${episode}?autoPlay=true&title=true&poster=true&nextButton=false&autoNext=false"
    },
    {
        "title": "vidlink.pro",
        "serverMovieLink": "https://vidlink.pro/movie/${movieId}?title=true&poster=true&autoplay=true&nextbutton=false",
        "serverTvLink": "https://vidlink.pro/tv/${tvId}/${season}/${episode}?title=true&poster=true&autoplay=true&nextbutton=false"
    },
    {
        "title": "vidrock.to",
        "serverMovieLink": "https://vidrock.to/movie/${movieId}?autoplay=true&autonext=false&download=false&nextbutton=false&episodeselector=false",
        "serverTvLink": "https://vidrock.to/tv/${tvId}/${season}/${episode}?autoplay=true&autonext=false&download=false&nextbutton=false&episodeselector=false"
    },
    {
        "title": "vidzee",
        "serverMovieLink": "https://player.vidzee.wtf/embed/movie/${movieId}",
        "serverTvLink": "https://player.vidzee.wtf/embed/tv/${tvId}/${season}/${episode}"
    },
    {
        "title": "viduki-multi",
        "serverMovieLink": "https://www.viduki.net/2/movie/${movieId}",
        "serverTvLink": "https://www.viduki.net/2/tv/${tvId}/${season}/${episode}"
    },
    {
        "title": "viduki-premium",
        "serverMovieLink": "https://www.viduki.net/4/movie/${movieId}",
        "serverTvLink": "https://www.viduki.net/4/tv/${tvId}/${season}/${episode}"
    },
    {
        "title": "tvserver-1",
        "serverMovieLink": "https://tvserver-1.crosmakesgames.com/embed/${movieId}",
        "serverTvLink": "https://tvserver-1.crosmakesgames.com/embed/${tvId}/${season}/${episode}"
    },
    null
];


// ==== BOOT: makes this file available instantly on every page. Don't edit. ====
(function () {
    try {
        localStorage.setItem('veridium_servers_cache_v3', JSON.stringify(window.VERIDIUM_SERVERS));
    } catch (err) {}
    try {
        window.dispatchEvent(new CustomEvent('veridium-servers-ready'));
    } catch (err) {}
})();
