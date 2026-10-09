"""Validate grammar.json: schema, rule list, core range, example keys, and counts.
Run: python3 -B tools/english/check_grammar.py   (add --recount with the build scripts beside it to re-run the classifier)
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "..", "data")
doc = json.load(open(os.path.join(DATA, "english", "grammar.json"), encoding="utf-8"))

assert set(doc) == {"title", "intro", "measured", "categories", "rules"}, set(doc)
assert doc["title"] == "Grammar"
assert isinstance(doc["intro"], list) and doc["intro"] and all(isinstance(p, str) and p.strip() for p in doc["intro"])
m = doc["measured"]
assert m[0] == ["What was measured", "Count"], m[0]
assert all(isinstance(r, list) and len(r) == 2 and all(isinstance(x, str) and x for x in r) for r in m)
assert not any("%" in r[1] for r in m), "counts, not percentages"

cats = doc["categories"]
assert all(set(c) == {"id", "name"} for c in cats)
cat_ids = [c["id"] for c in cats]
assert len(cat_ids) == len(set(cat_ids))

R = doc["rules"]
KEYS = {"n", "id", "cat", "title", "rule", "wrong", "right", "tip", "core", "bank", "papers", "examples", "src"}
assert len(R) == 120, len(R)
assert [r["n"] for r in R] == list(range(1, 121))
assert len({r["id"] for r in R}) == 120, "ids not unique"
for r in R:
    assert set(r) == KEYS, (r.get("id"), set(r) ^ KEYS)
    assert r["cat"] in cat_ids, r["id"]
    assert re.fullmatch(rf"{r['cat']}-\d+", r["id"]), r["id"]
    for f in ("title", "rule", "wrong", "right"):
        assert isinstance(r[f], str) and r[f].strip(), (r["id"], f)
    assert isinstance(r["tip"], str)
    assert r["wrong"].strip() != r["right"].strip(), r["id"]
    assert isinstance(r["core"], bool)
    assert isinstance(r["bank"], int) and r["bank"] >= 0 and isinstance(r["papers"], int) and r["papers"] >= 0
    assert r["src"] in ("bank", "web"), r["id"]
    assert (r["src"] == "bank") == (r["bank"] + r["papers"] > 0), r["id"]
    assert isinstance(r["examples"], list) and len(r["examples"]) <= 3
    assert len(r["examples"]) <= r["bank"], r["id"]
    for e in r["examples"]:
        assert set(e) == {"bank", "key"} and e["bank"] in ("guidely", "sreedhar"), e
    assert "%" not in r["rule"] + r["tip"]
# every category used, rules grouped by category in order
seen = []
for r in R:
    if not seen or seen[-1] != r["cat"]:
        assert r["cat"] not in seen, "category split: " + r["cat"]
        seen.append(r["cat"])
assert seen == cat_ids, "categories out of order or unused"

core = sum(r["core"] for r in R)
assert 35 <= core <= 45, core
web_core = sum(1 for r in R if r["core"] and r["src"] == "web")

# example keys must exist in the banks
keys = {}
for b in ("guidely", "sreedhar"):
    q = json.load(open(f"{DATA}/{b}/questions.json"))
    keys[b] = {f"{x['set']}#{x['q_no']}" for x in q}
for r in R:
    for e in r["examples"]:
        assert e["key"] in keys[e["bank"]], (r["id"], e)

# counts: recompute with the classifier and compare
sys.path.insert(0, os.path.join(HERE, "work"))
recheck = "--recount" in sys.argv
if recheck:
    import contextlib, io
    import classify
    bank, meta = classify.classify_banks()
    papers = classify.classify_papers()
    cnt_b, cnt_p = {}, {}
    for v in bank.values():
        for rid in v:
            cnt_b[rid] = cnt_b.get(rid, 0) + 1
    for v in papers.values():
        for rid in v:
            cnt_p[rid] = cnt_p.get(rid, 0) + 1
    # map final ids back to classifier ids via title
    import rules as RU
    title2old = {r[2]: r[0] for r in RU.R}
    for r in R:
        old = title2old[r["title"]]
        assert r["bank"] == cnt_b.get(old, 0), (r["id"], r["bank"], cnt_b.get(old, 0))
        assert r["papers"] == cnt_p.get(old, 0), (r["id"], r["papers"], cnt_p.get(old, 0))
        for e in r["examples"]:
            assert old in bank[(e["bank"], e["key"])], (r["id"], e)

print(f"OK: 120 rules, {len(cat_ids)} categories, core={core} (web-only core={web_core}), "
      f"src=web {sum(r['src']=='web' for r in R)}, examples={sum(len(r['examples']) for r in R)}, "
      f"bank hits={sum(r['bank'] for r in R)}, paper hits={sum(r['papers'] for r in R)}, counts re-verified={recheck}")
