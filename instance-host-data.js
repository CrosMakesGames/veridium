window.VERIDIUM_HOST_DATA = {
    // Its your instance - customize it how you want.

    // The site title shown in the navbar. The first letter automatically gets
    // the accent color. Default is "Veridium".
    "siteTitle": "Veridium",

    // Top poster is the show always pinned. Default random out of feature list
    "useCustomTopPoster": false,
    "topPoster": { "id": 1434, "type": "tv" },

    // 1 or more shows that are in the pin spot and shows rotates. 
    "superFeaturedShows": [{ "id": 1339713, "type": "movie" },{"id": 1434, "type": "tv"}, {"id": 66732, "type": "tv"}, {"id": 1396, "type": "tv"},{ "id": 1405, "type": "tv" }, ],
    // How often the hero advances, in milliseconds (8000 = every 8s, minimum 2000).
    "superFeaturedRotationMs": 8000,


    // The font the INSTANCE HOST text uses in the footer.
    // "Veridium title font" is the default. 
    "instanceHostFont": "Veridium title font",
    "instanceHostText": "CrosMakesGames",

    // Set to true and the INSTANCE HOST text becomes a link to the instanceHostLink.
    "instanceHostClickable": true,
    "instanceHostLink": "https://crosmakesgames.com",


    "customFavicon": "false",
    // Only used when "customFavicon" is set to true.
    // If you change the color scheme it will auto update the favicon.
    "customFaviconLink": "",

    // Custom color scheme put any color here (like #FF5500 for orange).
    // Leave empty for the default Veridium purple (#8B5CF6).
    "customColorScheme": "",

    // Navbar Layout - the buttons that show up in the navbar from left to right. You can rearrange or remove but theser are your options:
    "navbarLayout": [
        "Database",
        "Featured",
        "Live Sports"
    ],

    // Up to footer links. Each needs a "title" and a "url".
    // Note that you can change links but it will always say crosmakesgames.com to the side. You could remove it in the HTML but please don't.
    "footerLinks": [
        {
            "title": "Discord",
            "url": "https://discord.gg/5dTP5SbafH"
        }
    ],

    // These are featured shows. Its your instance, you can feature whatever you want.
    "featuredShows": [
        { "id": 1434, "type": "tv" },       // Family Guy
        { "id": 66732, "type": "tv" },      // Stranger Things
        { "id": 1396, "type": "tv" },       // Breaking Bad
        { "id": 97546, "type": "tv" },      // Ted Lasso
        { "id": 507089, "type": "movie" },  // Five Nights at Freddy's
        { "id": 1405, "type": "tv" },       // Dexter
        { "id": 95557, "type": "tv" },      // Invincible
        { "id": 2604, "type": "tv" },        // The Boondocks
        { "id": 1408, "type": "tv" },       // House M.D.
        { "id": 1402, "type": "tv" },       // The Walking Dead
        { "id": 245927, "type": "tv" },     // Paradise
        { "id": 1317288, "type": "movie" }, // Marty Supreme
        { "id": 100088, "type": "tv" },     // The Last of Us
        { "id": 76479, "type": "tv" },      // The Boys
        { "id": 60059, "type": "tv" },      // Better Call Saul
        { "id": 106379, "type": "tv" },     // Fallout
        { "id": 105248, "type": "tv" },     // Cyberpunk: Edgerunners
        { "id": 60625, "type": "tv" },      // Rick and Morty
        { "id": 1100, "type": "tv" },        // How I Met Your Mother
        { "id": 71694, "type": "tv" },      // Snowfall
        { "id": 63174, "type": "tv" },       // Lucifer
        { "id": 198178, "type": "tv" },     // Wonder Man
        { "id": 250307, "type": "tv" },     // The Pitt
        { "id": 687163, "type": "movie" },  // Project Hail Mary
        { "id": 124364, "type": "tv" },     // FROM
        { "id": 93405, "type": "tv" },       // Squid Game
        { "id": 119051, "type": "tv" },     // Wednesday
        { "id": 246, "type": "tv" },         // Avatar: The Last Airbender
        { "id": 1339713, "type": "movie" }, // Obsession
        { "id": 1083381, "type": "movie" }, // Backrooms
        { "id": 604079, "type": "movie" },   // The Long Walk
        { "id": 936075, "type": "movie" },         // Michael
        { "id": 37799, "type": "movie" }, // The Social Network
        { "id": 13, "type": "movie" },      // Forrest Gump
        { "id": 424694, "type": "movie" },   // Bohemian Rhapsody
    ]
};



// ==== BOOT: makes this file available instantly on every page. Don't edit. ====
// Caches the data (localStorage) so fast page switching never waits on this
// file, and pings app.js the moment the data is ready.
(function () {
    try {
        localStorage.setItem('veridium_host_data_cache_v1', JSON.stringify(window.VERIDIUM_HOST_DATA));
    } catch (err) {}
    try {
        window.dispatchEvent(new CustomEvent('veridium-host-data-ready'));
    } catch (err) {}
})();
