import { useEffect, useState } from "react";
import { Shield, LogOut, Plus, Users, ArrowLeft, Camera, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import MatchDayView from "./MatchDay.jsx";
import DocumentsView from "./Documents.jsx";
import TrainingSessionView from "./TrainingSession.jsx";

const POSITIONS = ["GK", "RB", "CB", "LB", "RM", "CM", "LM", "RW", "ST", "LW"];

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function sortByNumber(players) {
  return [...players].sort((a, b) => {
    const na = a.number === "" || a.number === null || a.number === undefined ? Infinity : Number(a.number);
    const nb = b.number === "" || b.number === null || b.number === undefined ? Infinity : Number(b.number);
    return na - nb;
  });
}

function PlayerCard({ player, onOpen }) {
  return (
    <button className="glass-card flex flex-col items-center text-center p-4" onClick={() => onOpen(player)}>
      <div
        className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 border-2 mb-3 flex items-center justify-center"
        style={{ borderColor: "var(--accent)", background: "rgba(255,255,255,0.04)" }}
      >
        {player.photo_url ? (
          <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
        ) : (
          <Users className="w-8 h-8" style={{ color: "var(--muted)" }} />
        )}
      </div>
      <div className="font-medium truncate w-full">{player.name || "Unnamed player"}</div>
      <div className="text-xs mt-1 flex items-center justify-center gap-2" style={{ color: "var(--muted)" }}>
        <span className="font-mono">#{player.number || "—"}</span>
        <span>·</span>
        <span>Age {player.age || "—"}</span>
      </div>
      <div className="text-xs mt-1 font-mono px-2 py-0.5 rounded-full" style={{ color: "var(--accent)", background: "rgba(46,124,246,0.12)" }}>
        {player.position}
      </div>
    </button>
  );
}

function InviteParent({ teamId, playerId }) {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generateInvite = async () => {
    setLoading(true);
    setError("");
    setCopied(false);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("invites")
      .insert({ team_id: teamId, role: "parent", player_id: playerId, created_by: userData.user.id })
      .select()
      .single();
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setLink(`${window.location.origin}${window.location.pathname}?invite=${data.id}`);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel p-6 mt-6">
      <h2 className="font-display text-lg mb-1">Parents</h2>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        Generate a link for this player's parent — they'll be linked to this
        child specifically, not the whole team.
      </p>
      {!link ? (
        <button className="btn-accent px-4 py-2 rounded-lg text-sm" onClick={generateInvite} disabled={loading}>
          {loading ? "Generating…" : "Generate parent invite link"}
        </button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <input className="input-dark flex-1 font-mono text-xs" value={link} readOnly onFocus={(e) => e.target.select()} />
          <button className="btn-ghost px-4 py-2 rounded-lg text-sm flex-shrink-0" onClick={copyLink}>
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}
      {error && <p className="text-sm mt-2" style={{ color: "#f28f8a" }}>{error}</p>}
    </div>
  );
}

const PLAN_STATUSES = [
  { id: "needs_practice", label: "Needs practice", color: "#E8433D" },
  { id: "improving", label: "Improving", color: "#F2A31D" },
  { id: "mastered", label: "Mastered", color: "#1FB65A" },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function TrainingPlanEditor({ playerId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("training_plans")
      .select("rows")
      .eq("player_id", playerId)
      .maybeSingle()
      .then(({ data }) => {
        setRows(data?.rows?.length ? data.rows : Array.from({ length: 5 }, () => ({ id: uid(), title: "", content: "", status: "needs_practice" })));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const save = async (nextRows) => {
    setSaving(true);
    setError("");
    const { error } = await supabase
      .from("training_plans")
      .upsert({ player_id: playerId, rows: nextRows }, { onConflict: "player_id" });
    setSaving(false);
    if (error) setError(error.message);
  };

  const updateRow = (id, patch) => {
    const next = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setRows(next);
  };

  const removeRow = (id) => {
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    save(next);
  };

  const addRow = () => {
    const next = [...rows, { id: uid(), title: "", content: "", status: "needs_practice" }];
    setRows(next);
  };

  return (
    <div className="glass-panel p-6 mt-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-lg">Training plan</h2>
        <button className="btn-accent px-3 py-1.5 rounded-lg text-xs" onClick={() => save(rows)} disabled={saving}>
          {saving ? "Saving…" : "Save plan"}
        </button>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        Only this player's own parent can see this — everything else on the team
        stays visible to all parents.
      </p>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const status = PLAN_STATUSES.find((s) => s.id === row.status) || PLAN_STATUSES[0];
            return (
              <div key={row.id} className="glass-card p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    className="input-dark flex-1 min-w-0"
                    placeholder="Title (e.g. First touch)"
                    value={row.title}
                    onChange={(e) => updateRow(row.id, { title: e.target.value })}
                  />
                  <input
                    className="input-dark flex-[2] min-w-0"
                    placeholder="Details / notes"
                    value={row.content}
                    onChange={(e) => updateRow(row.id, { content: e.target.value })}
                  />
                  <button className="opacity-50 hover:opacity-100 flex-shrink-0" onClick={() => removeRow(row.id)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {PLAN_STATUSES.map((s) => {
                    const active = status.id === s.id;
                    return (
                      <button
                        key={s.id}
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{
                          background: active ? s.color : "rgba(255,255,255,0.06)",
                          color: active ? "#0b1223" : "var(--muted)",
                          fontWeight: active ? 700 : 400,
                        }}
                        onClick={() => updateRow(row.id, { status: s.id })}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <button className="btn-ghost w-full py-2 rounded-lg text-sm" onClick={addRow}>
            + Add row
          </button>
        </div>
      )}
      {error && <p className="text-sm mt-2" style={{ color: "#f28f8a" }}>{error}</p>}
    </div>
  );
}

function statTotals(stats) {
  const goalsTotal = stats.reduce((s, x) => s + (Number(x.goals) || 0), 0);
  const savesTotal = stats.reduce((s, x) => s + (Number(x.saves) || 0), 0);
  const tacklesTotal = stats.reduce((s, x) => s + (Number(x.tackles) || 0), 0);
  const captainTotal = stats.filter((x) => x.captain).length;
  const potmTotal = stats.filter((x) => x.potm).length;
  const minutesPlayedTotal = stats.reduce((s, x) => s + (Number(x.minutes) || 0), 0);
  const matchMinutesTotal = stats.reduce((s, x) => s + (Number(x.matchMinutes) || 0), 0);
  const minutesPct = matchMinutesTotal > 0 ? Math.round((minutesPlayedTotal / matchMinutesTotal) * 100) : null;
  return { goalsTotal, savesTotal, tacklesTotal, captainTotal, potmTotal, minutesPct };
}

function StatTotalsGrid({ stats }) {
  const t = statTotals(stats);
  const boxes = [
    { label: "Minutes played", value: t.minutesPct === null ? "—" : `${t.minutesPct}%` },
    { label: "Goals", value: t.goalsTotal },
    { label: "Saves", value: t.savesTotal },
    { label: "Tackles", value: t.tacklesTotal },
    { label: "Captain", value: t.captainTotal },
    { label: "Player of the match", value: t.potmTotal },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {boxes.map((b) => (
        <div key={b.label} className="glass-card p-4">
          <div className="text-2xl font-mono">{b.value}</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>{b.label}</div>
        </div>
      ))}
    </div>
  );
}

function WeeklyStatsEditor({ playerId }) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("players").select("stats").eq("id", playerId).single().then(({ data }) => {
      setStats(data?.stats || []);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const persist = async (next) => {
    setSaving(true);
    setError("");
    const { error } = await supabase.from("players").update({ stats: next }).eq("id", playerId);
    setSaving(false);
    if (error) setError(error.message);
  };

  const addWeek = () => {
    const next = [
      { id: uid(), date: new Date().toISOString().slice(0, 10), opponent: "", matchMinutes: 0, minutes: 0, goals: 0, tackles: 0, saves: 0, captain: false, potm: false },
      ...stats,
    ];
    setStats(next);
    persist(next);
  };

  const updateStat = (id, patch) => {
    setStats((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const removeStat = (id) => {
    const next = stats.filter((x) => x.id !== id);
    setStats(next);
    persist(next);
  };

  return (
    <div className="glass-panel p-6 mt-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-lg">Weekly stats</h2>
        <div className="flex gap-2">
          <button className="btn-accent px-3 py-1.5 rounded-lg text-xs" onClick={() => persist(stats)} disabled={saving}>
            {saving ? "Saving…" : "Save stats"}
          </button>
          <button className="btn-ghost px-3 py-1.5 rounded-lg text-xs" onClick={addWeek}>+ Add this week</button>
        </div>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        Visible to every parent on the team, not just this player's own parent.
      </p>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>
      ) : stats.length === 0 ? (
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>No stats logged yet.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 mb-2">
          {stats.map((s) => (
            <div key={s.id} className="glass-card p-4 w-64 flex-shrink-0 relative">
              <button className="absolute top-2 right-2 opacity-50 hover:opacity-100" onClick={() => removeStat(s.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <label className="text-[10px] uppercase" style={{ color: "var(--muted)" }}>Match date</label>
              <input type="date" className="input-dark w-full mb-2 mt-1 text-sm" value={s.date} onChange={(e) => updateStat(s.id, { date: e.target.value })} />
              <label className="text-[10px] uppercase" style={{ color: "var(--muted)" }}>Opponent</label>
              <input className="input-dark w-full mb-2 mt-1 text-sm" value={s.opponent} onChange={(e) => updateStat(s.id, { opponent: e.target.value })} />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[10px] uppercase" style={{ color: "var(--muted)" }}>Match mins</label>
                  <input type="number" className="input-dark w-full font-mono text-sm" value={s.matchMinutes || 0} onChange={(e) => updateStat(s.id, { matchMinutes: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] uppercase" style={{ color: "var(--muted)" }}>Mins played</label>
                  <input type="number" className="input-dark w-full font-mono text-sm" value={s.minutes || 0} onChange={(e) => updateStat(s.id, { minutes: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] uppercase" style={{ color: "var(--muted)" }}>Goals</label>
                  <input type="number" className="input-dark w-full font-mono text-sm" value={s.goals || 0} onChange={(e) => updateStat(s.id, { goals: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] uppercase" style={{ color: "var(--muted)" }}>Tackles</label>
                  <input type="number" className="input-dark w-full font-mono text-sm" value={s.tackles || 0} onChange={(e) => updateStat(s.id, { tackles: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] uppercase" style={{ color: "var(--muted)" }}>Saves</label>
                  <input type="number" className="input-dark w-full font-mono text-sm" value={s.saves || 0} onChange={(e) => updateStat(s.id, { saves: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
                  <input type="checkbox" checked={!!s.captain} onChange={(e) => updateStat(s.id, { captain: e.target.checked })} />
                  Captain
                </label>
                <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
                  <input type="checkbox" checked={!!s.potm} onChange={(e) => updateStat(s.id, { potm: e.target.checked })} />
                  Player of the match
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="font-display text-base mb-2 mt-2">Stat totals</h3>
      <StatTotalsGrid stats={stats} />

      {error && <p className="text-sm mt-2" style={{ color: "#f28f8a" }}>{error}</p>}
    </div>
  );
}

function PlayerDetail({ player, onBack, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    name: player.name || "",
    number: player.number || "",
    age: player.age || "",
    position: player.position || "GK",
  });
  const [photoUrl, setPhotoUrl] = useState(player.photo_url || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    setPhotoUrl(url);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    const { error } = await supabase
      .from("players")
      .update({ ...form, photo_url: photoUrl })
      .eq("id", player.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved({ ...player, ...form, photo_url: photoUrl });
  };

  const remove = async () => {
    if (!confirm(`Remove ${player.name || "this player"}? This can't be undone.`)) return;
    const { error } = await supabase.from("players").delete().eq("id", player.id);
    if (error) {
      setError(error.message);
      return;
    }
    onDeleted(player.id);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button className="text-sm flex items-center gap-1 mb-6" style={{ color: "var(--muted)" }} onClick={onBack}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to team
      </button>

      {error && <p className="text-sm mb-4" style={{ color: "#f28f8a" }}>{error}</p>}

      <div className="flex flex-col items-center mb-8">
        <label className="w-28 h-28 rounded-full relative group cursor-pointer overflow-hidden border-2 flex items-center justify-center" style={{ borderColor: "var(--accent)", background: "rgba(255,255,255,0.04)" }}>
          {photoUrl ? (
            <img src={photoUrl} alt={form.name} className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8" style={{ color: "var(--muted)" }} />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
            <Camera className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "white" }} />
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel p-4">
          <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Name</label>
          <input className="input-dark w-full mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="glass-panel p-4">
          <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Number</label>
          <input type="number" className="input-dark w-full mt-1 font-mono" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
        </div>
        <div className="glass-panel p-4">
          <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Age</label>
          <input type="number" className="input-dark w-full mt-1" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
        </div>
        <div className="glass-panel p-4">
          <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Position</label>
          <select className="input-dark w-full mt-1" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-accent px-5 py-2.5 rounded-lg" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button className="btn-ghost px-4 py-2.5 rounded-lg flex items-center gap-2" onClick={remove}>
          <Trash2 className="w-4 h-4" /> Remove player
        </button>
      </div>

      <InviteParent teamId={player.team_id} playerId={player.id} />

      <WeeklyStatsEditor playerId={player.id} />
    </div>
  );
}

function TeamRoster({ team, onOpenPlayer }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("players").select("*").eq("team_id", team.id);
    if (!error) setPlayers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id]);

  const addPlayer = async () => {
    setError("");
    const { data, error } = await supabase
      .from("players")
      .insert({ team_id: team.id, name: "New Player", position: "GK" })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setPlayers((p) => [...p, data]);
    onOpenPlayer(data, load);
  };

  const sorted = sortByNumber(players);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative">
      <h1 className="font-display text-2xl tracking-wide mb-6">{team.name}</h1>

      {error && <p className="text-sm mb-4" style={{ color: "#f28f8a" }}>{error}</p>}

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : sorted.length === 0 ? (
        <div className="glass-panel p-10 text-center" style={{ color: "var(--muted)" }}>
          No players yet. Use the + button to add your first player.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {sorted.map((p) => (
            <PlayerCard key={p.id} player={p} onOpen={(player) => onOpenPlayer(player, load)} />
          ))}
        </div>
      )}

      <button
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full btn-accent flex items-center justify-center"
        onClick={addPlayer}
        title="Add player"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

const RSVP_STATUSES = {
  pending: { label: "Pending", color: "var(--muted)" },
  attending: { label: "Attending", color: "#1FB65A" },
  not_attending: { label: "Not attending", color: "#E8433D" },
};
const RSVP_ORDER = ["pending", "attending", "not_attending"];

function EventForm({ teamId, onCreated, onCancel }) {
  const [form, setForm] = useState({ type: "training", title: "", date: "", time: "", location: "", opponent: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!form.date) return;
    setSaving(true);
    setError("");
    const { data, error } = await supabase.from("calendar_events").insert({ team_id: teamId, ...form }).select().single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onCreated(data);
  };

  return (
    <div className="glass-panel p-5 mb-6 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Type</label>
          <select className="input-dark w-full mt-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="training">Training</option>
            <option value="match">Match</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Title (optional)</label>
          <input className="input-dark w-full mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Date</label>
          <input type="date" className="input-dark w-full mt-1" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Time</label>
          <input type="time" className="input-dark w-full mt-1" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Location</label>
          <input className="input-dark w-full mt-1" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        {form.type === "match" && (
          <div>
            <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Opponent</label>
            <input className="input-dark w-full mt-1" value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} />
          </div>
        )}
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Notes</label>
        <input className="input-dark w-full mt-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      {error && <p className="text-sm" style={{ color: "#f28f8a" }}>{error}</p>}
      <div className="flex gap-2">
        <button className="btn-accent px-4 py-2 rounded-lg text-sm" onClick={save} disabled={saving || !form.date}>
          {saving ? "Saving…" : "Save event"}
        </button>
        <button className="btn-ghost px-4 py-2 rounded-lg text-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function EventCard({ event, players, editable, ownChildIds, onDeleted }) {
  const [expanded, setExpanded] = useState(false);
  const [rsvps, setRsvps] = useState(null);

  const loadRsvps = async () => {
    const { data } = await supabase.from("rsvps").select("*").eq("event_id", event.id);
    const map = {};
    (data || []).forEach((r) => { map[r.player_id] = r; });
    setRsvps(map);
  };

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !rsvps) loadRsvps();
  };

  const cycleStatus = async (playerId, current) => {
    const next = RSVP_ORDER[(RSVP_ORDER.indexOf(current || "pending") + 1) % RSVP_ORDER.length];
    if (editable) {
      await supabase.from("rsvps").upsert({ event_id: event.id, player_id: playerId, status: next }, { onConflict: "event_id,player_id" });
    } else if (ownChildIds?.has(playerId)) {
      await supabase.rpc("submit_rsvp", { p_event_id: event.id, p_player_id: playerId, p_status: next });
    } else {
      return;
    }
    loadRsvps();
  };

  const toggleAttended = async (playerId, current) => {
    await supabase.from("rsvps").upsert({ event_id: event.id, player_id: playerId, attended: !current }, { onConflict: "event_id,player_id" });
    loadRsvps();
  };

  const deleteEvent = async () => {
    if (!confirm("Delete this event?")) return;
    await supabase.from("calendar_events").delete().eq("id", event.id);
    onDeleted(event.id);
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-3">
        <button className="flex-1 text-left" onClick={toggle}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: event.type === "match" ? "rgba(232,67,61,0.18)" : "rgba(46,124,246,0.18)", color: event.type === "match" ? "#f28f8a" : "#8fb8ff" }}
            >
              {event.type === "match" ? "Match" : "Training"}
            </span>
          </div>
          <div className="font-display text-lg tracking-wide">
            {event.title || (event.type === "match" ? `vs ${event.opponent || "TBC"}` : "Training session")}
          </div>
          <div className="text-xs mt-1 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ color: "var(--muted)" }}>
            <span>{event.date}{event.time ? ` · ${event.time}` : ""}</span>
            {event.location && <span>{event.location}</span>}
          </div>
        </button>
        {editable && (
          <button className="opacity-50 hover:opacity-100 flex-shrink-0" onClick={deleteEvent}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 pt-4 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {event.notes && <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>{event.notes}</p>}
          {!rsvps ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>
          ) : players.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>No players on the squad yet.</p>
          ) : (
            players.map((p) => {
              const r = rsvps[p.id] || { status: "pending", attended: false };
              const meta = RSVP_STATUSES[r.status] || RSVP_STATUSES.pending;
              const canEdit = editable || ownChildIds?.has(p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <span className="text-sm flex-1">{p.name || "Unnamed"}</span>
                  <button
                    className="text-xs px-2.5 py-1 rounded-full disabled:cursor-default"
                    style={{ background: "rgba(255,255,255,0.06)", color: meta.color }}
                    onClick={() => canEdit && cycleStatus(p.id, r.status)}
                    disabled={!canEdit}
                  >
                    {meta.label}
                  </button>
                  {editable && (
                    <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
                      <input type="checkbox" checked={!!r.attended} onChange={() => toggleAttended(p.id, r.attended)} />
                      Attended
                    </label>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function TeamCalendar({ team, editable, ownChildIds }) {
  const [events, setEvents] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: ev }, { data: pl }] = await Promise.all([
      supabase.from("calendar_events").select("*").eq("team_id", team.id).order("date"),
      supabase.from("players").select("id, name, number").eq("team_id", team.id),
    ]);
    setEvents(ev || []);
    setPlayers(pl || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h1 className="font-display text-2xl tracking-wide">Calendar</h1>
        {editable && !showForm && (
          <button className="btn-accent px-4 py-2 rounded-lg text-sm" onClick={() => setShowForm(true)}>+ Add event</button>
        )}
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        {editable ? "Add fixtures and training, mark attendance after each one." : "Tap your own child's RSVP to update it — everyone else's is view only."}
      </p>

      {showForm && (
        <EventForm
          teamId={team.id}
          onCreated={(ev) => { setEvents((e) => [...e, ev].sort((a, b) => a.date.localeCompare(b.date))); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : events.length === 0 ? (
        <div className="glass-panel p-10 text-center" style={{ color: "var(--muted)" }}>No events on the calendar yet.</div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              players={players}
              editable={editable}
              ownChildIds={ownChildIds}
              onDeleted={(id) => setEvents((e) => e.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TrainingPlansTab({ team }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openPlayer, setOpenPlayer] = useState(null);

  useEffect(() => {
    supabase.from("players").select("*").eq("team_id", team.id).then(({ data }) => {
      setPlayers(data || []);
      setLoading(false);
    });
  }, [team.id]);

  if (openPlayer) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button className="text-sm flex items-center gap-1 mb-6" style={{ color: "var(--muted)" }} onClick={() => setOpenPlayer(null)}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to training plans
        </button>
        <h1 className="font-display text-2xl tracking-wide mb-6">{openPlayer.name || "Unnamed player"}</h1>
        <TrainingPlanEditor playerId={openPlayer.id} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl tracking-wide mb-6">Training Plans</h1>
      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : players.length === 0 ? (
        <div className="glass-panel p-10 text-center" style={{ color: "var(--muted)" }}>No players yet.</div>
      ) : (
        <div className="space-y-2">
          {sortByNumber(players).map((p) => (
            <button key={p.id} className="glass-card w-full flex items-center gap-3 p-3 text-left" onClick={() => setOpenPlayer(p)}>
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2" style={{ borderColor: "var(--accent)" }}>
                {p.photo_url ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" /> :
                  <Users className="w-4 h-4" style={{ color: "var(--muted)" }} />}
              </div>
              <span className="flex-1 font-medium">{p.name || "Unnamed player"}</span>
              <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>#{p.number || "—"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CoachTeamPage({ profile, onSignOut }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [activeTab, setActiveTab] = useState("team");
  const [openPlayer, setOpenPlayer] = useState(null);
  const [reloadRoster, setReloadRoster] = useState(null);

  useEffect(() => {
    supabase
      .from("coach_team_links")
      .select("teams(id, name, logo_url)")
      .eq("coach_id", profile.id)
      .then(({ data }) => {
        const list = (data || []).map((r) => r.teams).filter(Boolean);
        setTeams(list);
        if (list.length) setActiveTeamId(list[0].id);
        setLoading(false);
      });
  }, [profile]);

  const activeTeam = teams.find((t) => t.id === activeTeamId);

  const handleOpenPlayer = (player, reload) => {
    setOpenPlayer(player);
    setReloadRoster(() => reload);
  };

  const closePlayer = () => {
    setOpenPlayer(null);
    if (reloadRoster) reloadRoster();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-panel p-6 max-w-sm text-center">
          <p className="mb-4" style={{ color: "var(--muted)" }}>You're not linked to any team yet — ask your club for an invite link.</p>
          <button className="btn-accent px-4 py-2 rounded-lg" onClick={onSignOut}>Log out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between px-6 h-16" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5" style={{ color: "var(--accent)" }} />
          {teams.length > 1 ? (
            <select
              className="input-dark text-sm py-1.5"
              value={activeTeamId}
              onChange={(e) => setActiveTeamId(e.target.value)}
            >
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          ) : (
            <span className="font-display text-lg tracking-wide">{activeTeam?.name}</span>
          )}
        </div>
        <button className="btn-ghost p-2 rounded-lg" onClick={onSignOut} title="Log out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {!openPlayer && (
        <div className="flex gap-2 px-6 pt-4">
          <button
            className={activeTab === "team" ? "btn-accent px-3 py-1.5 rounded-lg text-sm" : "btn-ghost px-3 py-1.5 rounded-lg text-sm"}
            onClick={() => setActiveTab("team")}
          >
            Team
          </button>
          <button
            className={activeTab === "calendar" ? "btn-accent px-3 py-1.5 rounded-lg text-sm" : "btn-ghost px-3 py-1.5 rounded-lg text-sm"}
            onClick={() => setActiveTab("calendar")}
          >
            Calendar
          </button>
          <button
            className={activeTab === "matchday" ? "btn-accent px-3 py-1.5 rounded-lg text-sm" : "btn-ghost px-3 py-1.5 rounded-lg text-sm"}
            onClick={() => setActiveTab("matchday")}
          >
            Match Day
          </button>
          <button
            className={activeTab === "plans" ? "btn-accent px-3 py-1.5 rounded-lg text-sm" : "btn-ghost px-3 py-1.5 rounded-lg text-sm"}
            onClick={() => setActiveTab("plans")}
          >
            Training Plans
          </button>
          <button
            className={activeTab === "session" ? "btn-accent px-3 py-1.5 rounded-lg text-sm" : "btn-ghost px-3 py-1.5 rounded-lg text-sm"}
            onClick={() => setActiveTab("session")}
          >
            Training Session
          </button>
          <button
            className={activeTab === "documents" ? "btn-accent px-3 py-1.5 rounded-lg text-sm" : "btn-ghost px-3 py-1.5 rounded-lg text-sm"}
            onClick={() => setActiveTab("documents")}
          >
            Documents
          </button>
        </div>
      )}

      {openPlayer ? (
        <PlayerDetail
          player={openPlayer}
          onBack={closePlayer}
          onSaved={() => closePlayer()}
          onDeleted={() => closePlayer()}
        />
      ) : activeTab === "calendar" ? (
        activeTeam && <TeamCalendar team={activeTeam} editable={true} />
      ) : activeTab === "matchday" ? (
        activeTeam && <MatchDayView team={activeTeam} editable={true} />
      ) : activeTab === "plans" ? (
        activeTeam && <TrainingPlansTab team={activeTeam} />
      ) : activeTab === "session" ? (
        activeTeam && <TrainingSessionView team={activeTeam} editable={true} />
      ) : activeTab === "documents" ? (
        activeTeam && <DocumentsView team={activeTeam} editable={true} />
      ) : (
        activeTeam && <TeamRoster team={activeTeam} onOpenPlayer={handleOpenPlayer} />
      )}
    </div>
  );
}

