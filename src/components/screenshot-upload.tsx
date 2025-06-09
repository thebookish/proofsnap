"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
  Square,
  Check,
  RotateCcw,
} from "lucide-react";
import { uploadScreenshotAction } from "@/app/actions";

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
  const [showBlurEditor, setShowBlurEditor] = useState(false);
  const [capturedStream, setCapturedStream] = useState<MediaStream | null>(
    null,
  );
  const [blurRegions, setBlurRegions] = useState<
    Array<{ x: number; y: number; width: number; height: number }>
  >([]);
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
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setCapturedStream(stream);
      setShowBlurEditor(true);
      setIsCapturing(false);
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
      setIsCapturing(false);
    }
  };

  const finalizeCapture = async () => {
    if (!capturedStream) return;

    try {
      // Create video element to capture the stream
      const video = document.createElement("video");
      video.srcObject = capturedStream;
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
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.drawImage(video, 0, 0);

      // Apply blur to selected regions
      blurRegions.forEach((region) => {
        // Get the image data for the region
        const imageData = ctx.getImageData(
          region.x,
          region.y,
          region.width,
          region.height,
        );

        // Apply blur effect by averaging pixels
        const blurRadius = 10;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let r = 0,
              g = 0,
              b = 0,
              count = 0;

            // Average surrounding pixels
            for (let dy = -blurRadius; dy <= blurRadius; dy++) {
              for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                const ny = y + dy;
                const nx = x + dx;

                if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                  const idx = (ny * width + nx) * 4;
                  r += data[idx];
                  g += data[idx + 1];
                  b += data[idx + 2];
                  count++;
                }
              }
            }

            const idx = (y * width + x) * 4;
            data[idx] = r / count;
            data[idx + 1] = g / count;
            data[idx + 2] = b / count;
          }
        }

        // Put the blurred image data back
        ctx.putImageData(imageData, region.x, region.y);
      });

      // Stop the stream
      capturedStream.getTracks().forEach((track) => track.stop());

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
          ? `${tags}, screen-capture, live-capture${blurRegions.length > 0 ? ", blurred" : ""}`
          : `screen-capture, live-capture${blurRegions.length > 0 ? ", blurred" : ""}`,
      );

      const result = await uploadScreenshotAction(formData);

      if (result.success) {
        toast({
          title: "Screen Capture Successful",
          description: `Screenshot captured and saved successfully${blurRegions.length > 0 ? " with blur effects" : ""}`,
        });
        onUploadComplete?.();
      } else {
        throw new Error(result.error || "Capture failed");
      }

      // Reset state
      setShowBlurEditor(false);
      setCapturedStream(null);
      setBlurRegions([]);
    } catch (error: any) {
      console.error("Finalize capture error:", error);
      toast({
        title: "Capture Failed",
        description: "Failed to finalize screenshot. Please try again.",
        variant: "destructive",
      });
    }
  };

  const cancelCapture = () => {
    if (capturedStream) {
      capturedStream.getTracks().forEach((track) => track.stop());
    }
    setShowBlurEditor(false);
    setCapturedStream(null);
    setBlurRegions([]);
  };

  const BlurEditor = () => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentRegion, setCurrentRegion] = useState<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (capturedStream && videoRef.current) {
        videoRef.current.srcObject = capturedStream;
        videoRef.current.play();
      }
    }, [capturedStream]);

    const handleMouseDown = (e: React.MouseEvent) => {
      if (!overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setStartPos({ x, y });
      setIsDrawing(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDrawing || !overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const width = x - startPos.x;
      const height = y - startPos.y;

      setCurrentRegion({
        x: Math.min(startPos.x, x),
        y: Math.min(startPos.y, y),
        width: Math.abs(width),
        height: Math.abs(height),
      });
    };

    const handleMouseUp = () => {
      if (
        currentRegion &&
        currentRegion.width > 10 &&
        currentRegion.height > 10
      ) {
        // Scale the region to match the actual video dimensions
        const video = videoRef.current;
        const overlay = overlayRef.current;
        if (video && overlay) {
          const scaleX = video.videoWidth / overlay.clientWidth;
          const scaleY = video.videoHeight / overlay.clientHeight;

          const scaledRegion = {
            x: Math.round(currentRegion.x * scaleX),
            y: Math.round(currentRegion.y * scaleY),
            width: Math.round(currentRegion.width * scaleX),
            height: Math.round(currentRegion.height * scaleY),
          };

          setBlurRegions((prev) => [...prev, scaledRegion]);
        }
      }
      setIsDrawing(false);
      setCurrentRegion(null);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Select Areas to Blur</h3>
            <p className="text-sm text-gray-600 mb-4">
              Click and drag to select areas you want to blur. You can select
              multiple areas.
            </p>
          </div>

          <div className="relative mb-4">
            <video
              ref={videoRef}
              className="max-w-full max-h-96 border rounded"
              muted
              playsInline
            />
            <div
              ref={overlayRef}
              className="absolute inset-0 cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* Show existing blur regions */}
              {blurRegions.map((region, index) => {
                const video = videoRef.current;
                const overlay = overlayRef.current;
                if (!video || !overlay) return null;

                const scaleX = overlay.clientWidth / video.videoWidth;
                const scaleY = overlay.clientHeight / video.videoHeight;

                return (
                  <div
                    key={index}
                    className="absolute border-2 border-red-500 bg-red-200 bg-opacity-30"
                    style={{
                      left: region.x * scaleX,
                      top: region.y * scaleY,
                      width: region.width * scaleX,
                      height: region.height * scaleY,
                    }}
                  >
                    <div className="absolute -top-6 left-0 text-xs bg-red-500 text-white px-1 rounded">
                      Blur {index + 1}
                    </div>
                  </div>
                );
              })}

              {/* Show current selection */}
              {currentRegion && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30"
                  style={{
                    left: currentRegion.x,
                    top: currentRegion.y,
                    width: currentRegion.width,
                    height: currentRegion.height,
                  }}
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {blurRegions.length} blur region(s) selected
              </span>
              {blurRegions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBlurRegions([])}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={cancelCapture}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={finalizeCapture}>
                <Check className="h-4 w-4 mr-2" />
                Capture Screenshot
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 bg-white">
      {showBlurEditor && <BlurEditor />}
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
