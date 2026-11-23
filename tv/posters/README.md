# Paramshanti TV — launch posters

Square posters for community posts: seven designs (2160 × 2160), each in English (`-en`) and Hindi (`-hi`), and an eighth made from a poster supplied by the mission.

| # | Poster | What it says |
|---|---|---|
| 1 | launch | Paramshanti TV is here: Bapuji on the television, 24×7, free |
| 2 | trio | Satsang, podcast, meditation: Bapuji, Anant Patel and Sakshi Patel |
| 3 | podcast | Bapuji and Anant Patel: 29 podcast series |
| 4 | meditation | Channel 09: meditate with Sakshi Patel |
| 5 | live | Live meditation every night at 10 PM IST |
| 6 | channels | 11 channels, 8 languages |
| 7 | phone | The TV on a phone, in three steps |
| 8 | now-launched | The supplied "Now launched" poster with the real photographs: Anant Patel, Brahma Maa, Bapuji, Neeru Maa and Sakshi Patel (1254 × 1254, English). `-trio` is the same with three people |

Every poster carries the short address `paramshantiblogs.org/tv`, which redirects to the TV page.

## Where the pictures come from

- Portraits of Anant Patel and Sakshi Patel: the profile pictures of their own YouTube channels.
- Portrait of Bapuji: the hero photograph on paramshantiblogs.org (mid-tones lowered slightly, nothing else changed).
- Pictures on the television screens: stills YouTube generates from the channel's own videos.
- The phone screen: a real screenshot of the TV page.

## Rebuilding

`src/posters.cjs` lays each poster out as HTML and photographs it with Playwright. It expects the Poppins and
JetBrains Mono font files from npm (`npm i @fontsource/poppins @fontsource/jetbrains-mono`) beside it, and the
folder served at `http://localhost:8766/`. `src/capture.cjs` retakes the phone screenshot.

Poster 8 is rebuilt with `python3 src/now-launched/compose.py` (add `trio` for the three-person version). It takes the
figures out of the supplied poster, lets the sky and light fill the space, places the real portraits (cut out with
`rembg`, model `birefnet-portrait`) and puts the badge, icon and name back on top untouched. The portraits of Brahma Maa
and Neeru Maa are the ones on the About page of paramshantiblogs.org.
