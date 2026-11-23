#!/usr/bin/env python3
"""Paramshanti TV builder.

Reads the public YouTube pages saved by fetch.sh (no network here), builds the
video catalogue described in channels.json, and writes:

  paramshanti-tv.html     full standalone page (open it in a browser to preview)
  squarespace-embed.html  the same thing as one snippet for a Squarespace Code Block
  catalog.json            the catalogue on its own, for reference

Usage:  python3 build.py [cache_dir]      (cache_dir defaults to ./cache)
        python3 build.py --lists [cache]  print the playlist ids fetch.sh must download
"""
import json, re, sys, os, datetime, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
TITLE_MAX = 72


def initial(path):
    try:
        s = open(path, encoding="utf-8", errors="replace").read()
    except OSError:
        return {}
    m = re.search(r"var ytInitialData = (\{.*?\});</script>", s, re.S)
    return json.loads(m.group(1)) if m else {}


def walk(o, key, out):
    if isinstance(o, dict):
        for k, v in o.items():
            if k == key:
                out.append(v)
            else:
                walk(v, key, out)
    elif isinstance(o, list):
        for v in o:
            walk(v, key, out)
    return out


def txt(o):
    if o is None:
        return ""
    if isinstance(o, str):
        return o
    if "content" in o:
        return o["content"]
    if "simpleText" in o:
        return o["simpleText"]
    if "runs" in o:
        return "".join(r.get("text", "") for r in o["runs"])
    return ""


def secs(badges):
    for b in badges:
        if re.fullmatch(r"\d+(:\d\d){1,2}", b or ""):
            n = 0
            for part in b.split(":"):
                n = n * 60 + int(part)
            return n
    return 0


def clean(title):
    t = re.sub(r"\s+", " ", title or "").strip()
    t = re.sub(r"\s*[|｜]\s*Bapuji Dashrathbhai Patel\s*$", "", t, flags=re.I)
    t = t.strip(" |-–·")
    if len(t) > TITLE_MAX:
        t = t[: TITLE_MAX - 1].rstrip() + "…"
    return t


def items(d):
    """Every video / playlist card on a saved page, in page order."""
    out = []
    for lv in walk(d, "lockupViewModel", []):
        meta = lv.get("metadata", {}).get("lockupMetadataViewModel", {})
        badges = [txt(b.get("text")) for b in walk(lv.get("contentImage", {}), "thumbnailBadgeViewModel", [])]
        cover = ""
        for src in walk(lv.get("contentImage", {}), "sources", []):
            for s in src:
                m = re.search(r"/vi(?:_webp)?/([\w-]{11})/", s.get("url", ""))
                if m:
                    cover = m.group(1)
                    break
            if cover:
                break
        out.append({"id": lv.get("contentId"), "type": lv.get("contentType", "").replace("LOCKUP_CONTENT_TYPE_", ""),
                    "title": txt(meta.get("title")), "badges": badges, "cover": cover})
    for sv in walk(d, "shortsLockupViewModel", []):
        vid = (walk(sv, "reelWatchEndpoint", []) or [{}])[0].get("videoId")
        out.append({"id": vid, "type": "SHORT", "title": txt(sv.get("overlayMetadata", {}).get("primaryText")), "badges": [], "cover": vid})
    for key in ("playlistVideoRenderer", "videoRenderer", "gridVideoRenderer"):
        for vr in walk(d, key, []):
            out.append({"id": vr.get("videoId"), "type": "VIDEO", "title": txt(vr.get("title")),
                        "badges": [txt(vr.get("lengthText"))], "cover": vr.get("videoId")})
    seen, res = set(), []
    for it in out:
        if it["id"] and it["id"] not in seen:
            seen.add(it["id"])
            res.append(it)
    return res


class Catalog:
    def __init__(self, cache):
        self.cache = cache
        self.V = {}

    def page(self, *parts):
        return initial(os.path.join(self.cache, *parts))

    def videos(self, d, limit, keep_shorts=True):
        ids = []
        for it in items(d):
            if it["type"] not in ("VIDEO", "SHORT"):
                continue
            t = clean(it["title"])
            if not t or t in ("[Private video]", "[Deleted video]"):
                continue
            self.V.setdefault(it["id"], [t, secs(it["badges"])])
            ids.append(it["id"])
            if len(ids) >= limit:
                break
        return ids

    def playlists(self, d):
        res = []
        for it in items(d):
            if it["type"] not in ("PLAYLIST", "COURSE", "PODCAST"):
                continue
            n = 0
            for b in it["badges"]:
                m = re.match(r"([\d,]+)\s", b)
                if m:
                    n = int(m.group(1).replace(",", ""))
            res.append({"l": it["id"], "t": clean(it["title"]), "c": n, "cv": it["cover"], "ty": it["type"]})
        return res


