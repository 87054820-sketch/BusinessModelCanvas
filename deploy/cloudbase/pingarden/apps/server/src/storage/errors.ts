/**
 * Storage-layer error indicating an attempt to mutate a resource that
 * lives in a read-only backend (today: the bundled case library). The
 * HTTP layer maps this to a 403 with a structured error body.
 *
 * Throwing this error — rather than returning a sentinel — keeps every
 * write path simple: the storage decides ownership, callers don't have
 * to remember to check `source === 'library'` themselves.
 */
export class BundleReadOnlyError extends Error {
  override readonly name = 'BundleReadOnlyError';
  constructor(
    /** The CanvasStorage method that was called, e.g. `'updateCanvasMeta'`. */
    public readonly operation: string,
    /** The id of the bundle resource that was targeted. */
    public readonly targetId?: string,
  ) {
    super(
      targetId
        ? `Cannot ${operation} on '${targetId}': it belongs to the read-only case library`
        : `Cannot ${operation}: target belongs to the read-only case library`,
    );
  }
}

/**
 * Type guard used by HTTP error mappers (and by callers that want to
 * react to library-write attempts without importing the class directly).
 */
export function isBundleReadOnlyError(err: unknown): err is BundleReadOnlyError {
  return err instanceof BundleReadOnlyError;
}
