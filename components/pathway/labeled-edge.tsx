"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { useEffect, useRef } from "react";

import { useGraphActions } from "@/components/pathway/graph-context";
import type { PathwayEdge } from "@/lib/pathway";

export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
  selected,
}: EdgeProps<PathwayEdge>) {
  const { updateEdgeLabel, editingEdgeId, setEditingEdgeId } = useGraphActions();
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });
  const editing = editingEdgeId === id;
  const label = data?.label ?? "";
  const fieldRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (editing) fieldRef.current?.focus();
  }, [editing]);

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} interactionWidth={24} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            setEditingEdgeId(id);
          }}
        >
          {editing ? (
            <input
              ref={fieldRef}
              defaultValue={label}
              aria-label="Arrow label"
              className="nodrag nopan w-36 rounded-md border border-stone-300 bg-white px-1.5 py-0.5 text-center text-[11px] text-stone-900 shadow-sm outline-none"
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  cancelRef.current = true;
                  setEditingEdgeId(null);
                }
              }}
              onBlur={(event) => {
                if (!cancelRef.current) updateEdgeLabel(id, event.target.value.trim());
                cancelRef.current = false;
                setEditingEdgeId(null);
              }}
            />
          ) : label ? (
            <span
              title="Double-click to edit"
              className="block max-w-40 rounded-full bg-white px-2 py-0.5 text-center text-[11px] font-medium text-stone-700 shadow-sm ring-1 ring-stone-300"
            >
              {label}
            </span>
          ) : selected ? (
            <span
              title="Double-click to edit"
              className="block rounded-full border border-dashed border-stone-300 bg-white/90 px-2 py-0.5 text-[10px] text-stone-400"
            >
              Label
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
