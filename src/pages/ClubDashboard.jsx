import { useEffect, useState } from "react";
import { Shield, LogOut, Plus, Users, Trash2, ArrowLeft, Upload, FileText, Palette } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import { Quadrant } from "./TrainingSession.jsx";
import ClubCalendarTab from "./ClubCalendar.jsx";
import DropdownMenu, { DropdownItem } from "../components/DropdownMenu.jsx";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

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

function InviteClubAdmin({ clubId }) {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generateInvite = async () => {
    setLoading(true);
    setError("");
    setCopied(false);
    const { data, error } = await supabase
      .from("invites")
      .insert({ club_id: clubId, role: "club", created_by: (await supabase.auth.getUser()).data.user.id })
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
    <div className="glass-panel p-6 mb-6">
      <h2 className="font-display text-lg mb-1">Club admins</h2>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        Generate a link to give someone else full club access — teams, calendar,
        documents, everything you can see.
      </p>
      {!link ? (
        <button className="btn-accent px-4 py-2 rounded-lg text-sm" onClick={generateInvite} disabled={loading}>
          {loading ? "Generating…" : "Generate admin invite link"}
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

function InviteCoach({ teamId }) {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generateInvite = async () => {
    setLoading(true);
    setError("");
    setCopied(false);
    const { data, error } = await supabase
      .from("invites")
      .insert({ team_id: teamId, role: "coach", created_by: (await supabase.auth.getUser()).data.user.id })
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
    <div className="glass-panel p-6 mb-6">
      <h2 className="font-display text-lg mb-1">Coaches</h2>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        Generate a link and send it to a coach — opening it lets them create their
        account and joins them to this team automatically.
      </p>
      {!link ? (
        <button className="btn-accent px-4 py-2 rounded-lg text-sm" onClick={generateInvite} disabled={loading}>
          {loading ? "Generating…" : "Generate invite link"}
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

function sortByNumber(players) {
  return [...players].sort((a, b) => {
    const na = a.number === "" || a.number === null || a.number === undefined ? Infinity : Number(a.number);
    const nb = b.number === "" || b.number === null || b.number === undefined ? Infinity : Number(b.number);
    return na - nb;
  });
}

const PLAN_STATUSES = [
  { id: "needs_practice", label: "Needs practice", color: "#E8433D" },
  { id: "improving", label: "Improving", color: "#F2A31D" },
  { id: "mastered", label: "Mastered", color: "#1FB65A" },
];

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

function ClubPlayerCard({ player, onOpen }) {
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

function ClubPlayerView({ player, onBack }) {
  const [plan, setPlan] = useState(null);
  const [openDrillsRowId, setOpenDrillsRowId] = useState(null);

  useEffect(() => {
    supabase.from("training_plans").select("rows").eq("player_id", player.id).maybeSingle().then(({ data }) => {
      setPlan(data?.rows || []);
    });
  }, [player.id]);

  const stats = player.stats || [];
  const t = statTotals(stats);

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

      <div className="glass-panel p-6 mb-6">
        <h2 className="font-display text-lg mb-3">Weekly stats</h2>
        {stats.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No stats logged yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Minutes played", value: t.minutesPct === null ? "—" : `${t.minutesPct}%` },
              { label: "Goals", value: t.goalsTotal },
              { label: "Saves", value: t.savesTotal },
              { label: "Tackles", value: t.tacklesTotal },
              { label: "Captain", value: t.captainTotal },
              { label: "Player of the match", value: t.potmTotal },
            ].map((b) => (
              <div key={b.label} className="glass-card p-4">
                <div className="text-2xl font-mono">{b.value}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{b.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel p-6">
        <h2 className="font-display text-lg mb-3">Training plan</h2>
        {plan === null ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>
        ) : plan.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No focus areas added yet.</p>
        ) : (
          <div className="space-y-2">
            {plan.map((row) => {
              const status = PLAN_STATUSES.find((s) => s.id === row.status) || PLAN_STATUSES[0];
              const drills = row.drills || [];
              return (
                <div key={row.id} className="glass-card p-3">
                  <div className="font-medium">{row.title || "Untitled"}</div>
                  {row.content && <div className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{row.content}</div>}
                  <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full inline-block" style={{ background: status.color, color: "#0b1223", fontWeight: 700 }}>
                      {status.label}
                    </span>
                    {drills.length > 0 && (
                      <button
                        className="text-xs"
                        style={{ color: "var(--accent)" }}
                        onClick={() => setOpenDrillsRowId(openDrillsRowId === row.id ? null : row.id)}
                      >
                        Improvement drills ({drills.length})
                      </button>
                    )}
                  </div>
                  {openDrillsRowId === row.id && (
                    <div className="space-y-4 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      {drills.map((drill) => (
                        <div key={drill.id} className="glass-panel p-4">
                          <div className="font-display text-base mb-3">{drill.title || "Untitled drill"}</div>
                          <Quadrant
                            index={drill.id}
                            quadrant={drill.pitch || { markers: [], arrows: [] }}
                            setQuadrant={() => {}}
                            tool={null}
                            editable={false}
                            label="Drill pitch"
                            showNotes={false}
                          />
                          {drill.description && <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>{drill.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamDetail({ team, onBack, onDeleted, onRenamed }) {
  const [name, setName] = useState(team.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [openPlayer, setOpenPlayer] = useState(null);
  const [showInviteCoach, setShowInviteCoach] = useState(false);

  useEffect(() => {
    supabase.from("players").select("*").eq("team_id", team.id).then(({ data }) => {
      setPlayers(data || []);
      setPlayersLoading(false);
    });
  }, [team.id]);

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

  if (openPlayer) {
    return <ClubPlayerView player={openPlayer} onBack={() => setOpenPlayer(null)} />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <button className="text-sm flex items-center gap-1" style={{ color: "var(--muted)" }} onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to teams
        </button>
        <DropdownMenu>
          {({ close }) => (
            <>
              <DropdownItem onClick={() => { setShowInviteCoach((v) => !v); close(); }}>
                {showInviteCoach ? "Hide coach invite" : "Invite a coach"}
              </DropdownItem>
              <DropdownItem onClick={() => { close(); deleteTeam(); }}>
                Remove team
              </DropdownItem>
            </>
          )}
        </DropdownMenu>
      </div>

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

      {showInviteCoach && <InviteCoach teamId={team.id} />}

      <div className="mb-6">
        <h2 className="font-display text-lg mb-3">Players</h2>
        <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>Read-only from the club view — coaches manage the squad.</p>
        {playersLoading ? (
          <p style={{ color: "var(--muted)" }}>Loading…</p>
        ) : players.length === 0 ? (
          <div className="glass-panel p-8 text-center" style={{ color: "var(--muted)" }}>No players on this team yet.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {sortByNumber(players).map((p) => (
              <ClubPlayerCard key={p.id} player={p} onOpen={setOpenPlayer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const RSVP_META = {
  pending: { label: "Pending", color: "var(--muted)" },
  attending: { label: "Attending", color: "#1FB65A" },
  not_attending: { label: "Not attending", color: "#E8433D" },
};

function ClubDocumentsTab({ club }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("documents").select("*").eq("club_id", club.id);
    setDocs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club.id]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    setPendingFile({ name: file.name, url });
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
  };

  const save = async () => {
    if (!pendingFile) return;
    setError("");
    const { error } = await supabase
      .from("documents")
      .insert({ club_id: club.id, title: title || pendingFile.name, file_name: pendingFile.name, file_url: pendingFile.url });
    if (error) {
      setError(error.message);
      return;
    }
    setPendingFile(null);
    setTitle("");
    load();
  };

  const remove = async (id) => {
    await supabase.from("documents").delete().eq("id", id);
    load();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl tracking-wide mb-1">Club Documents</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Anything uploaded here automatically appears in every team's Documents page.
      </p>

      <div className="glass-panel p-5 mb-8">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Title</label>
            <input className="input-dark w-full mt-1" placeholder="e.g. Club handbook" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <label className="btn-ghost px-4 py-2 rounded-lg flex items-center gap-2 justify-center cursor-pointer">
            <Upload className="w-4 h-4" /> {pendingFile ? pendingFile.name : "Choose file"}
            <input type="file" className="hidden" onChange={handleFile} />
          </label>
          <button className="btn-accent px-4 py-2 rounded-lg" disabled={!pendingFile} onClick={save}>Save</button>
        </div>
        {error && <p className="text-sm mt-2" style={{ color: "#f28f8a" }}>{error}</p>}
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : docs.length === 0 ? (
        <div className="glass-panel p-10 text-center" style={{ color: "var(--muted)" }}>No club documents uploaded yet.</div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="glass-card p-4 flex items-center gap-3">
              <FileText className="w-5 h-5 flex-shrink-0" style={{ color: "var(--gold)" }} />
              <a href={d.file_url} download={d.file_name} className="flex-1 min-w-0">
                <div className="font-medium truncate">{d.title}</div>
                <div className="text-xs truncate" style={{ color: "var(--muted)" }}>{d.file_name}</div>
              </a>
              <button className="opacity-50 hover:opacity-100 flex-shrink-0" onClick={() => remove(d.id)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const FULL_PRESET_THEMES = [
  { name: "Matchday Navy", accent: "#2E7CF6", dark: "#123a8a", bg: "#060b16", panel: "#0f1e3d", panel2: "#16295a" },
  { name: "Pitch Emerald", accent: "#1FB65A", dark: "#0c5c2b", bg: "#04140b", panel: "#0c2818", panel2: "#123822" },
  { name: "Kit Crimson", accent: "#E8433D", dark: "#7c1712", bg: "#160606", panel: "#2a0e0e", panel2: "#3a1414" },
  { name: "Amber Kit", accent: "#F2A31D", dark: "#8a5804", bg: "#160f02", panel: "#2a1e08", panel2: "#3a2a0c" },
  { name: "Royal Purple", accent: "#8A5CF6", dark: "#3d1f8f", bg: "#0c0620", panel: "#1a1038", panel2: "#241650" },
];

function ThemeInjector({ theme }) {
  if (!theme) return null;
  return (
    <style>{`:root{
      --accent:${theme.accent || "#2E7CF6"};
      --accent-dark:${theme.dark || "#123a8a"};
      --bg-deep:${theme.bg || "#060b16"};
      --bg-panel:${theme.panel || "#0f1e3d"};
      --bg-panel-2:${theme.panel2 || "#16295a"};
    }`}</style>
  );
}

function ClubSettingsTab({ profile, club, onThemeChange }) {
  const [draft, setDraft] = useState({
    accent: club.theme?.accent || "#2E7CF6",
    dark: club.theme?.dark || "#123a8a",
    bg: club.theme?.bg || "#060b16",
    panel: club.theme?.panel || "#0f1e3d",
    panel2: club.theme?.panel2 || "#16295a",
  });
  const [saving, setSaving] = useState(false);

  const applyPreset = async (preset) => {
    const t = { accent: preset.accent, dark: preset.dark, bg: preset.bg, panel: preset.panel, panel2: preset.panel2 };
    setDraft(t);
    setSaving(true);
    await supabase.from("clubs").update({ theme: t }).eq("id", club.id);
    setSaving(false);
    onThemeChange(t);
  };

  const applyCustom = async () => {
    setSaving(true);
    await supabase.from("clubs").update({ theme: draft }).eq("id", club.id);
    setSaving(false);
    onThemeChange(draft);
  };

  const field = (key, label) => (
    <div>
      <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</label>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="color"
          value={draft[key]}
          onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
          className="w-10 h-9 rounded-lg border border-white/10 bg-transparent"
        />
        <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{draft[key]}</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl tracking-wide mb-6">Settings</h1>

      <div className="glass-panel p-5 mb-6">
        <h2 className="font-display text-lg mb-3">Account</h2>
        <div className="text-sm space-y-1" style={{ color: "var(--muted)" }}>
          <div>Signed in as <span style={{ color: "var(--white)" }}>{profile.display_name}</span></div>
          <div>Role: <span style={{ color: "var(--white)" }}>Club (full access)</span></div>
        </div>
      </div>

      <InviteClubAdmin clubId={club.id} />

      <div className="glass-panel p-5">
        <h2 className="font-display text-lg mb-1 flex items-center gap-2"><Palette className="w-4 h-4" /> Club colours</h2>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          These fully re-theme the club view — background, panels, and accent — not just the highlights.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {FULL_PRESET_THEMES.map((p) => (
            <button key={p.name} className="glass-card p-3 flex items-center gap-2 text-left" onClick={() => applyPreset(p)}>
              <span className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: `linear-gradient(180deg, ${p.accent}, ${p.dark})`, border: `2px solid ${p.panel2}` }} />
              <span className="text-sm">{p.name}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
          {field("accent", "Accent")}
          {field("dark", "Accent (dark)")}
          {field("bg", "Background")}
          {field("panel", "Panel")}
          {field("panel2", "Panel (light)")}
        </div>

        <button className="btn-accent px-4 py-2 rounded-lg text-sm" onClick={applyCustom} disabled={saving}>
          {saving ? "Saving…" : "Apply colours"}
        </button>
      </div>
    </div>
  );
}

export default function ClubDashboard({ profile, club, onSignOut }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openTeamId, setOpenTeamId] = useState(null);
  const [activeTab, setActiveTab] = useState("teams");
  const [error, setError] = useState("");
  const [liveTheme, setLiveTheme] = useState(club.theme);

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
      <ThemeInjector theme={liveTheme} />
      <div className="flex items-center justify-between px-6 h-16" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <span className="font-display text-lg tracking-wide">{club.name}</span>
        </div>
        <button className="btn-ghost p-2 rounded-lg" onClick={onSignOut} title="Log out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 px-6 pt-4">
        <button
          className={activeTab === "teams" ? "btn-accent px-3 py-1.5 rounded-lg text-sm" : "btn-ghost px-3 py-1.5 rounded-lg text-sm"}
          onClick={() => setActiveTab("teams")}
        >
          Teams
        </button>
        <button
          className={activeTab === "calendar" ? "btn-accent px-3 py-1.5 rounded-lg text-sm" : "btn-ghost px-3 py-1.5 rounded-lg text-sm"}
          onClick={() => setActiveTab("calendar")}
        >
          Club Calendar
        </button>
        <button
          className={activeTab === "documents" ? "btn-accent px-3 py-1.5 rounded-lg text-sm" : "btn-ghost px-3 py-1.5 rounded-lg text-sm"}
          onClick={() => setActiveTab("documents")}
        >
          Documents
        </button>
        <button
          className={activeTab === "settings" ? "btn-accent px-3 py-1.5 rounded-lg text-sm" : "btn-ghost px-3 py-1.5 rounded-lg text-sm"}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </div>

      {activeTab === "calendar" ? (
        <ClubCalendarTab teams={teams} />
      ) : activeTab === "documents" ? (
        <ClubDocumentsTab club={club} />
      ) : activeTab === "settings" ? (
        <ClubSettingsTab profile={profile} club={club} onThemeChange={setLiveTheme} />
      ) : (
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
      )}
    </div>
  );
}

