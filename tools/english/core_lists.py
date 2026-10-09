"""Full lists for the seven most-asked grammar rules, written into data/english/grammar.json
as each rule's "more" table. Prepositions also get a count of how often the pair appears in
the banks' English questions (stems, options and solutions).

    python3 -B tools/english/core_lists.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "..", "data")

# word | preposition | example
PREPS = """abide|by|Abide by the rules.
abstain|from|He abstains from alcohol.
accede|to|They acceded to our request.
accompanied|by|She was accompanied by her father.
accuse|of|He was accused of theft.
accustomed|to|She is accustomed to hard work.
acquainted|with|I am acquainted with him.
adhere|to|Adhere to the schedule.
afraid|of|He is afraid of dogs.
agree|with|I agree with you. (a person)
agree|to|They agreed to the plan. (a proposal)
aim|at|The scheme aims at growth.
amazed|at|She was amazed at the result.
angry|with|He is angry with his brother. (a person)
angry|at|She was angry at the delay. (a thing)
anxious|about|They are anxious about the exam.
apologise|for|He apologised for the mistake.
appeal|to|The minister appealed to the public.
apply|for|She applied for the job.
approve|of|Her parents approve of the plan.
ashamed|of|He is ashamed of his lie.
aspire|to|She aspires to a career in banking.
assure|of|He assured me of his support.
astonished|at|We were astonished at the news.
attend|to|Please attend to the customer. (deal with)
aware|of|Are you aware of the risks?
believe|in|I believe in hard work.
belong|to|This land belongs to the state.
beware|of|Beware of fake calls.
blame|for|They blamed him for the loss.
boast|of|He boasts of his wealth.
capable|of|She is capable of leading the team.
charge|with|He was charged with fraud.
cling|to|The child clung to her mother.
comment|on|He refused to comment on it.
comply|with|All banks must comply with the rules.
composed|of|Water is composed of hydrogen and oxygen.
concentrate|on|Concentrate on your work.
confide|in|She confided in her friend.
confident|of|He is confident of success.
congratulate|on|I congratulate you on your result.
conscious|of|She is conscious of her duty.
consist|of|The team consists of five members.
contribute|to|Exports contribute to growth.
cope|with|How do you cope with stress?
count|on|You can count on me.
cure|of|The doctor cured him of malaria.
deal|with|The bank deals with complaints quickly.
depend|on|Prices depend on demand.
deprive|of|He was deprived of his rights.
deter|from|Fines deter people from littering.
devoid|of|The plan is devoid of logic.
differ|from|His view differs from mine.
disagree|with|I disagree with you.
dispose|of|Dispose of the waste safely.
eligible|for|She is eligible for the post.
engaged|in|He is engaged in research. (an activity)
engaged|to|She is engaged to Ravi. (a person)
envious|of|He is envious of her success.
equal|to|Two plus two is equal to four.
escape|from|He escaped from prison.
exempt|from|Farmers are exempt from this tax.
familiar|with|Are you familiar with the software?
famous|for|Agra is famous for the Taj Mahal.
fond|of|She is fond of music.
free|from|The area is free from pollution.
full|of|The hall was full of people.
good|at|He is good at maths.
grateful|to|I am grateful to you for your help. (to a person, for a thing)
guard|against|Guard against fraud.
guilty|of|He was found guilty of theft.
impressed|by|We were impressed by her speech.
independent|of|India became independent of British rule.
indifferent|to|He is indifferent to criticism.
indulge|in|Do not indulge in gossip.
infected|with|He is infected with a virus.
inferior|to|This cloth is inferior to that one.
insist|on|She insisted on paying.
interested|in|He is interested in politics.
involved|in|He was involved in the project.
jealous|of|She is jealous of her sister.
keen|on|He is keen on cricket.
liable|for|The company is liable for the damage.
listen|to|Listen to your teacher.
married|to|She is married to a doctor.
object|to|They objected to the new rule.
opposed|to|We are opposed to the plan.
part|with|He refused to part with his money.
persist|in|He persisted in his efforts.
pleased|with|The manager is pleased with her work.
preferable|to|Walking is preferable to driving.
prevent|from|Rain prevented us from going out.
prior|to|Report prior to the meeting.
proficient|in|She is proficient in English.
prohibit|from|Minors are prohibited from voting.
proud|of|We are proud of our country.
provide|with|They provided us with food.
recover|from|He recovered from fever.
refrain|from|Refrain from using phones.
rely|on|We rely on your support.
remind|of|This song reminds me of school.
rescue|from|He rescued the child from the fire.
resign|from|She resigned from her post.
respond|to|He did not respond to the letter.
responsible|for|Who is responsible for this? (a thing)
responsible|to|Ministers are responsible to Parliament. (a person or body)
result|in|Carelessness results in accidents. (cause)
result|from|Accidents result from carelessness. (effect)
rid|of|We must get rid of corruption.
satisfied|with|Are you satisfied with the result?
senior|to|He is senior to me.
sensitive|to|Her skin is sensitive to light.
similar|to|My bag is similar to yours.
succeed|in|He succeeded in clearing the exam.
suffer|from|She is suffering from fever.
superior|to|This product is superior to that one.
sure|of|I am sure of his honesty.
surprised|at|I was surprised at his reply.
suspect|of|He is suspected of fraud.
suspicious|of|She is suspicious of strangers.
sympathise|with|I sympathise with the victims.
tired|of|I am tired of waiting.
tolerant|of|Be tolerant of other views.
wait|for|Wait for me here.
worried|about|They are worried about prices."""

# main clause | what follows | example
TENSE = """Past main verb (said, thought, knew)|past form in the 'that' clause|He said that he was tired.
said that + will / can / may / shall|would / could / might / should|She said that she would come.
Present main verb + so that|may / can|He works hard so that he may pass.
Past main verb + so that|might / could|He worked hard so that he might pass.
Universal truth after a past verb|stays in the present|He said that the sun rises in the east.
Two past actions, one earlier|earlier one: had + V3|The train had left before I reached.
No sooner had ... |than + past|No sooner had he arrived than it rained.
Hardly / Scarcely had ...|when + past|Hardly had I sat down when the bell rang.
when / if / until / as soon as / before (future meaning)|simple present, not will|I will call you when I reach.
If (imaginary present)|past ... would + base verb|If I had money, I would buy a car.
If (imaginary past)|had + V3 ... would have + V3|If you had told me, I would have helped.
wish (present)|past (were for be)|I wish I were taller.
wish (past regret)|had + V3|I wish I had studied harder.
as if / as though (unreal)|past; were for be|He talks as if he were the boss.
It is time / It is high time|simple past|It is high time we left.
would rather (someone else)|simple past|I would rather you stayed here.
lest|should + base verb|Run fast lest you should miss the bus.
It has been [time] since|since + simple past; main: present perfect|It has been two years since he left.
Simple past time word (yesterday, ago, in 2019)|simple past, never has/have + V3|I met him yesterday.
since / for with an action still going on|has / have been + -ing|He has been working here since 2015."""

# subject | verb | example
SVA = """each / every / either / neither + noun|singular|Each student has a book.
everyone, someone, anyone, no one, nobody, everything|singular|Everyone is here.
X of Y (the price of vegetables)|agrees with X|The price of vegetables has risen.
X as well as / along with / together with / besides Y|agrees with X|The teacher, along with her students, is here.
either X or Y / neither X nor Y / not only X but also Y|agrees with Y (nearer)|Neither he nor his friends were present.
X and Y (two people or things)|plural|Ram and Shyam are friends.
X and Y naming one idea or one person|singular|Bread and butter is my breakfast.
every X and every Y / every X and Y|singular|Every boy and girl has a vote.
a number of + plural noun|plural|A number of students are absent.
the number of + plural noun|singular|The number of students is small.
many a + singular noun|singular|Many a man has tried.
more than one + singular noun|singular|More than one student has failed.
one of + plural noun|singular|One of my friends lives in Pune.
one of those + plural noun + who|plural (verb after who)|He is one of those who never give up.
news, mathematics, economics, physics, measles|singular|The news is good.
scissors, trousers, spectacles, goods, thanks, premises|plural|My spectacles are broken.
a pair of + scissors / shoes|singular|A pair of shoes is on the mat.
people, police, cattle, poultry, clergy|plural|The police have arrived.
the + adjective (the rich, the poor, the old)|plural|The poor need help.
an amount as one whole (ten kilometres, five lakh rupees, two hours)|singular|Five lakh rupees is a large sum.
collective noun as one unit (committee, team, jury)|singular|The committee has decided.
collective noun whose members act separately|plural|The jury were divided in their opinions.
title of a book, film or newspaper|singular|The Arabian Nights is a famous book.
there + verb + real subject|agrees with the real subject|There are many reasons.
the majority of / a lot of / half of / most of + noun|agrees with that noun|Most of the money is spent. Most of the students are here."""

# V1 | V2 | V3
VERBS = """arise|arose|arisen
awake|awoke|awoken
bear|bore|borne
beat|beat|beaten
become|became|become
begin|began|begun
bend|bent|bent
bet|bet|bet
bind|bound|bound
bite|bit|bitten
bleed|bled|bled
blow|blew|blown
break|broke|broken
bring|brought|brought
build|built|built
burst|burst|burst
buy|bought|bought
cast|cast|cast
catch|caught|caught
choose|chose|chosen
cling|clung|clung
come|came|come
cost|cost|cost
creep|crept|crept
cut|cut|cut
deal|dealt|dealt
dig|dug|dug
do|did|done
draw|drew|drawn
drink|drank|drunk
drive|drove|driven
eat|ate|eaten
fall|fell|fallen
feed|fed|fed
feel|felt|felt
fight|fought|fought
find|found|found
flee|fled|fled
fling|flung|flung
fly|flew|flown
forbid|forbade|forbidden
forget|forgot|forgotten
forgive|forgave|forgiven
forsake|forsook|forsaken
freeze|froze|frozen
get|got|got
give|gave|given
go|went|gone
grind|ground|ground
grow|grew|grown
hang (a picture)|hung|hung
hang (a person)|hanged|hanged
hear|heard|heard
hide|hid|hidden
hit|hit|hit
hold|held|held
hurt|hurt|hurt
keep|kept|kept
know|knew|known
lay (put down)|laid|laid
lead|led|led
lend|lent|lent
let|let|let
lie (rest)|lay|lain
lie (say what is false)|lied|lied
lose|lost|lost
mean|meant|meant
ride|rode|ridden
ring|rang|rung
rise|rose|risen
run|ran|run
seek|sought|sought
sell|sold|sold
send|sent|sent
set|set|set
shake|shook|shaken
shed|shed|shed
shine|shone|shone
shoot|shot|shot
shrink|shrank|shrunk
sing|sang|sung
sink|sank|sunk
slide|slid|slid
sow|sowed|sown
speak|spoke|spoken
spend|spent|spent
spread|spread|spread
spring|sprang|sprung
steal|stole|stolen
sting|stung|stung
strike|struck|struck
strive|strove|striven
swear|swore|sworn
swim|swam|swum
swing|swung|swung
take|took|taken
teach|taught|taught
tear|tore|torn
think|thought|thought
throw|threw|thrown
tread|trod|trodden
wake|woke|woken
wear|wore|worn
weave|wove|woven
weep|wept|wept
win|won|won
wind|wound|wound
withdraw|withdrew|withdrawn
write|wrote|written
found (set up)|founded|founded
fell (cut down)|felled|felled"""

# noun | verb | adjective | adverb
FAMILIES = """success|succeed|successful|successfully
decision|decide|decisive|decisively
importance|-|important|importantly
difference|differ|different|differently
ability|enable|able|ably
strength|strengthen|strong|strongly
length|lengthen|long|-
width|widen|wide|widely
depth|deepen|deep|deeply
beauty|beautify|beautiful|beautifully
danger|endanger|dangerous|dangerously
courage|encourage|courageous|courageously
economy|economise|economic / economical|economically
competition|compete|competitive|competitively
efficiency|-|efficient|efficiently
confidence|confide|confident|confidently
creation|create|creative|creatively
information|inform|informative|informatively
production|produce|productive|productively
reliance|rely|reliable|reliably
responsibility|-|responsible|responsibly
significance|signify|significant|significantly
possibility|-|possible|possibly
necessity|necessitate|necessary|necessarily
analysis|analyse|analytical|analytically
growth|grow|growing|-
expansion|expand|expansive|expansively
improvement|improve|improved|-
employment|employ|employable|-
prosperity|prosper|prosperous|prosperously
sufficiency|suffice|sufficient|sufficiently
recognition|recognise|recognisable|recognisably
protection|protect|protective|protectively
continuity|continue|continuous|continuously
effect|effect (bring about)|effective|effectively
regulation|regulate|regulatory|-
finance|finance|financial|financially
benefit|benefit|beneficial|beneficially
stability|stabilise|stable|stably
existence|exist|existent|-
failure|fail|-|-
payment|pay|payable|-
inflation|inflate|inflationary|-
attraction|attract|attractive|attractively
violence|-|violent|violently
simplicity|simplify|simple|simply
clarity|clarify|clear|clearly
security|secure|secure|securely
freedom|free|free|freely
health|heal|healthy|healthily
height|heighten|high|highly (= very much)
action|act|active|actively
care|care|careful|carefully
help|help|helpful|helpfully
use|use|useful|usefully
knowledge|know|knowledgeable|knowledgeably"""

# adjective | adverb | note / example
ADVERBS = """quick|quickly|He ran quickly.
careful|carefully|Drive carefully.
sweet|sweetly|She sings sweetly.
easy|easily|He won easily.
happy|happily|They lived happily.
bad|badly|He played badly.
good|well|She sings well. (good is the adjective: a good singer)
real|really|It is really cold.
sure|surely|You will surely pass.
quiet|quietly|Sit quietly.
slow|slowly|Walk slowly.
regular|regularly|Exercise regularly.
serious|seriously|Take it seriously.
heavy|heavily|It rained heavily.
proper|properly|Do it properly.
immediate|immediately|Reply immediately.
complete|completely|I forgot completely.
hard|hard|He works hard. (hardly means 'almost not': He hardly works.)
fast|fast|She runs fast. ('fastly' is not a word.)
late|late|He came late. (lately means 'recently'.)
high|high|The kite flew high. (highly means 'very much': highly paid.)
near|near|Come near. (nearly means 'almost'.)
deep|deep / deeply|Dig deep. I am deeply hurt. (deeply for feelings)
close|close / closely|Stay close. Watch closely. (closely = carefully)
free|free / freely|Children travel free (= without paying). Speak freely (= without limits).
friendly|in a friendly way|She smiled in a friendly way. (friendly is only an adjective)
lovely, lonely, costly, likely, silly|no -ly adverb|Use a phrase: in a lovely way.
look / seem / appear + adjective|adjective, not adverb|She looks happy. (not happily)
feel / taste / smell / sound + adjective|adjective, not adverb|The food tastes delicious.
become / remain / grow / turn + adjective|adjective, not adverb|He grew angry. The weather turned cold."""

# phrase | example
PREP_ING = """fond of|She is fond of reading.
interested in|He is interested in painting.
good at|She is good at solving puzzles.
capable of|He is capable of running a bank.
afraid of|She is afraid of losing.
tired of|I am tired of waiting.
used to (be used to)|I am used to working late.
accustomed to|He is accustomed to travelling.
look forward to|I look forward to meeting you.
object to|They object to paying extra.
committed to|We are committed to serving customers.
with a view to|He saved money with a view to buying a house.
averse to|She is averse to taking risks.
confess to|He confessed to stealing the bag.
devoted to|She is devoted to helping the poor.
addicted to|He is addicted to gaming.
instead of|Walk instead of driving.
without|He left without saying goodbye.
before|Read the rules before signing.
after|After finishing work, he left.
on (= as soon as)|On hearing the news, she wept.
by (the means)|You can learn by practising daily.
besides|Besides teaching, she writes books.
in spite of / despite|Despite being ill, he came.
apart from|Apart from cooking, he sings.
thanks for / sorry for|Thanks for helping me.
insist on|She insisted on paying.
succeed in|He succeeded in passing.
prevent ... from|Rain prevented us from playing.
refrain from|Refrain from talking.
think of / about|I am thinking of resigning.
believe in|I believe in working hard.
responsible for|He is responsible for checking the cash.
famous for|He is famous for telling jokes.
accuse ... of|They accused him of cheating.
prohibit ... from|Minors are prohibited from driving.
keen on|She is keen on learning French.
aim at|The plan aims at reducing costs.
engaged in|They are engaged in building roads.
persist in|He persisted in asking questions.
excuse for|There is no excuse for being late.
apologise for|He apologised for coming late."""

def rows(block):
    return [[c.strip() for c in ln.split("|")] for ln in block.strip().splitlines()]

def bank_text():
    out = []
    for b in ("guidely", "sreedhar"):
        sets = json.load(open(os.path.join(DATA, b, "sets.json"), encoding="utf-8"))
        for q in json.load(open(os.path.join(DATA, b, "questions.json"), encoding="utf-8")):
            if sets.get(q["set"], {}).get("section") != "English": continue
            out.append(" ".join([q.get("passage") or "", q.get("stem") or "", " ".join((q.get("options") or {}).values()), q.get("solution") or ""]).lower())
    return out

def stem_re(word, prep):
    w = word.lower()
    base = w[:-1] if w.endswith("e") else w
    base = re.sub(r"(y)$", "", base)
    return re.compile(r"\b" + re.escape(base) + r"\w{0,4}\s+" + re.escape(prep) + r"\b")

def main():
    texts = bank_text()
    preps = []
    for w, p, ex in rows(PREPS):
        rx = stem_re(w, p)
        n = sum(1 for t in texts if rx.search(t))
        preps.append([w + " " + p, ex, n])
    preps.sort(key=lambda r: (-r[2], r[0]))
    more = {
        "fixed-prep": {"title": "Fixed prepositions, most seen in the banks first", "cols": ["Word + preposition", "Example", "Seen in bank English questions"],
                        "rows": [[a, b, str(c) if c else "-"] for a, b, c in preps],
                        "note": "Counts are how many English questions in the banks contain the pair (in a sentence, an option or a solution), not how often it was the answer."},
        "tense-seq": {"title": "Tense patterns", "cols": ["When the sentence has", "Use", "Example"], "rows": rows(TENSE)},
        "sva-basic": {"title": "Tricky subjects", "cols": ["Subject", "Verb", "Example"], "rows": rows(SVA)},
        "v3": {"title": "Irregular verbs: base, past (V2), past participle (V3)", "cols": ["V1", "V2", "V3 (after has / have / had / be)"], "rows": rows(VERBS),
               "note": "After has, have or had, and in the passive, always the third column: has begun, was written, had risen."},
        "word-class": {"title": "Word families", "cols": ["Noun", "Verb", "Adjective", "Adverb"], "rows": rows(FAMILIES),
                       "note": "A noun is described by an adjective, a verb by an adverb. '-' means there is no common form."},
        "adverb": {"title": "Adjective or adverb", "cols": ["Adjective", "Adverb", "Example or trap"], "rows": rows(ADVERBS)},
        "prep-ing": {"title": "Preposition + -ing", "cols": ["Phrase", "Example"], "rows": rows(PREP_ING),
                     "note": "In look forward to, object to, be used to, committed to, with a view to, averse to, confess to, devoted to and addicted to, 'to' is a preposition, so -ing follows."},
    }
    p = os.path.join(DATA, "english", "grammar.json")
    g = json.load(open(p, encoding="utf-8"))
    byn = {102: "fixed-prep", 62: "tense-seq", 20: "sva-basic", 65: "v3", 51: "word-class", 52: "adverb", 77: "prep-ing"}
    for r in g["rules"]:
        if r["n"] in byn:
            r["more"] = more[byn[r["n"]]]
            print("rule %d: %s, %d rows" % (r["n"], r["more"]["title"], len(r["more"]["rows"])))
    json.dump(g, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    seen = sum(1 for r in preps if r[2])
    print("prepositions seen in the banks: %d of %d" % (seen, len(preps)))

main()
