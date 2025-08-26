import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { randomUUID } from "crypto";
import { insertFileSchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload file endpoint
  app.post("/api/files/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const shareUrl = randomUUID();
      const fileData = {
        filename: req.file.filename || req.file.originalname || "unknown",
        originalName: req.file.originalname || "unknown",
        mimetype: req.file.mimetype,
        size: req.file.size,
        shareUrl: shareUrl,
      };

      // Validate file data
      const validatedData = insertFileSchema.parse(fileData);
      
      // Store file metadata
      const file = await storage.createFile(validatedData);
      
      // Store actual file data
      storage.storeFileData(file.id, req.file.buffer);

      res.json({ 
        file: {
          ...file,
          uploadedAt: file.uploadedAt.toISOString(),
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

  // Get all files
  app.get("/api/files", async (req, res) => {
    try {
      const files = await storage.getAllFiles();
      res.json({ 
        files: files.map(file => ({
          ...file,
          uploadedAt: file.uploadedAt.toISOString(),
        }))
      });
    } catch (error) {
      console.error("Get files error:", error);
      res.status(500).json({ message: "Failed to retrieve files" });
    }
  });

  // Get file info by share URL (for preview)
  app.get("/api/files/info/:shareUrl", async (req, res) => {
    try {
      const { shareUrl } = req.params;
      const file = await storage.getFileByShareUrl(shareUrl);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      res.json({
        ...file,
        uploadedAt: file.uploadedAt.toISOString(),
      });
    } catch (error) {
      console.error("Get file info error:", error);
      res.status(500).json({ message: "Failed to get file info" });
    }
  });

  // Download file by share URL
  app.get("/api/files/download/:shareUrl", async (req, res) => {
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
        'Content-Type': file.mimetype,
        'Content-Disposition': `attachment; filename="${file.originalName}"`,
        'Content-Length': fileData.length.toString(),
      });

      res.send(fileData);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Download failed" });
    }
  });

  // Delete file
  app.delete("/api/files/:id", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
