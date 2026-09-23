# Veridium

A multi-page streaming TV app built for anyone to fork this repo or just take the source code and make their own custom instance easily. Very easily customizable just by changing settings in instance-host-data.js.

## instance-host-data.js (yours to customize)

- `siteTitle` - the site title shown in the navbar (the first letter gets the accent
  color automatically). Default is `"Veridium"`.
- `useCustomTopPoster` - set `true` to pin the Home and Featured hero to `topPoster`.
  Set `false` to keep the random choice.
- `topPoster` - TMDB title to pin when enabled, for example `{ "id": 1434, "type": "tv" }`.
  This can be outside `featuredShows`; if unavailable, a random featured title is used.
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
  so there is no HOME button.
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
- `player.html` - player, description, Recommended below; TV gets season/episode
  selectors; movies get the full-width cinema
- `livesports.html` - live sports. Sidebar picks the sport (or LIVE NOW), match list
  below it. Remove the page's entry from
  `navbarLayout` if you don't want the button.
