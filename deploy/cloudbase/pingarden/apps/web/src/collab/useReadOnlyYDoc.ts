import { useEffect, useState } from 'react';
import * as Y from 'yjs';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

interface Result {
  doc: Y.Doc | null;
  ready: boolean;
}

export function useReadOnlyYDoc(canvasId: string | undefined): Result {
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canvasId) {
      setDoc(null);
      setReady(false);
      return;
    }
    let cancelled = false;
    const ydoc = new Y.Doc();
    setReady(false);

    fetch(`${BASE}/canvases/${canvasId}/state`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 200) {
          const buf = await res.arrayBuffer();
          if (buf.byteLength > 0) Y.applyUpdate(ydoc, new Uint8Array(buf), 'remote');
        }
        setDoc(ydoc);
        setReady(true);
      })
      .catch((err) => {
        console.error('Failed to load read-only canvas state', err);
        if (cancelled) return;
        setDoc(ydoc);
        setReady(true);
      });

    return () => {
      cancelled = true;
      ydoc.destroy();
    };
  }, [canvasId]);

  return { doc, ready };
}
