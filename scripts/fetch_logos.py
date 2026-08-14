"""Fetch university logos into app/static/images/logos/<shortcode>.png.

Strategy, in order, per school:
  1. Wikipedia article images whose FILENAME both names the institution and says
     logo/crest/seal/emblem. This ordering matters: a university article's lead
     image is almost always a campus photograph ("University of Ghana, Balme
     Library.jpg"), and a bare "logo" keyword match picks up Commons-logo.svg,
     which sits in the external links of nearly every article.
  2. The institution's own apple-touch-icon, favicon.ico, or a logo referenced in
     its homepage markup (og:image / <link rel=icon> / <img ...logo...>).

Downloads are size-checked to reject photographs, then normalise to PNG.
Anything that fails is reported and simply left absent — the frontend falls back
to a generated monogram, so a missing file degrades gracefully rather than
breaking a card.

Requires `certifi` on python.org macOS builds, which ship without a CA bundle
(`pip install certifi`). It is a dev-time dependency of this script only and is
deliberately not in requirements.txt, since the app never fetches logos at runtime.

NOTE ON RIGHTS: university logos and crests are trademarked artwork. Many of the
images on Wikipedia are hosted under non-free "fair use" rationales scoped to
that article, and are not freely licensed for redistribution. Displaying a mark
to identify the institution it denotes (nominative use) is normal for a
directory, but review this before shipping commercially.

Usage:  python scripts/fetch_logos.py [--force]
"""
import json
import os
import re
import ssl
import sys
import time
import urllib.parse
import urllib.request

# python.org macOS builds ship without a CA bundle, so urllib fails SSL
# verification even where curl succeeds. Prefer certifi when it is installed.
try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CONTEXT = ssl.create_default_context()

USER_AGENT = (
    "EduPredictGhana/1.0 (Ghanaian university admission predictor; "
    "https://github.com/sharifaminuumar/university-admission-predictor)"
)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_DIR = os.path.join(REPO_ROOT, "app", "static", "images", "logos")

# shortcode -> (wikipedia article title, official site)
SCHOOLS = [
    ("ug",       "University of Ghana",                              "https://www.ug.edu.gh"),
    ("knust",    "Kwame Nkrumah University of Science and Technology", "https://www.knust.edu.gh"),
    ("ucc",      "University of Cape Coast",                         "https://www.ucc.edu.gh"),
    ("uew",      "University of Education, Winneba",                 "https://www.uew.edu.gh"),
    ("uds",      "University for Development Studies",               "https://www.uds.edu.gh"),
    ("upsa",     "University of Professional Studies",               "https://www.upsa.edu.gh"),
    ("uhas",     "University of Health and Allied Sciences",         "https://www.uhas.edu.gh"),
    ("umat",     "University of Mines and Technology",               "https://www.umat.edu.gh"),
    ("uenr",     "University of Energy and Natural Resources",       "https://www.uenr.edu.gh"),
    ("aamusted", "Akenten Appiah-Menka University of Skills Training and Entrepreneurial Development",
                                                                     "https://www.aamusted.edu.gh"),
    ("atu",      "Accra Technical University",                       "https://www.atu.edu.gh"),
    ("gctu",     "Ghana Communication Technology University",        "https://www.gctu.edu.gh"),
    ("ashesi",   "Ashesi University",                                "https://www.ashesi.edu.gh"),
    ("vvu",      "Valley View University",                           "https://www.vvu.edu.gh"),
]

TIMEOUT = 25
MIN_BYTES = 900          # anything smaller is almost certainly a placeholder or error page
IMAGE_MAGIC = {
    b"\x89PNG\r\n\x1a\n": "png",
    b"\xff\xd8\xff": "jpg",
    b"GIF87a": "gif",
    b"GIF89a": "gif",
    b"RIFF": "webp",
    b"\x00\x00\x01\x00": "ico",   # several .edu.gh sites only publish a favicon.ico
}


def get(url, accept=None):
    request = urllib.request.Request(url)
    request.add_header("User-Agent", USER_AGENT)
    if accept:
        request.add_header("Accept", accept)
    with urllib.request.urlopen(request, timeout=TIMEOUT, context=SSL_CONTEXT) as response:
        return response.read(), response.headers.get("Content-Type", "")


def detect_kind(blob):
    """Returns 'png'/'jpg'/'svg'/... or None when the bytes are not an image."""
    for magic, kind in IMAGE_MAGIC.items():
        if blob.startswith(magic):
            return kind
    head = blob[:400].lstrip().lower()
    if head.startswith(b"<?xml") or head.startswith(b"<svg"):
        return "svg"
    return None


