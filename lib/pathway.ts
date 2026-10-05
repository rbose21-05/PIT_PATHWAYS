import { MarkerType, type Edge, type Node } from "@xyflow/react";

import catalog from "@/data/courses.json";
import {
  BUCKETS,
  GEN_ED_CODES,
  type Bucket,
  type BucketNodeData,
  type Course,
  type CourseNodeData,
  type EdgeLabelData,
  type RootNodeData,
} from "@/lib/types";

export type RootNode = Node<RootNodeData, "root">;
export type BucketNode = Node<BucketNodeData, "bucket">;
export type CourseFlowNode = Node<CourseNodeData, "course">;
export type PathwayNode = RootNode | BucketNode | CourseFlowNode;
export type PathwayEdge = Edge<EdgeLabelData, "labeled">;

export type PathwayVersion = {
  id: string;
  name: string;
  nodes: PathwayNode[];
  edges: PathwayEdge[];
};

export type PathwayState = {
  courses: Course[];
  versions: PathwayVersion[];
  activeVersionId: string;
  chosenVersionId: string | null;
  nodes: PathwayNode[];
  edges: PathwayEdge[];
};

export const COURSE_DRAG_TYPE = "application/pit-course";
export const STORAGE_KEY = "pit-pathways-v1";

export const bucketMeta: Record<
  Bucket,
  { accent: string; wash: string; ink: string }
> = {
  "Public Interest": { accent: "#0f766e", wash: "#f0fdfa", ink: "#115e59" },
  "Social Governance": { accent: "#c2410c", wash: "#fff7ed", ink: "#9a3412" },
  "Digital Technology": { accent: "#4338ca", wash: "#eef2ff", ink: "#3730a3" },
};

const edgeMarker = {
  type: MarkerType.ArrowClosed,
  width: 16,
  height: 16,
  color: "#44403c",
} as const;

export const edgePresentation = {
  type: "labeled" as const,
  markerEnd: edgeMarker,
  style: { stroke: "#44403c", strokeWidth: 1.5 },
};

export const defaultCourses = catalog as Course[];

export function isCsRequirement(label: string) {
  const normalized = label.trim().toLowerCase();
  return normalized === "cs elective" || normalized === "jyw";
}

export function isBucket(value: unknown): value is Bucket {
  return typeof value === "string" && (BUCKETS as readonly string[]).includes(value);
}

function slugify(value: string) {
  const primary = value.split("/")[0]?.trim().toLowerCase() ?? "";
  const slug = primary
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "course";
}

