import { useContext } from 'react'
import TrackingContext from './TrackingContext.tsx'

export function useTracking() {
  const ctx = useContext(TrackingContext)
  if (!ctx) throw new Error('useTracking must be used within TrackingProvider')
  return ctx
}
