'use client';

import { useEffect } from 'react';
import { trackView } from '@/lib/track';

const tracked = new Set();

export default function ViewTracker({ id }) {
  useEffect(() => {
    // مرة وحدة لكل فتحة صفحة (حتى مع StrictMode)
    if (tracked.has(id)) return;
    tracked.add(id);
    const timer = setTimeout(() => tracked.delete(id), 2000);
    trackView(id);
    return () => clearTimeout(timer);
  }, [id]);
  return null;
}
