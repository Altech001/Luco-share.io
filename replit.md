# File Upload Application

## Overview

This is a full-stack file upload application built with React (frontend) and Express.js (backend). The application allows users to upload files through a drag-and-drop interface, view uploaded files in a gallery, and share files via unique URLs. It features a modern UI built with shadcn/ui components and Tailwind CSS.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React SPA**: Single-page application built with React 18 and TypeScript
- **UI Framework**: shadcn/ui components with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **File Upload**: react-dropzone for drag-and-drop file uploads with progress tracking

### Backend Architecture
- **Express.js**: RESTful API server with TypeScript
- **File Storage**: In-memory storage with buffer-based file data storage
- **File Processing**: Multer middleware for multipart/form-data handling
- **API Design**: RESTful endpoints for file upload, retrieval, and management
- **Error Handling**: Centralized error handling middleware

### Data Storage Solutions
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Definition**: Shared TypeScript schemas using Drizzle and Zod for validation
- **File Metadata**: PostgreSQL tables for file information (filename, size, mimetype, share URLs)
- **File Data**: Currently using in-memory storage (MemStorage class) with plans for database integration

### Authentication and Authorization
- **Session Management**: connect-pg-simple for PostgreSQL-backed sessions
- **User Schema**: Defined but not yet implemented in the current storage layer
- **Security**: Prepared for username/password authentication system

### External Dependencies
- **Database**: Neon Database (PostgreSQL) configured via DATABASE_URL
- **File Upload**: 100MB file size limit with memory-based processing
- **UI Components**: Comprehensive set of shadcn/ui components including forms, dialogs, toasts
- **Development Tools**: Vite for build tooling and hot reload, ESBuild for production builds

### Key Design Patterns
- **Shared Schema**: Common TypeScript types and Zod schemas shared between frontend and backend
- **Type Safety**: End-to-end TypeScript with strict type checking
- **Component Architecture**: Modular UI components with consistent design system
- **API Layer**: Centralized API client with error handling and credential management
- **File Management**: Unique share URLs for file access with metadata tracking