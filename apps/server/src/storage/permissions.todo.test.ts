import { describe, it } from 'vitest';

describe('future PermissionService contract', () => {
  it.todo('decides access from identity, resource ownership, action, and optional sharing grants');
  it.todo('keeps read-only library resources readable while denying every mutating action');
  it.todo('lets user-owned forks shadow library ids without inheriting read-only restrictions');
  it.todo('returns a stable denial reason that HTTP handlers can map to 401, 403, or 404');
  it.todo('does not require HTTP handlers to inspect source, owner, role, or ACL fields directly');
});
