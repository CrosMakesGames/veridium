// Select the servers for your instance.
// Up to 10 stream slots. Each filled slot shows up in the SERVER SELECTOR
// on the player page. Empty slots stay hidden.
// Variables: ${movieId}, ${tvId}, ${season}, ${episode}

window.VERIDIUM_SERVERS = [
    {
        "title": "Veridium Default",
        "serverMovieLink": "tvserver-1.crosmakesgames.com/embed/${movieId}",
        "serverTvLink": "tvserver-1.crosmakesgames.com/embed/${tvId}/${season}/${episode}"
    },
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null
];
