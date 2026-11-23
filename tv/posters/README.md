# Paramshanti TV — launch posters

Fourteen square posters (2160 × 2160) for community posts: seven designs, each in English (`-en`) and Hindi (`-hi`).

| # | Poster | What it says |
|---|---|---|
| 1 | launch | Paramshanti TV is here: Bapuji on the television, 24×7, free |
| 2 | trio | Satsang, podcast, meditation: Bapuji, Anant Patel and Sakshi Patel |
| 3 | podcast | Bapuji and Anant Patel: 29 podcast series |
| 4 | meditation | Channel 09: meditate with Sakshi Patel |
| 5 | live | Live meditation every night at 10 PM IST |
| 6 | channels | 11 channels, 8 languages |
| 7 | phone | The TV on a phone, in three steps |

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
