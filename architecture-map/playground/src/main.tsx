import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ArchitectureMap from '../../assets/components/ArchitectureMap'
import '../../assets/components/keyframes.css'
import { ARCHITECTURE } from './graph'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ArchitectureMap data={ARCHITECTURE} />
  </StrictMode>,
)
