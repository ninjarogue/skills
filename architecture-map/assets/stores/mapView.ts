export type Selection = { kind: 'node'; id: string } | { kind: 'edge'; id: string }

export type MapView = {
  selection: Selection | null
  hover: Selection | null
  hoverGroup: string | null
  activeFlowId: string | null
  resetTick: number
}

export const EMPTY_MAP_VIEW: MapView = {
  selection: null,
  hover: null,
  hoverGroup: null,
  activeFlowId: null,
  resetTick: 0,
}

let state: MapView = EMPTY_MAP_VIEW
const listeners = new Set<() => void>()

function set(next: Partial<MapView>) {
  const merged = { ...state, ...next }
  if (
    merged.selection === state.selection &&
    merged.hover === state.hover &&
    merged.hoverGroup === state.hoverGroup &&
    merged.activeFlowId === state.activeFlowId &&
    merged.resetTick === state.resetTick
  ) {
    return
  }
  state = merged
  for (const listener of listeners) listener()
}

export function selectCityItem(selection: Selection | null): void {
  set({ selection, activeFlowId: null })
}

export function inspectFlowItem(selection: Selection | null): void {
  set({ selection })
}

export function setHover(hover: Selection | null): void {
  set({ hover })
}

export function setHoverGroup(hoverGroup: string | null): void {
  set({ hoverGroup })
}

export function setActiveFlow(activeFlowId: string | null): void {
  set({ activeFlowId, selection: null })
}

export function clearView(): void {
  set({ selection: null, hover: null, activeFlowId: null, resetTick: state.resetTick + 1 })
}

export function getMapView(): MapView {
  return state
}

export function hasFocus(view: MapView): boolean {
  return view.selection !== null || view.activeFlowId !== null
}

export function subscribeMapView(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
