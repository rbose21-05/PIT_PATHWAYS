"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function PrereqTip({
  prerequisites,
  children,
}: {
  prerequisites: string;
  children: ReactNode;
}) {
  const text = prerequisites.trim();
  const anchorRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const tip = tipRef.current;
    if (!anchor || !tip) return;
    const host = anchor.getBoundingClientRect();
    const box = tip.getBoundingClientRect();
    let left = host.right + 8;
    let top = host.top;
    if (left + box.width > window.innerWidth - 8) {
      left = Math.max(8, host.left);
      top = host.bottom + 8;
      if (top + box.height > window.innerHeight - 8) top = Math.max(8, host.top - box.height - 8);
    } else if (top + box.height > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - box.height - 8);
    }
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  }, [open, text]);

  function show() {
    if (!text) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(true), 280);
  }

  function hide() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setOpen(false);
  }

  return (
    <div ref={anchorRef} onMouseEnter={show} onMouseLeave={hide} onDragStart={hide}>
      {children}
      {open && text
        ? createPortal(
            <div
              ref={tipRef}
              role="tooltip"
              className="pointer-events-none fixed z-[70] w-[280px] rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-stone-900 shadow-lg"
              style={{ top: -9999, left: 8 }}
            >
              <div className="text-[10px] font-semibold tracking-wide text-stone-500">Prerequisites</div>
              <p className="mt-1 text-xs leading-snug">{text}</p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
