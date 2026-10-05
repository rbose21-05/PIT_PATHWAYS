"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PathwayChips } from "@/components/pathway/chips";
import { useGraphActions } from "@/components/pathway/graph-context";
import { bucketMeta, type BucketNode, type CourseFlowNode, type RootNode } from "@/lib/pathway";
import { cn } from "@/lib/utils";

const handleClass =
  "!size-2.5 !border-2 !bg-stone-500 !border-white";

function NodeHandles({ dark = false }: { dark?: boolean }) {
  const className = dark ? "!size-2.5 !border-2 !border-stone-900 !bg-stone-300" : handleClass;
  return (
    <>
      <Handle className={className} id="top" type="source" position={Position.Top} />
      <Handle className={className} id="bottom" type="source" position={Position.Bottom} />
      <Handle className={className} id="left" type="source" position={Position.Left} />
      <Handle className={className} id="right" type="source" position={Position.Right} />
    </>
  );
}

function EditableLabel({
  value,
  onCommit,
  className,
}: {
  value: string;
  onCommit: (label: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!editing) return;
    const field = fieldRef.current;
    if (!field) return;
    field.focus();
    field.select();
  }, [editing]);

  if (editing) {
    return (
      <textarea
        ref={fieldRef}
        rows={Math.min(4, Math.max(2, Math.ceil(draft.length / 28)))}
        value={draft}
        aria-label="Node label"
        className={cn(
          "nodrag nopan w-full resize-none rounded-md border border-stone-300 bg-white px-1.5 py-1 text-left text-[13px] leading-snug font-medium outline-none",
          className,
          "bg-white text-stone-900",
        )}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (cancelRef.current) {
            cancelRef.current = false;
            setEditing(false);
            return;
          }
          const next = draft.trim();
          onCommit(next || value);
          setEditing(false);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            event.preventDefault();
            cancelRef.current = true;
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <div
      className={cn("cursor-text", className)}
      title="Double-click to edit"
      onDoubleClick={(event) => {
        event.stopPropagation();
        setDraft(value);
        setEditing(true);
      }}
    >
      {value}
    </div>
  );
}

export function RootNode({ id, data }: NodeProps<RootNode>) {
  const { updateNodeLabel } = useGraphActions();
  return (
    <div className="pit-card relative w-[260px] rounded-xl bg-stone-900 px-3.5 py-3 text-stone-50 shadow-sm">
      <NodeHandles dark />
      <div className="font-mono text-[11px] tracking-wide text-stone-300">{data.number}</div>
      <EditableLabel
        value={data.label}
        className="mt-1 text-sm leading-snug font-semibold text-stone-50"
        onCommit={(label) => updateNodeLabel(id, label)}
      />
      <div className="mt-2">
        <PathwayChips genEd={data.genEd} requirements={[]} tone="dark" />
      </div>
    </div>
  );
}

export function BucketNode({ id, data }: NodeProps<BucketNode>) {
  const { updateNodeLabel } = useGraphActions();
  const meta = bucketMeta[data.bucket];
  return (
    <div
      className="pit-card relative w-[210px] rounded-xl border-2 px-3 py-3 shadow-sm"
      style={{ background: meta.wash, borderColor: meta.accent }}
    >
      <NodeHandles />
      <div style={{ color: meta.ink }}>
        <EditableLabel
          value={data.label}
          className="text-sm leading-snug font-semibold text-inherit"
          onCommit={(label) => updateNodeLabel(id, label)}
        />
      </div>
    </div>
  );
}

export function CourseNode({ id, data }: NodeProps<CourseFlowNode>) {
  const { updateNodeLabel, removeCourseNode } = useGraphActions();
  return (
    <div className="pit-card relative w-[260px] rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm">
      <NodeHandles />
      <button
        type="button"
        className="pit-node-remove nodrag nopan absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-900"
        aria-label={`Remove ${data.number} from the pathway`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          removeCourseNode(id);
        }}
      >
        <X className="size-3.5" />
      </button>
      <div className="pr-5 font-mono text-[11px] leading-snug font-medium break-words text-stone-500">
        {data.number}
      </div>
      <EditableLabel
        value={data.label}
        className="mt-0.5 text-[13px] leading-snug font-semibold text-stone-900"
        onCommit={(label) => updateNodeLabel(id, label)}
      />
      <div className="mt-2">
        <PathwayChips genEd={data.genEd} requirements={data.requirements} />
      </div>
    </div>
  );
}
