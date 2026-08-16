import { useEffect, useState } from "react";
import { Shield, LogOut } from "lucide-react";
import { supabase } from "./lib/supabaseClient.js";
import ClubAuth from "./pages/ClubAuth.jsx";

// Shown right after a club logs in for the first time, if their signup
// didn't get to create the club row yet (e.g. email confirmation was
// required, so the browser tab that finally has an active session is a
// fresh one that never ran the signup form).
function CreateClubForm({ userId, onCreated }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data: club, error: clubError } = await supabase
      .from("clubs")
      .insert({ name: name || "My Club", owner_id: userId })
      .select()
      .single();
    if (clubError) {
      setError(clubError.message);
      setLoading(false);
      return;
    }
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ club_id: club.id })
      .eq("id", userId);
    setLoading(false);
    if (profileError) {
      setError(profileError.message);
      return;
    }
    onCreated(club);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md glass-panel p-6">
        <h1 className="font-display text-2xl tracking-wide mb-1">Set up your club</h1>
        <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
          Your account is confirmed — last step, name your club.
        </p>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Club name</label>
            <input className="input-dark w-full mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Westland Sports FC" required autoFocus />
          </div>
          {error && <p className="text-sm" style={{ color: "#f28f8a" }}>{error}</p>}
          <button type="submit" className="btn-accent w-full py-3 rounded-lg mt-2" disabled={loading}>
            {loading ? "Creating…" : "Create club"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ClubDashboardPlaceholder({ profile, club, onSignOut }) {
  return (
    <div className="min-h-screen">
      <div className="navbar-gloss flex items-center justify-between px-6 h-16" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <span className="font-display text-lg tracking-wide">{club.name}</span>
        </div>
        <button className="btn-ghost p-2 rounded-lg" onClick={onSignOut} title="Log out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="glass-panel p-6">
          <h1 className="font-display text-2xl tracking-wide mb-2">You're logged in ✅</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Signed in as <span style={{ color: "var(--white)" }}>{profile.display_name}</span> — role{" "}
            <span style={{ color: "var(--white)" }}>{profile.role}</span> — club{" "}
            <span style={{ color: "var(--white)" }}>{club.name}</span>.
          </p>
          <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>
            This is the Phase 1 checkpoint: real authentication is working end to end.
            The full Teams / Players / Calendar / Training Plans pages get ported into
            this project next.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = logged out
  const [profile, setProfile] = useState(null);
  const [club, setClub] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setClub(null);
      return;
    }
    setLoadingProfile(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        setLoadingProfile(false);
        if (!error) setProfile(data);
      });
  }, [session]);

  useEffect(() => {
    if (!profile?.club_id) {
      setClub(null);
      return;
    }
    supabase
      .from("clubs")
      .select("*")
      .eq("id", profile.club_id)
      .single()
      .then(({ data, error }) => {
        if (!error) setClub(data);
      });
  }, [profile]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <ClubAuth />;
  }

  if (loadingProfile || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: "var(--muted)" }}>Loading your account…</p>
      </div>
    );
  }

  if (!profile.club_id) {
    return <CreateClubForm userId={session.user.id} onCreated={setClub} />;
  }

  if (!club) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: "var(--muted)" }}>Loading your club…</p>
      </div>
    );
  }

  return <ClubDashboardPlaceholder profile={profile} club={club} onSignOut={handleSignOut} />;
}
