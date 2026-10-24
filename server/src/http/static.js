import fs from 'node:fs';
import path from 'node:path';
import express from 'express';

/**
 * Basic security headers for every response.
 * CSP allows Google Fonts (index.html) and inline styles (Framer Motion animates via style attributes).
 */
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' ws: wss:",
      "manifest-src 'self'",
      "worker-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );
  next();
}

/**
 * Serves the built web client (client/dist) with sensible caching, plus an
 * SPA fallback so any non-API path returns index.html.
 * Returns false (and does nothing) when the client hasn't been built.
 */
export function serveClient(app, distDir) {
  const indexFile = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexFile)) return false;

  app.use(
    express.static(distDir, {
      index: false,
      setHeaders(res, filePath) {
        const rel = path.relative(distDir, filePath).replace(/\\/g, '/');
        if (rel.startsWith('assets/')) {
          // Vite fingerprints these file names, so they can be cached forever.
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          // index.html, sw.js, manifest, icons: always revalidate so updates roll out.
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  app.get(/^\/(?!api\/|socket\.io\/).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
  return true;
}
