# Veridium

A multi-page streaming TV app built for anyone to fork this repo or just take the source code and make their own custom instance easily. Very easily customizable just by changing settings in instance-host-data.js.

## instance-host-data.js (yours to customize)

- `siteTitle` - the site title shown in the navbar (the first letter gets the accent
  color automatically). Default is `"Veridium"`.
- `useCustomTopPoster` - set `true` to pin the Home and Featured hero to `topPoster`.
  Set `false` to keep the random choice.
- `topPoster` - TMDB title to pin when enabled, for example `{ "id": 1434, "type": "tv" }`.
  This can be outside `featuredShows`; if unavailable, a random featured title is used.
- `superFeaturedShows` - the SUPER FEATURED hero carousel: a list of TMDB titles
  that rotate through the big hero on the Home and Featured pages, e.g.
  `[{ "id": 1434, "type": "tv" }, { "id": 278, "type": "movie" }]`.
  Two or more titles get the round indicators below the hero and auto-rotate;
  a single entry pins the hero; an empty list keeps normal behavior (random
  pick, or the `topPoster` pin above).
- `superFeaturedRotationMs` - how fast the hero carousel advances, in
  milliseconds. `8000` = every 8 seconds (minimum 2000). The whole track visibly swipes
  between titles; clicking a dot jumps to it and restarts the timer.
  `superFeaturedShows` also works on its own: an instance with only this list
  set (no `featuredShows`) still gets the carousel.
- `instanceHostFont` - font for the INSTANCE HOST text in the footer.
  `"Veridium title font"` is the default; set any font name to override.
- `instanceHostText` - what the footer says after "INSTANCE HOST:".
- `instanceHostClickable` - set to true and the INSTANCE HOST text becomes a link.
- `instanceHostLink` - the link that opens in a new window when the text is clicked.
- `customFavicon` - an image link, OR `true` to use `customFaviconLink` below. Empty/false = default favicon.
- `footerLinks` - up to 3 links shown in the footer. Each needs a `title` and a `url`.
  By default only the first one is filled in (Discord). If the array is empty (or left
  out), no custom links show - just crosmakesgames.com, which is always there.
