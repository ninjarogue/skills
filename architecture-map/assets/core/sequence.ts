import { chipAnchor, portAnchor } from './archetypes'
import { depthKey, polylineLengths, sceneBounds, toScreen, type ScreenPt } from './iso'
import type { EdgeGeometry } from './routes'
import type { Scene } from './scene'
import type { ArchEdge, ArchFlow, ArchNode } from './types'

/**
 * The flows map: a sequence, not the city.
 *
 * Groups, nodes and edges keep the isometric neighbourhoods. A flow is a
 * different claim — who talks, in what order — so it gets a different layout
 * of the *same* glyphs and packets: participants in a row, time running down,
 * each authored step a message. City footprints and `via` waypoints stay
 * behind; they answer geography, and a sequence is not a place.
 */

const COL_GAP = 3
const MESSAGE_ROW = 56
const MESSAGE_PAD = 36
const SELF_LOOP = 32
const LIFELINE_PAD = 18

export function sequenceEdgeId(index: number, edgeId: string): string {
  return `${index}::${edgeId}`
}

/** Strip the step tag so a sequence message still names its authored edge. */
export function sourceEdgeId(id: string): string {
  const split = id.indexOf('::')
  if (split <= 0) return id
  const n = Number(id.slice(0, split))
  return Number.isInteger(n) && n >= 0 ? id.slice(split + 2) : id
}

export type Lifeline = { id: string; a: ScreenPt; b: ScreenPt }

export type SequenceLayout = {
  flow: ArchFlow
  nodes: ArchNode[]
  edges: ArchEdge[]
  geometry: ReadonlyMap<string, EdgeGeometry>
  lifelines: Lifeline[]
}

/**
 * Participants in first-appearance order along the route, then each step as
 * a message on the next row. Repeated edges become two rows — the same call
 * at two times — which is why the drawn edge ids are tagged with the step.
 */
export function buildSequenceLayout(
  flow: ArchFlow,
  nodes: readonly ArchNode[],
  edges: readonly ArchEdge[],
): SequenceLayout | null {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const edgeById = new Map(edges.map((e) => [e.id, e]))

  const steps: ArchEdge[] = []
  for (const edgeId of flow.route) {
    const edge = edgeById.get(edgeId)
    if (!edge) return null
    if (!nodeById.has(edge.from) || !nodeById.has(edge.to)) return null
    steps.push(edge)
  }
  if (steps.length === 0) return null

  const seen: string[] = []
  const remember = (id: string) => {
    if (!seen.includes(id)) seen.push(id)
  }
  for (const step of steps) {
    remember(step.from)
    remember(step.to)
  }

  const participants = seen.map((id) => nodeById.get(id)!)
  const placed = placeParticipants(participants)
  const placedById = new Map(placed.map((n) => [n.id, n]))

  const baseY =
    Math.max(
      ...placed.map((n) => {
        const fp = n.footprint
        return Math.max(
          toScreen(fp.gx, fp.gy).y,
          toScreen(fp.gx + fp.w, fp.gy).y,
          toScreen(fp.gx + fp.w, fp.gy + fp.d).y,
          toScreen(fp.gx, fp.gy + fp.d).y,
        )
      }),
    ) + MESSAGE_PAD

  const lifelineX = (id: string): number => {
    const node = placedById.get(id)!
    return chipAnchor(node.footprint, 0).x
  }

  const lastY = baseY + (steps.length - 1) * MESSAGE_ROW
  const lifelines: Lifeline[] = placed.map((node) => {
    const x = lifelineX(node.id)
    const port = portAnchor(node.footprint)
    const top = toScreen(port.gx, port.gy).y + LIFELINE_PAD
    return { id: node.id, a: { x, y: top }, b: { x, y: lastY + LIFELINE_PAD } }
  })

  const drawn: ArchEdge[] = []
  const geometry = new Map<string, EdgeGeometry>()
  const route: string[] = []

  steps.forEach((step, i) => {
    const id = sequenceEdgeId(i, step.id)
    const y = baseY + i * MESSAGE_ROW
    const fromX = lifelineX(step.from)
    const toX = lifelineX(step.to)
    const pts =
      step.from === step.to
        ? [
            { x: fromX, y },
            { x: fromX + SELF_LOOP, y },
            { x: fromX + SELF_LOOP, y: y + MESSAGE_ROW * 0.4 },
            { x: fromX, y: y + MESSAGE_ROW * 0.4 },
          ]
        : [
            { x: fromX, y },
            { x: toX, y },
          ]
    const { cum, total } = polylineLengths(pts)
    geometry.set(id, { pts, cum, total })
    drawn.push({ ...step, id, via: undefined })
    route.push(id)
  })

  return {
    flow: { ...flow, route },
    nodes: placed,
    edges: drawn,
    geometry,
    lifelines,
  }
}

/**
 * Same buildings, a new street: origins sit on a constant-depth line so the
 * row reads left-to-right on screen, not as a walk into the city.
 */
function placeParticipants(nodes: readonly ArchNode[]): ArchNode[] {
  let gx = 0
  return nodes.map((node) => {
    const { w, d } = node.footprint
    const col = Math.max(w, d) + COL_GAP
    const placed = { ...node, footprint: { gx, gy: -gx, w, d } }
    gx += col
    return placed
  })
}

export function buildSequenceScene(layout: SequenceLayout): Scene {
  const shapes = [...layout.nodes].sort(
    (a, b) => depthKey(a.footprint) - depthKey(b.footprint) || a.footprint.gx - b.footprint.gx,
  )
  const buildingBounds = sceneBounds(
    shapes.map((s) => ({ footprint: s.footprint, height: s.height })),
  )
  const pts: ScreenPt[] = []
  for (const geom of layout.geometry.values()) pts.push(...geom.pts)
  for (const line of layout.lifelines) pts.push(line.a, line.b)
  const messageBounds = pointsBounds(pts)

  return {
    key: `flow:${layout.flow.id}`,
    shapes,
    districts: [],
    grid: [],
    bounds: unionBounds(buildingBounds, messageBounds),
  }
}

function pointsBounds(pts: ScreenPt[], margin = 48): {
  x: number
  y: number
  width: number
  height: number
} {
  if (pts.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return {
    x: minX - margin,
    y: minY - margin,
    width: maxX - minX + margin * 2,
    height: maxY - minY + margin * 2,
  }
}

function unionBounds(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  if (b.width === 0 && b.height === 0) return a
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const right = Math.max(a.x + a.width, b.x + b.width)
  const bottom = Math.max(a.y + a.height, b.y + b.height)
  return { x, y, width: right - x, height: bottom - y }
}
