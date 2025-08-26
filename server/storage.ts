import { type User, type InsertUser, type File, type InsertFile } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // File operations
  createFile(file: InsertFile): Promise<File>;
  getFileByShareUrl(shareUrl: string): Promise<File | undefined>;
  getFileById(id: string): Promise<File | undefined>;
  getAllFiles(): Promise<File[]>;
  deleteFile(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private files: Map<string, File>;
  private fileData: Map<string, Buffer>; // Store actual file data

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.fileData = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = randomUUID();
    const file: File = { 
      ...insertFile, 
      id, 
      uploadedAt: new Date() 
    };
    this.files.set(id, file);
    return file;
  }

  async getFileByShareUrl(shareUrl: string): Promise<File | undefined> {
    return Array.from(this.files.values()).find(
      (file) => file.shareUrl === shareUrl,
    );
  }

  async getFileById(id: string): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getAllFiles(): Promise<File[]> {
    return Array.from(this.files.values()).sort(
      (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
    );
  }

  async deleteFile(id: string): Promise<boolean> {
    const deleted = this.files.delete(id);
    this.fileData.delete(id);
    return deleted;
  }

  // File data operations
  storeFileData(fileId: string, data: Buffer): void {
    this.fileData.set(fileId, data);
  }

  getFileData(fileId: string): Buffer | undefined {
    return this.fileData.get(fileId);
  }
}

export const storage = new MemStorage();