export function uniqueCourseId(courses: Course[], number: string) {
  const base = slugify(number);
  const taken = new Set(courses.map((course) => course.id));
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function courseNodeId(courseId: string) {
  return `course-${courseId}`;
}

export const BUCKET_NODE_WIDTH = 210;
export const COURSE_NODE_WIDTH = 260;
const COURSE_STACK_GAP = 168;
const COURSE_STACK_OFFSET = 132;

export function bucketNodeId(bucket: Bucket) {
  if (bucket === "Public Interest") return "bucket-public-interest";
  if (bucket === "Social Governance") return "bucket-social-governance";
  return "bucket-digital-technology";
}

export function chooseBucket(
  courseBuckets: readonly Bucket[],
  bucketNodes: { bucket: Bucket; x: number }[],
  dropX?: number,
) {
  if (courseBuckets.length === 0) return null;
  if (dropX === undefined || bucketNodes.length === 0) return courseBuckets[0];
  const eligible = bucketNodes.filter((node) => courseBuckets.includes(node.bucket));
  const pool = eligible.length > 0 ? eligible : bucketNodes;
  let best = pool[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const node of pool) {
    const distance = Math.abs(dropX - (node.x + BUCKET_NODE_WIDTH / 2));
    if (distance < bestDistance) {
      best = node;
      bestDistance = distance;
    }
  }
  return courseBuckets.includes(best.bucket) ? best.bucket : courseBuckets[0];
}

export function courseColumnPosition(origin: { x: number; y: number }, siblingYs: number[]) {
  const x = origin.x + (BUCKET_NODE_WIDTH - COURSE_NODE_WIDTH) / 2;
  if (siblingYs.length === 0) return { x, y: origin.y + COURSE_STACK_OFFSET };
  return { x, y: Math.max(...siblingYs) + COURSE_STACK_GAP };
}

function bucketNode(bucket: Bucket, x: number): BucketNode {
  return {
    id: bucketNodeId(bucket),
    type: "bucket",
    position: { x, y: 188 },
    data: { bucket, label: bucket },
    deletable: false,
  };
}

export function createInitialNodes(): PathwayNode[] {
  return [
    {
      id: "root",
      type: "root",
      position: { x: 241, y: 0 },
      data: {
        number: "CICS 127",
        label: "Introduction to Public Interest Technology",
        genEd: ["SI"],
      },
      deletable: false,
    },
    bucketNode("Public Interest", 0),
    bucketNode("Social Governance", 266),
    bucketNode("Digital Technology", 532),
  ];
}

export function createInitialEdges(): PathwayEdge[] {
  const targets = [
    ["e-root-public", "bucket-public-interest"],
    ["e-root-social", "bucket-social-governance"],
    ["e-root-digital", "bucket-digital-technology"],
  ] as const;

  return targets.map(([id, target]) => ({
    id,
    source: "root",
    target,
    sourceHandle: "bottom",
    targetHandle: "top",
    data: { label: "" },
    ...edgePresentation,
  }));
}

export function createDefaultState(): PathwayState {
  const nodes = createInitialNodes();
  const edges = createInitialEdges();
  const version: PathwayVersion = { id: "plan-1", name: "Plan 1", nodes, edges };
  return {
    courses: defaultCourses.map((course) => ({
      ...course,
      buckets: [...course.buckets],
      genEd: [...course.genEd],
      requirements: [...course.requirements],
    })),
    versions: [version],
    activeVersionId: version.id,
    chosenVersionId: null,
    nodes,
    edges,
  };
}

export function withActive(
  state: PathwayState,
  update: (graph: { nodes: PathwayNode[]; edges: PathwayEdge[] }) => {
    nodes: PathwayNode[];
    edges: PathwayEdge[];
  },
): PathwayState {
  const next = update({ nodes: state.nodes, edges: state.edges });
  return {
    ...state,
    nodes: next.nodes,
    edges: next.edges,
    versions: state.versions.map((version) =>
      version.id === state.activeVersionId ? { ...version, nodes: next.nodes, edges: next.edges } : version,
    ),
  };
}

export function nextPlanId(versions: PathwayVersion[]) {
  const taken = new Set(versions.map((version) => version.id));
  let index = versions.length + 1;
  while (taken.has(`plan-${index}`)) index += 1;
  return `plan-${index}`;
}

function copyGraph(nodes: PathwayNode[], edges: PathwayEdge[]) {
  return {
    nodes: nodes.map((node) => ({ ...node, selected: false })),
    edges: edges.map((edge) => ({ ...edge, selected: false })),
  };
}

export function duplicateActiveVersion(state: PathwayState): PathwayState {
  const id = nextPlanId(state.versions);
  const graph = copyGraph(state.nodes, state.edges);
  const version: PathwayVersion = {
    id,
    name: `Plan ${state.versions.length + 1}`,
    nodes: graph.nodes,
    edges: graph.edges,
  };
  return {
    ...state,
    versions: [...state.versions, version],
    activeVersionId: id,
    nodes: graph.nodes,
    edges: graph.edges,
  };
}

export function activateVersion(state: PathwayState, id: string): PathwayState {
  const version = state.versions.find((item) => item.id === id);
  if (!version || version.id === state.activeVersionId) return state;
  const currentSaved = state.versions.map((item) =>
    item.id === state.activeVersionId ? { ...item, nodes: state.nodes, edges: state.edges } : item,
  );
  const next = currentSaved.find((item) => item.id === id) ?? version;
  return {
    ...state,
    versions: currentSaved,
    activeVersionId: id,
    nodes: next.nodes,
    edges: next.edges,
  };
}

export function coursesUnderBucket(nodes: PathwayNode[], edges: PathwayEdge[], bucket: Bucket) {
  const sourceId = bucketNodeId(bucket);
  const linked = new Set(edges.filter((edge) => edge.source === sourceId).map((edge) => edge.target));
  const anchor = nodes.find((node) => node.type === "bucket" && node.data.bucket === bucket);
  const columnX = anchor ? anchor.position.x + (BUCKET_NODE_WIDTH - COURSE_NODE_WIDTH) / 2 : null;
  return nodes.filter((node): node is CourseFlowNode => {
    if (node.type !== "course") return false;
    if (linked.has(node.id)) return true;
    return columnX !== null && Math.abs(node.position.x - columnX) < 40;
  });
}

export function graphWithoutNodes(nodes: PathwayNode[], edges: PathwayEdge[], ids: Set<string>) {
  return {
    nodes: nodes.filter((node) => !ids.has(node.id)),
    edges: edges.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target) && !ids.has(edge.id)),
  };
}

