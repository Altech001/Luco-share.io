import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Cloud, 
  CloudUpload, 
  File, 
  FileText, 
  Image, 
  Download, 
  Trash2, 
  Copy, 
  FolderOpen,
  Upload,
  Share,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileData {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  shareUrl: string;
  uploadedAt: string;
}

export default function Home() {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string>("");
  const [copiedUrls, setCopiedUrls] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all files
  const { data: filesData, isLoading } = useQuery<{ files: FileData[] }>({
    queryKey: ["/api/files"],
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      setUploadProgress(0);
      setUploadingFileName(file.name);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev === null) return 0;
          const newProgress = prev + Math.random() * 15;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 200);

      try {
        const response = await apiRequest("POST", "/api/files/upload", formData);
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        setTimeout(() => {
          setUploadProgress(null);
          setUploadingFileName("");
        }, 1000);
        
        return response.json();
      } catch (error) {
        clearInterval(progressInterval);
        setUploadProgress(null);
        setUploadingFileName("");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "Upload successful",
        description: "Your file has been uploaded and is ready to share",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiRequest("DELETE", `/api/files/${fileId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "File deleted",
        description: "File has been removed from your uploads",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setPreviewFile(file);
      
      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  }, []);
  
  const handleUpload = () => {
    if (previewFile) {
      uploadMutation.mutate(previewFile);
      setPreviewFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  };
  
  const handleCancel = () => {
    setPreviewFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const copyToClipboard = async (shareUrl: string, fileId: string) => {
    const fullUrl = `${window.location.origin}/preview/${shareUrl}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedUrls(prev => new Set(prev).add(fileId));
      
      toast({
        title: "Link copied!",
        description: "Share link has been copied to clipboard",
      });

      setTimeout(() => {
        setCopiedUrls(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadFile = (shareUrl: string) => {
    const downloadUrl = `/api/files/download/${shareUrl}`;
    window.open(downloadUrl, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimetype === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const files = filesData?.files || [];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - How it works */}
      <div className="sidebar">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <CloudUpload className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">LucoShare.io</h1>
            <p className="text-muted-foreground text-sm">Safe sharing of files</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">How it works</h2>
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-2">1. Upload</h3>
                <p className="text-sm text-muted-foreground">Drag and drop or select files to upload</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                  <Share className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-2">2. Share</h3>
                <p className="text-sm text-muted-foreground">Get a unique link for each uploaded file</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                  <Download className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-2">3. Download</h3>
                <p className="text-sm text-muted-foreground">Recipients can download using the shared link</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="main-content flex-1">
        {/* Mobile Sidebar */}
        <div className="mobile-sidebar lg:hidden">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <CloudUpload className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">LucoShare.io</h1>
              <p className="text-muted-foreground text-sm">Safe sharing of files</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold text-foreground mb-4">How it works</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                    <Upload className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1 text-sm">1. Upload</h3>
                  <p className="text-xs text-muted-foreground">Drag and drop files</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                    <Share className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1 text-sm">2. Share</h3>
                  <p className="text-xs text-muted-foreground">Get unique link</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                    <Download className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1 text-sm">3. Download</h3>
                  <p className="text-xs text-muted-foreground">Download via link</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Upload Section */}
          <section className="mb-8">
            <Card>
              <CardContent className="p-8">
                
                {/* Drag Drop Zone */}
                {!previewFile ? (
                  <div className="flex flex-col items-center">
                    <div
                      {...getRootProps()}
                      className={cn(
                        "circular-dropzone mx-auto cursor-pointer",
                        isDragActive && "drag-active"
                      )}
                      data-testid="drop-zone"
                    >
                      <input {...getInputProps()} data-testid="file-input" />
                      <div className="dropzone-content">
                        {isDragActive ? (
                          <>
                            <div className="dropzone-icon">
                              <File className="w-12 h-12" />
                            </div>
                            <div className="drag-active-text">Drop it</div>
                          </>
                        ) : (
                          <>
                            <div className="dropzone-icon">
                              <FolderOpen className="w-12 h-12" />
                            </div>
                            <div className="default-text">
                              Drag and drop your project output folder here.
                            </div>
                            <div className="browse-text">
                              Or, browse to upload.
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-8 text-center">
                      <h3 className="text-3xl font-bold mb-2 text-foreground">Drag & drop. It's online.</h3>
                      <p className="text-muted-foreground">Maximum file size: 100MB</p>
                    </div>
                  </div>
                ) : (
                  /* File Preview */
                  <div className="max-w-lg mx-auto">
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center mb-6">
                          <h3 className="text-lg font-semibold text-foreground mb-2">File Preview</h3>
                          <p className="text-sm text-muted-foreground">Review your file before uploading</p>
                        </div>
                        
                        <div className="space-y-4">
                          {/* Preview Content */}
                          <div className="bg-secondary rounded-lg p-4">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-primary-foreground flex-shrink-0">
                                {getFileIcon(previewFile.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground text-overflow-ellipsis" data-testid="text-preview-filename" title={previewFile.name}>
                                  {previewFile.name}
                                </h4>
                                <p className="text-sm text-muted-foreground" data-testid="text-preview-filesize">
                                  {formatFileSize(previewFile.size)}
                                </p>
                              </div>
                            </div>
                            
                            {/* Image Preview */}
                            {previewUrl && (
                              <div className="mt-4">
                                <img 
                                  src={previewUrl} 
                                  alt="Preview" 
                                  className="max-w-full h-32 object-cover rounded border mx-auto"
                                  data-testid="img-preview"
                                />
                              </div>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button 
                              onClick={handleCancel} 
                              variant="outline" 
                              className="flex-1"
                              data-testid="button-cancel-upload"
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleUpload} 
                              className="flex-1" 
                              disabled={uploadMutation.isPending}
                              data-testid="button-confirm-upload"
                            >
                              {uploadMutation.isPending ? "Uploading..." : "Upload File"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Upload Progress */}
                {uploadProgress !== null && (
                  <div className="mt-6 fade-in max-w-lg mx-auto" data-testid="upload-progress">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground text-overflow-ellipsis" data-testid="text-uploading-filename" title={uploadingFileName}>
                            {uploadingFileName}
                          </span>
                          <span className="text-sm text-muted-foreground flex-shrink-0 ml-2" data-testid="text-upload-progress">
                            {Math.round(uploadProgress)}%
                          </span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" data-testid="progress-upload" />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Uploaded Files Section */}
          <section className="mb-8">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Uploaded Files</h2>
                
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-secondary rounded-lg p-4 animate-pulse">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-muted rounded-lg flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-48" />
                            <div className="h-3 bg-muted rounded w-32" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-12" data-testid="empty-state">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <FolderOpen className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-foreground font-medium mb-2">No files uploaded yet</p>
                    <p className="text-muted-foreground">Upload files to start sharing</p>
                  </div>
                ) : (
                  <div className="space-y-4" data-testid="files-list">
                    {files.map((file) => (
                      <div key={file.id} className="bg-secondary rounded-lg p-4 fade-in" data-testid={`card-file-${file.id}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center space-x-4 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground flex-shrink-0">
                              {getFileIcon(file.mimetype)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-foreground text-overflow-ellipsis" data-testid={`text-filename-${file.id}`} title={file.originalName}>
                                {file.originalName}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                <span data-testid={`text-filesize-${file.id}`}>{formatFileSize(file.size)}</span> • 
                                <span data-testid={`text-uploaded-time-${file.id}`}> {formatTimeAgo(file.uploadedAt)}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadFile(file.shareUrl)}
                              data-testid={`button-download-${file.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(file.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${file.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        
                        <Separator className="my-4" />
                        
                        {/* Share Link Section */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Share Link</label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              value={`${window.location.origin}/preview/${file.shareUrl}`}
                              readOnly
                              className="flex-1 text-overflow-ellipsis"
                              data-testid={`input-share-url-${file.id}`}
                            />
                            <Button
                              onClick={() => copyToClipboard(file.shareUrl, file.id)}
                              className="flex items-center space-x-2 flex-shrink-0"
                              data-testid={`button-copy-${file.id}`}
                            >
                              {copiedUrls.has(file.id) ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                              <span>{copiedUrls.has(file.id) ? "Copied!" : "Copy"}</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </main>
        
        {/* Footer */}
        <footer className="text-center py-6 border-t border-border mt-8">
          <p className="text-sm text-muted-foreground">
            Made by <span className="font-medium text-foreground">Altech Technologies</span>
          </p>
        </footer>
      </div>
    </div>
  );
}