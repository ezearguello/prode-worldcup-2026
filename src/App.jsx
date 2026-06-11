import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase.js";

/* ---- equipos: nombre (openfootball) -> {es, bandera} ---- */
const TEAM = {
  Algeria:{es:"Argelia",f:"🇩🇿"}, Argentina:{es:"Argentina",f:"🇦🇷"}, Australia:{es:"Australia",f:"🇦🇺"},
  Austria:{es:"Austria",f:"🇦🇹"}, Belgium:{es:"Bélgica",f:"🇧🇪"}, "Bosnia & Herzegovina":{es:"Bosnia",f:"🇧🇦"},
  Brazil:{es:"Brasil",f:"🇧🇷"}, Canada:{es:"Canadá",f:"🇨🇦"}, "Cape Verde":{es:"Cabo Verde",f:"🇨🇻"},
  Colombia:{es:"Colombia",f:"🇨🇴"}, Croatia:{es:"Croacia",f:"🇭🇷"}, "Curaçao":{es:"Curazao",f:"🇨🇼"},
  "Czech Republic":{es:"Rep. Checa",f:"🇨🇿"}, "DR Congo":{es:"RD Congo",f:"🇨🇩"}, Ecuador:{es:"Ecuador",f:"🇪🇨"},
  Egypt:{es:"Egipto",f:"🇪🇬"}, England:{es:"Inglaterra",f:"🏴"}, France:{es:"Francia",f:"🇫🇷"},
  Germany:{es:"Alemania",f:"🇩🇪"}, Ghana:{es:"Ghana",f:"🇬🇭"}, Haiti:{es:"Haití",f:"🇭🇹"},
  Iran:{es:"Irán",f:"🇮🇷"}, Iraq:{es:"Irak",f:"🇮🇶"}, "Ivory Coast":{es:"Costa de Marfil",f:"🇨🇮"},
  Japan:{es:"Japón",f:"🇯🇵"}, Jordan:{es:"Jordania",f:"🇯🇴"}, Mexico:{es:"México",f:"🇲🇽"},
  Morocco:{es:"Marruecos",f:"🇲🇦"}, Netherlands:{es:"Países Bajos",f:"🇳🇱"}, "New Zealand":{es:"N. Zelanda",f:"🇳🇿"},
  Norway:{es:"Noruega",f:"🇳🇴"}, Panama:{es:"Panamá",f:"🇵🇦"}, Paraguay:{es:"Paraguay",f:"🇵🇾"},
  Portugal:{es:"Portugal",f:"🇵🇹"}, Qatar:{es:"Catar",f:"🇶🇦"}, "Saudi Arabia":{es:"Arabia Saudita",f:"🇸🇦"},
  Scotland:{es:"Escocia",f:"🏴󠁧󠁢󠁳󠁣󠁴󠁿"}, Senegal:{es:"Senegal",f:"🇸🇳"}, "South Africa":{es:"Sudáfrica",f:"🇿🇦"},
  "South Korea":{es:"Corea del Sur",f:"🇰🇷"}, Spain:{es:"España",f:"🇪🇸"}, Sweden:{es:"Suecia",f:"🇸🇪"},
  Switzerland:{es:"Suiza",f:"🇨🇭"}, Tunisia:{es:"Túnez",f:"🇹🇳"}, Turkey:{es:"Turquía",f:"🇹🇷"},
  USA:{es:"EE.UU.",f:"🇺🇸"}, Uruguay:{es:"Uruguay",f:"🇺🇾"}, Uzbekistan:{es:"Uzbekistán",f:"🇺🇿"},
};
const team = (n) => TEAM[n] || { es: n, f: "⚽" };
const fmtDate = (iso) => new Date(iso).toLocaleDateString("es-AR",
  { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("es-AR",
  { hour: "2-digit", minute: "2-digit" });

/* ====================== AUTH ====================== */
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password: pass, options: { data: { display_name: name || "Jugador" } },
        });
        if (error) throw error;
        setMsg({ ok: true, t: "Cuenta creada. Si pide confirmar email, revisá tu casilla." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      }
    } catch (e) { setMsg({ ok: false, t: e.message }); }
    setBusy(false);
  };

  return (
    <div className="wrap" style={{ maxWidth: 420, paddingTop: 60 }}>
      <h1 className="display" style={{ fontSize: 40, fontWeight: 800, margin: "0 0 4px" }}>
        EL PRODE <span style={{ color: "var(--pitch)" }}>’26</span>
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 24 }}>
        Pronosticá el Mundial y competí con tus amigos.
      </p>
      <div className="ticket" style={{ padding: 20 }}>
        <span className="perf-top" /><span className="perf-bot" />
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["login", "signup"].map((m) => (
            <button key={m} className="btn" onClick={() => setMode(m)}
              style={{ flex: 1, padding: "8px", fontSize: 13,
                background: mode === m ? "var(--ink)" : "transparent",
                color: mode === m ? "#fff" : "var(--muted)",
                border: mode === m ? "none" : "1.5px solid var(--line)" }}>
              {m === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          ))}
        </div>
        {mode === "signup" && (
          <input className="input" placeholder="Tu nombre en el grupo" value={name}
            onChange={(e) => setName(e.target.value)} style={{ marginBottom: 10 }} />
        )}
        <input className="input" type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: 10 }} />
        <input className="input" type="password" placeholder="Contraseña" value={pass}
          onChange={(e) => setPass(e.target.value)} style={{ marginBottom: 14 }}
          onKeyDown={(e) => e.key === "Enter" && submit()} />
        <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy} onClick={submit}>
          {busy ? "…" : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
        {msg && (
          <p style={{ fontSize: 13, marginTop: 12, marginBottom: 0,
            color: msg.ok ? "var(--pitchDk)" : "var(--hot)" }}>{msg.t}</p>
        )}
      </div>
    </div>
  );
}

