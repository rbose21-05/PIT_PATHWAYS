import {
  createDefaultState,
  loadPathwayState,
  serializePathwayState,
  STORAGE_KEY,
  type PathwayState,
} from "@/lib/pathway";

const serverState: PathwayState = createDefaultState();
let clientState: PathwayState | null = null;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function subscribePathway(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getServerPathwayState() {
  return serverState;
}

export function getClientPathwayState() {
  if (clientState) return clientState;
  clientState = loadPathwayState() ?? serverState;
  return clientState;
}

export function updatePathway(recipe: (current: PathwayState) => PathwayState) {
  const current = typeof window === "undefined" ? serverState : getClientPathwayState();
  clientState = recipe(current);
  listeners.forEach((listener) => listener());
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  const pending = clientState;
  saveTimer = setTimeout(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializePathwayState(pending)));
  }, 200);
}
