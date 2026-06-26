import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

interface Result {
  doc: Y.Doc | null;
  ready: boolean;
}

/**
 * Loads a Yjs document for one canvas:
 *   1. GET /canvases/:id/state → applyUpdate with remote origin
 *   2. Subscribe to local updates → debounce 500ms → PUT /canvases/:id/state
 *
 * Read-only library canvases hydrate normally but never write back.
 * Single-tab MVP — no WebSocket. The exact same `Y.Doc` will work
 * unchanged when we attach `y-websocket` later (M3).
 */
export function useYDoc(
  canvasId: string | undefined,
  displayName: string,
  readOnly = false,
): Result {
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (!canvasId) return;
    let cancelled = false;
    const ydoc = new Y.Doc();

    // 1) hydrate
    fetch(`${BASE}/canvases/${canvasId}/state`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 200) {
          const buf = await res.arrayBuffer();
          if (buf.byteLength > 0) {
            Y.applyUpdate(ydoc, new Uint8Array(buf), 'remote');
          }
        }
        setDoc(ydoc);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        // Even on hydration failure, expose the empty doc so the user can start adding stickies.
        setDoc(ydoc);
        setReady(true);
      });

    // 2) save on local changes (origin === null means it came from this client)
    function onUpdate(_update: Uint8Array, origin: unknown) {
      if (origin === 'remote') return; // hydrate / future: from y-websocket
      if (readOnly) return;
      dirty.current = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const state = Y.encodeStateAsUpdate(ydoc);
        // Copy into a fresh ArrayBuffer-backed Uint8Array — keeps strict TS happy
        // about `Uint8Array<ArrayBufferLike>` vs the BodyInit-compatible variant.
        const body = new Uint8Array(state).buffer;
        void fetch(`${BASE}/canvases/${canvasId}/state`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Display-Name': encodeURIComponent(displayName),
          },
          body,
        }).then((res) => {
          if (res.ok) dirty.current = false;
        });
      }, 500);
    }
    ydoc.on('update', onUpdate);

    return () => {
      cancelled = true;
      ydoc.off('update', onUpdate);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      // Flush pending local changes with identity headers so updatedBy stays useful
      // for identity restoration on the next app launch. Hydrated-but-unchanged
      // docs and read-only library docs never write back.
      if (!readOnly && dirty.current) {
        const state = Y.encodeStateAsUpdate(ydoc);
        const flushBody = new Uint8Array(state).buffer;
        void fetch(`${BASE}/canvases/${canvasId}/state`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Display-Name': encodeURIComponent(displayName),
          },
          body: flushBody,
          keepalive: true,
        });
      }
      ydoc.destroy();
    };
  }, [canvasId, displayName, readOnly]);

  return { doc, ready };
}
