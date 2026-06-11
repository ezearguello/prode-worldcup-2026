// ============================================================================
//  Seed del fixture 2026 — carga los 104 partidos reales en Supabase.
//  Uso:
//    SUPABASE_URL=...  SUPABASE_SERVICE_ROLE=...  node supabase/seed_fixture.mjs
//  El service_role key bypassa RLS (es de servidor: NUNCA lo pongas en el front).
// ============================================================================
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE;
if (!URL || !KEY) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE en el entorno.");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(here, "fixture_2026.json"), "utf8"));

const STAGE = (round) => {
  if (round.startsWith("Matchday")) return "group";
  return {
    "Round of 32": "r32", "Round of 16": "r16", "Quarter-final": "qf",
    "Semi-final": "sf", "Match for third place": "third", "Final": "final",
  }[round] || "group";
};

// "13:00 UTC-6" -> Date en UTC.  hora local en UTC-6 => UTC = local - (-6) = +6.
function toUTC(date, time) {
  const m = time.match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/);
  const [y, mo, d] = date.split("-").map(Number);
  if (!m) return new Date(`${date}T${time.slice(0, 5)}:00Z`);
  const hh = +m[1], mm = +m[2], off = +m[3];
  return new Date(Date.UTC(y, mo - 1, d, hh - off, mm));
}

const rows = raw.matches.map((x, i) => {
  const stage = STAGE(x.round);
  return {
    id: i + 1,
    stage,
    group_label: x.group ? x.group.replace("Group ", "") : null,
    round_label: x.round,
    team1: x.team1,
    team2: x.team2,
    is_placeholder: stage !== "group",
    venue: x.ground || null,
    kickoff: toUTC(x.date, x.time).toISOString(),
    status: "scheduled",
  };
});

const db = createClient(URL, KEY, { auth: { persistSession: false } });

console.log(`Cargando ${rows.length} partidos…`);
const { error } = await db.from("matches").upsert(rows, { onConflict: "id" });
if (error) { console.error("Error:", error.message); process.exit(1); }

const grupo = rows.filter((r) => r.stage === "group").length;
console.log(`✓ Listo. ${grupo} de fase de grupos + ${rows.length - grupo} de eliminatorias.`);
console.log(`  Primer partido: ${rows[0].team1} vs ${rows[0].team2} — ${rows[0].kickoff}`);
