#!/usr/bin/env python3
"""Turns the Bank Clerk Master File (a Notion page saved as markdown) into
data/playbook/playbook.json, the file the Playbook tab reads.

    python3 tools/playbook_import.py            # from arena_dashboard/
    python3 tools/playbook_import.py SOURCE.md DATA_DIR

It does two jobs:
  1. cuts the page into modules -> sections -> cards (archetypes, drills ...)
  2. matches every question ID the page mentions (PYQ-AGE-13, S-MT64-59,
     G-two-person-9 ...) to the real question in data/<bank>/questions.json,
     so the app can open those questions directly.
Nothing but the standard library. Safe to re-run; it only rewrites playbook.json.
"""
import json, os, re, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
_IN = os.path.join(HERE, "..", "data")              # the data committed inside the repo (the one copy)
_OUT = os.path.join(HERE, "..", "..", "data")      # old layout: data beside the repo
DATA = sys.argv[2] if len(sys.argv) > 2 else (_IN if os.path.isdir(_IN) else _OUT)
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DATA, "playbook", "source.md")
OUT = os.path.join(DATA, "playbook", "playbook.json")

# ------------------------------------------------------------------ blocks
def read_lines(path):
    t = open(path, encoding="utf-8").read()
    m = re.search(r"<content>\n?(.*)</content>", t, re.S)
    return (m.group(1) if m else t).split("\n")

LIST = re.compile(r"^(\t*)(-|\d+\.) (.*)$")

def to_blocks(lines):
    """Notion markdown -> a flat list of blocks: h, p, ul/ol, table, hr."""
    out, i, n = [], 0, len(lines)
    while i < n:
        raw = lines[i]
        s = raw.strip()
        if not s:
            i += 1; continue
        if s.startswith("<table"):
            rows, row = [], None
            i += 1
            while i < n and lines[i].strip() != "</table>":
                c = lines[i].strip()
                if c == "<tr>": row = []
                elif c == "</tr>": rows.append(row)
                else:
                    m = re.match(r"<td>(.*)</td>$", c, re.S)
                    if m and row is not None: row.append(m.group(1).strip())
                i += 1
            i += 1
            if rows: out.append({"t": "table", "rows": rows})
            continue
        m = re.match(r"^(#{1,6}) (.*)$", s)
        if m:
            out.append({"t": "h", "l": len(m.group(1)), "x": m.group(2).strip()}); i += 1; continue
        if s == "---":
            out.append({"t": "hr"}); i += 1; continue
        m = LIST.match(raw)
        if m:
            items = []
            while i < n:
                m = LIST.match(lines[i])
                if not m: break
                depth, mark, text = len(m.group(1)), m.group(2), m.group(3)
                items.append((depth, mark != "-", text))
                i += 1
            out.extend(nest(items))
            continue
        out.append({"t": "p", "x": s}); i += 1
    return out

def nest(items):
    """(depth, ordered, text) rows -> list blocks, children under their parent."""
    def build(pos, depth):
        blocks, cur = [], None
        while pos < len(items):
            d, ordered, text = items[pos]
            if d < depth: break
            if d > depth:
                sub, pos = build(pos, d)
                if cur: cur["items"][-1].setdefault("sub", []).extend(sub)
                else: blocks.extend(sub)
                continue
            kind = "ol" if ordered else "ul"
            if cur is None or cur["t"] != kind:
                cur = {"t": kind, "items": []}; blocks.append(cur)
            cur["items"].append({"x": text}); pos += 1
        return blocks, pos
    return build(0, items[0][0])[0]

# ---------------------------------------------------------------- structure
def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

KINDS = [("core", r"core mental|basic type"), ("arch", r"^archetypes"), ("drills", r"drill"),
         ("cheat", r"cheat"), ("ladder", r"practice ladder"), ("verify", r"verification"),
         ("index", r"pattern index")]
def kind_of(title):
    t = title.lower()
    for k, rx in KINDS:
        if re.search(rx, t): return k
    return "more"

def split_at(blocks, level):
    """[(heading text or None, blocks under it)] cut at headings of `level`."""
    parts, cur = [], (None, [])
    for b in blocks:
        if b["t"] == "h" and b["l"] == level:
            parts.append(cur); cur = (b["x"], [])
        else: cur[1].append(b)
    parts.append(cur)
    return parts

