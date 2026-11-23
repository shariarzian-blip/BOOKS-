#!/usr/bin/env bash
# Downloads the public YouTube pages that build.py reads. No API key and no login:
# these are the same pages a browser shows. Run from this folder:  ./fetch.sh && python3 build.py
set -euo pipefail
cd "$(dirname "$0")"
CACHE="${1:-cache}"
rm -rf "$CACHE"; mkdir -p "$CACHE/pl" "$CACHE/ch"
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
get() { curl -sS -m 40 -A "$UA" -H "Accept-Language: en-US,en;q=0.9" -H "Cookie: SOCS=CAI; CONSENT=YES+1" -o "$1" "$2" || echo "failed: $2" >&2; sleep 0.4; }

MAIN=$(python3 -c "import json;print(json.load(open('channels.json'))['channels'][0]['handle'])")
B="https://www.youtube.com/$MAIN"
get "$CACHE/main_featured.html"      "$B/featured"
get "$CACHE/main_playlists.html"     "$B/playlists"
get "$CACHE/main_playlists_lad.html" "$B/playlists?view=1&sort=lad"
get "$CACHE/main_playlists_dd.html"  "$B/playlists?view=1&sort=dd"
get "$CACHE/main_podcasts.html"      "$B/podcasts"

# every channel: newest videos, live streams, shorts, most viewed, and its playlists
for c in $(python3 -c "
import json; c=json.load(open('channels.json'))
ids=[x['id'] for x in c['channels']]+[c['english'].get('extraChannel')]
print(' '.join(dict.fromkeys(i for i in ids if i)))"); do
  for p in UULF UULV UUSH UULP; do get "$CACHE/ch/$p${c:2}.html" "https://www.youtube.com/playlist?list=$p${c:2}"; done
  get "$CACHE/ch/$c.playlists.html" "https://www.youtube.com/channel/$c/playlists"
done

# every playlist of the main channel, plus the ones named for the English channel
for l in $(python3 build.py --lists "$CACHE") $(python3 -c "import json;print(' '.join(r['list'] for r in json.load(open('channels.json'))['english']['rows']))"); do
  [ -s "$CACHE/pl/$l.html" ] || get "$CACHE/pl/$l.html" "https://www.youtube.com/playlist?list=$l"
done
echo "saved $(find "$CACHE" -name '*.html' | wc -l) pages in $CACHE/"
