import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { footprintsOverlap } from '../assets/core/iso'
import { buildFlowProgram, packetPosition, positionAt } from '../assets/core/program'
import { buildSequenceLayout, sourceEdgeId, sequenceEdgeId } from '../assets/core/sequence'
import type { ArchEdge, ArchFlow, ArchNode } from '../assets/core/types'

function node(id: string, w = 2, d = 2): ArchNode {
  return {
    id,
    code: id.slice(0, 2).toUpperCase(),
    name: id,
    role: `the ${id}`,
    group: 'g',
    archetype: 'cube',
    footprint: { gx: 10, gy: 10, w, d },
    height: 2,
    whatItDoes: id,
    howItsBuilt: id,
    files: [`${id}.ts`],
  }
}

function edge(id: string, from: string, to: string): ArchEdge {
  return { id, from, to, kind: 'call', label: id, flowIds: ['f'] }
}

const NODES = [node('auth'), node('api'), node('db', 3, 3)]
const EDGES = [
  edge('auth-api', 'auth', 'api'),
  edge('api-db', 'api', 'db'),
  edge('db-api', 'db', 'api'),
  edge('api-api', 'api', 'api'),
]

function flow(route: string[]): ArchFlow {
  return { id: 'f', name: 'F', payload: 'token', summary: 'a trip', route }
}

describe('buildSequenceLayout', () => {
  it('returns null when a route names a missing edge', () => {
    assert.equal(buildSequenceLayout(flow(['nope']), NODES, EDGES), null)
  })

  it('places first-seen participants on a horizontal row', () => {
    const layout = buildSequenceLayout(flow(['auth-api', 'api-db']), NODES, EDGES)
    assert.ok(layout)
    assert.deepEqual(layout.nodes.map((n) => n.id), ['auth', 'api', 'db'])

    const ys = layout.nodes.map((n) => n.footprint.gx + n.footprint.gy)
    assert.equal(new Set(ys).size, 1, 'origins share a depth so they read across, not into the city')
    assert.ok(layout.nodes.every((a, i) =>
      layout.nodes.every((b, j) => i === j || !footprintsOverlap(a.footprint, b.footprint)),
    ))

    const xs = layout.nodes.map((n) => n.footprint.gx)
    assert.ok(xs[0] < xs[1] && xs[1] < xs[2])
  })

  it('keeps city-sized buildings and drops via waypoints', () => {
    const withVia: ArchEdge[] = [{ ...EDGES[0], via: [{ gx: 4, gy: -2 }] }]
    const layout = buildSequenceLayout(flow(['auth-api']), NODES, withVia)
    assert.ok(layout)
    assert.equal(layout.nodes[0].height, 2)
    assert.equal(layout.nodes[0].archetype, 'cube')
    assert.equal(layout.edges[0].via, undefined)
  })

  it('stacks messages downward and keeps packets on those rows', () => {
    const layout = buildSequenceLayout(flow(['auth-api', 'api-db', 'db-api']), NODES, EDGES)
    assert.ok(layout)
    const ys = ['0::auth-api', '1::api-db', '2::db-api'].map((id) => layout.geometry.get(id)!.pts[0].y)
    assert.ok(ys[0] < ys[1] && ys[1] < ys[2])

    const first = layout.geometry.get('0::auth-api')!
    assert.equal(first.pts[0].y, first.pts[1].y)
    assert.notEqual(first.pts[0].x, first.pts[1].x)
  })

  it('gives a repeated edge two rows', () => {
    const layout = buildSequenceLayout(flow(['auth-api', 'api-db', 'auth-api']), NODES, EDGES)
    assert.ok(layout)
    assert.deepEqual(layout.flow.route, ['0::auth-api', '1::api-db', '2::auth-api'])
    const a = layout.geometry.get('0::auth-api')!
    const b = layout.geometry.get('2::auth-api')!
    assert.ok(b.pts[0].y > a.pts[0].y)
    assert.equal(sourceEdgeId('2::auth-api'), 'auth-api')
  })

  it('loops a self-call beside its lifeline', () => {
    const layout = buildSequenceLayout(flow(['api-api']), NODES, EDGES)
    assert.ok(layout)
    const geom = layout.geometry.get('0::api-api')!
    assert.ok(geom.pts.length > 2)
    assert.equal(geom.pts[0].x, geom.pts[geom.pts.length - 1].x)
  })

  it('does not carry a drawn packet between disconnected message rows', () => {
    const layout = buildSequenceLayout(flow(['auth-api', 'api-db']), NODES, EDGES)
    assert.ok(layout)
    const program = buildFlowProgram(layout.flow, layout.nodes, layout.edges, layout.geometry)
    assert.ok(program)
    const travels = program.beats.filter((beat) => beat.kind === 'travel')
    const dwell = travels[0].start + travels[0].duration + 1
    const next = travels[1].start
    const park = positionAt(program, dwell)
    const hop = positionAt(program, next)
    assert.ok(hop.y - park.y > 50, 'rows stay a MESSAGE_ROW apart')
    assert.equal(packetPosition(program, dwell), null)
    assert.deepEqual(packetPosition(program, next), hop)
  })

  it('feeds the existing beat program without inventing edges', () => {
    const authored = flow(['auth-api', 'api-db'])
    const layout = buildSequenceLayout(authored, NODES, EDGES)
    assert.ok(layout)
    const program = buildFlowProgram(layout.flow, layout.nodes, layout.edges, layout.geometry)
    assert.ok(program)
    assert.deepEqual(program.nodeIds, ['auth', 'api', 'db'])
    assert.equal(program.geoms.length, 2)
    assert.ok(program.geoms[1].pts[0].y > program.geoms[0].pts[0].y)
  })

  it('tags and untags step ids without eating authored names that contain colons', () => {
    assert.equal(sequenceEdgeId(3, 'a:b'), '3::a:b')
    assert.equal(sourceEdgeId('3::a:b'), 'a:b')
    assert.equal(sourceEdgeId('auth-api'), 'auth-api')
    assert.equal(sourceEdgeId('::weird'), '::weird')
  })
})
