"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Upload,
  X,
  FileImage,
  AlertCircle,
  Camera,
  Monitor,
} from "lucide-react";
import {
  uploadScreenshotAction,
  captureWebsiteScreenshotAction,
} from "@/app/actions";

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface ScreenshotUploadProps {
  onUploadComplete?: () => void;
}

export default function ScreenshotUpload({
  onUploadComplete,
}: ScreenshotUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [project, setProject] = useState("");
  const [tags, setTags] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"],
    },
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setIsUploading(true);

    for (const uploadFile of files) {
      if (uploadFile.status !== "pending") continue;

      try {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: "uploading", progress: 0 }
              : f,
          ),
        );

        const formData = new FormData();
        formData.append("file", uploadFile.file);
        formData.append("project", project);
        formData.append("tags", tags);

        // Simulate progress
        const progressInterval = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id && f.progress < 90
                ? { ...f, progress: f.progress + 10 }
                : f,
            ),
          );
        }, 200);

        const result = await uploadScreenshotAction(formData);
        clearInterval(progressInterval);

        if (result.success) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: "success", progress: 100 }
                : f,
            ),
          );
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: "error", progress: 0, error: result.error }
                : f,
            ),
          );
        }
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: "error", progress: 0, error: "Upload failed" }
              : f,
          ),
        );
      }
    }

    setIsUploading(false);

    const successCount = files.filter((f) => f.status === "success").length;
    if (successCount > 0) {
      toast({
        title: "Upload Complete",
        description: `${successCount} screenshot(s) uploaded successfully`,
      });
      onUploadComplete?.();
      // Clear successful uploads
      setFiles((prev) => prev.filter((f) => f.status !== "success"));
    }
  };

  const captureScreenshot = async () => {
    setIsCapturing(true);
    try {
      // Check if the browser supports screen capture
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        toast({
          title: "Screen Capture Not Supported",
          description:
            "Your browser doesn't support screen capture. Please use file upload instead.",
          variant: "destructive",
        });
        return;
      }

      // Request screen capture permission
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: "screen",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      // Create video element to capture the stream
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      // Wait for video to load
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      // Create canvas and capture the frame
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);

      // Stop the stream
      stream.getTracks().forEach((track) => track.stop());

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/png");
      });

      // Create a File object from the blob
      const timestamp = Date.now();
      const file = new File([blob], `screen-capture-${timestamp}.png`, {
        type: "image/png",
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("project", project || "Screen Capture");
      formData.append(
        "tags",
        tags
          ? `${tags}, screen-capture, live-capture`
          : "screen-capture, live-capture",
      );

      const result = await uploadScreenshotAction(formData);

      if (result.success) {
        toast({
          title: "Screen Capture Successful",
          description: "Screenshot captured and saved successfully",
        });
        onUploadComplete?.();
      } else {
        throw new Error(result.error || "Capture failed");
      }
    } catch (error: any) {
      console.error("Screen capture error:", error);
      if (error.name === "NotAllowedError") {
        toast({
          title: "Permission Denied",
          description:
            "Screen capture permission was denied. Please allow screen sharing to capture screenshots.",
          variant: "destructive",
        });
      } else if (error.name === "NotSupportedError") {
        toast({
          title: "Not Supported",
          description:
            "Screen capture is not supported in your browser. Please use file upload instead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Capture Failed",
          description: "Failed to capture screenshot. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="space-y-6 bg-white">
      {/* Upload Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* File Upload */}
        <Card>
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p className="text-base font-medium text-gray-900 mb-2">
                {isDragActive ? "Drop screenshots here" : "Upload Screenshots"}
              </p>
              <p className="text-sm text-gray-500 mb-3">
                Drag & drop or click to browse
              </p>
              <p className="text-xs text-gray-400">
                PNG, JPG, JPEG, GIF, BMP, WebP
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Screen Capture */}
        <Card>
          <CardContent className="p-6">
            <div className="border-2 border-dashed border-green-300 rounded-lg p-6">
              <div className="text-center mb-4">
                <Monitor className="mx-auto h-10 w-10 text-green-500 mb-3" />
                <p className="text-base font-medium text-gray-900 mb-2">
                  Capture Screen
                </p>
                <p className="text-sm text-gray-500">
                  Take a live screenshot of any screen, window, or tab
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={captureScreenshot}
                  disabled={isCapturing}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {isCapturing ? "Capturing..." : "Capture Screen"}
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  Uses browser screen sharing to capture any visible content
                </p>
                <p className="text-xs text-gray-500 text-center">
                  You'll be prompted to select what to capture
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metadata Inputs */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label htmlFor="project">Project (Optional)</Label>
            <Input
              id="project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Enter project name"
            />
          </div>
          <div>
            <Label htmlFor="tags">Tags (Optional)</Label>
            <Textarea
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Enter tags separated by commas (e.g., bug, ui, mobile)"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4">
              Files to Upload ({files.length})
            </h3>
            <div className="space-y-3">
              {files.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <FileImage className="h-8 w-8 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {uploadFile.status === "uploading" && (
                      <Progress value={uploadFile.progress} className="mt-2" />
                    )}
                    {uploadFile.status === "error" && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        <span className="text-xs text-red-500">
                          {uploadFile.error}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        uploadFile.status === "success"
                          ? "default"
                          : uploadFile.status === "error"
                            ? "destructive"
                            : uploadFile.status === "uploading"
                              ? "secondary"
                              : "outline"
                      }
                    >
                      {uploadFile.status}
                    </Badge>
                    {uploadFile.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadFile.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <Button
                onClick={uploadFiles}
                disabled={
                  isUploading || files.every((f) => f.status !== "pending")
                }
              >
                {isUploading
                  ? "Uploading..."
                  : `Upload ${files.filter((f) => f.status === "pending").length} Files`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
