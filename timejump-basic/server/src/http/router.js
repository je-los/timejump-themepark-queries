export class Router {
  constructor() {
    this.routes = [];
  }

  register(method, pattern, handler) {
    const compiled = compile(pattern);
    this.routes.push({
      method: method.toUpperCase(),
      pattern,
      handler,
      ...compiled,
    });
  }

  get(pattern, handler) {
    this.register('GET', pattern, handler);
  }

  post(pattern, handler) {
    this.register('POST', pattern, handler);
  }

  put(pattern, handler) {
    this.register('PUT', pattern, handler);
  }

  delete(pattern, handler) {
    this.register('DELETE', pattern, handler);
  }

  match(method, pathname) {
    const upper = method.toUpperCase();
    for (const route of this.routes) {
      if (route.method !== upper) continue;
      const match = route.regex.exec(pathname);
      if (!match) continue;
      const params = {};
      route.keys.forEach((key, index) => {
        params[key] = decodeURIComponent(match[index + 1] ?? '');
      });
      return { handler: route.handler, params };
    }
    return null;
  }
}

function compile(pattern) {
  if (!pattern.startsWith('/')) {
    throw new Error(`Route pattern must start with "/": ${pattern}`);
  }
  const segments = pattern.split('/').filter(Boolean);
  const keys = [];
  const parts = segments.map(segment => {
    if (segment.startsWith(':')) {
      const key = segment.slice(1);
      if (!key) throw new Error(`Invalid route param in pattern: ${pattern}`);
      keys.push(key);
      return '([^/]+)';
    }
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  const regex = new RegExp(`^/${parts.join('/')}$`);
  return { regex, keys };
}
