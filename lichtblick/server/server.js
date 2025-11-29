// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * Lichtblick Marketplace Development Server
 *
 * A simple static file server for serving marketplace assets during development.
 * Supports CORS for cross-origin requests from the Lichtblick application.
 *
 * Usage:
 *   npm start                    # Start server on port 3001
 *   PORT=8080 npm start          # Start on custom port
 */

import { readFile, stat } from "fs/promises";
import { createServer } from "http";
import { extname, join } from "path";
import { fileURLToPath } from "url";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.PORT ?? 3001;
const ASSETS_DIR = join(currentDir, "assets");

// MIME type mapping for common file types
const MIME_TYPES = {
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".foxe": "application/octet-stream",
};

/**
 * Main HTTP server handler
 */
const server = createServer(async (req, res) => {
  // Enable CORS for all origins
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method Not Allowed");
    return;
  }

  try {
    // Construct file path from URL
    const urlPath = req.url === "/" ? "/index.html" : req.url;
    const filePath = join(ASSETS_DIR, urlPath.slice(1));

    // Security check: prevent directory traversal
    if (!filePath.startsWith(ASSETS_DIR)) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden");
      return;
    }

    // Check if file exists and is a file (not directory)
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }

    // Read file content
    const content = await readFile(filePath);

    // Determine content type
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Send response
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": content.length,
      "Cache-Control": "no-cache", // For development
    });
    res.end(content);

    // Log successful request
    console.debug(`[${new Date().toISOString()}] 200 GET ${req.url ?? "/"}`);
  } catch (error) {
    // Handle file not found or read errors
    if (error.code === "ENOENT") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      console.debug(`[${new Date().toISOString()}] 404 GET ${req.url ?? "/"}`);
    } else {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
      console.error(`[${new Date().toISOString()}] 500 GET ${req.url ?? "/"}`, error);
    }
  }
});

// Start server
server.listen(PORT, () => {
  const message = `
🚀 Lichtblick Marketplace Server
================================
Server running at http://localhost:${PORT}

Available endpoints:
  📦 Extensions: http://localhost:${PORT}/extensions/extensions.json
  🎨 Layouts:    http://localhost:${PORT}/layouts/layouts.json

Environment variables:
  EXTENSION_MARKETPLACE_URL=http://localhost:${PORT}/extensions/extensions.json
  LAYOUT_MARKETPLACE_URL=http://localhost:${PORT}/layouts/layouts.json

Press Ctrl+C to stop
`;
  console.warn(message);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.warn("\n🛑 Shutting down server...");
  server.close(() => {
    console.warn("Server stopped");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.warn("\n🛑 Shutting down server...");
  server.close(() => {
    console.warn("Server stopped");
    process.exit(0);
  });
});