def image_size(blob):
    """(width, height) for PNG/JPEG/GIF without pulling in Pillow. None if unknown."""
    if blob.startswith(b"\x89PNG\r\n\x1a\n") and len(blob) > 24:
        return int.from_bytes(blob[16:20], "big"), int.from_bytes(blob[20:24], "big")
    if blob.startswith((b"GIF87a", b"GIF89a")) and len(blob) > 10:
        return int.from_bytes(blob[6:8], "little"), int.from_bytes(blob[8:10], "little")
    if blob.startswith(b"\xff\xd8"):
        i = 2
        while i + 9 < len(blob):
            if blob[i] != 0xFF:
                i += 1
                continue
            marker = blob[i + 1]
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                return int.from_bytes(blob[i + 7:i + 9], "big"), int.from_bytes(blob[i + 5:i + 7], "big")
            i += 2 + int.from_bytes(blob[i + 2:i + 4], "big")
    return None


def looks_like_a_logo(blob):
    """Reject campus photography, which is what a university article's lead image
    usually is. Logos are small, roughly square-ish, and rarely multi-megapixel."""
    size = image_size(blob)
    if not size:
        return True, "unknown dimensions"
    width, height = size
    if width == 0 or height == 0:
        return False, "zero dimension"
    if width * height > 400_000:
        return False, f"{width}x{height} is photo-sized"
    if max(width, height) / min(width, height) > 3.2:
        return False, f"{width}x{height} aspect looks like a banner/photo"
    if max(width, height) < 48:
        return False, f"{width}x{height} too small to render at 40px"
    return True, f"{width}x{height}"


LOGO_WORDS = ("logo", "crest", "seal", "coat_of_arms", "coatofarms", "emblem", "shield", "arms")

# Wikipedia article chrome and national symbols. Without this, "logo" matches
# Commons-logo.svg — which sits in the external links of nearly every article —
# and every school ends up with the same Wikimedia logo.
BLOCKED = (
    "commons-logo", "commons_logo", "wikimedia", "wikidata", "wikisource", "wiktionary",
    "wikiquote", "wikibooks", "wikiversity", "wikinews", "wikispecies", "meta-wiki",
    "wikipedia", "portal", "flag_of", "flag of", "coat_of_arms_of_ghana",
    "coat of arms of ghana", "edit-", "ambox", "question_book", "symbol_", "red_pencil",
    "folder", "magnify", "increase", "decrease", "padlock", "office-book", "text_document",
)

STOPWORDS = {"university", "of", "and", "the", "for", "in", "at", "college", "studies", "ghana"}


def relevance_tokens(code, title):
    """Distinctive words that a genuine logo filename should contain, so a generic
    or unrelated image can't be mistaken for this school's mark."""
    tokens = {code.lower()}
    for word in title.lower().replace(",", " ").replace("-", " ").split():
        if len(word) > 3 and word not in STOPWORDS:
            tokens.add(word)
    # "University of Ghana" has no distinctive token once Ghana is a stopword,
    # so allow the bare name through for that shape of title.
    if len(tokens) == 1:
        tokens.add("ghana")
    return tokens


def wikipedia_logo_image(title, code):
    """Prefer an image whose filename says logo/crest/seal AND names the
    institution, over the article's lead image (usually a campus photo)."""
    query = urllib.parse.urlencode({
        "action": "query", "format": "json", "prop": "images", "imlimit": "200", "titles": title,
    })
    blob, _ = get("https://en.wikipedia.org/w/api.php?" + query, accept="application/json")
    pages = json.loads(blob.decode("utf-8")).get("query", {}).get("pages", {})

    tokens = relevance_tokens(code, title)
    candidates = []
    for page in pages.values():
        for image in page.get("images", []):
            name = image.get("title", "")
            lowered = name.lower()
            if not lowered.endswith((".png", ".jpg", ".jpeg", ".svg", ".gif")):
                continue
            if any(bad in lowered for bad in BLOCKED):
                continue
            if not any(token in lowered for token in tokens):
                continue
            if not any(word in lowered for word in LOGO_WORDS):
                # Relevance alone is not enough: campus photos are named after the
                # university too ("University of Ghana, Balme Library.jpg").
                continue
            # Prefer PNG/SVG over JPEG — logos are usually the former.
            rank = (0 if lowered.endswith((".png", ".svg")) else 1, len(lowered))
            candidates.append((rank, name))

    if not candidates:
        return None

    for _, name in sorted(candidates):
        info_query = urllib.parse.urlencode({
            "action": "query", "format": "json", "prop": "imageinfo",
            "iiprop": "url", "iiurlwidth": "512", "titles": name,
        })
        try:
            blob, _ = get("https://en.wikipedia.org/w/api.php?" + info_query, accept="application/json")
            info_pages = json.loads(blob.decode("utf-8")).get("query", {}).get("pages", {})
            for page in info_pages.values():
                for entry in page.get("imageinfo", []):
                    # thumburl rasterises SVGs for us; fall back to the original.
                    return entry.get("thumburl") or entry.get("url")
        except Exception:
            continue
    return None


def wikipedia_lead_image(title):
    url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(title.replace(" ", "_"))
    blob, _ = get(url, accept="application/json")
    data = json.loads(blob.decode("utf-8"))
    for key in ("originalimage", "thumbnail"):
        if data.get(key, {}).get("source"):
            return data[key]["source"]
    return None