def relevel(blocks, base):
    for b in blocks:
        if b["t"] == "h": b["l"] = max(1, b["l"] - base)
    return blocks

OPT = re.compile(r"\(([A-E])\)\s*")
def split_options(text):
    """'30 (B) 35 (C) 40' or '(A) 30 (B) 35' -> (text before, {a:..}) or None."""
    if not re.search(r"\(B\)", text) or not re.search(r"\(C\)", text): return None
    parts = OPT.split(text)
    head, opts = parts[0].strip(), {}
    if "(A)" not in text:
        opts["a"], head = head, ""
    for j in range(1, len(parts) - 1, 2):
        opts[parts[j].lower()] = parts[j + 1].strip()
    return (head, opts) if len(opts) >= 4 else None

def plain(b):
    if b["t"] == "p": return b["x"]
    if b["t"] in ("ul", "ol"): return " ".join(i["x"] for i in b["items"])
    return ""

def parse_drill(title, blocks):
    """A drill card: what you read, the question(s) with options, and the
    method, which stays hidden until you have answered."""
    d = {"title": title, "body": [], "qs": [], "method": []}
    seen_q = False
    for b in blocks:
        txt = plain(b)
        mq = re.match(r"\*\*Q(\d+)\.?\*\*\.?\s*(.*)$", txt) if b["t"] == "p" else None
        if mq and not d["method"]:
            so = split_options(mq.group(2))
            if so:
                d["qs"].append({"n": int(mq.group(1)), "stem": so[0], "options": so[1], "answer": ""})
                seen_q = True; continue
        if not seen_q and not d["method"]:
            one = b["t"] == "p" or (b["t"] == "ol" and len(b["items"]) == 1 and not b["items"][0].get("sub"))
            so = split_options(txt) if one else None
            if so and len(so[0]) < 4:
                d["qs"].append({"n": 1, "stem": "", "options": so[1], "answer": ""})
                seen_q = True; continue
            if so:                                    # question and options on one line
                d["qs"].append({"n": 1, "stem": so[0], "options": so[1], "answer": ""})
                seen_q = True; continue
        (d["method"] if seen_q else d["body"]).append(b)
    alltext = " ".join(json.dumps(b, ensure_ascii=False) for b in d["method"])
    if len(d["qs"]) == 1:
        m = re.search(r"Answer:?\*{0,2}:?\s*\(([A-E])\)", alltext) or re.search(r"Answer[^.]{0,12}\(([A-E])\)", alltext)
        if m: d["qs"][0]["answer"] = m.group(1)
    for q in d["qs"]:
        if q["answer"]: continue
        m = re.search(r"Q%d:?\s*\(([A-E])\)" % q["n"], alltext)
        if m: q["answer"] = m.group(1)
    if not d["qs"]:
        d["body"], d["method"] = [], []
        hit = False
        for b in blocks:
            if not hit and re.search(r"\*\*(Conventional|Fast|30-second|Method|Answer)", plain(b)): hit = True
            (d["method"] if hit else d["body"]).append(b)
    return d

LABELS = ["Confirmed", "Seen once", "Bank only", "Excluded"]
def parse_arch_title(t):
    m = re.match(r"^([A-Z]{1,3}\d{1,2}[a-z]?)[.:]\s*(.*?)(?:\s*\(([^()]*)\)\s*)?$", t)
    if not m: return {"title": t}
    code, name, lab = m.groups()
    out = {"code": code, "title": name.strip()}
    if lab:
        if any(lab.startswith(x) for x in LABELS): out["label"] = lab
        else: out["title"] = "%s (%s)" % (name.strip(), lab)
    return out

