# Paramshanti TV — logo

The logo is the mission's own emblem (the burst of orange rays around the seated figure) with **PARAMSHANTI TV**
on one line beneath it: the name in the mission's magenta lettering, TV in the orange of the rays.

| File | Use |
|---|---|
| `paramshanti-tv-logo.svg` / `.png` | the logo, emblem above the name (transparent background) |
| `paramshanti-tv-logo-horizontal.svg` / `.png` | emblem beside the name, for narrow strips |
| `paramshanti-tv-logo-square.jpg` | on white with room around it, for profile pictures and posts |

Colours: orange `#F9A21B`, light gold `#FBC34B`, magenta `#FA02B9`.

On the TV page the logo sits on a white plate on the set's lower edge and again at the foot of the page.
The page keeps the artwork once (`../src/logo.html`) and draws it in both places.

## How it is made

- `source/` holds the two logo files the mission supplied (English and Hindi lettering).
- `trace.py` turns them into light vector artwork in `brand.json`: each of the 113 rays as a fitted leaf shape,
  the figure and both wordmarks as traced outlines. Needs `numpy`, `scipy`, `Pillow` and `potracer`.
- `tv-letters.json` holds the letters TV as outlines, set in Forum (SIL Open Font License), the typeface closest
  to the wordmark.
- `node make.cjs` writes the SVG files, the piece the page uses, and (with Playwright installed) the PNG and JPG copies.
