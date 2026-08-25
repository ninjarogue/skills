'use client'

import { useEffect } from 'react'
import type { ArchEdge, ArchFlow, ArchNode, Group } from '../core/types'
import { sourceEdgeId } from '../core/sequence'
import { useClockBeatIndex, useClockProgram } from '../stores/useFlowClock'
import { select, setActiveFlow, setHoverGroup, useMapView } from '../stores/useMapView'
import { paint, type as typeface } from './theme'

/**
 * The index to the map, and the reading pane.
 *
 * The rail leads with the flows — they are the page's verbs, and what someone
 * new should press first — then the modules grouped exactly as the floor
 * groups them, so reading down the rail walks you across the map. Pointing at
 * a heading lights its neighborhood, which is how the two surfaces teach each
 * other.
 *
 * The panel is prose. Sentences are set in the body face, never the mono one:
 * monospace is for codes and paths, and a paragraph of it is a punishment.
 */

const LABEL: React.CSSProperties = {
  fontFamily: typeface.mono,
  fontSize: 10,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  color: paint.inkTertiary,
}

export function LegendRail({
  groups,
  nodes,
  flows,
}: {
  groups: readonly Group[]
  nodes: readonly ArchNode[]
  flows: readonly ArchFlow[]
}) {
  const { selection, hover, hoverGroup, activeFlowId } = useMapView()
  const selectedId = selection?.kind === 'node' ? selection.id : null

  // A selection made on the canvas may live below this rail's fold; bring its
  // chip into view so both surfaces always visibly agree.
  useEffect(() => {
    if (!selectedId) return
    document.getElementById(`am-rail-${selectedId}`)?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  return (
    <aside
      style={{
        width: 224,
        flexShrink: 0,
        overflowY: 'auto',
        borderRight: `1px solid ${paint.border}`,
        background: paint.surface,
      }}
    >
      <div style={{ position: 'sticky', top: 0, background: paint.surface, padding: '20px 16px 16px', zIndex: 1 }}>
        <p style={LABEL}>Flows</p>
        <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {flows.map((flow) => {
            const active = activeFlowId === flow.id
            return (
              <li key={flow.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveFlow(active ? null : flow.id)}
                  style={{
                    display: 'flex', width: '100%', alignItems: 'center', gap: 8,
                    padding: '6px 8px 6px 6px', textAlign: 'left', cursor: 'pointer',
                    background: active ? paint.accentWash : 'transparent',
                    borderRadius: 4, border: 'none',
                    borderLeft: `2px solid ${active ? paint.accent : 'transparent'}`,
                    color: active ? paint.accent : paint.inkPrimary,
                    fontFamily: typeface.body, fontSize: 12,
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {flow.name}
                  </span>
                  <span style={{ ...LABEL, color: active ? paint.accent : paint.inkTertiary, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {flow.payload}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div style={{ borderTop: `1px solid ${paint.border}`, padding: '20px 16px 24px' }}>
        {groups.map((group) => {
          const members = nodes.filter((n) => n.group === group.id)
          if (members.length === 0) return null
          return (
            <section
              key={group.id}
              style={{ marginTop: 20 }}
              onPointerEnter={() => setHoverGroup(group.id)}
              onPointerLeave={() => setHoverGroup(null)}
            >
              <h3 style={{ ...LABEL, color: hoverGroup === group.id ? paint.accent : paint.inkSecondary, margin: 0 }}>
                {group.label}
              </h3>
              <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {members.map((node) => {
                  const isSelected = selectedId === node.id
                  const isHovered = hover?.kind === 'node' && hover.id === node.id
                  return (
                    <li key={node.id}>
                      <button
                        type="button"
                        id={`am-rail-${node.id}`}
                        aria-pressed={isSelected}
                        onClick={() => select({ kind: 'node', id: node.id })}
                        style={{
                          display: 'flex', width: '100%', alignItems: 'center', gap: 8,
                          padding: '6px 8px', cursor: 'pointer', textAlign: 'left',
                          borderRadius: 4,
                          border: `1px solid ${isSelected ? paint.accent : paint.border}`,
                          background: isSelected ? paint.accentWash : isHovered ? paint.border : paint.surface,
                          color: isSelected ? paint.accent : paint.inkPrimary,
                          fontFamily: typeface.body, fontSize: 12,
                        }}
                      >
                        <span style={{ ...LABEL, color: isSelected ? paint.accent : paint.inkTertiary }}>{node.code}</span>
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {node.name}
                        </span>
                        {node.count ? <span style={{ ...LABEL }}>{node.count}</span> : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </aside>
  )
}

/** `[[term]]` marks a word the map wants to emphasise. */
function Prose({ text }: { text: string }) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g)
  return (
    <p style={{ fontFamily: typeface.body, fontSize: 13, lineHeight: 1.6, color: paint.inkSecondary, margin: '16px 0 0' }}>
      {parts.map((part, i) =>
        part.startsWith('[[') ? (
          <span key={i} style={{ background: paint.accentWash, color: paint.accent, padding: '1px 3px', borderRadius: 3 }}>
            {part.slice(2, -2)}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  )
}

export function ExplainerPanel({
  intro,
  nodes,
  edges,
  flows,
}: {
  intro: { title: string; lede: string; whatItDoes: string; howItsBuilt: string }
  nodes: readonly ArchNode[]
  edges: readonly ArchEdge[]
  flows: readonly ArchFlow[]
}) {
  const { selection, activeFlowId } = useMapView()
  const program = useClockProgram()
  const beatIndex = useClockBeatIndex()

  const node = selection?.kind === 'node' ? nodes.find((n) => n.id === selection.id) : undefined
  const edge = selection?.kind === 'edge'
    ? edges.find((e) => e.id === selection.id || e.id === sourceEdgeId(selection.id))
    : undefined
  const flow = !node && !edge ? flows.find((f) => f.id === activeFlowId) : undefined

  const title = node?.name ?? (edge ? edge.label : flow?.name ?? intro.title)
  const lede = node
    ? node.loc
      ? `${node.count} files · ~${node.loc.toLocaleString('en-US')} lines`
      : undefined
    : edge
      ? `${nodes.find((n) => n.id === edge.from)?.name} → ${nodes.find((n) => n.id === edge.to)?.name}`
      : flow
        ? flow.payload
        : intro.lede
  const what = node?.whatItDoes ?? (edge ? `A ${edge.kind} path. ${edge.label}.` : flow?.summary ?? intro.whatItDoes)
  const how = node?.howItsBuilt ?? (flow ? undefined : intro.howItsBuilt)
  const currentEdgeId =
    program && beatIndex >= 0 && program.beats[beatIndex]?.kind === 'travel'
      ? sourceEdgeId(program.beats[beatIndex].edgeId)
      : null
  const flowSteps = flow
    ? flow.route.flatMap((id) => {
        const step = edges.find((e) => e.id === id)
        return step ? [step] : []
      })
    : []
  const carries = node ? flows.filter((f) => f.route.some((id) => {
    const e = edges.find((x) => x.id === id)
    return e && (e.from === node.id || e.to === node.id)
  })) : []

  return (
    <aside
      style={{
        width: 340, flexShrink: 0, overflowY: 'auto',
        borderLeft: `1px solid ${paint.border}`, padding: 20, background: paint.surface,
      }}
    >
      <h2 style={{ fontFamily: typeface.title, fontSize: 22, color: paint.inkPrimary, margin: 0 }}>{title}</h2>
      {lede && (
        <p style={{ fontFamily: typeface.body, fontSize: 13, color: paint.inkTertiary, margin: '6px 0 0' }}>{lede}</p>
      )}

      <Prose text={what} />
      {how && <Prose text={how} />}

      {flowSteps.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h3 style={LABEL}>Messages</h3>
          <ol style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {flowSteps.map((step, i) => {
              const current = step.id === currentEdgeId
              const from = nodes.find((n) => n.id === step.from)?.name ?? step.from
              const to = nodes.find((n) => n.id === step.to)?.name ?? step.to
              return (
                <li
                  key={`${i}:${step.id}`}
                  style={{
                    fontFamily: typeface.body, fontSize: 12, lineHeight: 1.45,
                    color: current ? paint.accent : paint.inkSecondary,
                  }}
                >
                  <span style={{ ...LABEL, color: current ? paint.accent : paint.inkTertiary, marginRight: 8 }}>
                    {i + 1}
                  </span>
                  {from} → {to}
                  <span style={{ ...LABEL, marginLeft: 8 }}>{step.label}</span>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {carries.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h3 style={LABEL}>Travelled by</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {carries.map((flow) => (
              <button
                key={flow.id}
                type="button"
                onClick={() => setActiveFlow(flow.id)}
                style={{
                  ...LABEL, color: paint.accent, cursor: 'pointer',
                  border: `1px solid ${paint.accent}`, background: 'transparent',
                  borderRadius: 999, padding: '3px 8px',
                }}
              >
                {flow.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {node?.stack && node.stack.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h3 style={LABEL}>Built with</h3>
          <p style={{ fontFamily: typeface.body, fontSize: 12, color: paint.inkSecondary, margin: '8px 0 0' }}>
            {node.stack.join(' · ')}
          </p>
        </section>
      )}

      {node?.files && node.files.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h3 style={LABEL}>Source</h3>
          <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
            {node.files.map((file) => (
              <li key={file} style={{ fontFamily: typeface.mono, fontSize: 11, color: paint.inkTertiary, lineHeight: 1.8 }}>
                {file}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}
