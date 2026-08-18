import type { Archetype, ArchetypeParams } from './archetypes'
import type { Footprint } from './iso'

/**
 * Where the buildings stand and how big they are — derived from the
 * measurement rather than placed by hand.
 *
 * The version of this map that was hand-authored looked better for about a
 * week. Then a module tripled in size and its building stayed the same height,
 * because the height was a number somebody typed. Deriving the geometry from
 * what the scanner counts means the skyline re-proportions itself as the code
 * moves, and nobody has to remember to nudge it.
 *
 * What is derived: footprint, height, and archetype. What stays authored:
 * which modules exist, what they are called, what they do, and which of them
 * a flow travels through. No measurement can answer those.
 *
 * The output is plain data. A footprint that lands somewhere ugly can be
 * overridden in the authored table without fighting this file — the merge
 * prefers whatever a human wrote.
 */

/** What the scanner knows about one module. */
export type Measure = { count: number; loc: number }

/** Heights are a log ladder: a module ten times bigger is not ten times taller. */
const MIN_HEIGHT = 1
const MAX_HEIGHT = 6

export function deriveHeight({ loc }: Measure): number {
  if (loc <= 0) return MIN_HEIGHT
  const steps = Math.log2(loc / 180 + 1) * 1.25
  return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(steps)))
}

/**
 * The shape a module *is*, read off how its code is distributed.
 *
 * - Many files of similar size — a collection whose count is the point.
 *   Nine asset editors, twenty route handlers. Drawn as a row of fins.
 * - One dominant file — a deep single-purpose pile. Drawn as a tower.
 * - Lots of code across many files — something that accreted in layers.
 *   Drawn as a stepped stack.
 * - A handful of small files — an ordinary mid-rise.
 * - Almost nothing — a plate on the floor. Small libraries, and the
 *   outside-world services that are not code in this repo at all.
 */
export function deriveArchetype({ count, loc }: Measure): {
  archetype: Archetype
  params?: ArchetypeParams
} {
  if (count === 0 || loc < 60) return { archetype: 'low-slab' }
  const average = loc / count

  if (count >= 6 && average < 260) {
    // Fins get crowded past a dozen; beyond that the row reads as a comb.
    return { archetype: 'fin-row', params: { count: Math.min(count, 12) } }
  }
  if (count >= 5 && loc > 1200) {
    return { archetype: 'slab-stack', params: { levels: Math.min(2 + Math.floor(loc / 1800), 5) } }
  }
  if (count <= 2 && average > 400) return { archetype: 'tower' }
  return { archetype: 'cube' }
}

/** How much floor a building claims, before anything is placed. */
export function deriveSize(
  archetype: Archetype,
  params: ArchetypeParams | undefined,
  measure: Measure,
): { w: number; d: number } {
  switch (archetype) {
    case 'fin-row':
      // One cell per fin, plus a margin, so the fins are not shoulder to shoulder.
      return { w: Math.max(3, Math.round((params?.count ?? 3) * 0.75)), d: 2 }
    case 'tower':
      return { w: 2, d: 2 }
    case 'slab-stack':
      return { w: 3, d: 3 }
    case 'low-slab':
      return { w: 3, d: 2 }
    case 'cube':
      return measure.loc > 700 ? { w: 3, d: 2 } : { w: 2, d: 2 }
  }
}

/* ------------------------------------------------------------- packing */

/** Room between buildings inside a plot, and between the plots themselves. */
const BUILDING_GAP = 1
const DISTRICT_GAP = 5

type Placed<T> = { item: T; footprint: Footprint }
type Box = { w: number; d: number }

/**
 * Shelf packing: fill a row left to right until it would pass `maxWidth`,
 * then start the next row behind it. Deterministic, and good enough for the
 * dozen-odd buildings a readable district holds — the alternative is a
 * bin-packer whose output nobody can predict from one run to the next.
 */
function shelfPack<T>(items: { item: T; size: Box }[], maxWidth: number): {
  placed: Placed<T>[]
  size: Box
} {
  const placed: Placed<T>[] = []
  let gx = 0
  let gy = 0
  let rowDepth = 0
  let widest = 0

  for (const { item, size } of items) {
    if (gx > 0 && gx + size.w > maxWidth) {
      gy += rowDepth + BUILDING_GAP
      gx = 0
      rowDepth = 0
    }
    placed.push({ item, footprint: { gx, gy, w: size.w, d: size.d } })
    gx += size.w + BUILDING_GAP
    rowDepth = Math.max(rowDepth, size.d)
    widest = Math.max(widest, gx - BUILDING_GAP)
  }

  return { placed, size: { w: widest, d: gy + rowDepth } }
}

/** Roughly square is what reads best on a diamond grid. */
function targetWidth(sizes: Box[]): number {
  const area = sizes.reduce((sum, s) => sum + (s.w + BUILDING_GAP) * (s.d + BUILDING_GAP), 0)
  const side = Math.sqrt(area)
  return Math.max(Math.ceil(side), Math.max(...sizes.map((s) => s.w), 1))
}

export type LayoutInput<T> = { item: T; group: string; size: Box }

/**
 * Place every building on the world grid: pack each neighborhood on its own,
 * then pack the neighborhoods against each other in the order they are given
 * — which is the order the legend lists them, so reading down the rail walks
 * you across the map.
 */
export function packLayout<T>(
  inputs: LayoutInput<T>[],
  groupOrder: readonly string[],
): Map<T, Footprint> {
  const districts = groupOrder
    .map((group) => inputs.filter((i) => i.group === group))
    .filter((members) => members.length > 0)

  // Each plot, packed in isolation and biggest first so the small ones fill in.
  const packedDistricts = districts.map((members) => {
    const sorted = [...members].sort((a, b) => b.size.w * b.size.d - a.size.w * a.size.d)
    return shelfPack(
      sorted.map((m) => ({ item: m.item, size: m.size })),
      targetWidth(sorted.map((m) => m.size)),
    )
  })

  // Then the plots themselves, on the same rule one scale up.
  const plots = shelfPack(
    packedDistricts.map((d, i) => ({ item: i, size: d.size })),
    targetWidth(packedDistricts.map((d) => d.size)) + DISTRICT_GAP,
  )

  const out = new Map<T, Footprint>()
  plots.placed.forEach(({ item: districtIndex, footprint: plot }) => {
    for (const { item, footprint } of packedDistricts[districtIndex].placed) {
      out.set(item, {
        gx: plot.gx + footprint.gx,
        gy: plot.gy + footprint.gy,
        w: footprint.w,
        d: footprint.d,
      })
    }
  })
  return out
}
