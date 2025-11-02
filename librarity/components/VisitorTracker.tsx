/**
 * Visitor Tracker Component
 * Automatically tracks all visitors
 */
'use client';

import { useVisitorTracking } from '@/lib/hooks/useVisitorTracking';

export function VisitorTracker() {
  useVisitorTracking();
  return null; // This component doesn't render anything
}
