import { useEffect, useState } from "react";
import { Shield, LogOut, Plus, Users, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";

function TeamCard({ team, onOpen }) {
  return (
    <button className="glass-card flex flex-col items-center text-center p-4" onClick={() => onOpen(team)}>
      <div
        className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 border-2 mb-3 flex items-center justify-center"
        style={{ borderColor: "var(--accent)", background: "rgba(255,255,255,0.04)" }}
      >
        {team.logo_url ? (
          <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
        ) : (
          <Users className="w-8 h-8" style={{ color: "var(--muted)" }} />
        )}
      </div>
      <div className="font-medium truncate w-full">{team.name}</div>
    </button>
  );
}

function TeamDetail({ team, onBack, onDeleted, onRenamed }) {
  const [name, setName] = useState(team.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const saveName = async () => {
    setSaving(true);
    setError("");
    const { error } = await supabase.from("teams").update({ name }).eq("id", team.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onRenamed(team.id, name);
  };

  const deleteTeam = async () => {
    if (!confirm(`Remove ${team.name}? This can't be undone.`)) return;
    const { error } = await supabase.from("teams").delete().eq("id", team.id);
    if (error) {
      setError(error.message);
      return;
    }
    onDeleted(team.id);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button className="text-sm flex items-center gap-1 mb-6" style={{ color: "var(--muted)" }} onClick={onBack}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to teams
      </button>

      {error && <p className="text-sm mb-4" style={{ color: "#f28f8a" }}>{error}</p>}

      <div className="glass-panel p-6 mb-6">
        <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Team name</label>
        <div className="flex gap-2 mt-1">
          <input className="input-dark flex-1" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-accent px-4 rounded-lg" onClick={saveName} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="glass-panel p-6 mb-6">
        <h2 className="font-display text-lg mb-1">Coaches</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Coach invites are coming in the next step — this is where you'll add coaches to this team.
        </p>
      </div>

      <button className="btn-ghost px-4 py-2 rounded-lg text-sm flex items-center gap-2" onClick={deleteTeam}>
        <Trash2 className="w-4 h-4" /> Remove team
      </button>
    </div>
  );
}

export default function ClubDashboard({ profile, club, onSignOut }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openTeamId, setOpenTeamId] = useState(null);
  const [error, setError] = useState("");

  const loadTeams = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("teams").select("*").order("created_at", { ascending: true });
    if (!error) setTeams(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const addTeam = async () => {
    setError("");
    const { data, error } = await supabase
      .from("teams")
      .insert({ club_id: club.id, name: "New Team" })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setTeams((t) => [...t, data]);
    setOpenTeamId(data.id);
  };

  const openTeam = teams.find((t) => t.id === openTeamId);

  if (openTeam) {
    return (
      <TeamDetail
        team={openTeam}
        onBack={() => setOpenTeamId(null)}
        onDeleted={(id) => {
          setTeams((t) => t.filter((x) => x.id !== id));
          setOpenTeamId(null);
        }}
        onRenamed={(id, name) => {
          setTeams((t) => t.map((x) => (x.id === id ? { ...x, name } : x)));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between px-6 h-16" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <span className="font-display text-lg tracking-wide">{club.name}</span>
        </div>
        <button className="btn-ghost p-2 rounded-lg" onClick={onSignOut} title="Log out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl tracking-wide mb-6">Teams</h1>

        {error && <p className="text-sm mb-4" style={{ color: "#f28f8a" }}>{error}</p>}

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading…</p>
        ) : teams.length === 0 ? (
          <div className="glass-panel p-10 text-center" style={{ color: "var(--muted)" }}>
            No teams yet. Use the + button to create your first team.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {teams.map((t) => (
              <TeamCard key={t.id} team={t} onOpen={(team) => setOpenTeamId(team.id)} />
            ))}
          </div>
        )}

        <button
          className="fixed bottom-8 right-8 w-14 h-14 rounded-full btn-accent flex items-center justify-center"
          onClick={addTeam}
          title="Add team"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
