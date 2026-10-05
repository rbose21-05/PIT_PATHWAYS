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

export type PathwayState = {
  courses: Course[];
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

function bucketNode(bucket: Bucket, x: number): BucketNode {
  return {
    id:
      bucket === "Public Interest"
        ? "bucket-public-interest"
        : bucket === "Social Governance"
          ? "bucket-social-governance"
          : "bucket-digital-technology",
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
  return {
    courses: defaultCourses.map((course) => ({ ...course, buckets: [...course.buckets], genEd: [...course.genEd], requirements: [...course.requirements] })),
    nodes: createInitialNodes(),
    edges: createInitialEdges(),
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

export function parsePathwayState(value: unknown): PathwayState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.courses) || !Array.isArray(record.nodes) || !Array.isArray(record.edges)) {
    return null;
  }
  const courses = record.courses.map(parseCourse);
  const nodes = record.nodes.map(parseNode);
  const edges = record.edges.map(parseEdge);
  if (courses.some((course) => course === null)) return null;
  if (nodes.some((node) => node === null)) return null;
  if (edges.some((edge) => edge === null)) return null;
  return {
    courses: courses as Course[],
    nodes: nodes as PathwayNode[],
    edges: edges as PathwayEdge[],
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

export function serializePathwayState(state: PathwayState) {
  return {
    courses: state.courses,
    nodes: state.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    })),
    edges: state.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      data: { label: edge.data?.label ?? "" },
    })),
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