- `customColorScheme` - any hex color (`#8B5CF6` or `#F50` shorthand). Recolors the whole
  theme including particles. Empty = default Veridium purple (#8B5CF6).
- `navbarLayout` - the buttons in the navbar. Options: `"Database"`, `"Featured"`,
  `"Live Sports"`. Put them in any order, or remove entries - the navbar rebuilds
  itself from this list on the next refresh. ("Popular" still works and now opens
  the Database page.) The Veridium logo always links home,
  so there is no HOME button. The player page keeps the section you came from
  lit (Database/Featured/Live Sports via the referring page), so its navbar
  matches the rest of the site.
- `featuredShows` - the list on the Home and Featured pages.
  These are featured shows. Its your instance, you can feature whatever you want.
  Each entry is `{ "id": <TMDB id>, "type": "tv" or "movie" }`.
  Comments (//) are allowed anywhere in the file.

## servers.js (stream slots)

10 slots total. Each filled slot shows up in the SERVER SELECTOR dropdown on the
player page. Fill a slot like this:

```js
{
    "title": "My Instance",
    "serverMovieLink": "myserver.example.com/embed/${movieId}",
    "serverTvLink": "myserver.example.com/embed/${tvId}/${season}/${episode}"
}
```

Variables: `${movieId}`, `${tvId}`, `${season}`, `${episode}` are filled in
automatically per title and per episode. 

## Pages

- `index.html` - Continue Watching (up to 28 shows you opened, saved in localStorage
  with season/episode, hover a poster for the X to remove it), Recommended (picks
  based on genres, TMDB keywords/themes, and writers/creators across all watched titles,
  with newer watches weighted more heavily), then Featured. Continue Watching and Recommended only appear once you've
  opened a show or movie. Both sections page through with the < > arrows above the
  last card (greyed out when there's no page to go to).
- `database.html` - the Database: TMDB trending by default, plus a search bar that
  finds any show or movie (results appear while typing; Enter searches immediately).
  Trending displays up to 50 unique titles, and missing artwork displays title and year
- `featured.html` - hero + full featured grid
- `player.html` - player, description, Recommended below; TV gets a NEXT
  EPISODE button in the season header (left of the season dropdown) that
  advances one episode, rolls into the next season's first episode at the
  end of a season (the season dropdown always tracks the season you land
  on), and flashes END OF SERIES on the finale; plus the
  season/episode selectors. Movies get the full-width cinema and, when they
  belong to a TMDB collection (a franchise like Harry Potter or the
  Avengers), a COLLECTION section under the player with every part in
  release order, the one you're watching highlighted; parts are fetched
  once and cached for a week. TV shows don't have collections on TMDB, so
  they get the usual layout.
Player/stream sync notes: setting the same stream twice never reloads
  the iframe, and the page watches the embedded player - if a server's own
  Next Episode button navigates the stream to another episode of the show
  (same-origin embeds are read directly every 1.5s and on iframe load;
  query/hash differences are ignored), the episode list, season dropdown
  and URL follow it without reloading the stream. A cooperating server can
  also postMessage `{type:'next-episode'}` or `{season, episode}` to the
  parent to advance or jump; messages are only accepted from the player
  frame itself. Cross-origin streams that navigate themselves silently
  stay out of sync (the browser blocks reading them) - nothing breaks.

- `livesports.html` - live sports. Sidebar picks the sport (or LIVE NOW), match list
  below it. Remove the page's entry from
  `navbarLayout` if you don't want the button.

## Mobile (phones)

style.css ships a full phone layout on top of the desktop one:

- `<=900px` tablet pass: tighter nav, smaller hero, 4-5 poster rows.
- `<=640px` phone pass: the navbar stacks into two rows (logo over a
  full-width segmented tab bar), grids go 3 posters per row, the player
  buttons become two-per-row 44px tap targets with the server picker on
  its own full-width row, the episode list caps at 400px, and the
  Database search input uses 16px text so iOS doesn't zoom on focus.
- `<=380px` small-phone pass: 2 posters per row, tighter nav text.
- Touch devices don't get the hover lift effects; the Continue Watching
  remove button is always visible (no hover on phones).
- `viewport-fit=cover` + safe-area padding handle notched/gesture phones.

The desktop layout is unchanged - everything above lives in media queries.

## Servers note

The default servers.js ships with 9 working embed providers verified in
October 2026: viduki (x3 slots incl. multi-language + premium), vidy.st,
vidfast.pro, vidlink.pro, vidrock.to, vidzee, and tvserver-1. Full https://
URLs are used so the app never has to guess the scheme.

## Home page layout (layout.conf)

The home page is configured in `layout.conf`: one section per line, top to
bottom. If the file is missing, the site falls back to a built-in order.

Section types:

- `super_featured` - the hero carousel
- `continue_watching` - the continue watching row
- `recommended_row` - recommended picks, as a row
- `recent_row` / `recent_group` - the 14 newest releases (new movie
  releases plus shows with a fresh episode in the last 20 days)
- `featured_row` - every featured title in one horizontal row with the
  two < > arrows
- `featured_group` - every featured title as a wrapping grid
- `top{N}_group` - the N highest rated titles on TMDB (e.g. `top21_group`);
  any number works
- `database_button` - "Can't find something?" strip with a Search Database
  button that links to database.html
- `backtotop` - "Couldn't find anything?" strip that smooth-scrolls to top
- `custom/{id}` - a custom section defined at the bottom of the file:

```
[custom/halloween]
title: Halloween & Horror
type: row
content: 1339713.movie, 66732.tv, 694.movie
```

`content` is a comma-separated list of TMDB ids as `{id}.movie` or `{id}.tv`.
`type` is `row` (arrow-scrolled strip) or `group` (wrapping grid).

Each section type renders at most once; unknown lines are ignored.

## Poster flags (showFlags in instance host)

`showFlags` in instance-host-data.js controls the small pills in the
top-right corner of each poster. Options:

- `recent` - new episode or release within the last 20 days
- `featured` - in this instance's featured list
- `acclaimed` - rating of 8.0+ on TMDB

Use an empty list `[]` to hide them all.
