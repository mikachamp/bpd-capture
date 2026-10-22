/**
 * Where a path or file URI really points once "." and ".." are resolved, so a
 * guard compares locations, not spellings. Accepts "file:///…" URIs and plain
 * paths; backslashes count as separators and %-escapes are decoded first
 * ("%2E%2E" is still "..").
 */
export function resolvePath(uri: string): string {
  const match = uri.match(/^([a-z][a-z0-9+.-]*:\/\/\/?)(.*)$/i);
  const prefix = match ? match[1] : '';
  const body = (match ? match[2] : uri).replace(/\x5c/g, '/');
  const out: string[] = [];
  for (const raw of body.split('/')) {
    let part = raw;
    try {
      part = decodeURIComponent(raw);
    } catch {
      // not valid %-encoding: compare it as written
    }
    if (part === '' || part === '.') continue;
    if (part === '..') {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return prefix + (!prefix && body.startsWith('/') ? '/' : '') + out.join('/');
}

/**
 * True only when `target` is strictly inside `base`: the base folder itself,
 * its parent, and siblings that merely start with the same name
 * ("orders-old" next to "orders") are all outside.
 */
export function isStrictlyInside(base: string, target: string): boolean {
  const b = resolvePath(base);
  const t = resolvePath(target);
  return t.length > b.length + 1 && t.startsWith(b + '/');
}

/** A file name typed by a user: no separators, reserved characters, or names made only of dots. */
export function safeFileBaseName(name: string): string {
  return name.replace(/[/\x5c:*?"<>|\u0000-\u001f]/g, '').trim().replace(/[. ]+$/, '');
}
