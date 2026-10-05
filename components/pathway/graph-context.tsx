"use client";

import { createContext, useContext } from "react";

type GraphActions = {
  updateNodeLabel: (id: string, label: string) => void;
  updateEdgeLabel: (id: string, label: string) => void;
  removeCourseNode: (id: string) => void;
  editingEdgeId: string | null;
  setEditingEdgeId: (id: string | null) => void;
};

const GraphActionsContext = createContext<GraphActions | null>(null);

export function GraphActionsProvider({
  value,
  children,
}: {
  value: GraphActions;
  children: React.ReactNode;
}) {
  return <GraphActionsContext.Provider value={value}>{children}</GraphActionsContext.Provider>;
}

export function useGraphActions() {
  const value = useContext(GraphActionsContext);
  if (!value) {
    throw new Error("Pathway nodes must render inside the pathway canvas.");
  }
  return value;
}
