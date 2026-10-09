"""Validate vocabulary.json (schema + counts). Optional spelling check if wordfreq/pyspellchecker are installed."""
import json, os, re, sys

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data', 'english', 'vocabulary.json')
d = json.load(open(P, encoding='utf-8'))

assert set(d) == {'title', 'intro', 'measured', 'words', 'oneword', 'spelling', 'confusables'}, set(d)
assert d['title'] == 'Vocabulary'
assert d['intro'] and all(isinstance(p, str) and p for p in d['intro'])
assert d['measured'][0] == ['What was measured', 'Count']
for row in d['measured'][1:]:
    assert len(row) == 2 and isinstance(row[0], str) and isinstance(row[1], int), row
for k in ('words', 'oneword', 'spelling', 'confusables'):
    assert isinstance(d[k], list) and d[k], k + ' is empty'
SRC = {'bank', 'web'}

# words
W = d['words']
assert len(W) == 500, len(W)
assert sum(e['core'] for e in W) == 250, sum(e['core'] for e in W)
heads = [e['w'] for e in W]
assert len(set(heads)) == 500, 'duplicate headwords'
for e in W:
    assert set(e) == {'w', 'pos', 'meaning', 'syn', 'ant', 'core', 'count', 'src'}, e
    assert re.fullmatch(r"[a-z][a-z\-]*", e['w']), e['w']
    assert e['pos'] in {'noun', 'verb', 'adjective', 'adverb'}, e
    assert e['meaning'].strip()
    assert 2 <= len(e['syn']) <= 4, e['w']
    assert 0 <= len(e['ant']) <= 3, e['w']
    assert e['w'] not in e['syn'] and e['w'] not in e['ant'], 'self as syn/ant: ' + e['w']
    assert not set(e['syn']) & set(e['ant']), 'syn/ant overlap: ' + e['w']
    assert len(set(e['syn'])) == len(e['syn']) and len(set(e['ant'])) == len(e['ant']), e['w']
    assert isinstance(e['core'], bool) and isinstance(e['count'], int) and e['count'] >= 0
    assert e['src'] in SRC and (e['src'] == 'bank') == (e['count'] > 0), e
# core = top of the count ranking: no non-core word may outrank a core word
assert min(e['count'] for e in W if e['core']) >= max(e['count'] for e in W if not e['core'])

# one-word
O = d['oneword']
assert len({e['w'] for e in O}) == len(O)
for e in O:
    assert set(e) == {'w', 'meaning', 'core', 'count', 'src'}, e
    assert e['w'] and e['meaning'] and isinstance(e['core'], bool) and isinstance(e['count'], int)
    assert e['src'] in SRC and (e['src'] == 'bank') == (e['count'] > 0), e

# spelling
S = d['spelling']
assert len({e['right'] for e in S}) == len(S)
for e in S:
    assert set(e) == {'right', 'wrong', 'tip', 'core', 'count', 'src'}, e
    assert e['wrong'] and e['right'] not in e['wrong'] and e['tip'], e
    assert e['src'] in SRC and (e['src'] == 'bank') == (e['count'] > 0), e

# confusables
C = d['confusables']
assert len({tuple(e['words']) for e in C}) == len(C)
for e in C:
    assert set(e) == {'words', 'diff', 'core', 'src'}, e
    assert len(e['words']) >= 2 and len(set(e['words'])) == len(e['words']) and e['diff'], e
    assert e['src'] in SRC

def n(k): return (len(d[k]), sum(e['core'] for e in d[k]), sum(e['src'] == 'bank' for e in d[k]), sum(e['src'] == 'web' for e in d[k]))
print('list          total core bank web')
for k in ('words', 'oneword', 'spelling', 'confusables'):
    print('%-12s %6d %4d %4d %3d' % ((k,) + n(k)))
print('measured rows', len(d['measured']) - 1)

# optional spelling check
try:
    from wordfreq import zipf_frequency as zf
    from spellchecker import SpellChecker
except ImportError:
    print('spelling check skipped (install wordfreq and pyspellchecker)')
    sys.exit(0)
sp = SpellChecker()
def ok(t): return zf(t, 'en') >= 1.0 or t in sp
toks = set()
for e in W:
    for x in [e['w']] + e['syn'] + e['ant']: toks.update(re.split(r"[\s\-]+", x))
for e in O: toks.add(e['w'])
for e in S: toks.add(e['right'])
for e in C: toks.update(t.replace("'", "") if "'" in t else t for t in e['words'])
bad = sorted(t for t in toks if t and t != 'theyre' and not ok(t.lower()))
print('tokens checked', len(toks), '| not found in word lists:', bad if bad else 'none')
valid_wrong = sorted(w for e in S for w in e['wrong'] if w in sp)
print('"wrong" forms that the spellchecker dictionary accepts (review):', valid_wrong if valid_wrong else 'none')