ARCH_P = re.compile(r"^\*\*([A-Z]{1,3}\d{1,2}[a-z]?)\.\s*(.*?)\*\*\s*(.*)$", re.S)
def arch_cards(items):
    """Later modules write an archetype as one paragraph under a "Core" or
    "Insurance" heading: **W1. Name. Confirmed.** *Pattern clues:* ... Cut each
    into its own card, one line per part, so every module reads the same way."""
    if any(it.get("code") for it in items): return items, []
    out, loose = [], []
    for grp in items:
        g = "Insurance" if "insurance" in grp["title"].lower() else "Core"
        for b in grp["blocks"]:
            m = ARCH_P.match(b["x"]) if b["t"] == "p" else None
            if not m:
                (out[-1]["blocks"] if out and b["t"] != "p" else loose).append(b); continue
            code, head, rest = m.groups()
            head = head.strip().rstrip(".")
            lm = re.search(r"(?:^|\.\s+)((?:Confirmed|Seen once|Bank only).*)$", head)
            it = {"code": code, "title": (head[:lm.start()] if lm else head).strip().rstrip("."), "group": g, "blocks": []}
            if lm: it["label"] = lm.group(1).strip()
            elif g == "Insurance": it["label"] = "Bank only"
            parts = re.split(r"\*([A-Z][^*\n]{2,90}?):\*\s*", rest)
            if parts[0].strip(): it["blocks"].append({"t": "p", "x": parts[0].strip()})
            for j in range(1, len(parts) - 1, 2):
                it["blocks"].append({"t": "p", "x": "**%s.** %s" % (parts[j].strip(), parts[j + 1].strip())})
            out.append(it)
    return (out, loose) if out else (items, [])

def build_module(title, blocks, part, hlevel):
    """hlevel: the heading level of the module title in the source."""
    name = re.sub(r"^Module \d+:\s*", "", title)
    name = re.sub(r"\s*-\s*Speed Mastery Module$", "", name).strip()
    mod = {"id": slug(name), "part": part, "title": name, "sections": [], "codes": {}}
    parts = split_at(blocks, hlevel + 1)
    lead = parts[0][1]
    if lead: mod["sample"] = relevel(lead, hlevel)
    for head, bl in parts[1:]:
        stitle = re.sub(r"^\d+\.\s*", "", head)
        sec = {"kind": kind_of(stitle), "title": stitle}
        if sec["kind"] == "index" and ":" in stitle: sec["title"] = "Pattern index"
        subs = split_at(bl, hlevel + 2)
        if sec["kind"] in ("arch", "drills", "index") and len(subs) > 1:
            sec["lead"] = relevel(subs[0][1], hlevel + 1)
            sec["items"] = []
            pending = None
            for h, sb in subs[1:]:
                sb = relevel(sb, hlevel + 2)
                if sec["kind"] == "drills": sec["items"].append(parse_drill(h, sb))
                elif sec["kind"] == "arch":
                    it = parse_arch_title(h); it["blocks"] = sb
                    sec["items"].append(it)
                else:
                    sec["items"].append({"title": h, "blocks": sb})
        else:
            sec["blocks"] = relevel(bl, hlevel + 1)
        if sec["kind"] == "arch" and sec.get("items"):
            sec["items"], loose = arch_cards(sec["items"])
            if loose: sec["tail"] = loose
        mod["sections"].append(sec)
    # the archetype table: code -> name, label
    for sec in mod["sections"]:
        if sec["kind"] not in ("arch", "index"): continue
        for b in (sec.get("lead") or sec.get("blocks") or []):
            if b["t"] != "table" or not b["rows"] or b["rows"][0][0].strip().lower() != "code": continue
            head = [c.lower() for c in b["rows"][0]]
            for r in b["rows"][1:]:
                c = mod["codes"].setdefault(r[0].strip(), {})
                c.setdefault("name", r[1] if len(r) > 1 else "")
                for col, key in (("label", "label"), ("group", "group"), ("method", "method")):
                    if col in head and len(r) > head.index(col) and r[head.index(col)]:
                        c.setdefault(key, r[head.index(col)])
        for it in sec.get("items") or []:
            if it.get("code"):
                c = mod["codes"].setdefault(it["code"], {})
                c.setdefault("name", it["title"])
                if it.get("label"): c.setdefault("label", it["label"])
    return mod

