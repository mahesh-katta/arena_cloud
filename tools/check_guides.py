"""Checks every tools/guide/*.json against the banks.

For each lesson: the practice keys exist in their bank, every key has a working,
and the last line of each working contains the text of the keyed option.
Checks and "more" questions must name an answer that is among their options.

    python3 -B tools/check_guides.py            # all guides
    python3 -B tools/check_guides.py ages       # one guide
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
GUIDES = os.path.join(HERE, "guide")

def load_bank(name):
    qs = json.load(open(os.path.join(DATA, name, "questions.json"), encoding="utf-8"))
    return {"%s#%s" % (q["set"], q["q_no"]): q for q in qs}

def norm(t):
    t = re.sub(r"\brs\.?\s*", "", str(t).lower().replace("₹", "")).replace(",", "")
    t = re.sub(r"\s*/\s*", "/", t)
    for a, b in (("½", " 1/2"), ("⅓", " 1/3"), ("⅔", " 2/3"), ("¼", " 1/4"), ("¾", " 3/4"), ("–", "-")):
        t = t.replace(a, b)
    return " ".join(t.split())

UNITS = ("years", "year", "days", "minutes", "hours", "km/h", "profit", "loss of", "a.m.", "p.m.")

def shows(want, line):
    w, l = norm(want), norm(line)
    if w in l: return True
    for u in UNITS:
        w = w.replace(u, "").strip()
    return bool(w) and w in l

def main(only):
    banks, problems, seen = {}, 0, 0
    for name in sorted(os.listdir(GUIDES)):
        if not name.endswith(".json") or name == "basics.json": continue
        if only and name[:-5] not in only: continue
        g = json.load(open(os.path.join(GUIDES, name), encoding="utf-8"))
        work = g.get("work") or {}
        for l in g["lessons"]:
            for c in ([l["check"]] if l.get("check") else []) + (l.get("more") or []):
                if c["answer"].lower() not in c["options"]:
                    print("!! %s / %s: check answer %s not in options" % (name, l["id"], c["answer"])); problems += 1
            pr = l.get("practice")
            if not pr: continue
            bank = banks.setdefault(pr["bank"], load_bank(pr["bank"]))
            for k in pr["keys"]:
                seen += 1
                q = bank.get(k)
                if not q:
                    print("!! %s / %s: %s not in %s" % (name, l["id"], k, pr["bank"])); problems += 1; continue
                lines = (work.get(pr["bank"]) or {}).get(k)
                if not lines:
                    print("!! %s / %s: no working for %s" % (name, l["id"], k)); problems += 1; continue
                want = q["options"].get(q["answer"].lower(), "")
                if not shows(want, lines[-1]):
                    print("!! %s / %s: %s last line does not contain keyed option %r" % (name, l["id"], k, want)); problems += 1
    print("%d practice questions checked, %d problems" % (seen, problems))
    return problems

if __name__ == "__main__":
    sys.exit(1 if main(set(sys.argv[1:])) else 0)
