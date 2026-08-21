import { useEffect, useRef, useState } from "react";
import { Circle, ArrowUpRight, Eraser } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const TOOLS = [
  { id: "blue", label: "Blue marker", kind: "dot", color: "#2E7CF6" },
  { id: "red", label: "Red marker", kind: "dot", color: "#E8433D" },
  { id: "run", label: "Run (solid)", kind: "arrow", style: "solid" },
  { id: "pass", label: "Pass (dashed)", kind: "arrow", style: "dashed" },
  { id: "dribble", label: "Dribble (curved)", kind: "arrow", style: "curved" },
  { id: "dragarrow", label: "Drag arrow", kind: "drag-arrow" },
  { id: "erase", label: "Erase", kind: "erase" },
];

function defaultSession() {
  return { quadrants: Array.from({ length: 4 }, () => ({ markers: [], arrows: [], notes: "" })) };
}

function Quadrant({ index, quadrant, setQuadrant, tool, editable, label }) {
  const svgRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [dragMarkerId, setDragMarkerId] = useState(null);
  const [dragArrowStart, setDragArrowStart] = useState(null);
  const [dragArrowPreview, setDragArrowPreview] = useState(null);

  const getPoint = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(1, Math.min(99, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(1, Math.min(65, ((e.clientY - rect.top) / rect.height) * 66));
    return { x, y };
  };

  const handleClick = (e) => {
    if (!editable || !tool) return;
    const pt = getPoint(e);
    if (tool.kind === "dot") {
      setQuadrant({ ...quadrant, markers: [...quadrant.markers, { id: uid(), x: pt.x, y: pt.y, color: tool.color }] });
      return;
    }
    if (tool.kind === "arrow") {
      if (!pending) setPending(pt);
      else {
        setQuadrant({ ...quadrant, arrows: [...quadrant.arrows, { id: uid(), x1: pending.x, y1: pending.y, x2: pt.x, y2: pt.y, style: tool.style }] });
        setPending(null);
      }
    }
  };

  const handlePointerDown = (e) => {
    if (!editable) return;
    if (tool?.kind === "drag-arrow") {
      const pt = getPoint(e);
      setDragArrowStart(pt);
      setDragArrowPreview(pt);
    }
  };

  const handlePointerMove = (e) => {
    if (dragMarkerId) {
      const pt = getPoint(e);
      setQuadrant({ ...quadrant, markers: quadrant.markers.map((m) => (m.id === dragMarkerId ? { ...m, x: pt.x, y: pt.y } : m)) });
      return;
    }
    if (dragArrowStart) setDragArrowPreview(getPoint(e));
  };

  const handlePointerUp = (e) => {
    if (dragMarkerId) {
      setDragMarkerId(null);
      return;
    }
    if (dragArrowStart) {
      const pt = getPoint(e);
      const dist = Math.hypot(pt.x - dragArrowStart.x, pt.y - dragArrowStart.y);
      if (dist > 2) {
        setQuadrant({ ...quadrant, arrows: [...quadrant.arrows, { id: uid(), x1: dragArrowStart.x, y1: dragArrowStart.y, x2: pt.x, y2: pt.y, style: "solid" }] });
      }
      setDragArrowStart(null);
      setDragArrowPreview(null);
    }
  };

  const startMarkerDrag = (e, id) => {
    if (!editable || tool?.kind === "erase") return;
    e.stopPropagation();
    setDragMarkerId(id);
  };

  const eraseMarker = (id, e) => {
    e.stopPropagation();
    if (!editable || tool?.kind !== "erase") return;
    setQuadrant({ ...quadrant, markers: quadrant.markers.filter((m) => m.id !== id) });
  };
  const eraseArrow = (id, e) => {
    e.stopPropagation();
    if (!editable || tool?.kind !== "erase") return;
    setQuadrant({ ...quadrant, arrows: quadrant.arrows.filter((a) => a.id !== id) });
  };

  const clearAll = () => setQuadrant({ ...quadrant, markers: [], arrows: [] });

  return (
    <div className="glass-panel p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
        {editable && <button className="text-xs opacity-60 hover:opacity-100" onClick={clearAll}>Clear</button>}
      </div>
      <svg
        ref={svgRef}
        viewBox="0 0 100 66"
        className="w-full"
        style={{
          aspectRatio: "3/2",
          touchAction: "none",
          background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.045) 0 40px, rgba(0,0,0,0.02) 40px 80px), linear-gradient(180deg, #168a3f, #136b34)",
          border: "2px solid rgba(255,255,255,0.35)",
          borderRadius: 6,
          cursor: editable ? "crosshair" : "default",
        }}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <rect x="1" y="1" width="98" height="64" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
        <line x1="50" y1="1" x2="50" y2="65" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
        <circle cx="50" cy="33" r="9" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
        <rect x="1" y="18" width="14" height="30" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
        <rect x="85" y="18" width="14" height="30" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />

        <defs>
          <marker id={`arrowhead-${index}`} markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="white" />
          </marker>
        </defs>

        {quadrant.arrows.map((a) => {
          const dashArr = a.style === "dashed" ? "2,1.5" : undefined;
          if (a.style === "curved") {
            const mx = (a.x1 + a.x2) / 2;
            const my = (a.y1 + a.y2) / 2 - 8;
            return (
              <path key={a.id} d={`M ${a.x1} ${a.y1} Q ${mx} ${my} ${a.x2} ${a.y2}`} fill="none" stroke="white" strokeWidth="0.8"
                markerEnd={`url(#arrowhead-${index})`} onClick={(e) => eraseArrow(a.id, e)} />
            );
          }
          return (
            <line key={a.id} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="white" strokeWidth="0.8" strokeDasharray={dashArr}
              markerEnd={`url(#arrowhead-${index})`} onClick={(e) => eraseArrow(a.id, e)} />
          );
        })}

        {dragArrowStart && dragArrowPreview && (
          <line x1={dragArrowStart.x} y1={dragArrowStart.y} x2={dragArrowPreview.x} y2={dragArrowPreview.y}
            stroke="yellow" strokeWidth="0.8" strokeDasharray="1.5,1" markerEnd={`url(#arrowhead-${index})`} />
        )}

        {quadrant.markers.map((m) => (
          <g key={m.id} style={{ cursor: editable && tool?.kind !== "erase" ? "grab" : "default" }}>
            <circle cx={m.x} cy={m.y} r="2.3" fill={m.color} stroke="white" strokeWidth="0.4"
              onPointerDown={(e) => startMarkerDrag(e, m.id)} onClick={(e) => eraseMarker(m.id, e)} />
          </g>
        ))}

        {pending && <circle cx={pending.x} cy={pending.y} r="1.3" fill="yellow" />}
      </svg>

      <div className="mt-3">
        <label className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Notes</label>
        <textarea
          className="input-dark w-full mt-1 min-h-[60px]"
          placeholder={editable ? "Add notes for this session…" : "No notes added yet."}
          value={quadrant.notes || ""}
          disabled={!editable}
          onChange={(e) => setQuadrant({ ...quadrant, notes: e.target.value })}
        />
      </div>
    </div>
  );
}