def build(lines):
    blocks = to_blocks(lines)
    tops = split_at(blocks, 1)
    book = {"version": 1, "title": "Bank Clerk Playbook", "parts": [], "modules": []}
    part = None
    for head, bl in tops[1:]:
        if head.startswith("Part "):
            pname = head.split(":", 1)[1].strip()
            part = {"id": slug(pname.split()[0]), "name": pname, "modules": [], "intro": []}
            book["parts"].append(part)
            subs = split_at(bl, 2)
            mods = [(h, sb) for h, sb in subs[1:] if h.startswith("Module ")]
            if not mods:                                  # Part A: modules are the next h1s
                for h, sb in subs[1:]: part["intro"].append({"t": "h", "l": 2, "x": h}); part["intro"].extend(sb)
                part["intro"] = subs[0][1] + part["intro"]
                continue
            part["intro"] = [b for b in subs[0][1] if b["t"] != "hr"]
            for h, sb in subs[1:]:
                if h.startswith("Module "):
                    m = build_module(h, sb, part["id"], 2)
                else:
                    m = {"id": slug(h), "part": part["id"], "title": h.split(":")[0], "codes": {},
                         "sections": [{"kind": "index", "title": h, "blocks": relevel(sb, 2)}], "ref": True}
                book["modules"].append(m); part["modules"].append(m["id"])
        elif part and "Speed Mastery Module" in head:
            m = build_module(head, bl, part["id"], 1)
            book["modules"].append(m); part["modules"].append(m["id"])
        elif part is None and head:
            book["about"] = [b for b in bl if b["t"] == "p"]
    # a reasoning module filed under Quant in the source belongs with the reasoning ones
    rz = next((p for p in book["parts"] if p["id"].startswith("reason")), None)
    for m in book["modules"]:
        if rz and m["title"].startswith("Reasoning:") and m["part"] != rz["id"]:
            for p in book["parts"]:
                if m["id"] in p["modules"]: p["modules"].remove(m["id"])
            m["part"] = rz["id"]; m["title"] = m["title"].split(":", 1)[1].strip()
            rz["modules"].insert(max(0, len(rz["modules"]) - 1), m["id"])
    for p in book["parts"]:
        p["intro"] = [b for b in p["intro"] if b["t"] != "hr"]
    return book

# ---------------------------------------------------------------- the IDs
TOKEN = re.compile(r"\b(PYQ|CON|SIS|SBI|RRB|PO)(?:-[A-Z]{2,4})?-\d+\b|\bS-MT\d+-\d+\b|\bG-[a-z0-9][a-z0-9-]*-\d+\b")

def expand(text):
    """'G-after-1, 2, 10 · S-MT46-69 to 73 · CON-AGE-01, 06' -> every full ID."""
    out, prefix, width = [], None, 0
    text = re.sub(r"\([^)]*\)", "", text)
    text = re.sub(r"^\s*[A-Z]{1,3}\d{1,2}[a-z]?(?: to [A-Z]{1,3}\d{1,2})?\s*:\s*", "", text)
    for seg in re.split(r"\s*[·;]\s*", text):
        prefix = None
        for piece in re.split(r"\s*,\s*", seg):
            piece = piece.strip().rstrip(".")
            if re.match(r"^MT\d+-\d+", piece): piece = "S-" + piece
            m = re.match(r"^((?:[A-Z]{1,4}(?:-[A-Z]{2,4})?-|S-MT\d+-|G-[a-z0-9-]*?-))(\d+)(?:\s+to\s+(\d+))?$", piece)
            if m:
                prefix, a, b = m.group(1), m.group(2), m.group(3)
                width = len(a) if a.startswith("0") else 0
            else:
                m = re.match(r"^(\d+)(?:\s+to\s+(\d+))?$", piece)
                if not m or not prefix: continue
                a, b = m.group(1), m.group(2)
            for v in range(int(a), int(b or a) + 1):
                out.append(prefix + (str(v).zfill(width) if width else str(v)))
    return out

