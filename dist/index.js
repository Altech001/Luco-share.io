// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  users;
  files;
  fileData;
  // Store actual file data
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.files = /* @__PURE__ */ new Map();
    this.fileData = /* @__PURE__ */ new Map();
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async createFile(insertFile) {
    const id = randomUUID();
    const file = {
      ...insertFile,
      id,
      uploadedAt: /* @__PURE__ */ new Date(),
      isPrivate: insertFile.isPrivate ?? false
    };
    this.files.set(id, file);
    return file;
  }
  async getFileByShareUrl(shareUrl) {
    return Array.from(this.files.values()).find(
      (file) => file.shareUrl === shareUrl
    );
  }
  async getFileById(id) {
    return this.files.get(id);
  }
  async getAllFiles() {
    return Array.from(this.files.values()).sort(
      (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
    );
  }
  async getPublicFiles() {
    return Array.from(this.files.values()).filter((file) => !file.isPrivate).sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }
  async deleteFile(id) {
    const deleted = this.files.delete(id);
    this.fileData.delete(id);
    return deleted;
  }
  // File data operations
  storeFileData(fileId, data) {
    this.fileData.set(fileId, data);
  }
  getFileData(fileId) {
    return this.fileData.get(fileId);
  }
};
var storage = new MemStorage();

// server/routes.ts
import multer from "multer";
import { randomUUID as randomUUID2 } from "crypto";

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimetype: text("mimetype").notNull(),
  size: integer("size").notNull(),
  shareUrl: text("share_url").notNull().unique(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isPrivate: boolean("is_private").default(false).notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertFileSchema = createInsertSchema(files).omit({
  id: true,
  uploadedAt: true
});

// server/routes.ts
import { z } from "zod";
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
    // 100MB limit
  }
});
async function registerRoutes(app2) {
  app2.post("/api/files/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const shareUrl = randomUUID2();
      const isPrivate = req.body.isPrivate === "true";
      const fileData = {
        filename: req.file.filename || req.file.originalname || "unknown",
        originalName: req.file.originalname || "unknown",
        mimetype: req.file.mimetype,
        size: req.file.size,
        shareUrl,
        isPrivate
      };
      const validatedData = insertFileSchema.parse(fileData);
      const file = await storage.createFile(validatedData);
      storage.storeFileData(file.id, req.file.buffer);
      res.json({
        file: {
          ...file,
          uploadedAt: file.uploadedAt.toISOString()
        }
      });
    } catch (error) {
      console.error("Upload error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid file data", errors: error.errors });
      }
      res.status(500).json({ message: "Upload failed" });
    }
  });
  app2.get("/api/files", async (req, res) => {
    try {
      const files2 = await storage.getPublicFiles();
      res.json({
        files: files2.map((file) => ({
          ...file,
          uploadedAt: file.uploadedAt.toISOString()
        }))
      });
    } catch (error) {
      console.error("Get files error:", error);
      res.status(500).json({ message: "Failed to retrieve files" });
    }
  });
  app2.get("/api/files/info/:shareUrl", async (req, res) => {
    try {
      const { shareUrl } = req.params;
      const file = await storage.getFileByShareUrl(shareUrl);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      res.json({
        ...file,
        uploadedAt: file.uploadedAt.toISOString()
      });
    } catch (error) {
      console.error("Get file info error:", error);
      res.status(500).json({ message: "Failed to get file info" });
    }
  });
  app2.get("/api/files/download/:shareUrl", async (req, res) => {
    try {
      const { shareUrl } = req.params;
      const file = await storage.getFileByShareUrl(shareUrl);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      const fileData = storage.getFileData(file.id);
      if (!fileData) {
        return res.status(404).json({ message: "File data not found" });
      }
      res.set({
        "Content-Type": file.mimetype,
        "Content-Disposition": `attachment; filename="${file.originalName}"`,
        "Content-Length": fileData.length.toString()
      });
      res.send(fileData);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Download failed" });
    }
  });
  app2.delete("/api/files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteFile(id);
      if (!deleted) {
        return res.status(404).json({ message: "File not found" });
      }
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ message: "Delete failed" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
var vite_config_default = defineConfig({
  root: "client",
  plugins: [
    react()
    // runtimeErrorOverlay(),
    // ...(process.env.NODE_ENV !== "production" &&
    // process.env.REPL_ID !== undefined
    //   ? [
    //       await import("@replit/vite-plugin-cartographer").then((m) =>
    //         m.cartographer(),
    //       ),
    //     ]
    //   : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  // root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
