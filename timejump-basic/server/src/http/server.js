import http from 'http';
import { URL } from 'url';
import dotenv from 'dotenv';
import { Router } from './router.js';
import { registerRoutes } from '../routes/index.js';
import { resolveAuthUser } from '../middleware/auth.js';
import { formatDuration } from '../utils/time.js';
import { performance } from 'perf_hooks';

dotenv.config({ path: '.env.local', override: true }); //for local use
dotenv.config();

const DEFAULT_MAX_BODY = 1024 * 1024; // 1MB

function parseOrigins(value) {
  if (!value) return null;
  const list = value
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
  return list.length ? list : null;
}

function normalizeOrigin(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === '*') return '*';
  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

export function createServer() {
  const router = new Router();
  registerRoutes(router);

  const allowedOrigins = parseOrigins(process.env.CORS_ORIGIN);
  const maxBodySize = DEFAULT_MAX_BODY;

  const server = http.createServer(async (req, res) => {
    const start = performance.now();
    const { method = 'GET', url = '/' } = req;
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const origin = req.headers.origin;
    applyCors(res, origin, allowedOrigins);

    if (method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      logRequest(method, url, res.statusCode, start, requestId);
      return;
    }

    const parsedUrl = safeUrl(url);
    if (!parsedUrl) {
      sendJson(res, 400, { error: 'Invalid URL' });
      logRequest(method, url, 400, start, requestId);
      return;
    }

    let rawBody = '';
    let body = null;
    try {
      ({ rawBody, body } = await readBody(req, maxBodySize));
    } catch (err) {
      sendJson(res, 413, { error: err.message || 'Payload too large' });
      logRequest(method, url, 413, start, requestId);
      return;
    }

    let authUser = null;
    try {
      authUser = await resolveAuthUser(req.headers.authorization);
    } catch (err) {
      console.warn('[auth]', err.message);
    }

    const pathname = parsedUrl.pathname;
    let match = router.match(method, pathname);
    let effectivePath = pathname;
    if (!match && pathname.startsWith('/api/')) {
      const altPath = pathname.slice(4) || '/';
      match = router.match(method, altPath);
      if (match) effectivePath = altPath;
    }
    if (!match) {
      sendJson(res, 404, { error: 'Not found' });
      logRequest(method, url, 404, start, requestId);
      return;
    }

    const context = createContext({
      req,
      res,
      method,
      url: parsedUrl,
      query: Object.fromEntries(parsedUrl.searchParams.entries()),
      params: match.params,
      rawBody,
      body,
      authUser,
      requestId,
      path: effectivePath,
    });

    try {
      const result = await match.handler(context);
      if (!res.writableEnded) {
        if (result === undefined) {
          res.statusCode = res.statusCode || 204;
          res.end();
        } else {
          sendJson(res, res.statusCode || 200, result);
        }
      }
    } catch (err) {
      console.error('[error]', err);
      if (!res.writableEnded) {
        sendJson(res, 500, { error: 'Internal server error.' });
      }
    } finally {
      logRequest(method, url, res.statusCode || 200, start, requestId);
    }
  });

  return server;
}

function applyCors(res, origin, allowList) {
  let value = '*';
  const rawOrigin = typeof origin === 'string' ? origin.trim() : '';
  const normalizedOrigin = normalizeOrigin(rawOrigin);

  if (Array.isArray(allowList) && allowList.length) {
    if (normalizedOrigin && allowList.includes(normalizedOrigin)) {
      value = rawOrigin || normalizedOrigin;
    } else if (allowList.includes('*')) {
      value = '*';
    } else {
      [value] = allowList;
    }
  }

  res.setHeader('Access-Control-Allow-Origin', value);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
}

function safeUrl(raw) {
  try {
    return new URL(raw, 'http://localhost');
  } catch {
    return null;
  }
}

async function readBody(req, limit) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return { rawBody: '', body: null };
  }
  const lengthHeader = req.headers['content-length'];
  if (lengthHeader && Number(lengthHeader) > limit) {
    throw new Error('Payload too large');
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limit) {
      throw new Error('Payload too large');
    }
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return { rawBody: '', body: null };
  }
  const rawBody = Buffer.concat(chunks).toString('utf8');
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    try {
      const parsed = rawBody ? JSON.parse(rawBody) : null;
      return { rawBody, body: parsed };
    } catch {
      throw new Error('Invalid JSON payload');
    }
  }
  return { rawBody, body: rawBody };
}

function sendJson(res, status, payload) {
  if (res.writableEnded) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload ?? {}));
}

function createContext({ req, res, method, url, query, params, rawBody, body, authUser, requestId, path }) {
  const ctx = {
    req,
    res,
    method,
    url,
    path: path || url.pathname,
    query,
    params,
    rawBody,
    body,
    authUser,
    requestId,
  };

  ctx.json = (status, payload) => {
    sendJson(res, status, payload);
  };

  ctx.ok = payload => ctx.json(200, payload);
  ctx.created = payload => ctx.json(201, payload);
  ctx.noContent = () => {
    if (!res.writableEnded) {
      res.statusCode = 204;
      res.end();
    }
  };
  ctx.error = (status, message) => ctx.json(status, { error: message });
  return ctx;
}

function logRequest(method, url, status, startTime, requestId) {
  const duration = formatDuration(performance.now() - startTime);
  console.log(`[${requestId}] ${method} ${url} -> ${status} (${duration})`);
}
