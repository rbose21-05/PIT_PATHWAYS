"use client";

import {
  Background,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  ReactFlow,
  useReactFlow,
  type Connection,
  type OnBeforeDelete,
  type OnEdgesChange,
  type OnNodesChange,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import { useCallback, useMemo } from "react";

import { LabeledEdge } from "@/components/pathway/labeled-edge";
import { GraphActionsProvider } from "@/components/pathway/graph-context";
import { BucketNode, CourseNode, RootNode } from "@/components/pathway/nodes";
import {
  COURSE_DRAG_TYPE,
  edgePresentation,
  type PathwayEdge,
  type PathwayNode,
} from "@/lib/pathway";
import type { Course } from "@/lib/types";

const nodeTypes = {
  root: RootNode,
  bucket: BucketNode,
  course: CourseNode,
};

const edgeTypes = {
  labeled: LabeledEdge,
};

export function PathwayCanvas({
  nodes,
  edges,
  courses,
  deleteEnabled,
  editingEdgeId,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectionChange,
  onEdgesDeleteCheck,
  setEditingEdgeId,
  updateNodeLabel,
  updateEdgeLabel,
  onDropCourse,
}: {
  nodes: PathwayNode[];
  edges: PathwayEdge[];
  courses: Course[];
  deleteEnabled: boolean;
  editingEdgeId: string | null;
  onNodesChange: OnNodesChange<PathwayNode>;
  onEdgesChange: OnEdgesChange<PathwayEdge>;
  onConnect: (connection: Connection) => void;
  onSelectionChange: OnSelectionChangeFunc<PathwayNode, PathwayEdge>;
  onEdgesDeleteCheck: OnBeforeDelete<PathwayNode, PathwayEdge>;
  setEditingEdgeId: (id: string | null) => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateEdgeLabel: (id: string, label: string) => void;
  onDropCourse: (course: Course, position: { x: number; y: number }) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const actions = useMemo(
    () => ({ updateNodeLabel, updateEdgeLabel, editingEdgeId, setEditingEdgeId }),
    [editingEdgeId, setEditingEdgeId, updateEdgeLabel, updateNodeLabel],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <GraphActionsProvider value={actions}>
      <ReactFlow<PathwayNode, PathwayEdge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onBeforeDelete={onEdgesDeleteCheck}
        onEdgeDoubleClick={(_, edge) => setEditingEdgeId(edge.id)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={edgePresentation}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: "#44403c", strokeWidth: 1.5 }}
        isValidConnection={(connection) => connection.source !== connection.target}
        deleteKeyCode={deleteEnabled ? ["Delete", "Backspace"] : null}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
        colorMode="light"
        proOptions={{ hideAttribution: false }}
        className="bg-[#f3f1ec]"
        onDragOver={onDragOver}
        onDrop={(event) => {
          event.preventDefault();
          const custom = event.dataTransfer.getData(COURSE_DRAG_TYPE);
          const plain = event.dataTransfer.getData("text/plain");
          const courseId = custom || (courses.some((course) => course.id === plain) ? plain : "");
          const course = courses.find((item) => item.id === courseId);
          if (!course) return;
          const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
          onDropCourse(course, { x: point.x - 130, y: point.y - 16 });
        }}
      >
        <Background gap={18} size={1.2} color="#d6d3d1" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </GraphActionsProvider>
  );
}