export function graphWithCourse(
  nodes: PathwayNode[],
  edges: PathwayEdge[],
  course: Course,
  bucket: Bucket,
) {
  const focusId = courseNodeId(course.id);
  const anchor = nodes.find((node) => node.type === "bucket" && node.data.bucket === bucket);
  const sourceId = anchor?.id ?? bucketNodeId(bucket);
  const origin = anchor?.position ?? { x: 0, y: 188 };
  const position = courseColumnPosition(origin, []);
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
    focusId,
    nodes: [...nodes.map((item) => ({ ...item, selected: false })), node],
    edges: [...edges.map((item) => ({ ...item, selected: false })), edge],
  };
}

const REQUIREMENT_ORDER = ["CS elective", "JYW", "IE"];

export function satisfiedByPlan(nodes: PathwayNode[]) {
  const genEd = new Set<string>();
  const requirements = new Set<string>();
  for (const node of nodes) {
    if (node.type !== "course") continue;
    for (const code of node.data.genEd) genEd.add(code);
    for (const label of node.data.requirements) requirements.add(label);
  }
  const labels = [...requirements].sort((a, b) => {
    const aRank = REQUIREMENT_ORDER.indexOf(a);
    const bRank = REQUIREMENT_ORDER.indexOf(b);
    if (aRank !== -1 || bRank !== -1) {
      return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank);
    }
    return a.localeCompare(b);
  });
  return {
    genEd: GEN_ED_CODES.filter((code) => genEd.has(code)),
    requirements: labels,
  };
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : [];
}

function parseCourse(value: unknown): Course | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.trim() === "") return null;
  if (typeof record.number !== "string" || record.number.trim() === "") return null;
  if (typeof record.title !== "string" || record.title.trim() === "") return null;
  if (!Array.isArray(record.buckets)) return null;
  const buckets = record.buckets.filter(isBucket);
  if (buckets.length === 0) return null;

  const course: Course = {
    id: record.id,
    number: record.number.trim(),
    title: record.title.trim(),
    credits: typeof record.credits === "number" ? record.credits : null,
    description: typeof record.description === "string" ? record.description : "",
    prerequisites: typeof record.prerequisites === "string" ? record.prerequisites : "",
    enrollment: typeof record.enrollment === "string" ? record.enrollment : "",
    buckets,
    genEd: stringList(record.genEd).filter((code) =>
      (GEN_ED_CODES as readonly string[]).includes(code),
    ),
    requirements: stringList(record.requirements),
    verified: typeof record.verified === "boolean" ? record.verified : true,
  };
  if (typeof record.unverifiedReason === "string" && record.unverifiedReason.trim()) {
    course.unverifiedReason = record.unverifiedReason.trim();
  }
  return course;
}

function parseNode(value: unknown): PathwayNode | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string") return null;
  const position = record.position as { x?: unknown; y?: unknown } | null;
  if (!position || typeof position.x !== "number" || typeof position.y !== "number") return null;
  if (!record.data || typeof record.data !== "object") return null;
  const data = record.data as Record<string, unknown>;
  if (typeof data.label !== "string") return null;
  const point = { x: position.x, y: position.y };

  if (record.type === "root") {
    if (typeof data.number !== "string") return null;
    return {
      id: record.id,
      type: "root",
      position: point,
      deletable: false,
      data: {
        number: data.number,
        label: data.label,
        genEd: stringList(data.genEd),
      },
    };
  }

  if (record.type === "bucket") {
    if (!isBucket(data.bucket)) return null;
    return {
      id: record.id,
      type: "bucket",
      position: point,
      deletable: false,
      data: { bucket: data.bucket, label: data.label },
    };
  }

  if (record.type === "course") {
    if (typeof data.courseId !== "string" || typeof data.number !== "string") return null;
    return {
      id: record.id,
      type: "course",
      position: point,
      data: {
        courseId: data.courseId,
        number: data.number,
        label: data.label,
        genEd: stringList(data.genEd).filter((code) =>
          (GEN_ED_CODES as readonly string[]).includes(code),
        ),
        requirements: stringList(data.requirements),
      },
    };
  }

  return null;
}