/* ====================== LIGAS ====================== */
function LeaguePicker({ onPicked }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState(null);
  const run = async (rpc, arg) => {
    setErr(null);
    const { data, error } = await supabase.rpc(rpc, arg);
    if (error) return setErr(error.message);
    onPicked(data);
  };
  return (
    <div className="wrap" style={{ maxWidth: 460, paddingTop: 40 }}>
      <span className="eyebrow">Primer paso</span>
      <h2 className="display" style={{ fontSize: 26, fontWeight: 700, margin: "4px 0 20px" }}>
        Creá tu grupo o sumate a uno
      </h2>
      <div className="ticket" style={{ padding: 18, marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Crear grupo nuevo</div>
        <input className="input" placeholder="Nombre (ej. Los del asado)" value={name}
          onChange={(e) => setName(e.target.value)} style={{ marginBottom: 12 }} />
        <button className="btn btn-primary" style={{ width: "100%" }}
          disabled={!name.trim()} onClick={() => run("create_league", { p_name: name })}>
          Crear grupo
        </button>
      </div>
      <div className="ticket" style={{ padding: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Unirme con un código</div>
        <input className="input mono" placeholder="ABC123" value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6}
          style={{ marginBottom: 12, letterSpacing: ".1em" }} />
        <button className="btn btn-ghost" style={{ width: "100%" }}
          disabled={code.length < 4} onClick={() => run("join_league", { p_code: code })}>
          Unirme
        </button>
      </div>
      {err && <p style={{ color: "var(--hot)", fontSize: 13, marginTop: 12 }}>{err}</p>}
    </div>
  );
}

/* ====================== PRONÓSTICO (una fila) ====================== */
function MatchRow({ m, pred, onSave, league }) {
  const locked = new Date(m.kickoff) <= new Date();
  const finished = m.status === "finished";
  const [a, setA] = useState(pred ? pred.pred_home : 0);
  const [b, setB] = useState(pred ? pred.pred_away : 0);
  const [state, setState] = useState("idle"); // idle | saving | saved | err
  const [picks, setPicks] = useState(null);

  useEffect(() => { if (pred) { setA(pred.pred_home); setB(pred.pred_away); } }, [pred]);

  const save = async () => {
    setState("saving");
    const ok = await onSave(m.id, a, b);
    setState(ok ? "saved" : "err");
    if (ok) setTimeout(() => setState("idle"), 1500);
  };
  const showPicks = async () => {
    const { data, error } = await supabase.rpc("get_match_predictions",
      { p_match: m.id, p_league: league.id });
    if (!error) setPicks(data);
  };

  const t1 = team(m.team1), t2 = team(m.team2);
  const pts = finished && pred
    ? (pred.pred_home === m.home_score && pred.pred_away === m.away_score ? league.pts_exact
      : Math.sign(pred.pred_home - pred.pred_away) === Math.sign(m.home_score - m.away_score) ? league.pts_outcome : 0)
    : null;

  return (
    <div className="ticket" style={{ padding: "14px 16px 12px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span className="eyebrow">{m.round_label}{m.group_label ? ` · Grupo ${m.group_label}` : ""}</span>
        {finished ? <span className="chip" style={{ borderColor: "var(--pitch)", color: "var(--pitchDk)" }}>● Final {m.home_score}–{m.away_score}</span>
          : locked ? <span className="chip" style={{ color: "var(--muted)" }}>🔒 Cerrado</span>
          : <span className="chip mono" style={{ borderColor: "var(--hot)", color: "var(--hot)", fontSize: 11 }}>ABIERTO</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
        <div style={{ textAlign: "center" }}>
          <div className="flag">{t1.f}</div>
          <div className="display" style={{ fontWeight: 700, fontSize: 14 }}>{t1.es}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {locked ? (
            <span className="mono" style={{ fontSize: 26, fontWeight: 700 }}>
              {pred ? `${pred.pred_home}–${pred.pred_away}` : "·–·"}
            </span>
          ) : (
            <>
              <Stepper v={a} on={setA} />
              <span className="display" style={{ fontSize: 20, color: "var(--muted)" }}>:</span>
              <Stepper v={b} on={setB} />
            </>
          )}
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="flag">{t2.f}</div>
          <div className="display" style={{ fontWeight: 700, fontSize: 14 }}>{t2.es}</div>
        </div>
      </div>

      <div style={{ borderTop: "1px dashed var(--line)", marginTop: 12, paddingTop: 10,
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {fmtDate(m.kickoff)} · {fmtTime(m.kickoff)} hs{m.venue ? ` · ${m.venue}` : ""}
        </span>
        {!locked && (
          <button className="btn btn-ghost" style={{ padding: "6px 12px" }} onClick={save}>
            {state === "saving" ? "Guardando…" : state === "saved" ? "✓ Guardado"
              : state === "err" ? "Error" : pred ? "Actualizar" : "Guardar pronóstico"}
          </button>
        )}
        {finished && pred != null && (
          <span className="mono" style={{ fontWeight: 700, fontSize: 14,
            color: pts > 0 ? "var(--pitchDk)" : "var(--muted)" }}>
            tu {pred.pred_home}–{pred.pred_away} · {pts > 0 ? `+${pts}` : "0"} pts
          </span>
        )}
        {locked && !picks && (
          <button className="btn btn-ghost" style={{ padding: "6px 12px" }} onClick={showPicks}>Ver picks del grupo</button>
        )}
      </div>

      {picks && (
        <div style={{ marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
          {picks.length === 0 ? <span style={{ fontSize: 12, color: "var(--muted)" }}>Nadie pronosticó este partido.</span>
            : picks.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}>
                <span>{p.display_name}</span>
                <span className="mono">{p.pred_home}–{p.pred_away}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
function Stepper({ v, on }) {
  const set = (d) => on(Math.max(0, Math.min(20, v + d)));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <button className="step" onClick={() => set(1)} aria-label="más">▲</button>
      <div className="score-box">{v}</div>
      <button className="step" onClick={() => set(-1)} aria-label="menos">▼</button>
    </div>
  );
}

/* ====================== VISTAS ====================== */
function Predictions({ matches, preds, onSave, league }) {
  const [showFinished, setShowFinished] = useState(false);
  const now = new Date();
  const open = matches.filter((m) => new Date(m.kickoff) > now);
  const done = matches.filter((m) => new Date(m.kickoff) <= now);
  const list = showFinished ? done : open;

  // agrupar por fecha
  const groups = {};
  list.forEach((m) => { const k = fmtDate(m.kickoff); (groups[k] ||= []).push(m); });

  return (
    <div className="rise">
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className="btn" onClick={() => setShowFinished(false)}
          style={{ flex: 1, padding: 10, fontSize: 13, background: !showFinished ? "var(--pitch)" : "transparent",
            color: !showFinished ? "#fff" : "var(--muted)", border: !showFinished ? "none" : "1.5px solid var(--line)" }}>
          Por jugar ({open.length})
        </button>
        <button className="btn" onClick={() => setShowFinished(true)}
          style={{ flex: 1, padding: 10, fontSize: 13, background: showFinished ? "var(--pitch)" : "transparent",
            color: showFinished ? "#fff" : "var(--muted)", border: showFinished ? "none" : "1.5px solid var(--line)" }}>
          Jugados ({done.length})
        </button>
      </div>
      {list.length === 0 && <p style={{ color: "var(--muted)", textAlign: "center" }}>No hay partidos acá todavía.</p>}
      {Object.entries(groups).map(([day, ms]) => (
        <div key={day}>
          <div className="eyebrow" style={{ margin: "10px 0 10px" }}>{day}</div>
          {ms.map((m) => <MatchRow key={m.id} m={m} pred={preds[m.id]} onSave={onSave} league={league} />)}
        </div>
      ))}
    </div>
  );
}

function Leaderboard({ league, meId }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    supabase.rpc("get_leaderboard", { p_league: league.id })
      .then(({ data }) => setRows(data || []));
  }, [league.id]);
  if (!rows) return <p style={{ color: "var(--muted)" }}>Cargando tabla…</p>;
  const max = Math.max(1, ...rows.map((r) => Number(r.points)));
  return (
    <div className="ticket rise">
      <span className="perf-top" /><span className="perf-bot" />
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
        <div className="eyebrow">Grupo · {league.name}</div>
        <div className="display" style={{ fontSize: 19, fontWeight: 700 }}>Tabla de posiciones</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
          Código para invitar: <span className="mono" style={{ fontWeight: 700 }}>{league.join_code}</span> ·
          puntaje {league.pts_exact}/{league.pts_outcome}
        </div>
      </div>
      {rows.map((r, i) => {
        const you = r.user_id === meId;
        return (
          <div key={r.user_id} style={{ display: "grid", gridTemplateColumns: "30px 1fr auto",
            alignItems: "center", gap: 10, padding: "11px 16px",
            borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none",
            background: you ? "rgba(30,122,77,.06)" : "transparent" }}>
            <span className="mono display" style={{ fontSize: 18, fontWeight: 700,
              color: i === 0 ? "var(--gold)" : "var(--muted)" }}>{i + 1}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {r.display_name}{you && <span style={{ color: "var(--pitch)" }}> · vos</span>}
              </div>
              <div style={{ height: 5, borderRadius: 3, marginTop: 5, background: "var(--line)", maxWidth: 220, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(Number(r.points) / max) * 100}%`,
                  background: you ? "var(--pitch)" : "var(--celeste)", transition: "width .5s" }} />
              </div>
            </div>
            <span className="mono" style={{ fontSize: 17, fontWeight: 700 }}>{r.points}</span>
          </div>
        );
      })}
    </div>
  );
}

function Admin({ matches, onResult }) {
  const [q, setQ] = useState("");
  const list = matches.filter((m) =>
    `${team(m.team1).es} ${team(m.team2).es} ${m.round_label}`.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 40);
  return (
    <div className="rise">
      <div className="ticket" style={{ padding: 14, marginBottom: 14, background: "rgba(217,148,43,.10)" }}>
        <b>Panel admin.</b> Cargá el resultado final de cada partido jugado. Eso recalcula la tabla de todas las ligas.
      </div>
      <input className="input" placeholder="Buscar partido…" value={q}
        onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 14 }} />
      {list.map((m) => <AdminRow key={m.id} m={m} onResult={onResult} />)}
    </div>
  );
}
function AdminRow({ m, onResult }) {
  const [h, setH] = useState(m.home_score ?? 0);
  const [a, setA] = useState(m.away_score ?? 0);
  const [s, setS] = useState("idle");
  const save = async () => {
    setS("saving"); const ok = await onResult(m.id, h, a); setS(ok ? "ok" : "err");
    setTimeout(() => setS("idle"), 1500);
  };
  return (
    <div className="ticket" style={{ padding: "10px 14px", marginBottom: 8, display: "flex",
      alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>
        {team(m.team1).f} {team(m.team1).es} vs {team(m.team2).es} {team(m.team2).f}
        {m.status === "finished" && <span style={{ color: "var(--pitchDk)" }}> · cargado</span>}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input className="input mono" style={{ width: 48, padding: 6, textAlign: "center" }}
          value={h} onChange={(e) => setH(+e.target.value || 0)} />
        <span>:</span>
        <input className="input mono" style={{ width: 48, padding: 6, textAlign: "center" }}
          value={a} onChange={(e) => setA(+e.target.value || 0)} />
        <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={save}>
          {s === "saving" ? "…" : s === "ok" ? "✓" : s === "err" ? "✗" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

/* ====================== APP ====================== */
export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [league, setLeague] = useState(null);
  const [matches, setMatches] = useState([]);
  const [preds, setPreds] = useState({});
  const [tab, setTab] = useState("jugar");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadAll = useCallback(async (uid) => {
    const [{ data: prof }, { data: lgs }, { data: ms }, { data: ps }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).single(),
      supabase.from("leagues").select("*").order("created_at"),
      supabase.from("matches").select("*").order("kickoff"),
      supabase.from("predictions").select("*").eq("user_id", uid),
    ]);
    setProfile(prof); setLeagues(lgs || []); setMatches(ms || []);
    const map = {}; (ps || []).forEach((p) => (map[p.match_id] = p)); setPreds(map);
    if (lgs && lgs.length) setLeague((cur) => cur || lgs[0]);
  }, []);

  useEffect(() => { if (session?.user) loadAll(session.user.id); }, [session, loadAll]);

  const savePred = async (matchId, h, a) => {
    const { error } = await supabase.from("predictions").upsert(
      { user_id: session.user.id, match_id: matchId, pred_home: h, pred_away: a, updated_at: new Date().toISOString() },
      { onConflict: "user_id,match_id" }
    );
    if (error) { console.error(error); return false; }
    setPreds((p) => ({ ...p, [matchId]: { ...p[matchId], pred_home: h, pred_away: a } }));
    return true;
  };
  const saveResult = async (matchId, h, a) => {
    const { error } = await supabase.from("matches")
      .update({ home_score: h, away_score: a, status: "finished" }).eq("id", matchId);
    if (error) { console.error(error); return false; }
    setMatches((ms) => ms.map((m) => m.id === matchId ? { ...m, home_score: h, away_score: a, status: "finished" } : m));
    return true;
  };

  if (session === undefined) return <div className="wrap" style={{ paddingTop: 80, color: "var(--muted)" }}>Cargando…</div>;
  if (!session) return <AuthScreen />;
  if (!profile) return <div className="wrap" style={{ paddingTop: 80, color: "var(--muted)" }}>Preparando tu perfil…</div>;
  if (!league) return <LeaguePicker onPicked={(lg) => { setLeagues((l) => [...l, lg]); setLeague(lg); }} />;

  const isAdmin = profile.is_site_admin;
  const tabs = [["jugar", "Pronósticos"], ["tabla", "Tabla"], ...(isAdmin ? [["admin", "Resultados"]] : [])];

  return (
    <div className="wrap">
      <header style={{ padding: "22px 0 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <h1 className="display" style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>
          EL PRODE <span style={{ color: "var(--pitch)" }}>’26</span>
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select className="input" style={{ width: "auto", padding: "8px 10px", fontSize: 13 }}
            value={league.id} onChange={(e) => setLeague(leagues.find((l) => l.id === e.target.value))}>
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            <option value="__new">+ Otro grupo…</option>
          </select>
          <button className="btn btn-ghost" style={{ padding: "8px 10px" }}
            onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </header>

      {league.id === "__new"
        ? <LeaguePicker onPicked={(lg) => { setLeagues((l) => [...l, lg]); setLeague(lg); }} />
        : <>
            <div className="ticket" style={{ display: "flex", marginBottom: 20, overflow: "hidden" }}>
              {tabs.map(([k, lbl]) => (
                <button key={k} className="tab" data-on={tab === k} onClick={() => setTab(k)}>{lbl}</button>
              ))}
            </div>
            {tab === "jugar" && <Predictions matches={matches} preds={preds} onSave={savePred} league={league} />}
            {tab === "tabla" && <Leaderboard league={league} meId={session.user.id} />}
            {tab === "admin" && isAdmin && <Admin matches={matches} onResult={saveResult} />}
          </>}

      <footer style={{ textAlign: "center", marginTop: 40, fontSize: 11.5, color: "var(--muted)" }}>
        El Prode ’26 · datos del fixture: openfootball · v1 partido a partido
      </footer>
    </div>
  );
}
