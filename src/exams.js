/* The exams a student can choose, and how each one finds its mocks and its booster course.
   `match` lists the exam names used in the mock data; "Bank PO" style names are shared by several exams.
   `boost` says which Prelims score-booster course fits ("po" or "clerk"); Mains always gets the Mains bundle. */
const PM = ["Prelims", "Mains"];
export const EXAMS = [
  { id: "ibps-po", name: "IBPS PO", stages: PM, boost: "po", match: ["IBPS PO", "Bank PO", "SBI PO & IBPS PO"] },
  { id: "ibps-clerk", name: "IBPS Clerk", stages: PM, boost: "clerk", match: ["IBPS Clerk", "Bank Clerk"] },
  { id: "sbi-po", name: "SBI PO", stages: PM, boost: "po", match: ["SBI PO", "Bank PO", "SBI PO & IBPS PO"] },
  { id: "sbi-clerk", name: "SBI Clerk", stages: PM, boost: "clerk", match: ["SBI Clerk", "Bank Clerk", "SBI Clerk & RRB PO"] },
  { id: "ibps-rrb-po", name: "IBPS RRB PO", stages: PM, boost: "po", match: ["IBPS RRB PO", "SBI Clerk & RRB PO"] },
  { id: "ibps-rrb-clerk", name: "IBPS RRB Clerk", stages: PM, boost: "clerk", match: ["IBPS RRB Clerk"] },
  { id: "ibps-so", name: "IBPS SO", stages: ["Prelims"], boost: "po", match: ["IBPS SO"] },
  { id: "rbi-assistant", name: "RBI Assistant", stages: PM, match: ["RBI Assistant"] },
  { id: "rbi-office-attendant", name: "RBI Office Attendant", stages: [], match: ["RBI Office Attendant"] },
  { id: "lic-aao", name: "LIC AAO", stages: ["Prelims"], match: ["LIC AAO"] },
  { id: "lic-ado", name: "LIC ADO", stages: PM, match: ["LIC ADO"] },
  { id: "lic-hfl", name: "LIC HFL Jr Assistant", stages: [], match: ["LIC HFL Jr Assistant"] },
  { id: "nabard", name: "NABARD Development Assistant", stages: PM, match: ["NABARD Dev Asst"] },
  { id: "nicl", name: "NICL Assistant", stages: PM, match: ["NICL Assistant"] },
  { id: "uiic", name: "UIIC AO", stages: ["Prelims"], match: ["UIIC AO"] },
  { id: "lbo", name: "Local Bank Officer (LBO)", stages: [], match: ["Bank LBO", "IOB Local Bank Officer", "PNB LBO", "Punjab & Sind Bank LBO"] },
  { id: "sbi-bob-apprentice", name: "SBI & BOB Apprentice", stages: [], match: ["SBI & BOB Apprentice"] },
];

export const examById = (id) => EXAMS.find((e) => e.id === id);
export const profileId = (examId, stage) => examId + "--" + (stage ? stage.toLowerCase() : "all");
export const profileLabel = (pr) => (pr ? pr.examName + (pr.stage ? " · " + pr.stage : "") : "");

export const stageOf = (s) => (/mains/i.test(s || "") ? "Mains" : /prelim/i.test(s || "") ? "Prelims" : "");

/* Does a mock test (summary from index.json) belong to this profile? A test with no stage fits both stages. */
export function fits(pr, t) {
  if (!pr) return true;
  const e = examById(pr.exam);
  if (!e || !e.match.includes(t.exam)) return false;
  const s = stageOf(t.stage);
  return !s || !pr.stage || s === pr.stage;
}

/* Which booster course(s) a profile follows. Returns the groups from index.json; empty means none fits. */
export function boosterFor(pr, groups) {
  if (!pr) return groups;
  const e = examById(pr.exam);
  if (pr.stage === "Mains") return groups.filter((g) => /mains/i.test(g.id));
  if (!e || !e.boost) return [];
  return groups.filter((g) => /prelims/i.test(g.id) && g.id.includes(e.boost === "po" ? "bank-po" : "bank-clerk"));
}
