// Select the servers for your instance.
// This file is the single source of truth for the SERVER SELECTOR on the
// player page: edit it, push, and the selector updates on the next visit.
// Up to 10 stream slots. Each filled slot shows up in the selector.
// Empty slots stay hidden.
// Variables: ${movieId}, ${tvId}, ${season}, ${episode}
//
// Viduki's 3 servers are back at the top (all verified working Oct 20 2026).
// English dub by default and correct TMDB episode order.

window.VERIDIUM_SERVERS = [
    {
        "title": "viduki-1",
        "serverMovieLink": "https://viduki.net/1/movie/${movieId}",
        "serverTvLink": "https://viduki.net/1/tv/${tvId}/${season}/${episode}"
    },
{
    "title": "viduki-2",
    "serverMovieLink": "https://viduki.net/2/movie/${movieId}",
    "serverTvLink": "https://viduki.net/2/tv/${tvId}/${season}/${episode}"
},
{
    "title": "viduki-3",
    "serverMovieLink": "https://viduki.net/3/movie/${movieId}",
    "serverTvLink": "https://viduki.net/3/tv/${tvId}/${season}/${episode}"
},
{
    "title": "vidy.st",
    "serverMovieLink": "https://vidy.st/movie/${movieId}?overlay=true",
    "serverTvLink": "https://vidy.st/tv/${tvId}/${season}/${episode}?overlay=true&episodeSelector=false&nextEpisode=false&autoplayNextEpisode=false"
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
    "title": "tvserver-1",
    "serverMovieLink": "https://tvserver-1.crosmakesgames.com/embed/${movieId}",
    "serverTvLink": "https://tvserver-1.crosmakesgames.com/embed/${tvId}/${season}/${episode}"
},
null
];


// ==== BOOT: announces the list to the page. Don't edit. ====
(function () {
    try {
        window.dispatchEvent(new CustomEvent('veridium-servers-ready'));
    } catch (err) {}
})();
