/**
 * True for fetch/socket errors that may succeed on retry (timeouts, resets, etc.).
 */
export function isTransientNetworkError(err: unknown): boolean {
  if (err == null) return false;

  const codes = new Set<string>();
  const messages: string[] = [];

  const visit = (node: unknown, depth: number): void => {
    if (node == null || depth > 6) return;
    if (typeof node === 'string') {
      messages.push(node);
      return;
    }
    if (node instanceof Error) {
      messages.push(node.message);
      const code = (node as NodeJS.ErrnoException).code;
      if (typeof code === 'string') codes.add(code);
      if (node.cause != null) visit(node.cause, depth + 1);
      return;
    }
    if (typeof node === 'object') {
      const o = node as Record<string, unknown>;
      if (typeof o.message === 'string') messages.push(o.message);
      if (typeof o.code === 'string') codes.add(o.code);
      if (o.cause != null) visit(o.cause, depth + 1);
    }
  };

  visit(err, 0);

  const haystack = messages.join(' ').toLowerCase();
  const transientCodes = [
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT',
    'UND_ERR_SOCKET',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EPIPE',
    'EAI_AGAIN',
    'ENOTFOUND',
  ];

  for (const c of transientCodes) {
    if (codes.has(c)) return true;
  }

  if (haystack.includes('fetch failed')) return true;
  if (haystack.includes('connect timeout')) return true;
  if (haystack.includes('socket hang up')) return true;
  if (haystack.includes('network error')) return true;

  return false;
}