def wikipedia_pageimage(title):
    query = urllib.parse.urlencode({
        "action": "query", "format": "json", "prop": "pageimages",
        "piprop": "original|thumbnail", "pithumbsize": "512", "titles": title,
    })
    blob, _ = get("https://en.wikipedia.org/w/api.php?" + query, accept="application/json")
    pages = json.loads(blob.decode("utf-8")).get("query", {}).get("pages", {})
    for page in pages.values():
        for key in ("original", "thumbnail"):
            if page.get(key, {}).get("source"):
                return page[key]["source"]
    return None


def site_logo_from_html(site):
    """Scrape the homepage for a declared logo: og:image, an icon <link>, or an
    <img> whose src/alt mentions a logo. Several .edu.gh sites publish no
    favicon at the conventional paths but do reference a real logo in markup."""
    try:
        blob, _ = get(site, accept="text/html")
    except Exception:
        return None

    html = blob.decode("utf-8", errors="ignore")
    candidates = []

    # <meta property="og:image" content="...">
    for match in re.finditer(r'<meta[^>]+(?:property|name)=["\']og:image["\'][^>]*>', html, re.I):
        url = re.search(r'content=["\']([^"\']+)["\']', match.group(0), re.I)
        if url:
            candidates.append(url.group(1))

    # <link rel="... icon ..." href="...">
    for match in re.finditer(r'<link[^>]+rel=["\'][^"\']*icon[^"\']*["\'][^>]*>', html, re.I):
        url = re.search(r'href=["\']([^"\']+)["\']', match.group(0), re.I)
        if url:
            candidates.append(url.group(1))

    # <img src="...logo..."> or <img alt="...logo...">
    for match in re.finditer(r"<img[^>]+>", html, re.I):
        tag = match.group(0)
        if "logo" not in tag.lower():
            continue
        url = re.search(r'src=["\']([^"\']+)["\']', tag, re.I)
        if url and not url.group(1).startswith("data:"):
            candidates.append(url.group(1))

    for raw in candidates:
        try:
            absolute = urllib.parse.urljoin(site, raw)
            blob, _ = get(absolute)
            if len(blob) >= MIN_BYTES and detect_kind(blob):
                usable, _reason = looks_like_a_logo(blob)
                if usable:
                    return blob
        except Exception:
            continue
    return None


def site_icon(site):
    """Best-effort: apple-touch-icon, favicon.ico, then whatever the HTML declares."""
    for path in ("/apple-touch-icon.png", "/apple-touch-icon-precomposed.png", "/favicon.ico"):
        try:
            blob, _ = get(site.rstrip("/") + path)
            if len(blob) >= MIN_BYTES and detect_kind(blob):
                return blob
        except Exception:
            continue
    return site_logo_from_html(site)


def fetch(code, title, site, force=False):
    target = os.path.join(LOGO_DIR, code + ".png")
    if os.path.exists(target) and os.path.getsize(target) >= MIN_BYTES and not force:
        return "skip", f"already present ({os.path.getsize(target)} bytes)"

    for label, resolver in (("wikipedia-logo", lambda t: wikipedia_logo_image(t, code)),):
        try:
            source = resolver(title)
            if not source:
                continue
            blob, _ = get(source)
            kind = detect_kind(blob)
            if not kind or len(blob) < MIN_BYTES:
                continue

            usable, reason = looks_like_a_logo(blob)
            if not usable:
                print(f"     {label}: rejected — {reason}")
                continue

            # Keep the .png filename contract even for non-PNG bytes; browsers
            # sniff content type, and the frontend only ever needs one path.
            with open(target, "wb") as handle:
                handle.write(blob)
            return "ok", f"{label} -> {kind} {reason}, {len(blob)} bytes"
        except Exception as exc:
            print(f"     {label} failed: {exc}")

    try:
        blob = site_icon(site)
        if blob:
            with open(target, "wb") as handle:
                handle.write(blob)
            return "ok", f"site-icon -> {detect_kind(blob)}, {len(blob)} bytes"
    except Exception as exc:
        print(f"     site-icon failed: {exc}")

    return "fail", "no usable image found"


def main():
    force = "--force" in sys.argv
    os.makedirs(LOGO_DIR, exist_ok=True)

    results = {"ok": [], "skip": [], "fail": []}
    for code, title, site in SCHOOLS:
        print(f"  {code:<9} ...", flush=True)
        status, detail = fetch(code, title, site, force)
        results[status].append(code)
        print(f"  {code:<9} {status.upper():<5} {detail}")
        time.sleep(0.4)  # be polite to the API

    print(f"\nfetched {len(results['ok'])}, skipped {len(results['skip'])}, failed {len(results['fail'])}")
    if results["fail"]:
        print("failed:", ", ".join(results["fail"]))
        print("Those schools fall back to the generated monogram in the UI.")


if __name__ == "__main__":
    main()
