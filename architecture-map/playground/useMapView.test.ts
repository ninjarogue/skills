import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  clearView,
  getMapView,
  inspectFlowItem,
  selectCityItem,
  setActiveFlow,
} from '../assets/stores/mapView.ts'

afterEach(() => {
  clearView()
})

describe('map view verbs', () => {
  it('selectCityItem clears the flow', () => {
    setActiveFlow('narrate')
    selectCityItem({ kind: 'node', id: 'types' })
    const view = getMapView()
    assert.equal(view.activeFlowId, null)
    assert.deepEqual(view.selection, { kind: 'node', id: 'types' })
  })

  it('inspectFlowItem keeps the flow', () => {
    setActiveFlow('narrate')
    inspectFlowItem({ kind: 'node', id: 'sequence' })
    const view = getMapView()
    assert.equal(view.activeFlowId, 'narrate')
    assert.deepEqual(view.selection, { kind: 'node', id: 'sequence' })
  })

  it('clearView drops the flow and the selection', () => {
    setActiveFlow('narrate')
    inspectFlowItem({ kind: 'edge', id: '0::rail-view' })
    clearView()
    const view = getMapView()
    assert.equal(view.activeFlowId, null)
    assert.equal(view.selection, null)
  })
})
