# परमशांति TV

A TV-style page for Bapuji's YouTube channels, made to sit at
[paramshantiblogs.org/tv](https://www.paramshantiblogs.org/tv). It is one self-contained
snippet for a Squarespace Code Block: no API key, no server, nothing else to host.

## What is on the page

- **24×7 TV** – a round-the-clock channel. The programme on air is worked out from the clock,
  so everyone who opens the page sees the same video at the same point, with a programme guide
  (now / next, in the viewer's local time) beside the screen.
- **Channels** – हिंदी, English, ગુજરાતી, తెలుగు, বাংলা, मराठी, ಕನ್ನಡ, ਪੰਜਾਬੀ, plus ध्यान (Sakshi Patel),
  पॉडकास्ट (Anant) and माँ का संदेश. Changing channel changes the 24×7 stream and every row below.
- **Live** – a card that counts down to the daily 10 PM IST live meditation, opens the live
  stream at that hour, and offers the last live replay the rest of the day.
- **Rows** – New additions, Live satsang episodes, Most viewed, Shorts (vertical viewer),
  then playlists grouped as Start here, Courses, Podcasts, Films / audio books / songs.
  A playlist opens as a panel with all its videos and a "Play all" button.
- **Search**, share links (`?v=<video id>&ch=<channel>`), a mini player that follows you down
  the page, and a हिंदी / EN switch for the page's own labels.

## How it stays current without an API key

The snippet carries a snapshot of the catalogue (`catalog.json`, about 460 videos with titles
and durations) so the page paints instantly. After it loads, a hidden YouTube player is asked
for the current contents of each "uploads" playlist, any videos newer than the snapshot are
added to the front of their row, and their titles come from YouTube's public oEmbed endpoint.
Playlists are read the same way when they are opened. The 24×7 schedule itself uses only the
snapshot, because it needs durations; rebuild now and then to freshen it.

## Putting it on Squarespace

1. Open the `tv` page in the editor, add a **Code** block (HTML, "Display source" off).
2. Paste the whole of `squarespace-embed.html` and save.
3. Give the section full width and no extra padding; the block brings its own.

Scripts do not run inside the Squarespace editor, so the block looks empty until the page is
saved and viewed. `paramshanti-tv.html` is the same snippet wrapped as a full page; opened
straight from disk the layout works but YouTube refuses to play (it wants a real web address).

## Rebuilding

```bash
./fetch.sh
```

```bash
python3 build.py
```

`fetch.sh` saves the public YouTube pages into `cache/` (not committed); `build.py` reads them
and rewrites `catalog.json`, `squarespace-embed.html` and `paramshanti-tv.html`.

- `channels.json` – the channel line-up, row sizes, and which playlists go in which group.
  Add or remove a channel here.
- `src/tv.css`, `src/tv.html`, `src/tv.js` – the page itself. Everything is scoped to `.pstv`.

YouTube lists at most 100 videos per page without paging, so each row's snapshot is the newest
(or most viewed) slice; the rest is reached through "Show more", which asks YouTube live.
