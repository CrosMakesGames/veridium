# Veridium

A multi-page streaming TV app built for anyone to fork this repo or just take the source code and make their own custom instance easily. Very easily customizable just by changing settings in instance-host-data.js.

## instance-host-data.js (yours to customize)

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
- `navbarLayout` - the buttons in the navbar. Options: `"Popular"`, `"Featured"`,
  `"Live Sports"`. Put them in any order, or remove entries - the navbar rebuilds
  itself from this list on the next refresh. The Veridium logo always links home,
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

- `index.html` - Continue Watching (up to 7 shows you opened, saved in localStorage
  with season/episode, hover a poster for the X to remove it), Recommended (7 picks
  based on the genres of what you've watched), then Featured. Continue Watching and
  Recommended only appear once you've opened a show or movie.
- `popular.html` - TMDB trending
- `featured.html` - hero + full featured grid
- `player.html` - player, description, Recommended below; TV gets season/episode
  selectors; movies get the full-width cinema
- `livesports.html` - live sports. Sidebar picks the sport (or LIVE NOW), match list
  below it. Remove the page's entry from
  `navbarLayout` if you don't want the button.
