import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export default function DropdownMenu({ children, align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative inline-block flex-shrink-0" ref={ref}>
      <button className="btn-ghost p-2 rounded-lg" onClick={() => setOpen((v) => !v)} title="More options">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div
          className="absolute z-30 mt-2 glass-panel p-1.5 min-w-[220px]"
          style={{ [align === "right" ? "right" : "left"]: 0 }}
        >
          {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ children, onClick }) {
  return (
    <button
      className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-white/5"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

