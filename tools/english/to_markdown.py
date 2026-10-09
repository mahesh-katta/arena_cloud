"""Writes printable copies of the English lists: docs/english/grammar.md and vocabulary.md.

    python3 -B tools/english/to_markdown.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "..", "data", "english")
OUT = os.path.join(HERE, "..", "..", "docs", "english")

def table(rows):
    out = ["| " + " | ".join(rows[0]) + " |", "|" + "---|" * len(rows[0])]
    out += ["| " + " | ".join(str(c) for c in r) + " |" for r in rows[1:]]
    return out

def grammar():
    g = json.load(open(os.path.join(DATA, "grammar.json"), encoding="utf-8"))
    cat = {c["id"]: c["name"] for c in g["categories"]}
    L = ["# Grammar: %d rules" % len(g["rules"]), ""] + [p + "\n" for p in g["intro"]] + table(g["measured"]) + [""]
    core = sorted([r for r in g["rules"] if r["core"]], key=lambda r: (-(r["bank"] + r["papers"]), r["n"]))
    L += ["## Exam short list (%d rules, most asked first)" % len(core), ""]
    for r in core:
        L.append("- **%d. %s** (%s). %s ✗ *%s* ✓ *%s*" % (r["n"], r["title"], cat[r["cat"]], r["rule"], r["wrong"], r["right"]))
    L += ["", "## All %d rules" % len(g["rules"])]
    last = None
    for r in g["rules"]:
        if r["cat"] != last:
            L += ["", "### " + cat[r["cat"]], ""]; last = r["cat"]
        tag = " ★" if r["core"] else ""
        L += ["**%d. %s**%s  " % (r["n"], r["title"], tag), r["rule"] + "  ", "✗ " + r["wrong"] + "  ", "✓ " + r["right"] + ("  " if r["tip"] else "")]
        if r["tip"]: L.append("Tip: " + r["tip"])
        L.append("")
    return "\n".join(L) + "\n"

def vocabulary():
    v = json.load(open(os.path.join(DATA, "vocabulary.json"), encoding="utf-8"))
    L = ["# Vocabulary", ""] + [p + "\n" for p in v["intro"]] + table(v["measured"]) + [""]
    for core, name in ((True, "Short list"), (False, "Rest of the full list")):
        ws = [w for w in v["words"] if w["core"] == core]
        L += ["## Words: %s (%d)" % (name.lower(), len(ws)), ""]
        L += table([["Word", "Meaning", "Same", "Opposite"]] + [[w["w"] + " (" + w["pos"] + ")", w["meaning"], ", ".join(w["syn"]), ", ".join(w["ant"])] for w in ws]) + [""]
    L += ["## One-word substitutes (★ = short list)", ""]
    L += table([["Meaning", "One word"]] + [[o["meaning"], o["w"] + (" ★" if o["core"] else "")] for o in v["oneword"]]) + [""]
    L += ["## Spelling traps (★ = short list)", ""]
    L += table([["Right", "Common wrong forms", "Tip"]] + [[s["right"] + (" ★" if s["core"] else ""), ", ".join(s["wrong"]), s["tip"]] for s in v["spelling"]]) + [""]
    L += ["## Confusables (★ = short list)", ""]
    L += table([["Words", "Difference"]] + [[" / ".join(c["words"]) + (" ★" if c["core"] else ""), c["diff"]] for c in v["confusables"]]) + [""]
    return "\n".join(L)

os.makedirs(OUT, exist_ok=True)
for name, fn in (("grammar", grammar), ("vocabulary", vocabulary)):
    open(os.path.join(OUT, name + ".md"), "w", encoding="utf-8").write(fn())
    print("wrote docs/english/%s.md" % name)
