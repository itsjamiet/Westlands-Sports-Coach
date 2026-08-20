import { useEffect, useState } from "react";
import { Shield, LogOut, Plus, Users, ArrowLeft, Camera, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";

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

      <p className="text-xs mt-6" style={{ color: "var(--muted)" }}>
        Weekly stats and training plans get added here in the next step.
      </p>
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

export default function CoachTeamPage({ profile, onSignOut }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTeamId, setActiveTeamId] = useState(null);
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

      {openPlayer ? (
        <PlayerDetail
          player={openPlayer}
          onBack={closePlayer}
          onSaved={() => closePlayer()}
          onDeleted={() => closePlayer()}
        />
      ) : (
        activeTeam && <TeamRoster team={activeTeam} onOpenPlayer={handleOpenPlayer} />
      )}
    </div>
  );
}
