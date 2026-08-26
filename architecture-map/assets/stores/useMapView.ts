'use client'

import { useSyncExternalStore } from 'react'
import {
  EMPTY_MAP_VIEW,
  getMapView,
  subscribeMapView,
  type MapView,
} from './mapView'

export type { MapView, Selection } from './mapView'
export {
  clearView,
  getMapView,
  hasFocus,
  inspectFlowItem,
  selectCityItem,
  setActiveFlow,
  setHover,
  setHoverGroup,
} from './mapView'

export function useMapView(): MapView {
  return useSyncExternalStore(subscribeMapView, getMapView, () => EMPTY_MAP_VIEW)
}
