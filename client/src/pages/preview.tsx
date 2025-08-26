import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  CloudUpload, 
  File, 
  FileText, 
  Image, 
  Download, 
  ArrowLeft,
  ExternalLink
} from "lucide-react";

interface FileData {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  shareUrl: string;
  uploadedAt: string;
}

export default function Preview() {
  const { shareUrl } = useParams<{ shareUrl: string }>();
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch file info by share URL
  const { data: fileData, isLoading, error } = useQuery<FileData>({
    queryKey: ["/api/files/info", shareUrl],
    queryFn: async () => {
      const response = await fetch(`/api/files/info/${shareUrl}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("File not found");
      }
      return response.json();
    },
    enabled: !!shareUrl,
  });

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
    if (mimetype.startsWith('image/')) return <Image className="h-8 w-8" />;
    if (mimetype === 'application/pdf') return <FileText className="h-8 w-8" />;
    return <File className="h-8 w-8" />;
  };

  const handleDownload = async () => {
    if (!fileData) return;
    
    setIsDownloading(true);
    try {
      const downloadUrl = `/api/files/download/${fileData.shareUrl}`;
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const goHome = () => {
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="preview-container">
        <div className="preview-card">
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <File className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-48 mx-auto animate-pulse" />
                  <div className="h-3 bg-muted rounded w-32 mx-auto animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !fileData) {
    return (
      <div className="preview-container">
        <div className="preview-card">
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <File className="h-8 w-8 text-muted-foreground" />
                </div>
                <h1 className="text-xl font-semibold text-foreground mb-2">File Not Found</h1>
                <p className="text-muted-foreground mb-6">
                  The file you're looking for doesn't exist or has been removed.
                </p>
                <Button onClick={goHome} className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Go to LucoShare.io</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-container">
      <div className="preview-card">
        <Card>
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <CloudUpload className="h-4 w-4 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold text-foreground">LucoShare.io</h1>
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">File Preview</h2>
              <p className="text-muted-foreground">
                Someone shared this file with you
              </p>
            </div>

            <Separator className="mb-8" />

            {/* File Info */}
            <div className="space-y-6">
              <div className="bg-secondary rounded-lg p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center text-primary-foreground flex-shrink-0">
                    {getFileIcon(fileData.mimetype)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-lg mb-1" data-testid="text-filename" title={fileData.originalName}>
                      {fileData.originalName}
                    </h3>
                    <p className="text-muted-foreground" data-testid="text-file-details">
                      {formatFileSize(fileData.size)} • Uploaded {formatTimeAgo(fileData.uploadedAt)}
                    </p>
                  </div>
                </div>

                {/* File type info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 text-foreground font-medium">{fileData.mimetype}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Size:</span>
                    <span className="ml-2 text-foreground font-medium">{formatFileSize(fileData.size)}</span>
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <div className="space-y-4">
                <Button 
                  onClick={handleDownload} 
                  size="lg" 
                  className="w-full flex items-center justify-center space-x-2"
                  disabled={isDownloading}
                  data-testid="button-download-file"
                >
                  <Download className="h-5 w-5" />
                  <span>{isDownloading ? "Downloading..." : "Download File"}</span>
                </Button>

                <div className="text-center">
                  <Button 
                    variant="ghost" 
                    onClick={goHome}
                    className="flex items-center space-x-2"
                    data-testid="button-go-home"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Try LucoShare.io yourself</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}