def norm(s):
    s = re.sub(r"\bCI\b", "compound interest", re.sub(r"\bSI\b", "simple interest", s))
    s = s.lower().replace("&", " and ")
    s = re.sub(r"\bset\s*-?\s*\d+\b|\bprelims\b|\bnew\b|\(.*?\)", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    stop = {"based", "on", "the", "of", "and", "or", "a", "an", "in", "for", "with", "to"}
    return [w.rstrip("s") for w in s.split() if w not in stop]

class Banks:
    def __init__(self, data):
        self.ok = {}
        self.clerk, self.sree, self.gsets, self.gq = {}, {}, {}, set()
        try:
            for q in json.load(open(os.path.join(data, "clerk", "questions.json"), encoding="utf-8")):
                sid = (q.get("source") or {}).get("id")
                if sid: self.clerk[sid] = "%s#%s" % (q["set"], q["q_no"])
            self.ok["clerk"] = True
        except OSError: pass
        try:
            for q in json.load(open(os.path.join(data, "sreedhar", "questions.json"), encoding="utf-8")):
                s = q.get("source") or {}
                if s.get("model_test") is not None:
                    self.sree["S-MT%s-%s" % (s["model_test"], s.get("qno"))] = "%s#%s" % (q["set"], q["q_no"])
            self.ok["sreedhar"] = True
        except OSError: pass
        try:
            self.gsets = json.load(open(os.path.join(data, "guidely", "sets.json"), encoding="utf-8"))
            for q in json.load(open(os.path.join(data, "guidely", "questions.json"), encoding="utf-8")):
                self.gq.add("%s#%s" % (q["set"], q["q_no"]))
            self.ok["guidely"] = True
        except OSError: pass

    def guidely_set(self, code, name, hint):
        """The Guidely set a code stands for: its long name (from the module's
        own code list) or the code itself, matched against set titles and slugs."""
        want = norm(name or code.replace("-", " "))
        if not want: return None
        hintw = set(norm(hint))
        best, score, tie = None, 0, False
        for sl, meta in self.gsets.items():
            if (meta.get("section") or "") != "Quant": continue
            have = set(norm(meta.get("subtopic") or meta.get("title") or "")) | set(norm(sl.replace("-", " ")))
            hit = sum(1 for w in want if w in have)
            if hit < len(want): continue
            topicw = set(norm(meta.get("topic") or ""))
            sc = 10 + (5 if hintw & topicw else 0) - 0.1 * len(have - set(want) - topicw)
            if sc > score + 1e-9: best, score, tie = sl, sc, False
            elif abs(sc - score) < 1e-9: tie = True
        return None if tie else best

TOPIC_HINT = {"ages": "ages", "simple-compound-interest": "si ci interest compound", "percentages": "percentage",
              "partnership": "partnership", "time-work": "time work pipes cistern",
              "speed-time-distance": "time speed distance trains", "profit-loss": "profit loss",
              "boat-stream": "boats stream", "mixtures-alligations": "mixture alligation",
              "simplification": "simplification approximation"}

# Short codes the page uses without spelling them out, by module: the start of
# the Guidely set's own name in data/guidely/sets.json.
TW, PC, PL = "time-and-work-based-on-", "pipes-and-cistern-based-on-", "profit-and-loss-based-on-"
ALIAS = {
    "time-work": {
        "cap": PC + "capacity", "io": PC + "inlet-outlet", "leak": PC + "leakage", "npipe": PC + "n-number-pipes",
        "ptime": PC + "time-based", "p2io": PC + "two-pipes-inlet-or-inlet-outlet", "pvar": PC + "variables",
        "pinc": PC + "increased-and-decreased", "peff": PC + "efficiency", "pmisc": PC + "miscellaneous",
        "p3": PC + "three-pipes", "p23": PC + "two-pipes-and-three-pipes",
        "mvw": TW + "men-vs-women-set", "mwc": TW + "men-vs-women-vs-children", "wmisc": TW + "miscellaneous",
        "wpct": TW + "percentage", "w3": TW + "three-persons", "w2": TW + "two-person", "weff": TW + "efficiency",
        "wfrac": TW + "fraction", "winc": TW + "increased-decreased", "ind": TW + "individual-person",
        "wrat": TW + "ratio", "wvar": TW + "variable-days", "cp": TW + "certain-people",
        "grp": TW + "group-of-men-women-children", "mh": TW + "man-hours-and-days", "lj": TW + "man-leaving-joining",
        "alt": TW + "alternative-days", "bc": TW + "before-completion", "chain": TW + "chain-rule",
        "wage": TW + "wages", "twice": TW + "twice-thrice-n-times",
    },
    "profit-loss": {
        "cp-sp": PL + "cost-and-selling-price", "cpx-spy": PL + "cost-price-of-x-chairs", "disc-pl": PL + "discount-price-and-profit-and-loss",
        "incr-price": PL + "actual-and-increased-price", "no-pl": PL + "neither-profit-nor-loss", "succ-disc": PL + "successive-discount",
    },
    "boat-stream": {"speed-change": "boats-and-stream-based-on-speed-increased-and-decreased"},
    "mixtures-alligations": {"alligation": "mixture-and-allegation-based-on-allegation-method",
                             "one-vessel": "mixture-and-allegation-based-on-one-vessel",
                             "vessels": "mixture-and-allegation-based-on-more-than-one-vessel"},
    "percentages": {"inc1": "percentage-based-on-increase-or-decrease", "inc2": "percentage-based-on-increases-and-decreases",
                    "pp": "percentage-based-on-percentage-of-percentage"},
}

def walk_text(node, fn):
    if isinstance(node, dict):
        for k, v in node.items():
            if k in ("x", "title", "stem") and isinstance(v, str): fn(v)
            else: walk_text(v, fn)
    elif isinstance(node, list):
        for v in node:
            if isinstance(v, str): fn(v)
            else: walk_text(v, fn)

def link_ids(book, banks):
    ids, stats = {}, collections.Counter()
    for mod in book["modules"]:
        gcodes = {}
        def grab(t):
            m = re.search(r"Guidely set codes?[^:=]*:\s*(.*)$", t)
            if m:
                for part in re.split(r";\s*", m.group(1)):
                    mm = re.match(r"\s*([a-z0-9-]+)\s*=\s*(.+?)\.?\s*$", part)
                    if mm: gcodes[mm.group(1)] = mm.group(2)
        walk_text(mod, grab)
        gcache = {}
        def resolve(i):
            if i in ids: return
            if i.startswith("S-MT"):
                k = banks.sree.get(i)
                if k: ids[i] = ["sreedhar", k]
            elif i.startswith("G-"):
                m = re.match(r"G-(.+)-(\d+)$", i)
                code, n = m.group(1), m.group(2)
                key = mod["id"] + "/" + code
                if key not in gcache:
                    pre = ALIAS.get(mod["id"], {}).get(code)
                    hit = [sl for sl in banks.gsets if sl.startswith(pre)] if pre else []
                    gcache[key] = hit[0] if len(hit) == 1 else banks.guidely_set(
                        code, gcodes.get(code), TOPIC_HINT.get(mod["id"], mod["title"]))
                s = gcache[key]
                if s and ("%s#%s" % (s, n)) in banks.gq: ids[mod["id"] + ":" + i] = ["guidely", "%s#%s" % (s, n)]
            else:
                k = banks.clerk.get(i)
                if k: ids[i] = ["clerk", k]
        found = []
        def scan(t):
            if TOKEN.search(t) or re.search(r"\bG-[a-z]", t):
                for i in expand(t) if ("·" in t or ";" in t or re.search(r"\d,\s*(\d|MT)| to \d", t)) else [m.group(0) for m in TOKEN.finditer(t)]:
                    found.append(i)
                for m in TOKEN.finditer(t): found.append(m.group(0))
        walk_text(mod, scan)
        for i in dict.fromkeys(found):
            resolve(i)
            fam = "guidely" if i.startswith("G-") else "sreedhar" if i.startswith("S-MT") else "clerk" if re.match(r"(PYQ|CON)-", i) else "other"
            stats[fam + ":seen"] += 1
            if i in ids or (mod["id"] + ":" + i) in ids: stats[fam + ":linked"] += 1
        # every archetype's questions, per bank, in the page's order
        mod["practice"] = {}
        for sec in mod["sections"]:
            if sec["kind"] != "index": continue
            for it in sec.get("items") or []:
                m = re.match(r"^([A-Z]{1,3}\d{1,2}[a-z]?) question IDs?$", it["title"])
                if not m: continue
                per = collections.OrderedDict()
                for b in it["blocks"]:
                    for i in expand(plain(b)):
                        hit = ids.get(i) or ids.get(mod["id"] + ":" + i)
                        if hit: per.setdefault(hit[0], []).append(hit[1])
                if per: mod["practice"][m.group(1)] = {k: list(dict.fromkeys(v)) for k, v in per.items()}
            for b in sec.get("blocks") or []:
                if b["t"] != "ul": continue
                for li in b["items"]:
                    m = re.match(r"^([A-Z]{1,3}\d{1,2}[a-z]?)(?: \(\d+\))?:\s*(.*)$", li["x"], re.S)
                    if not m: continue
                    per = mod["practice"].setdefault(m.group(1), {})
                    for i in expand(m.group(2)):
                        hit = ids.get(i) or ids.get(mod["id"] + ":" + i)
                        if hit and hit[1] not in per.setdefault(hit[0], []): per[hit[0]].append(hit[1])
                    for k in [k for k, v in per.items() if not v]: del per[k]
                    if not per: del mod["practice"][m.group(1)]
        # the ladder: one playlist per rung
        for sec in mod["sections"]:
            if sec["kind"] != "ladder": continue
            rungs, cur = [], None
            def add(name, text):
                nonlocal cur
                if cur is None or cur["name"] != name:
                    cur = {"name": name, "keys": collections.OrderedDict()}; rungs.append(cur)
                for i in expand(text):
                    hit = ids.get(i) or ids.get(mod["id"] + ":" + i)
                    if hit: cur["keys"].setdefault(hit[0], []).append(hit[1])
            label = "Ladder"
            for b in sec.get("blocks") or []:
                if b["t"] == "p":
                    m = re.match(r"\*\*(Rung \d+)", b["x"])
                    if m: label = m.group(1)
                elif b["t"] == "table" and b["rows"]:
                    head = [c.lower() for c in b["rows"][0]]
                    col = next((j for j, c in enumerate(head) if c in ("id", "set", "ids", "question", "questions")), None)
                    rc = next((j for j, c in enumerate(head) if c.startswith("rung")), None)
                    if col is None: continue
                    for r in b["rows"][1:]:
                        if col < len(r):
                            add("Rung " + r[rc].split(":")[0].strip() if rc is not None and rc < len(r) else label, r[col])
            sec["rungs"] = [{"name": r["name"], "keys": {k: list(dict.fromkeys(v)) for k, v in r["keys"].items()}}
                            for r in rungs if r["keys"]]
    # two codes landing on one set means at least one is a wrong guess: drop both
    owner = collections.defaultdict(set)
    for k, v in ids.items():
        if v[0] == "guidely": owner[(k.split(":")[0], v[1].split("#")[0])].add(re.match(r".*:G-(.+)-\d+$", k).group(1))
    clash = {(m, c) for (m, sl), cs in owner.items() if len(cs) > 1 for c in cs}
    for k in [k for k, v in ids.items() if v[0] == "guidely" and (k.split(":")[0], re.match(r".*:G-(.+)-\d+$", k).group(1)) in clash]:
        del ids[k]
    if clash: print("  dropped (two codes, one set):", sorted(clash))
    book["ids"] = ids
    # the way back: from a question in a bank to the archetype that solves it
    back = {}
    for mod in book["modules"]:
        for code, per in mod.get("practice", {}).items():
            for bank, keys in per.items():
                for k in keys: back.setdefault(bank, {}).setdefault(k, [mod["id"], code])
    book["byKey"] = back
    return stats

# ------------------------------------------------------------ guided lessons
# tools/guide/*.json is teaching written for a beginner: basics.json (the ideas
# every topic leans on) and one file per topic that has been rewritten as a
# path of short lessons, each with a worked example, a question to try and a
# handful of real bank questions. Text fields are lists of markdown lines.
GUIDES = os.path.join(HERE, "guide")

def md(lines):
    """Markdown lines -> blocks. Adds '| a | b |' tables to what to_blocks reads."""
    if isinstance(lines, str): lines = [lines]
    out, buf, rows = [], [], []
    def flush():
        nonlocal buf, rows
        if rows: out.append({"t": "table", "rows": rows}); rows = []
        if buf: out.extend(to_blocks(buf)); buf = []
    for ln in lines or []:
        if re.match(r"^\|.*\|$", ln.strip()):
            if buf: flush()
            rows.append([c.strip() for c in ln.strip()[1:-1].split("|")])
        else:
            if rows: flush()
            buf.append(ln)
            if not LIST.match(ln): flush()
    flush()
    return out

def lesson(l):
    out = {"id": l["id"], "title": l["title"], "plain": l.get("plain", ""), "teach": md(l.get("teach"))}
    for k in ("code", "needs", "practice"):
        if l.get(k): out[k] = l[k]
    if l.get("example"): out["example"] = l["example"]
    out["checks"] = (l.get("checks") or ([l["check"]] if l.get("check") else [])) + (l.get("more") or [])
    if l.get("shortcut"): out["shortcut"] = {"title": l["shortcut"]["title"], "text": md(l["shortcut"]["text"])}
    return out

def add_guides(book, banks):
    if not os.path.isdir(GUIDES): return
    known = {"clerk": set(banks.clerk.values()), "sreedhar": set(banks.sree.values()), "guidely": banks.gq}
    book["work"], book["lessonOf"] = {}, {}
    for name in sorted(os.listdir(GUIDES)):
        if not name.endswith(".json"): continue
        g = json.load(open(os.path.join(GUIDES, name), encoding="utf-8"))
        if "module" not in g:
            book["basics"] = {"title": g["title"], "intro": md(g["intro"]), "lessons": [lesson(l) for l in g["lessons"]]}
            print("  basics: %d lessons" % len(g["lessons"]))
            continue
        mod = next((m for m in book["modules"] if m["id"] == g["module"]), None)
        if not mod and g.get("new"):
            # a topic that exists only as guided lessons (split out of another module's notes)
            nw = g["new"]
            mod = {"id": g["module"], "part": nw["part"], "title": nw["title"], "codes": {}, "practice": {},
                   "sample": md(nw.get("sample")),
                   "sections": [{"kind": "cheat", "title": "Cheat sheet", "blocks": md(nw.get("revision"))}]}
            ids = [m["id"] for m in book["modules"]]
            book["modules"].insert(ids.index(nw["after"]) + 1 if nw.get("after") in ids else len(ids), mod)
            for pt in book["parts"]:
                if pt["id"] == nw["part"]:
                    pm = pt["modules"]
                    pm.insert(pm.index(nw["after"]) + 1 if nw.get("after") in pm else len(pm), mod["id"])
        if not mod: print("  !! guide for unknown module", g["module"]); continue
        mod["guide"] = {"intro": md(g.get("intro")), "after": md(g.get("after")), "needs": g.get("needs", []),
                        "lessons": [lesson(l) for l in g["lessons"]]}
        n = 0
        for l in g["lessons"]:
            pr = l.get("practice")
            if not pr: continue
            bad = [k for k in pr["keys"] if banks.ok.get(pr["bank"]) and k not in known[pr["bank"]]]
            if bad: print("  !! %s / %s: not in the %s bank: %s" % (g["module"], l["id"], pr["bank"], bad))
            for k in pr["keys"]:
                book["lessonOf"].setdefault(pr["bank"], {})[k] = [mod["id"], l["id"]]; n += 1
        # what each question on the path is hiding: shown as the first line of its working
        tagof = {}
        for l in g["lessons"]:
            pr = l.get("practice") or {}
            tags = pr.get("tags") or []
            if tags and len(tags) != len(pr["keys"]): print("  !! %s / %s: %d tags for %d questions" % (g["module"], l["id"], len(tags), len(pr["keys"])))
            for k, t in zip(pr.get("keys", []), tags): tagof[(pr["bank"], k)] = t
        for bank, ws in (g.get("work") or {}).items():
            for k, lines in ws.items():
                head = ("What this one hides: " + tagof[(bank, k)] + "\n") if (bank, k) in tagof else ""
                book["work"].setdefault(bank, {})[k] = head + "\n".join("%d. %s" % (i + 1, t) for i, t in enumerate(lines))
        print("  guide %s: %d lessons, %d questions on the path, %d workings" % (
            g["module"], len(g["lessons"]), n, sum(len(w) for w in (g.get("work") or {}).values())))

def main():
    book = build(read_lines(SRC))
    banks = Banks(DATA)
    stats = link_ids(book, banks)
    add_guides(book, banks)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(book, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("wrote", os.path.relpath(OUT), "%.0f KB" % (os.path.getsize(OUT) / 1024))
    for p in book["parts"]: print(" part", p["name"], "-", len(p["modules"]), "modules")
    for m in book["modules"]:
        kinds = [s["kind"] for s in m["sections"]]
        dr = [d for s in m["sections"] if s["kind"] == "drills" for d in s.get("items", [])]
        nq = sum(len(d["qs"]) for d in dr); na = sum(1 for d in dr for q in d["qs"] if q["answer"])
        pr = sum(len(v) for per in m.get("practice", {}).values() for v in per.values())
        rg = sum(len(v) for s in m["sections"] for r in s.get("rungs", []) for v in r["keys"].values())
        print("  %-34s %-44s drills %2d (%d/%d keyed, %d plain)  codes %2d  linked: %4d by archetype, %3d on ladder" % (
            m["title"][:34], ",".join(kinds), len(dr), na, nq, sum(1 for d in dr if not d["qs"]), len(m["codes"]), pr, rg))
    for fam in ("clerk", "sreedhar", "guidely", "other"):
        print("  ids %-9s %5d seen, %5d linked" % (fam, stats[fam + ":seen"], stats[fam + ":linked"]))

if __name__ == "__main__":
    main()