export default function TrainingSessionView({ team, editable }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toolId, setToolId] = useState(editable ? "blue" : null);
  const saveTimer = useRef(null);

  useEffect(() => {
    supabase.from("teams").select("session").eq("id", team.id).single().then(({ data }) => {
      const s = data?.session?.quadrants?.length === 4 ? data.session : defaultSession();
      setSession(s);
      setLoading(false);
    });
  }, [team.id]);

  const persist = (next) => {
    setSession(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await supabase.from("teams").update({ session: next }).eq("id", team.id);
      setSaving(false);
    }, 400);
  };

  const setQuadrantAt = (i, val) => {
    const quadrants = [...session.quadrants];
    quadrants[i] = val;
    persist({ ...session, quadrants });
  };

  const tool = TOOLS.find((t) => t.id === toolId) || null;

  if (loading || !session) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl tracking-wide">Training Session</h1>
        {saving && <span className="text-xs" style={{ color: "var(--muted)" }}>Saving…</span>}
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        {editable
          ? "Pick a tool, then click a pitch to place it — markers can be dragged afterwards. Drag arrow: press, drag, and release."
          : "View only — ask your coach to make edits."}
      </p>

      {editable && (
        <div className="flex flex-wrap gap-2 mb-6">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`btn-ghost px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 ${toolId === t.id ? "ring-2 ring-white" : ""}`}
              onClick={() => setToolId(t.id)}
            >
              {t.kind === "dot" && <Circle className="w-3.5 h-3.5" fill={t.color} stroke={t.color} />}
              {t.kind === "arrow" && <ArrowUpRight className="w-3.5 h-3.5" />}
              {t.kind === "drag-arrow" && <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={3} />}
              {t.kind === "erase" && <Eraser className="w-3.5 h-3.5" />}
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {session.quadrants.map((q, i) => (
          <Quadrant
            key={i}
            index={i}
            quadrant={q}
            setQuadrant={(val) => setQuadrantAt(i, val)}
            tool={tool}
            editable={editable}
            label={`Quarter ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

