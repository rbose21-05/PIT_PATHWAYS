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

import { PathwayChips } from "@/components/pathway/chips";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  activateVersion,
  blankCourse,
  bucketMeta,
  courseNodeId,
  coursesUnderBucket,
  createDefaultState,
  duplicateActiveVersion,
  edgePresentation,
  graphWithCourse,
  graphWithoutNodes,
  parsePathwayState,
  satisfiedByPlan,
  serializePathwayState,
  withActive,
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

function bucketList(buckets: readonly string[]) {
  if (buckets.length < 2) return buckets[0] ?? "";
  if (buckets.length === 2) return `${buckets[0]} and ${buckets[1]}`;
  return `${buckets.slice(0, -1).join(", ")}, and ${buckets[buckets.length - 1]}`;
}

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
  const [bucketPrompt, setBucketPrompt] = useState<Course | null>(null);
  const [replacePrompt, setReplacePrompt] = useState<{
    course: Course;
    bucket: Bucket;
    occupantIds: string[];
    occupantNumber: string;
    occupantLabel: string;
  } | null>(null);
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
    updatePathway((current) =>
      withActive(current, ({ nodes: currentNodes, edges }) => ({
        nodes: applyNodeChanges(changes, currentNodes),
        edges,
      })),
    );
  }, []);

  const onEdgesChange: OnEdgesChange<PathwayEdge> = useCallback((changes) => {
    updatePathway((current) =>
      withActive(current, ({ nodes: currentNodes, edges }) => ({
        nodes: currentNodes,
        edges: applyEdgeChanges(changes, edges),
      })),
    );
  }, []);

  const updateNodeLabel = useCallback((id: string, label: string) => {
    updatePathway((current) =>
      withActive(current, ({ nodes: currentNodes, edges }) => ({
        edges,
        nodes: currentNodes.map((node) => {
          if (node.id !== id) return node;
          if (node.type === "root") return { ...node, data: { ...node.data, label } };
          if (node.type === "bucket") return { ...node, data: { ...node.data, label } };
          return { ...node, data: { ...node.data, label } };
        }),
      })),
    );
  }, []);

  const updateEdgeLabel = useCallback((id: string, label: string) => {
    updatePathway((current) =>
      withActive(current, ({ nodes: currentNodes, edges }) => ({
        nodes: currentNodes,
        edges: edges.map((edge) => (edge.id === id ? { ...edge, data: { ...edge.data, label } } : edge)),
      })),
    );
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    updatePathway((current) =>
      withActive(current, ({ nodes: currentNodes, edges }) => ({
        nodes: currentNodes,
        edges: addEdge({ ...connection, ...edgePresentation, data: { label: "" } }, edges),
      })),
    );
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

  function placeCourse(course: Course, bucket?: Bucket) {
    setSidebarOpen(false);
    const chosen = bucket && course.buckets.includes(bucket) ? bucket : course.buckets[0];
    if (!chosen) return;
    const existing = nodes.find((node) => node.type === "course" && node.data.courseId === course.id);
    if (existing) {
      updatePathway((current) =>
        withActive(current, ({ nodes: currentNodes, edges }) => ({
          nodes: currentNodes.map((node) => ({ ...node, selected: node.id === existing.id })),
          edges: edges.map((edge) => ({ ...edge, selected: false })),
        })),
      );
      setCanDelete(true);
      reveal(existing.id);
      return;
    }
    const occupants = coursesUnderBucket(nodes, edges, chosen);
    if (occupants.length > 0) {
      setReplacePrompt({
        course,
        bucket: chosen,
        occupantIds: occupants.map((node) => node.id),
        occupantNumber: occupants[0].data.number,
        occupantLabel: occupants[0].data.label,
      });
      return;
    }
    let focusId = courseNodeId(course.id);
    updatePathway((current) =>
      withActive(current, ({ nodes: currentNodes, edges }) => {
        const placed = graphWithCourse(currentNodes, edges, course, chosen);
        focusId = placed.focusId;
        return placed;
      }),
    );
    setCanDelete(true);
    reveal(focusId);
  }

  function replaceInPlan() {
    const prompt = replacePrompt;
    if (!prompt) return;
    setReplacePrompt(null);
    let focusId = courseNodeId(prompt.course.id);
    updatePathway((current) =>
      withActive(current, ({ nodes: currentNodes, edges }) => {
        const cleared = graphWithoutNodes(currentNodes, edges, new Set(prompt.occupantIds));
        const placed = graphWithCourse(cleared.nodes, cleared.edges, prompt.course, prompt.bucket);
        focusId = placed.focusId;
        return placed;
      }),
    );
    setCanDelete(true);
    reveal(focusId);
  }

  function branchWithCourse() {
    const prompt = replacePrompt;
    if (!prompt) return;
    setReplacePrompt(null);
    let focusId = courseNodeId(prompt.course.id);
    updatePathway((current) => {
      const branched = duplicateActiveVersion(current);
      return withActive(branched, ({ nodes: currentNodes, edges }) => {
        const cleared = graphWithoutNodes(currentNodes, edges, new Set(prompt.occupantIds));
        const placed = graphWithCourse(cleared.nodes, cleared.edges, prompt.course, prompt.bucket);
        focusId = placed.focusId;
        return placed;
      });
    });
    setCanDelete(true);
    reveal(focusId);
  }

  function newVersion() {
    updatePathway((current) => duplicateActiveVersion(current));
    setCanDelete(false);
    window.requestAnimationFrame(() => {
      void flow.fitView({ padding: 0.2, maxZoom: 1, duration: 200 });
    });
  }

  function chooseThisPlan() {
    updatePathway((current) => ({ ...current, chosenVersionId: current.activeVersionId }));
  }

  function switchVersion(id: string) {
    updatePathway((current) => activateVersion(current, id));
    setCanDelete(false);
    window.requestAnimationFrame(() => {
      void flow.fitView({ padding: 0.2, maxZoom: 1, duration: 200 });
    });
  }

  function requestPlace(course: Course) {
    const placed = nodes.some((node) => node.type === "course" && node.data.courseId === course.id);
    if (!placed && course.buckets.length > 1) {
      setSidebarOpen(false);
      setBucketPrompt(course);
      return;
    }
    placeCourse(course, course.buckets.length === 1 ? course.buckets[0] : undefined);
  }

  function countForBucket(bucket: Bucket) {
    const course = bucketPrompt;
    setBucketPrompt(null);
    if (course) placeCourse(course, bucket);
  }

  const removeCourseNode = useCallback((id: string) => {
    updatePathway((current) =>
      withActive(current, ({ nodes: currentNodes, edges }) =>
        graphWithoutNodes(currentNodes, edges, new Set([id])),
      ),
    );
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
      const rewrite = (currentNodes: PathwayNode[]) =>
        currentNodes.map((node) => {
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
        });
      updatePathway((current) => {
        const nodes = rewrite(current.nodes);
        return {
          ...current,
          courses: current.courses.map((course) => (course.id === existing.id ? next : course)),
          nodes,
          versions: current.versions.map((version) => ({
            ...version,
            nodes: version.id === current.activeVersionId ? nodes : rewrite(version.nodes),
          })),
        };
      });
    } else {
      updatePathway((current) => ({
        ...current,
        courses: [...current.courses, blankCourse(current.courses, draft)],
      }));
    }
    setDialog({ mode: "closed" });
  }

  function removeCourse(course: Course) {
    const strip = (currentNodes: PathwayNode[], currentEdges: PathwayEdge[]) => {
      const removed = new Set(
        currentNodes
          .filter((node) => node.type === "course" && node.data.courseId === course.id)
          .map((node) => node.id),
      );
      return graphWithoutNodes(currentNodes, currentEdges, removed);
    };
    updatePathway((current) => {
      const active = strip(current.nodes, current.edges);
      return {
        ...current,
        courses: current.courses.filter((item) => item.id !== course.id),
        nodes: active.nodes,
        edges: active.edges,
        versions: current.versions.map((version) => {
          const graph = version.id === current.activeVersionId ? active : strip(version.nodes, version.edges);
          return { ...version, nodes: graph.nodes, edges: graph.edges };
        }),
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
    updatePathway((current) =>
      withActive(current, ({ nodes: currentNodes, edges }) => {
        const cleared = graphWithoutNodes(currentNodes, edges, nodeIds);
        return {
          nodes: cleared.nodes,
          edges: cleared.edges.filter((edge) => !edgeIds.has(edge.id)),
        };
      }),
    );
    setCanDelete(false);
    return true;
  }, [flow]);

  const dialogOpen =
    dialog.mode !== "closed" || resetOpen || notice !== null || bucketPrompt !== null || replacePrompt !== null;
  const satisfied = satisfiedByPlan(nodes);
  const activeVersion = pathway.versions.find((version) => version.id === pathway.activeVersionId);
  const planIsChosen = pathway.chosenVersionId === pathway.activeVersionId;

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
      <header className="flex shrink-0 flex-col gap-1 border-b border-stone-200 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
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
          <label className="flex items-center gap-1 text-[11px] font-medium text-stone-500">
            Plan
            <select
              aria-label="Plan"
              className="h-7 rounded-md border border-stone-200 bg-white px-1.5 text-xs font-medium text-stone-800"
              value={pathway.activeVersionId}
              onChange={(event) => switchVersion(event.target.value)}
            >
              {pathway.versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name}
                  {version.id === pathway.chosenVersionId ? " · chosen" : ""}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="outline" size="sm" onClick={newVersion}>
            New version
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={planIsChosen} onClick={chooseThisPlan}>
            {planIsChosen ? "Chosen" : "Choose this plan"}
          </Button>
          <div
            className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-1.5 rounded-lg border-2 border-stone-900 bg-white px-2.5 py-1.5 shadow-sm"
            aria-label={
              activeVersion
                ? `Requirements ${activeVersion.name} satisfies`
                : "Requirements this plan satisfies"
            }
          >
            <span className="rounded-md bg-stone-900 px-2 py-0.5 text-xs font-bold tracking-wide text-white">
              Satisfies
            </span>
            {satisfied.genEd.length === 0 && satisfied.requirements.length === 0 ? (
              <span className="text-xs font-medium text-stone-600">None yet</span>
            ) : (
              <PathwayChips genEd={satisfied.genEd} requirements={satisfied.requirements} />
            )}
          </div>
        </div>
        <div className="toolbar-scroll flex min-w-0 items-center justify-end gap-1 overflow-x-auto">
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
            onAdd={(course) => requestPlace(course)}
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
            onDropCourse={(course) => requestPlace(course)}
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
            onAdd={(course) => requestPlace(course)}
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

      <Dialog open={replacePrompt !== null} onOpenChange={(open) => { if (!open) setReplacePrompt(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>One course per bucket</DialogTitle>
            <DialogDescription>
              {replacePrompt
                ? `${replacePrompt.bucket} already has ${replacePrompt.occupantNumber}. This plan can hold one course in each bucket. Replace it here, or keep this plan and try ${replacePrompt.course.number} in a new version.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={replaceInPlan}>
              Replace in this plan
            </Button>
            <Button type="button" variant="outline" onClick={branchWithCourse}>
              New version
            </Button>
            <Button type="button" variant="ghost" onClick={() => setReplacePrompt(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bucketPrompt !== null} onOpenChange={(open) => { if (!open) setBucketPrompt(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose one bucket</DialogTitle>
            <DialogDescription>
              {bucketPrompt
                ? `${bucketPrompt.number} is listed under ${bucketList(bucketPrompt.buckets)}. It can count for only one.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {bucketPrompt?.buckets.map((bucket) => {
              const meta = bucketMeta[bucket];
              return (
                <Button
                  key={bucket}
                  type="button"
                  variant="outline"
                  className="justify-start"
                  style={{ borderColor: meta.accent, color: meta.ink }}
                  onClick={() => countForBucket(bucket)}
                >
                  <span className="size-2 rounded-full" style={{ background: meta.accent }} />
                  {bucket}
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

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
