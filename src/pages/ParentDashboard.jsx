import { useEffect, useState } from "react";
import { Shield, LogOut, Users, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";

const PLAN_STATUSES = [
  { id: "needs_practice", label: "Needs practice", color: "#E8433D" },
  { id: "improving", label: "Improving", color: "#F2A31D" },
  { id: "mastered", label: "Mastered", color: "#1FB65A" },
];

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

function ReadOnlyTrainingPlan({ playerId }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("training_plans")
      .select("rows")
      .eq("player_id", playerId)
      .maybeSingle()
      .then(({ data, error }) => {
        setRows(error ? null : data?.rows || []);
        setLoading(false);
      });
  }, [playerId]);

  if (loading) return <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>;
  if (rows === null) return <p className="text-sm" style={{ color: "var(--muted)" }}>Couldn't load the plan.</p>;
  if (rows.length === 0) return <p className="text-sm" style={{ color: "var(--muted)" }}>No focus areas added yet.</p>;

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const status = PLAN_STATUSES.find((s) => s.id === row.status) || PLAN_STATUSES[0];
        return (
          <div key={row.id} className="glass-card p-3">
            <div className="font-medium">{row.title || "Untitled"}</div>
            {row.content && <div className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{row.content}</div>}
            <span
              className="text-xs px-2 py-0.5 rounded-full inline-block mt-2"
              style={{ background: status.color, color: "#0b1223", fontWeight: 700 }}
            >
              {status.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PlayerView({ player, isOwnChild, onBack }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button className="text-sm flex items-center gap-1 mb-6" style={{ color: "var(--muted)" }} onClick={onBack}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to team
      </button>

      <div className="flex flex-col items-center mb-8">
        <div
          className="w-28 h-28 rounded-full overflow-hidden border-2 flex items-center justify-center"
          style={{ borderColor: "var(--accent)", background: "rgba(255,255,255,0.04)" }}
        >
          {player.photo_url ? (
            <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            <Users className="w-9 h-9" style={{ color: "var(--muted)" }} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel p-4">
          <div className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Name</div>
          <div className="font-display text-lg mt-1">{player.name || "—"}</div>
        </div>
        <div className="glass-panel p-4">
          <div className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Number</div>
          <div className="font-mono text-lg mt-1">#{player.number || "—"}</div>
        </div>
        <div className="glass-panel p-4">
          <div className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Age</div>
          <div className="text-lg mt-1">{player.age || "—"}</div>
        </div>
        <div className="glass-panel p-4">
          <div className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Position</div>
          <div className="text-lg mt-1">{player.position}</div>
        </div>
      </div>

      {isOwnChild && (
        <div className="glass-panel p-6">
          <h2 className="font-display text-lg mb-1">Training plan</h2>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            Only visible to you, as this player's parent.
          </p>
          <ReadOnlyTrainingPlan playerId={player.id} />
        </div>
      )}
    </div>
  );
}

export default function ParentDashboard({ profile, onSignOut }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [openPlayer, setOpenPlayer] = useState(null);

  useEffect(() => {
    supabase
      .from("parent_child_links")
      .select("players(id, team_id, teams(id, name))")
      .eq("parent_id", profile.id)
      .then(({ data }) => {
        const kids = (data || []).map((r) => r.players).filter(Boolean);
        setChildren(kids);
        if (kids.length) setActiveTeamId(kids[0].team_id);
        setLoading(false);
      });
  }, [profile]);

  useEffect(() => {
    if (!activeTeamId) return;
    setRosterLoading(true);
    supabase
      .from("players")
      .select("*")
      .eq("team_id", activeTeamId)
      .then(({ data }) => {
        setRoster(data || []);
        setRosterLoading(false);
      });
  }, [activeTeamId]);

  const teamsMap = {};
  children.forEach((c) => {
    if (c.teams) teamsMap[c.team_id] = c.teams;
  });
  const teamOptions = Object.values(teamsMap);
  const ownChildIds = new Set(children.map((c) => c.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-panel p-6 max-w-sm text-center">
          <p className="mb-4" style={{ color: "var(--muted)" }}>You're not linked to a child yet — ask your coach for an invite link.</p>
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
          {teamOptions.length > 1 ? (
            <select className="input-dark text-sm py-1.5" value={activeTeamId} onChange={(e) => { setActiveTeamId(e.target.value); setOpenPlayer(null); }}>
              {teamOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          ) : (
            <span className="font-display text-lg tracking-wide">{teamsMap[activeTeamId]?.name}</span>
          )}
        </div>
        <button className="btn-ghost p-2 rounded-lg" onClick={onSignOut} title="Log out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {openPlayer ? (
        <PlayerView player={openPlayer} isOwnChild={ownChildIds.has(openPlayer.id)} onBack={() => setOpenPlayer(null)} />
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="font-display text-2xl tracking-wide mb-6">{teamsMap[activeTeamId]?.name}</h1>
          {rosterLoading ? (
            <p style={{ color: "var(--muted)" }}>Loading…</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {sortByNumber(roster).map((p) => (
                <PlayerCard key={p.id} player={p} onOpen={setOpenPlayer} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
