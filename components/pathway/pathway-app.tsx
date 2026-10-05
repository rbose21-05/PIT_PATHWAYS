"use client";

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  getNodesBounds,
  getViewportForBounds,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type OnBeforeDelete,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useState } from "react";

import { CourseDialog, type CourseDraft } from "@/components/pathway/course-dialog";
import { CourseSidebar } from "@/components/pathway/course-sidebar";
import { PathwayCanvas } from "@/components/pathway/pathway-canvas";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  blankCourse,
  BUCKET_NODE_WIDTH,
  bucketNodeId,
  chooseBucket,
  COURSE_NODE_WIDTH,
  courseColumnPosition,
  courseNodeId,
  createDefaultState,
  edgePresentation,
  parsePathwayState,
  serializePathwayState,
  type CourseFlowNode,
  type PathwayEdge,
  type PathwayNode,
} from "@/lib/pathway";
import {
  getClientPathwayState,
  getServerPathwayState,
  subscribePathway,
  updatePathway,
} from "@/lib/pathway-store";
import type { Bucket, Course } from "@/lib/types";

function downloadUrl(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
}

function PathwayShell() {
  const pathway = useSyncExternalStore(subscribePathway, getClientPathwayState, getServerPathwayState);
  const { courses, nodes, edges } = pathway;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dialog, setDialog] = useState<
    { mode: "closed" } | { mode: "add" } | { mode: "edit"; course: Course }
  >({ mode: "closed" });
  const [resetOpen, setResetOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [canDelete, setCanDelete] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const flow = useReactFlow();

  const reveal = useCallback(
    (id: string) => {
      window.setTimeout(() => {
        const node = flow.getNode(id);
        if (!node) return;
        const width = node.measured?.width ?? 260;
        const height = node.measured?.height ?? 100;
        void flow.setCenter(node.position.x + width / 2, node.position.y + height / 2, {
          zoom: 1,
          duration: 200,
        });
      }, 40);
    },
    [flow],
  );

  const onNodesChange: OnNodesChange<PathwayNode> = useCallback((changes) => {
    updatePathway((current) => ({
      ...current,
      nodes: applyNodeChanges(changes, current.nodes),
    }));
  }, []);

  const onEdgesChange: OnEdgesChange<PathwayEdge> = useCallback((changes) => {
    updatePathway((current) => ({
      ...current,
      edges: applyEdgeChanges(changes, current.edges),
    }));
  }, []);

  const updateNodeLabel = useCallback((id: string, label: string) => {
    updatePathway((current) => ({
      ...current,
      nodes: current.nodes.map((node) => {
        if (node.id !== id) return node;
        if (node.type === "root") return { ...node, data: { ...node.data, label } };
        if (node.type === "bucket") return { ...node, data: { ...node.data, label } };
        return { ...node, data: { ...node.data, label } };
      }),
    }));
  }, []);

  const updateEdgeLabel = useCallback((id: string, label: string) => {
    updatePathway((current) => ({
      ...current,
      edges: current.edges.map((edge) =>
        edge.id === id ? { ...edge, data: { ...edge.data, label } } : edge,
      ),
    }));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    updatePathway((current) => ({
      ...current,
      edges: addEdge({ ...connection, ...edgePresentation, data: { label: "" } }, current.edges),
    }));
  }, []);

  const onBeforeDelete: OnBeforeDelete<PathwayNode, PathwayEdge> = useCallback(
    async ({ nodes: selectedNodes, edges: selectedEdges }) => {
      const deletableNodes = selectedNodes.filter((node) => node.type === "course");
      const ids = new Set(deletableNodes.map((node) => node.id));
      return {
        nodes: deletableNodes,
        edges: selectedEdges.filter(
          (edge) => edge.selected || ids.has(edge.source) || ids.has(edge.target),
        ),
      };
    },
    [],
  );

  function placeCourse(course: Course, bucket?: Bucket, dropX?: number) {
    setSidebarOpen(false);
    let focusId = courseNodeId(course.id);
    updatePathway((current) => {
      const existing = current.nodes.find(
        (node) => node.type === "course" && (node.id === focusId || node.data.courseId === course.id),
      );
      if (existing) {
        focusId = existing.id;
        return {
          ...current,
          nodes: current.nodes.map((node) => ({ ...node, selected: node.id === existing.id })),
          edges: current.edges.map((edge) => ({ ...edge, selected: false })),
        };
      }

      const bucketNodes = current.nodes.flatMap((node) =>
        node.type === "bucket"
          ? [{ id: node.id, bucket: node.data.bucket, x: node.position.x, y: node.position.y }]
          : [],
      );
      const chosen =
        bucket && course.buckets.includes(bucket)
          ? bucket
          : (chooseBucket(course.buckets, bucketNodes, dropX) ?? course.buckets[0]);
      const anchor = bucketNodes.find((node) => node.bucket === chosen);
      const sourceId = anchor?.id ?? bucketNodeId(chosen);
      const origin = anchor ? { x: anchor.x, y: anchor.y } : { x: 0, y: 188 };
      const columnX = origin.x + (BUCKET_NODE_WIDTH - COURSE_NODE_WIDTH) / 2;
      const siblingYs = current.nodes
        .filter((node) => node.type === "course" && Math.abs(node.position.x - columnX) < 40)
        .map((node) => node.position.y);
      const position = courseColumnPosition(origin, siblingYs);
      const node: CourseFlowNode = {
        id: focusId,
        type: "course",
        position,
        selected: true,
        data: {
          courseId: course.id,
          number: course.number,
          label: course.title,
          genEd: [...course.genEd],
          requirements: [...course.requirements],
        },
      };
      const edge: PathwayEdge = {
        id: `e-${sourceId}-${focusId}`,
        source: sourceId,
        target: focusId,
        sourceHandle: "bottom",
        targetHandle: "top",
        data: { label: "" },
        ...edgePresentation,
      };
      return {
        ...current,
        nodes: [...current.nodes.map((item) => ({ ...item, selected: false })), node],
        edges: [...current.edges.map((item) => ({ ...item, selected: false })), edge],
      };
    });
    setCanDelete(true);
    reveal(focusId);
  }

  const removeCourseNode = useCallback((id: string) => {
    updatePathway((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== id),
      edges: current.edges.filter((edge) => edge.source !== id && edge.target !== id),
    }));
    setCanDelete(false);
  }, []);

  function saveCourse(draft: CourseDraft, existing: Course | null) {
    if (existing) {
      const next: Course = {
        ...existing,
        number: draft.number,
        title: draft.title,
        buckets: draft.buckets,
        genEd: draft.genEd,
        requirements: draft.requirements,
      };
      updatePathway((current) => ({
        ...current,
        courses: current.courses.map((course) => (course.id === existing.id ? next : course)),
        nodes: current.nodes.map((node) => {
          if (node.type !== "course" || node.data.courseId !== existing.id) return node;
          return {
            ...node,
            data: {
              ...node.data,
              number: next.number,
              label: node.data.label === existing.title ? next.title : node.data.label,
              genEd: [...next.genEd],
              requirements: [...next.requirements],
            },
          };
        }),
      }));
    } else {
      updatePathway((current) => ({
        ...current,
        courses: [...current.courses, blankCourse(current.courses, draft)],
      }));
    }
    setDialog({ mode: "closed" });
  }

  function removeCourse(course: Course) {
    updatePathway((current) => {
      const removed = new Set(
        current.nodes
          .filter((node) => node.type === "course" && node.data.courseId === course.id)
          .map((node) => node.id),
      );
      return {
        ...current,
        courses: current.courses.filter((item) => item.id !== course.id),
        nodes: current.nodes.filter((node) => !removed.has(node.id)),
        edges: current.edges.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target)),
      };
    });
    setDialog({ mode: "closed" });
  }

  function resetPathway() {
    updatePathway(() => createDefaultState());
    setResetOpen(false);
    window.requestAnimationFrame(() => {
      void flow.fitView({ padding: 0.2, maxZoom: 1, duration: 200 });
    });
  }

  async function importFile(file: File) {
    try {
      const parsed = parsePathwayState(JSON.parse(await file.text()) as unknown);
      if (!parsed) {
        setNotice("That file is not a PIT Pathways export.");
        return;
      }
      updatePathway(() => parsed);
      window.requestAnimationFrame(() => {
        void flow.fitView({ padding: 0.2, maxZoom: 1, duration: 200 });
      });
    } catch {
      setNotice("That file is not a PIT Pathways export.");
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(serializePathwayState(pathway), null, 2) + "\n"], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    downloadUrl(url, "pit-pathways.json");
    URL.revokeObjectURL(url);
  }

  async function exportPng() {
    const current = flow.getNodes();
    if (current.length === 0) return;
    const element = document.querySelector(".react-flow__viewport");
    if (!(element instanceof HTMLElement)) return;
    const bounds = getNodesBounds(current);
    const pad = 96;
    let width = Math.ceil(bounds.width + pad);
    let height = Math.ceil(bounds.height + pad);
    const scaleDown = Math.min(1, 3200 / Math.max(width, height));
    width = Math.max(640, Math.ceil(width * scaleDown));
    height = Math.max(480, Math.ceil(height * scaleDown));
    const viewport = getViewportForBounds(bounds, width, height, 0.4, 2, 0.15);
    setExporting(true);
    try {
      const dataUrl = await toPng(element, {
        backgroundColor: "#f3f1ec",
        width,
        height,
        skipFonts: true,
        pixelRatio: width * height > 2_000_000 ? 1 : 2,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
        filter: (node) => !(node instanceof HTMLElement && node.classList.contains("pit-node-remove")),
      });
      downloadUrl(dataUrl, "pit-pathways.png");
    } catch {
      setNotice("Could not export the PNG.");
    } finally {
      setExporting(false);
    }
  }

  const deleteSelected = useCallback(() => {
    const selectedNodes = flow.getNodes().filter((node) => node.selected && node.type === "course");
    const selectedEdges = flow.getEdges().filter((edge) => edge.selected);
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return false;
    const nodeIds = new Set(selectedNodes.map((node) => node.id));
    const edgeIds = new Set(selectedEdges.map((edge) => edge.id));
    updatePathway((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => !nodeIds.has(node.id)),
      edges: current.edges.filter(
        (edge) => !edgeIds.has(edge.id) && !nodeIds.has(edge.source) && !nodeIds.has(edge.target),
      ),
    }));
    setCanDelete(false);
    return true;
  }, [flow]);

  const dialogOpen = dialog.mode !== "closed" || resetOpen || notice !== null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Backspace" && event.key !== "Delete") return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      event.preventDefault();
      if (dialogOpen) return;
      if (deleteSelected()) event.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [deleteSelected, dialogOpen]);

  return (
    <div className="flex h-dvh flex-col bg-white text-stone-900">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-stone-200 px-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="md:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          Courses
        </Button>
        <h1 className="shrink-0 text-[13px] font-semibold tracking-tight">PIT Pathways</h1>
        <div className="toolbar-scroll ml-auto flex min-w-0 items-center gap-1 overflow-x-auto py-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canDelete}
            onMouseDown={(event) => event.preventDefault()}
            onClick={deleteSelected}
          >
            Delete
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            Import JSON
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportJson}>
            Export JSON
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={exporting} onClick={() => void exportPng()}>
            Export PNG
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setResetOpen(true)}>
            Reset
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void importFile(file);
          }}
        />
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[320px] shrink-0 border-r border-stone-200 md:flex md:min-h-0 md:flex-col">
          <CourseSidebar
            courses={courses}
            onAdd={(course, bucket) => placeCourse(course, bucket)}
            onEdit={(course) => setDialog({ mode: "edit", course })}
            onCreate={() => setDialog({ mode: "add" })}
          />
        </aside>
        <main className="h-full min-w-0 flex-1">
          <PathwayCanvas
            nodes={nodes}
            edges={edges}
            courses={courses}
            deleteEnabled={!dialogOpen}
            editingEdgeId={editingEdgeId}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
              setCanDelete(selectedNodes.some((node) => node.type === "course") || selectedEdges.length > 0);
            }}
            onEdgesDeleteCheck={onBeforeDelete}
            setEditingEdgeId={setEditingEdgeId}
            updateNodeLabel={updateNodeLabel}
            updateEdgeLabel={updateEdgeLabel}
            removeCourseNode={removeCourseNode}
            onDropCourse={(course, position) => placeCourse(course, undefined, position.x)}
          />
        </main>
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[min(100vw,22rem)] gap-0 p-0 sm:max-w-none">
          <SheetHeader className="sr-only">
            <SheetTitle>Courses</SheetTitle>
            <SheetDescription>Courses grouped by pathway bucket.</SheetDescription>
          </SheetHeader>
          <CourseSidebar
            courses={courses}
            onAdd={(course, bucket) => placeCourse(course, bucket)}
            onEdit={(course) => {
              setSidebarOpen(false);
              setDialog({ mode: "edit", course });
            }}
            onCreate={() => {
              setSidebarOpen(false);
              setDialog({ mode: "add" });
            }}
          />
        </SheetContent>
      </Sheet>

      {dialog.mode !== "closed" ? (
        <CourseDialog
          key={dialog.mode === "edit" ? dialog.course.id : "new"}
          course={dialog.mode === "edit" ? dialog.course : null}
          onClose={() => setDialog({ mode: "closed" })}
          onSave={saveCourse}
          onRemove={removeCourse}
        />
      ) : null}

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset pathway?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears the chart and restores the course list from the spreadsheet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={resetPathway}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={notice !== null} onOpenChange={(open) => { if (!open) setNotice(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Something went wrong</AlertDialogTitle>
            <AlertDialogDescription>{notice}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setNotice(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PathwayApp() {
  return (
    <ReactFlowProvider>
      <PathwayShell />
    </ReactFlowProvider>
  );
}
