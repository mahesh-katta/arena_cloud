"""Full lists for the grammar rules matched 10 or more times beyond the first seven
(see core_lists.py). Written into data/english/grammar.json as each rule's "more" table.

    python3 -B tools/english/core_lists2.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "..", "..", "data", "english", "grammar.json")

def rows(block):
    return [[c.strip() for c in ln.split("|")] for ln in block.strip().splitlines()]

LISTS = {
68: ("Modals: meaning and form", ["Modal", "Meaning", "Example"], """
can|ability, permission (informal)|She can speak French.
could|past ability, polite request, possibility|Could you help me?
may|permission (formal), possibility|It may rain today.
might|weaker possibility; past of may in reported speech|He might be late.
must|necessity, a sure guess|You must wear a helmet.
should|advice, duty|You should save money.
ought to|duty (the only modal with 'to')|You ought to respect elders.
shall|future with I / we; offers|Shall I open the window?
will|future, willingness|I will help you.
would|polite request, past habit, unreal result|He would walk to school every day.
need (as a modal)|necessity, in negatives and questions; no -s, no 'to'|You need not come. (not 'need not to come')
dare (as a modal)|courage, in negatives and questions; no 'to'|How dare he speak like that?
used to|past habit; takes 'to'|He used to smoke.
must have + V3|sure guess about the past|She must have left already.
should have + V3|right thing not done in the past|You should have told me.
could have + V3|past possibility not used|We could have won.
may / might have + V3|possibility about the past|He may have missed the bus.
need not have + V3|did something that was not necessary|You need not have waited.
modal + be + V3|passive with a modal|The work must be finished today.
modal + base verb|never -s, never 'to', never V2|She can sing. (not can sings / can to sing / can sang)"""),

74: ("Verb + to-infinitive, verb + -ing, and verbs that take both", ["Verb", "Pattern", "Example"], """
afford|to + verb|We cannot afford to buy a car.
agree|to + verb|He agreed to help.
aim|to + verb|We aim to finish by May.
appear|to + verb|She appears to be tired.
arrange|to + verb|They arranged to meet at six.
attempt|to + verb|He attempted to escape.
choose|to + verb|She chose to stay.
claim|to + verb|He claims to know the minister.
decide|to + verb|I decided to resign.
deserve|to + verb|She deserves to win.
expect|to + verb|We expect to finish soon.
fail|to + verb|He failed to reply.
hesitate|to + verb|Do not hesitate to ask.
hope|to + verb|I hope to see you.
intend|to + verb|She intends to study law.
learn|to + verb|He learnt to swim.
manage|to + verb|We managed to win.
offer|to + verb|She offered to drive.
plan|to + verb|They plan to expand.
pretend|to + verb|He pretended to sleep.
promise|to + verb|He promised to come.
refuse|to + verb|She refused to sign.
seem|to + verb|He seems to be busy.
tend|to + verb|Prices tend to rise.
threaten|to + verb|They threatened to strike.
want / wish|to + verb|I want to leave.
admit|-ing|He admitted stealing the money.
avoid|-ing|Avoid eating late.
consider|-ing|She is considering moving.
delay / postpone|-ing|They postponed signing.
deny|-ing|He denied taking it.
enjoy|-ing|I enjoy reading.
finish|-ing|Finish writing first.
give up|-ing|He gave up smoking.
imagine|-ing|Imagine living there.
keep|-ing|Keep trying.
mind|-ing|Do you mind waiting?
miss|-ing|I miss playing cricket.
practise|-ing|She practises singing daily.
quit|-ing|He quit drinking.
recommend|-ing|I recommend booking early.
risk|-ing|Do not risk losing it.
suggest|-ing|He suggested leaving early. (or: suggested that we leave)
can't help|-ing|I can't help laughing.
stop|both; meaning changes|He stopped smoking (gave it up). He stopped to smoke (paused in order to smoke).
remember|both; meaning changes|Remember to lock the door (a future duty). I remember locking it (a memory).
forget|both; meaning changes|Don't forget to call (future). I'll never forget meeting her (past).
try|both; meaning changes|Try to lift it (make an effort). Try adding salt (as an experiment).
regret|both; meaning changes|I regret to tell you (giving bad news). I regret telling him (sorry it happened).
begin / start / continue / like / prefer|both; same meaning|It began to rain. / It began raining."""),

8: ("Determiners and the noun after them", ["Determiner", "Noun after it", "Example"], """
a / an|singular countable|a branch, an hour
each / every|singular countable|every branch, each student
either / neither|singular countable|either side, neither answer
one of the / each of the / either of the / neither of the|plural noun|one of the branches
many|plural countable|many branches
several|plural countable|several reasons
few / a few|plural countable|a few people
both|plural countable|both hands
these / those|plural countable|these files
various / numerous|plural countable|various options
a number of / the number of|plural countable|a number of complaints
a couple of / a pair of|plural noun|a couple of days
two, three ... (any number above one)|plural noun|three years
much|uncountable|much money
little / a little|uncountable|a little sugar
less|uncountable (fewer for countable)|less water, fewer bottles
an amount of / a great deal of|uncountable|a great deal of time
a lot of / lots of / plenty of / some / any / all / no / most|countable plural or uncountable|a lot of people, a lot of money
another|singular countable|another chance
other|plural or uncountable|other banks
enough|plural countable or uncountable|enough chairs, enough time"""),

22: ("Words that take a singular verb", ["Word or pattern", "Verb", "Example"], """
each|singular|Each has a vote.
each of + plural noun|singular|Each of the boys is here.
every + noun|singular|Every house has a garden.
every X and every Y / every X and Y|singular|Every boy and girl was given a book.
either / neither|singular|Neither is correct.
either of / neither of + plural noun|singular|Neither of the answers is correct.
everyone / everybody / everything|singular|Everybody knows him.
someone / somebody / something|singular|Something is wrong.
anyone / anybody / anything|singular|Is anybody there?
no one / nobody / nothing|singular|Nobody was hurt.
none of + uncountable|singular|None of the money is left.
many a + singular noun|singular|Many a student has failed.
more than one + singular noun|singular|More than one bank has closed.
one of + plural noun|singular|One of the branches is closed.
the number of + plural noun|singular|The number of cases is rising.
whoever / whatever / whichever|singular|Whoever comes is welcome."""),

9: ("Which pronoun goes with which noun", ["When the noun is", "Use", "Example"], """
plural noun|they / them / their|The players thanked their coach.
singular person (male / female)|he / she, his / her|The manager gave his speech.
each / every / either / neither / one of + people|his or her (formal); exam keys often accept 'his'|Each of the girls has done her work.
everyone / everybody / anyone / no one|his or her (formal)|Everyone must do his or her duty.
one (the general person)|one, one's, oneself|One should keep one's promises.
collective noun as one unit|it / its|The committee gave its decision.
collective noun whose members act separately|they / their|The jury were divided in their opinions.
company, bank, government, country|it / its (as one body)|The bank raised its rates.
X or Y / X nor Y|the nearer noun|Neither the manager nor the clerks did their work.
X and Y (two people)|they / their|Ram and Sita did their best.
a thing or an animal|it / its, which|The dog wagged its tail.
reflexive after the same subject|myself, himself, themselves ...|She hurt herself."""),

16: ("Relative words: who, whom, whose, which, that, where, when", ["Word", "Used for", "Example"], """
who|a person, as the subject of the verb|The man who called is my uncle.
whom|a person, as the object or after a preposition|The man whom I met is a doctor. / to whom it may concern
whose|possession, for people and things|The girl whose bag was lost is here.
which|things and animals; also a whole earlier idea after a comma|The book which I bought is good. He failed, which upset us.
that|people or things in a defining clause; after superlatives, all, only, none, nothing|This is the best film that I have seen.
where|a place (= in which)|This is the town where I was born.
when|a time (= at which)|I remember the day when we met.
why|a reason (= for which)|That is the reason why he left.
no 'that' after a comma|use who / which in a non-defining clause|My father, who is a teacher, lives in Pune.
no 'which' for people|use who / that|The doctor who treated me was kind.
no extra pronoun after the relative|the relative already stands for the noun|The book which I read it was good. → The book which I read was good."""),

56: ("Uses of the simple present", ["Use", "Signal words", "Example"], """
habits and routines|always, usually, often, every day, never, generally|She goes to the gym every morning.
general truths and facts|(none needed)|Water boils at 100 degrees Celsius.
timetables and fixed schedules|at 6 pm, tomorrow (with a timetable)|The train leaves at 6 pm.
after time words for a future meaning|when, after, before, until, as soon as|I will call you when I reach.
after if / unless (first conditional)|if, unless|If it rains, we will stay in.
stative verbs (no -ing)|know, believe, own, belong, seem, contain|I know the answer.
headlines and summaries|(newspaper style)|PM opens new bridge.
instructions and directions|first, then|You turn left at the signal.
in reported speech for a universal truth|said that, taught that|He said that honesty pays.
with 'here' and 'there' at the start|here, there|Here comes the bus."""),

116: ("Keeping items parallel", ["Pattern", "Wrong", "Right"], """
a list of actions|She likes reading, writing and to swim.|She likes reading, writing and swimming.
a list of to-verbs|He wants to study, to work and travelling.|He wants to study, to work and to travel.
not only ... but also|He not only sings but also a dancer.|He is not only a singer but also a dancer.
either ... or|You can either pay now or later payment.|You can pay either now or later.
both ... and|She is both clever and works hard.|She is both clever and hard-working.
rather than / than|He prefers walking than to drive.|He prefers walking to driving.
comparisons|Swimming is better than to run.|Swimming is better than running.
a list of nouns and adjectives|The job needs patience, skill and being honest.|The job needs patience, skill and honesty.
two verbs with one auxiliary|He has never and will never cheat.|He has never cheated and will never cheat.
articles in a list of different things|a pen, notebook and an eraser|a pen, a notebook and an eraser
prepositions in a list|interested and good at maths|interested in and good at maths"""),

1: ("Uncountable nouns", ["Noun", "Wrong", "Right"], """
advice|advices, an advice|a piece of advice
information|informations|some information
furniture|furnitures|a piece of furniture
luggage / baggage|luggages|two pieces of luggage
equipment|equipments|some equipment
machinery|machineries|heavy machinery
scenery|sceneries|beautiful scenery
evidence|evidences|enough evidence
knowledge|knowledges|a good knowledge of English
news|a news|a piece of news
poetry|poetries|a poem
stationery|stationeries|some stationery
traffic|traffics|heavy traffic
work (effort)|works (meaning 'jobs')|a lot of work (works = factory or writings)
research|researches (in exams)|some research
progress|progresses|good progress
damage|damages (meaning harm)|much damage (damages = money paid by a court)
hair (on the head)|hairs|her hair is long (hairs = single strands)
money|moneys|much money
bread|breads|a loaf of bread
weather|a bad weather|bad weather
trouble|troubles (meaning difficulty)|much trouble
fun|a fun|great fun
homework|homeworks|a lot of homework
jewellery|jewelleries|some jewellery
mail|mails|some mail"""),

19: ("Look-alike pairs", ["Pair", "Meaning", "Example"], """
its / it's|its = belonging to it; it's = it is / it has|The bank cut its rates. It's late.
whose / who's|whose = belonging to whom; who's = who is / who has|Whose pen is this? Who's coming?
your / you're|your = belonging to you; you're = you are|Your bag. You're late.
their / there / they're|their = belonging to them; there = a place; they're = they are|Their car is there; they're inside.
than / then|than = comparison; then = next or at that time|She is taller than me. Then we left.
to / too|to = direction or infinitive; too = also, or more than enough|Too much salt. I want to go too.
lose / loose|lose = fail to keep; loose = not tight|Don't lose the key. The screw is loose.
of / off|of = belonging; off = away from|A cup of tea. Switch off the light."""),

79: ("-ing and -ed adjectives", ["-ing (what causes it)", "-ed (how a person feels)", "Example"], """
boring|bored|The lecture was boring, so I was bored.
interesting|interested|An interesting book; an interested reader.
exciting|excited|An exciting match; excited fans.
tiring|tired|A tiring day; a tired worker.
surprising|surprised|Surprising news; a surprised look.
shocking|shocked|A shocking result; shocked voters.
confusing|confused|Confusing rules; confused students.
disappointing|disappointed|A disappointing score; a disappointed team.
amazing|amazed|An amazing view; amazed tourists.
frightening|frightened|A frightening dream; a frightened child.
satisfying|satisfied|A satisfying meal; satisfied customers.
embarrassing|embarrassed|An embarrassing moment; an embarrassed boy.
worrying|worried|Worrying signs; worried parents.
annoying|annoyed|An annoying noise; annoyed neighbours.
depressing|depressed|Depressing news; depressed investors.
encouraging|encouraged|Encouraging results; encouraged staff.
alarming|alarmed|An alarming rise; alarmed officials.
relaxing|relaxed|A relaxing holiday; a relaxed mood.
convincing|convinced|A convincing reason; a convinced buyer.
overwhelming|overwhelmed|An overwhelming response; overwhelmed staff."""),

119: ("Superfluous words", ["Wrong (says it twice)", "Right", "Why"], """
return back|return|return already means 'go back'
revert back|revert|revert means 'go back'
repeat again|repeat|repeat means 'say again'
reply back|reply|reply already answers back
cousin brother / cousin sister|cousin|cousin covers both
each and every|each / every|one is enough
free gift|gift|a gift is already free
final outcome|outcome|an outcome is final
future plans|plans|plans are about the future
past history|history|history is the past
advance planning|planning|planning is done in advance
collaborate together|collaborate|collaborate means 'work together'
combine together|combine|combine means 'join together'
discuss about|discuss|discuss takes no 'about'
enter into (a room)|enter|enter means 'go into'
mutual cooperation|cooperation|cooperation is mutual
the reason is because|the reason is that|because repeats 'reason'
because ... so|because (or so)|use one linker, not two
although ... but|although|use one linker, not two
more better / most best|better / best|double comparison
seldom or ever|seldom, if ever|fixed phrase
equally as|equally / as|one is enough
true facts|facts|facts are true
sufficient enough|sufficient / enough|same meaning
very unique|unique|unique has no degrees
ascend up / descend down|ascend / descend|direction is in the verb
join together|join|join means 'put together'
end result|result|a result is the end
new innovation|innovation|an innovation is new"""),
}

def main():
    g = json.load(open(P, encoding="utf-8"))
    by = {r["n"]: r for r in g["rules"]}
    for n, (title, cols, block) in LISTS.items():
        rws = rows(block)
        assert all(len(r) == len(cols) for r in rws), (n, [r for r in rws if len(r) != len(cols)])
        by[n]["more"] = {"title": title, "cols": cols, "rows": rws}
        print("rule %d (%s): %s, %d rows" % (n, by[n]["title"], title, len(rws)))
    json.dump(g, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

main()
