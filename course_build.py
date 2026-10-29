"""Builds data/course/* : the course structure for the Course tab. It only READS data/bank, data/speed, data/mocks and
the hand-made quant maps; nothing in those folders is changed. Everything here is ids, names and order.

  python3 -I course_build.py [quant maps dir]

Writes
  data/course/index.json              both subjects, their topics and counts (the Course home)
  data/course/quant/<topic>.json      units = archetypes, lessons = recipes (core question first, then its look-alikes)
  data/course/reasoning/<topic>.json  units = concepts (subtopic), lessons = one puzzle (passage + its questions)
  data/course/idmap.json              question id -> [kind, file(, group)] so the server can fetch a lesson's questions

Edit ORDER / TITLES below (or the written files) to reorder; the app only follows the order it finds.
"""
import collections, glob, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data')
OUT = os.path.join(DATA, 'course')
QMAPS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DATA, 'quant_maps')

REASONING = [  # (topic file in data/bank, shown name)
    ('month-with-date-based-puzzle', 'Month with Date-Based Puzzle'), ('box-based-puzzle', 'Box-Based Puzzle'),
    ('parallel-seating-arrangement', 'Parallel Seating Arrangement'), ('circular-seating-arrangement', 'Circular Seating Arrangement'),
    ('floor-with-flat-based-puzzle', 'Floor with Flat-Based Puzzle'), ('linear-seating-arrangement', 'Linear Seating Arrangement'),
    ('unknown-linear-seating-arrangement', 'Unknown Linear Seating Arrangement'), ('floor-based-puzzle', 'Floor-Based Puzzle'),
    ('designation-based-puzzle', 'Designation-Based Puzzle'), ('sequence-based-puzzle', 'Sequence-Based Puzzle'),
    ('square-seating-arrangement', 'Square Seating Arrangement'), ('day-based-puzzle', 'Day-Based Puzzle'),
    ('month-based-puzzle', 'Month-Based Puzzle'), ('year-based-puzzle', 'Year-Based Puzzle'),
    ('rectangular-seating-arrangement', 'Rectangular Seating Arrangement'), ('month-with-year-based-puzzle', 'Month with Year-Based Puzzle'),
]
QUANT_NAMES = {'averages': 'Averages', 'boats-and-streams': 'Boats and Streams', 'mensuration': 'Mensuration',
               'mixtures-and-alligations': 'Mixtures and Alligations', 'partnership': 'Partnership', 'percentages': 'Percentages',
               'pipes-and-cisterns': 'Pipes and Cisterns', 'probability': 'Probability', 'problems-on-ages': 'Problems on Ages',
               'problems-on-numbers': 'Problems on Numbers', 'profit-and-loss': 'Profit and Loss',
               'ratio-and-proportion': 'Ratio and Proportion', 'simple-and-compound-interest': 'Simple and Compound Interest',
               'time-and-distance': 'Time and Distance', 'time-and-work': 'Time and Work', 'trains': 'Trains'}

def dump(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(obj, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))

# ---- where every id lives (bank / speed / mocks) -------------------------------------------------------------
where = {}
for kind in ('bank', 'speed', 'mocks'):
    for f in sorted(glob.glob(f'{DATA}/{kind}/*.json')):
        if f.endswith('index.json'): continue
        stem = os.path.basename(f)[:-5]
        for q in json.load(open(f))['questions']:
            where[q['id']] = (kind, stem, q.get('mock_id'))

used = {}
def use(i):
    kind, stem, mock = where[i]
    used[i] = [{'bank': 'b', 'speed': 's', 'mocks': 'm'}[kind], stem] + ([mock] if mock else [])

# ---- quant: archetype -> recipe -> questions --------------------------------------------------------------------
quant = []
for slug, name in QUANT_NAMES.items():
    m = json.load(open(f'{QMAPS}/{slug}_mapping.json'))
    units = collections.OrderedDict()
    for core, c in m['cores'].items():
        ids = [core] + [i for i in c['ids'] if i != core]
        ids = [i for i in ids if i in where]
        if not ids: continue
        for i in ids: use(i)
        units.setdefault(c['archetype'], []).append({'id': c['code'], 'title': c['sub_archetype'], 'ids': ids})
    # most-asked first: units by how many questions they hold, and the recipes inside a unit the same way
    out_units = [{'name': a, 'lessons': sorted(ls, key=lambda l: -len(l['ids']))} for a, ls in units.items()]
    out_units.sort(key=lambda u: -sum(len(l['ids']) for l in u['lessons']))
    dump(f'{OUT}/quant/{slug}.json', {'id': slug, 'subject': 'quant', 'name': name, 'units': out_units})
    quant.append({'id': slug, 'name': name, 'units': len(out_units), 'lessons': sum(len(u['lessons']) for u in out_units),
                  'questions': sum(len(l['ids']) for u in out_units for l in u['lessons'])})

# ---- reasoning: concept -> puzzle (a passage and its questions). Prelims side only; Mains tests are left out. ------
def concept(s):
    s = re.sub(r'[^a-z0-9 ]', ' ', (s or 'General').lower().replace('bi-direction', 'bidirection').replace('bi direction', 'bidirection'))
    s = s.replace('bidirectional', 'bidirection')
    return ' '.join(s.split())

reasoning = []
for slug, name in REASONING:
    qs = json.load(open(f'{DATA}/bank/reasoning--{slug}.json'))['questions']
    def is_prelims(q):
        sname = (q.get('set_name') or '').lower()
        if 'prelim' in sname or 'beginner' in sname: return True
        if 'mains' in sname or q.get('exam_stage') == 'Mains': return False
        return True
    qs = [q for q in qs if is_prelims(q) and q.get('common_data_id')]
    puzzles = collections.OrderedDict()
    for q in qs: puzzles.setdefault(q['common_data_id'], []).append(q)
    units = collections.OrderedDict()
    for pid, pq in puzzles.items():
        key = concept(pq[0].get('subtopic'))
        u = units.setdefault(key, {'names': collections.Counter(), 'beginner': False, 'lessons': []})
        u['names'][pq[0].get('subtopic') or 'General'] += 1
        u['beginner'] |= (pq[0].get('set_name') or '').startswith('Beginners')
        for q in pq: use(q['id'])
        u['lessons'].append({'id': pid, 'test': pq[0].get('set_name'), 'ids': [q['id'] for q in pq]})
    ordered = sorted(units.values(), key=lambda u: not u['beginner'])   # concepts that start from the Beginner quizzes first, then file order
    out_units = []
    for u in ordered:
        for n, l in enumerate(u['lessons'], 1): l['title'] = f'Puzzle {n}'
        out_units.append({'name': u['names'].most_common(1)[0][0], 'lessons': u['lessons']})
    dump(f'{OUT}/reasoning/{slug}.json', {'id': slug, 'subject': 'reasoning', 'name': name, 'units': out_units})
    reasoning.append({'id': slug, 'name': name, 'units': len(out_units), 'lessons': sum(len(u['lessons']) for u in out_units),
                      'questions': sum(len(l['ids']) for u in out_units for l in u['lessons'])})

dump(f'{OUT}/index.json', {'subjects': [{'id': 'reasoning', 'name': 'Seating & Puzzles', 'topics': reasoning}, {'id': 'quant', 'name': 'Arithmetic', 'topics': quant}]})
dump(f'{OUT}/idmap.json', used)
print('quant', len(quant), 'topics,', sum(t['questions'] for t in quant), 'questions |', 'reasoning', len(reasoning), 'topics,', sum(t['questions'] for t in reasoning), 'questions |', len(used), 'ids mapped')
