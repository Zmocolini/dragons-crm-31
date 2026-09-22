"use client";

import { useEffect, useState } from "react";
import { useLoading } from "@/lib/loading/context";

const OVERLAY_FADE_MS = 250;

export function DragonLoader() {
  const { visible, progress } = useLoading();
  const [mounted, setMounted] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
    } else if (rendered) {
      setMounted(false);
      const t = setTimeout(() => setRendered(false), OVERLAY_FADE_MS);
      return () => clearTimeout(t);
    }
  }, [visible, rendered]);

  if (!rendered) return null;

  return (
    <div
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Se încarcă pagina"
      className="pointer-events-none fixed inset-x-0 top-0 z-[200]"
      style={{
        opacity: mounted ? 1 : 0,
        transition: `opacity ${OVERLAY_FADE_MS}ms ease-in-out`,
      }}
    >
      {/* Track — vizibil ca „raft" pentru bară */}
      <div className="relative h-1 w-full overflow-hidden bg-white/[0.06]">
        {/* Fill — bara propriu-zisă */}
        <div
          className="relative h-full"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #8b5cf6 0%, #6366f1 45%, #3b82f6 100%)",
            boxShadow: "0 0 12px rgba(139,92,246,1), 0 0 6px rgba(99,102,241,0.8)",
            transition: "width 400ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Shimmer care alunecă peste fill — comunică clar „încă se lucrează" */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%)",
              backgroundSize: "40% 100%",
              animation: "loader-shimmer 1s linear infinite",
            }}
          />
          {/* Vârful barei — un „cap" mai luminos care se vede mereu */}
          <div
            className="absolute right-0 top-0 h-full w-3"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 100%)",
              filter: "blur(2px)",
            }}
          />
        </div>
      </div>

      {/* Halou subtil sub bară, dă senzație de „lumină emisă" */}
      <div
        className="pointer-events-none h-2 w-full"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.5) ${progress / 2}%, rgba(99,102,241,0.5) ${progress}%, transparent ${progress + 0.5}%)`,
          filter: "blur(6px)",
          opacity: 0.7,
        }}
      />

      <style>{`
        @keyframes loader-shimmer {
          0%   { background-position: -40% 0; }
          100% { background-position: 140% 0; }
        }
      `}</style>
    </div>
  );
}