function parseEdge(value: unknown): PathwayEdge | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string") return null;
  if (typeof record.source !== "string" || typeof record.target !== "string") return null;
  const data = record.data as { label?: unknown } | null;
  const label = data && typeof data.label === "string" ? data.label : "";
  return {
    id: record.id,
    source: record.source,
    target: record.target,
    sourceHandle: typeof record.sourceHandle === "string" ? record.sourceHandle : undefined,
    targetHandle: typeof record.targetHandle === "string" ? record.targetHandle : undefined,
    data: { label },
    ...edgePresentation,
  };
}

function parseGraph(nodesValue: unknown, edgesValue: unknown) {
  if (!Array.isArray(nodesValue) || !Array.isArray(edgesValue)) return null;
  const nodes = nodesValue.map(parseNode);
  const edges = edgesValue.map(parseEdge);
  if (nodes.some((node) => node === null) || edges.some((edge) => edge === null)) return null;
  return { nodes: nodes as PathwayNode[], edges: edges as PathwayEdge[] };
}

function parseVersion(value: unknown): PathwayVersion | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.trim() === "") return null;
  if (typeof record.name !== "string" || record.name.trim() === "") return null;
  const graph = parseGraph(record.nodes, record.edges);
  if (!graph) return null;
  return { id: record.id, name: record.name.trim(), nodes: graph.nodes, edges: graph.edges };
}

export function parsePathwayState(value: unknown): PathwayState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.courses)) return null;
  const courses = record.courses.map(parseCourse);
  if (courses.some((course) => course === null)) return null;

  let versions: PathwayVersion[] | null = null;
  if (Array.isArray(record.versions) && record.versions.length > 0) {
    const parsed = record.versions.map(parseVersion);
    if (parsed.some((version) => version === null)) return null;
    versions = parsed as PathwayVersion[];
  } else {
    const graph = parseGraph(record.nodes, record.edges);
    if (!graph) return null;
    versions = [{ id: "plan-1", name: "Plan 1", nodes: graph.nodes, edges: graph.edges }];
  }

  const ids = new Set(versions.map((version) => version.id));
  const activeVersionId =
    typeof record.activeVersionId === "string" && ids.has(record.activeVersionId)
      ? record.activeVersionId
      : versions[0].id;
  const chosenVersionId =
    typeof record.chosenVersionId === "string" && ids.has(record.chosenVersionId)
      ? record.chosenVersionId
      : null;
  const active = versions.find((version) => version.id === activeVersionId) ?? versions[0];
  return {
    courses: courses as Course[],
    versions,
    activeVersionId: active.id,
    chosenVersionId,
    nodes: active.nodes,
    edges: active.edges,
  };
}

export function loadPathwayState(): PathwayState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parsePathwayState(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function serializeGraph(nodes: PathwayNode[], edges: PathwayEdge[]) {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      data: { label: edge.data?.label ?? "" },
    })),
  };
}

export function serializePathwayState(state: PathwayState) {
  const versions = state.versions.map((version) =>
    version.id === state.activeVersionId ? { ...version, nodes: state.nodes, edges: state.edges } : version,
  );
  const active = serializeGraph(state.nodes, state.edges);
  return {
    courses: state.courses,
    versions: versions.map((version) => ({
      id: version.id,
      name: version.name,
      ...serializeGraph(version.nodes, version.edges),
    })),
    activeVersionId: state.activeVersionId,
    chosenVersionId: state.chosenVersionId,
    ...active,
  };
}

export function blankCourse(courses: Course[], draft: Pick<Course, "number" | "title" | "buckets" | "genEd" | "requirements">): Course {
  return {
    id: uniqueCourseId(courses, draft.number),
    number: draft.number.trim(),
    title: draft.title.trim(),
    credits: null,
    description: "",
    prerequisites: "",
    enrollment: "",
    buckets: draft.buckets,
    genEd: draft.genEd,
    requirements: draft.requirements,
    verified: true,
  };
}
