# परमशांति TV

A TV-style page for Bapuji's YouTube channels, made to sit at
[paramshantiblogs.org/tv](https://www.paramshantiblogs.org/tv). It is one self-contained
snippet for a Squarespace Code Block: no API key, no server, nothing else to host.

## What is on the page

The page is in English, set in the site's sans font, and has no header of its own: it starts with the television.

- **The TV** – a set with a bezel and a channel banner under the picture: channel number, logo and name,
  ON AIR, a clock, what is on NOW with a progress bar, and what is NEXT. The programme on air is worked
  out from the clock, so everyone who opens a channel sees the same video at the same point.
- **Channels** – 01 Hindi, 02 English, 03 Gujarati, 04 Telugu, 05 Bengali, 06 Marathi, 07 Kannada,
  08 Punjabi, 09 Meditation (Sakshi Patel), 10 Podcast (Anant) and 11 Maa ka Sandesh. The list shows each
  channel's number, logo and current programme. Changing channel gives a burst of static and the channel
  number in the corner of the screen. The last channel is remembered.
- **The remote** – CH down / up, sound, Live and Guide. "Back to TV", Previous and Next appear only while
  an on-demand video is playing. On a phone, swiping the channel banner sideways also changes channel.
- **Live** – a card that counts down to the daily 10 PM IST live meditation, opens the live stream at
  that hour, and offers the last live replay the rest of the day.
- **Search**, then rows: Latest videos, Live satsang, Most viewed, Shorts (tall viewer), and playlists
  grouped as Start here, Courses, Podcasts, More playlists. A playlist opens as a panel with all its
  videos and a "Play all" button.
- **Phones** – the block breaks out of the site's side gutters so the picture runs edge to edge, the
  channel list becomes a strip of tiles, and once sound is on a mini player follows you down the page.
- Nothing inside the page scrolls up and down on its own, so the mouse wheel always moves the page; rows
  move sideways by swipe, trackpad, arrow buttons, or dragging with the mouse.

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

## Tests

`tests/` drives the built page in a headless browser (Playwright):

- `flows.cjs` – every button and state on a desktop and a phone, with a stand-in for the YouTube player.
- `robust.cjs` – sound refused, autoplay refused, nothing plays, the player script blocked, storage blocked, links.
- `clock.cjs` – the schedule, the hand-over between programmes and the live card, against a fixed clock.
- `gestures.cjs` – finger swipes, mouse wheel, mouse dragging, arrows, keyboard, window resizing.
- `site.cjs` – the freshly built block swapped into the real published page (its Squarespace styles, real
  YouTube) at fifteen screen sizes. Nothing is published by the test.

The first four expect `paramshanti-tv.html` served at `http://localhost:8765/tv.html`
(`python3 -m http.server 8765` in a folder holding a copy named `tv.html`).

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