def short_title(t):
    t = re.sub(r"\s*w/\s*Bapu\w*\s*&\s*Anant Patel\s*$", "", t, flags=re.I)
    t = re.sub(r"\s*[-–|]\s*(?:Spirituality|Spiritual Talk|Spiritual Quest|Explore|Revelation|Analysis)\s*$", "", t, flags=re.I)
    t = re.sub(r"\s+I\s*-?\s*$", "", t)
    t = re.sub(r"\s+I\s+", " · ", t)
    return t.strip(" -–|·*\"") or t


def build(cache):
    cfg = json.load(open(os.path.join(HERE, "channels.json"), encoding="utf-8"))
    cat = Catalog(cache)
    N, NO, NS, K = cfg["rowSize"], cfg["rowSizeOther"], cfg["shortsSize"], cfg["collectionPreview"]
    main_id = cfg["channels"][0]["id"]

    # every playlist of the main channel, from all the saved listing pages
    main_pl = {}
    for f in ("main_featured", "main_playlists", "main_playlists_lad", "main_podcasts", "main_playlists_dd"):
        for p in cat.playlists(cat.page(f + ".html")):
            main_pl.setdefault(p["l"], p)

    def collection(p, preview):
        ids = cat.videos(cat.page("pl", p["l"] + ".html"), preview) if preview else []
        cv = p.get("cv") or (ids[0] if ids else "")
        if not cv:  # podcasts carry custom square art, so borrow the first episode's thumbnail
            first = [it["id"] for it in items(cat.page("pl", p["l"] + ".html")) if it["type"] == "VIDEO"][:1]
            cv = first[0] if first else ""
        return {"l": p["l"], "t": short_title(p["t"]), "c": p["c"], "cv": cv, "ids": ids,
                "ty": {"COURSE": "c", "PODCAST": "p"}.get(p["ty"], "")}

    def std_rows(cid, n, main=False):
        s = cid[2:]
        rows = []
        spec = [("new", "UULF", "नए वीडियो", "Latest videos", n, 1),
                ("live", "UULV", "लाइव सत्संग एपिसोड" if main else "लाइव", "Live satsang" if main else "Live streams", n, 1),
                ("top", "UULP", "सबसे ज़्यादा देखे गए", "Most viewed", n, 0),
                ("shorts", "UUSH", "शॉर्ट्स", "Shorts", NS, 1)]
        for key, pre, hi, en, lim, sync in spec:
            ids = cat.videos(cat.page("ch", pre + s + ".html"), lim)
            if len(ids) < 4:
                continue
            row = {"k": key, "l": pre + s, "hi": hi, "en": en, "ids": ids}
            if sync:
                row["s"] = 1
            if key == "shorts":
                row["kind"] = "s"
            rows.append(row)
        return rows

    channels = []
    for i, c in enumerate(cfg["channels"]):
        ch = {"k": c["key"], "n": c["name"], "en": c["en"], "t": c["title"], "id": c["id"], "h": c["handle"], "R": [], "G": []}
        if c.get("live"):
            ch["live"] = c["live"]
        for av in walk(cat.page("ch", c["id"] + ".playlists.html"), "channelMetadataRenderer", []):
            for th in (av.get("avatar") or {}).get("thumbnails", [])[:1]:
                ch["a"] = re.sub(r"=s\d+", "=s88", th.get("url", ""))
        if c.get("main"):
            ch["R"] = std_rows(c["id"], N, main=True)
            used = set()
            for g in cfg["mainGroups"]:
                ex = set(g.get("exclude", []))
                named = [main_pl[l] for l in g.get("lists", []) if l in main_pl]
                typed = [p for p in main_pl.values() if p["l"] not in ex and p not in named
                         and (p["ty"] in g.get("types", []) or g.get("rest"))]
                picked = typed + named if g.get("listsLast") else named + typed
                picked = [p for p in picked if p["l"] not in used and p["c"] > 0]
                used.update(p["l"] for p in picked)
                ch["G"].append({"k": g["key"], "hi": g["hi"], "en": g["en"], "P": [collection(p, K) for p in picked]})
        elif c.get("custom") == "english":
            e = cfg["english"]
            for r in e["rows"]:
                ids = cat.videos(cat.page("pl", r["list"] + ".html"), N)
                ch["R"].append({"k": r["key"], "l": r["list"], "hi": r["hi"], "en": r["en"], "ids": ids, "s": 1})
            x = e.get("extraChannel")
            if x:
                ids = cat.videos(cat.page("ch", "UULF" + x[2:] + ".html"), NO)
                if ids:
                    ch["R"].append({"k": "audio", "l": "UULF" + x[2:], "hi": "ऑडियो बुक — अंग्रेज़ी", "en": "English audio books", "ids": ids})
        else:
            ch["R"] = std_rows(c["id"], NO)
            pls = [p for p in cat.playlists(cat.page("ch", c["id"] + ".playlists.html")) if p["c"] >= 3 and p["cv"]][:12]
            if pls:
                ch["G"].append({"k": "pl", "hi": "प्लेलिस्ट", "en": "Playlists", "P": [collection(p, 0) for p in pls]})
        channels.append(ch)

    # 24x7 programme wheel per channel: the long-form videos already in its rows, in a fixed shuffled order
    for ch in channels:
        pool = []
        for r in ch["R"]:
            if r.get("kind") == "s":
                continue
            for vid in r["ids"]:
                d = cat.V[vid][1]
                if 240 <= d <= 5400 and vid not in pool:
                    pool.append(vid)
        pool.sort(key=lambda v: hashlib.md5((ch["k"] + v).encode()).hexdigest())
        ch["tv"] = pool

    # drop videos nothing points at
    used = set()
    for ch in channels:
        used.update(ch["tv"])
        for r in ch["R"]:
            used.update(r["ids"])
        for g in ch["G"]:
            for p in g["P"]:
                used.update(p["ids"])
    V = {k: v for k, v in cat.V.items() if k in used}
    # the page is English only: drop the Hindi labels and native-script channel names it no longer shows
    for ch in channels:
        ch.pop("n", None)
        for r in ch["R"]:
            r.pop("hi", None)
        for g in ch["G"]:
            g.pop("hi", None)
            for p in g["P"]:
                p.pop("ty", None)
    return {"gen": datetime.date.today().isoformat(), "main": main_id, "V": V, "C": channels}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    cache = args[0] if args else os.path.join(HERE, "cache")
    if "--lists" in sys.argv:
        cat = Catalog(cache)
        seen = set()
        for f in ("main_featured", "main_playlists", "main_playlists_lad", "main_podcasts", "main_playlists_dd"):
            for p in cat.playlists(cat.page(f + ".html")):
                if p["l"] not in seen:
                    seen.add(p["l"])
                    print(p["l"])
        return
    data = build(cache)
    blob = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    open(os.path.join(HERE, "catalog.json"), "w", encoding="utf-8").write(json.dumps(data, ensure_ascii=False, indent=1))
    src = os.path.join(HERE, "src")
    css = open(os.path.join(src, "tv.css"), encoding="utf-8").read()
    body = open(os.path.join(src, "tv.html"), encoding="utf-8").read()
    # the logo artwork (made by logos/make.cjs) is kept once in the page and drawn wherever it appears
    body = body.replace("<!--logo-->", open(os.path.join(src, "logo.html"), encoding="utf-8").read().strip())
    js = open(os.path.join(src, "tv.js"), encoding="utf-8").read()
    safe = blob.replace("</", "<\\/")
    embed = ("<!-- Paramshanti TV · paste this whole snippet into one Squarespace Code Block (HTML) · built %s -->\n"
             "<style id=\"pstv-style\">\n%s\n</style>\n%s\n<script id=\"pstv-data\" type=\"application/json\">%s</script>\n<script id=\"pstv-script\">\n%s\n</script>\n"
             % (data["gen"], css, body, safe, js))
    open(os.path.join(HERE, "squarespace-embed.html"), "w", encoding="utf-8").write(embed)
    page = ("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
            "<title>Paramshanti TV</title>\n<style>html,body{margin:0;background:#fffdf8}.wrap{padding:0 6vw}@media(min-width:768px){.wrap{padding:0 4vw}}</style>\n</head>\n<body>\n<div class=\"wrap\">\n%s</div>\n</body>\n</html>\n" % embed)
    open(os.path.join(HERE, "paramshanti-tv.html"), "w", encoding="utf-8").write(page)
    nv = len(data["V"])
    print("videos in catalogue:", nv, "| channels:", len(data["C"]))
    for ch in data["C"]:
        hrs = sum(data["V"][v][1] for v in ch["tv"]) / 3600
        print("  %-4s rows=%d collections=%d tv=%d (%.1f h loop)" % (ch["k"], len(ch["R"]), sum(len(g["P"]) for g in ch["G"]), len(ch["tv"]), hrs))
    print("catalogue bytes:", len(blob.encode()), "| embed bytes:", len(embed.encode()))


if __name__ == "__main__":
    main()
