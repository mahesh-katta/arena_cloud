"""Re-attach the original Guidely test name ("Box Based Puzzle Single Variable Set -3 (Prelims)")
to every question in data/bank/*.json. The build scripts dropped it; this recovers it by matching each
bank question to the raw test files in arena_raw.zip (sets/Beginner_part_1, Beginner_part_2, Medium).

usage: python3 -I stitch_set_names.py <dir with arena_raw/sets extracted> [bank dir]
Adds: set_name, set_code (link_code), set_q_no (position inside that test).
"""
import json, glob, re, html, sys, collections, unicodedata, difflib

RAW = sys.argv[1].rstrip('/') + '/arena_raw/sets/'
BANK = (sys.argv[2] if len(sys.argv) > 2 else 'data/bank').rstrip('/') + '/'

def nz(s, raw=True):  # raw = HTML from the dump; bank text is already plain, so '<' '>' are symbols, not tags
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s or '')) if raw else (s or '')
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', s).lower())

def loose(s, raw=True):  # keeps symbols (<, >, =, ...) that nz() throws away
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s or '')) if raw else (s or '')
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', s)).lower()

idx = collections.defaultdict(list)
for d in ('Beginner_part_1', 'Beginner_part_2', 'Medium'):
    for f in sorted(glob.glob(RAW + d + '/*.json')):
        j = json.load(open(f))
        for sec in j['section']:
            for q in (sec['mock_questions'] or {}).get('english', []):
                k = ('|'.join(nz(o) for o in q['options']), int(q['answer']))
                idx[k].append(dict(name=j['name'], code=j['link_code'], sno=q.get('sno'), q=nz(q['question']), cd=nz(q.get('common_data')), lq=loose(q['question'])))

files = [f for f in glob.glob(BANK + '*.json') if not f.endswith('index.json')]
data = {f: json.load(open(f)) for f in files}

hits = {}
for f, d in data.items():
    for q in d['questions']:
        c = idx.get(('|'.join(nz(o['text'], False) for o in q['options']), 'ABCDE'.index(q['correct_option'])), [])
        bq, bcd = nz(q['question'], False), nz(q.get('common_data'), False)
        good = [x for x in c if not x['q'] or x['q'] in bq or bq in x['q']]
        if not good and c:  # symbol-heavy questions (Inequality, Syllogism): fuzzy compare with symbols kept
            bl = loose(q['question'], False)
            sc = [(difflib.SequenceMatcher(None, x['lq'], bl[-len(x['lq']) - 20:] or bl).ratio(), x) for x in c]
            best = max(sc, key=lambda t: t[0], default=(0, None))
            good = [x for r, x in sc if r >= 0.9 and r >= best[0] - 0.02]
        if len(good) > 1 and bcd:
            good = [x for x in good if x['cd'] and (x['cd'] in bcd or bcd in x['cd'])] or good
        hits[q['id']] = good

# a common-data set is one raw test: vote across its questions
votes = collections.defaultdict(collections.Counter)
for d in data.values():
    for q in d['questions']:
        if q.get('common_data_id'):
            for x in {x['code']: x for x in hits[q['id']]}.values(): votes[q['common_data_id']][x['code']] += 1

stat = collections.Counter()
for f, d in data.items():
    for q in d['questions']:
        good, pick = hits[q['id']], None
        top = votes[q['common_data_id']].most_common(1)[0][0] if q.get('common_data_id') and votes[q['common_data_id']] else None
        if good:
            pick = next((x for x in good if x['code'] == top), good[0])
        elif top:
            pick = dict(name=next(x['name'] for h in hits.values() for x in h if x['code'] == top), code=top, sno=None)
            stat['inherited'] += 1
        for k in ('set_name', 'set_code', 'set_q_no'): q.pop(k, None)
        if pick:
            q['set_name'], q['set_code'] = pick['name'], pick['code']
            q['set_q_no'] = int(pick['sno']) if str(pick['sno']).isdigit() else None
            stat['tagged'] += 1
            sn = pick['name']
            if re.search(r'\b(prelim|prelims|beginner|beginners)\b', sn, re.I):
                q['exam_stage'] = 'Prelims'
                q['difficulty'] = None
            elif re.search(r'\bmains\b', sn, re.I):
                q['exam_stage'] = 'Mains'
                q['difficulty'] = 'high'
        else: stat['untagged'] += 1
    json.dump(d, open(f, 'w'), ensure_ascii=False, separators=(',', ':'))
print(dict(stat))
