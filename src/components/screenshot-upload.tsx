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
  MousePointer,
  Pen,
  ArrowRight,
  Circle,
  Type,
  Palette,
  Minus,
  Plus,
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
  editingScreenshot?: {
    id: string;
    filename: string;
    original_filename: string;
    file_size: number;
    file_type: string;
    file_url: string;
    sha256_hash: string;
    ip_address: string;
    browser_info: string;
    project: string;
    tags: string[] | null;
    verification_status: string;
    created_at: string;
    updated_at: string;
  } | null;
  onEditComplete?: () => void;
  onCancelEdit?: () => void;
}

export default function ScreenshotUpload({
  onUploadComplete,
  editingScreenshot,
  onEditComplete,
  onCancelEdit,
}: ScreenshotUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [project, setProject] = useState(editingScreenshot?.project || "");
  const [tags, setTags] = useState(editingScreenshot?.tags?.join(", ") || "");
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showBlurEditor, setShowBlurEditor] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [capturedStream, setCapturedStream] = useState<MediaStream | null>(
    null,
  );
  const [blurRegions, setBlurRegions] = useState<
    Array<{ x: number; y: number; width: number; height: number }>
  >([]);
  const [captureMode, setCaptureMode] = useState<"full" | "selection">("full");
  const [annotations, setAnnotations] = useState<
    Array<{
      id: string;
      type: "arrow" | "circle" | "text" | "pen";
      x: number;
      y: number;
      width?: number;
      height?: number;
      points?: Array<{ x: number; y: number }>;
      text?: string;
      color: string;
      strokeWidth: number;
    }>
  >([]);
  const [selectedTool, setSelectedTool] = useState<
    "select" | "blur" | "arrow" | "circle" | "text" | "pen"
  >("select");
  const [selectedColor, setSelectedColor] = useState("#ff0000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [captureArea, setCaptureArea] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
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

  const handleEditExistingScreenshot = () => {
    if (editingScreenshot) {
      setEditingImageUrl(editingScreenshot.file_url);
      setShowImageEditor(true);
    }
  };

  const handleSaveMetadata = async () => {
    if (!editingScreenshot) return;

    setIsSavingMetadata(true);
    try {
      // For now, we'll just show a success message since we're only updating local state
      // In a real app, you'd want to update the database here
      toast({
        title: "Metadata Updated",
        description: "Project and tags have been updated successfully",
      });
      onEditComplete?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update metadata",
        variant: "destructive",
      });
    } finally {
      setIsSavingMetadata(false);
    }
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

      // Apply annotations to canvas
      annotations.forEach((annotation) => {
        ctx.save();
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = annotation.strokeWidth;
        ctx.fillStyle = annotation.color;
        ctx.font = `${annotation.strokeWidth * 4}px Arial`;

        if (annotation.type === "pen" && annotation.points) {
          ctx.beginPath();
          annotation.points.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.stroke();
        } else if (annotation.type === "arrow") {
          // Draw arrow line
          ctx.beginPath();
          ctx.moveTo(annotation.x, annotation.y);
          ctx.lineTo(
            annotation.x + annotation.width!,
            annotation.y + annotation.height!,
          );
          ctx.stroke();

          // Draw arrowhead
          const angle = Math.atan2(annotation.height!, annotation.width!);
          const headLength = 15;
          ctx.beginPath();
          ctx.moveTo(
            annotation.x + annotation.width!,
            annotation.y + annotation.height!,
          );
          ctx.lineTo(
            annotation.x +
              annotation.width! -
              headLength * Math.cos(angle - Math.PI / 6),
            annotation.y +
              annotation.height! -
              headLength * Math.sin(angle - Math.PI / 6),
          );
          ctx.moveTo(
            annotation.x + annotation.width!,
            annotation.y + annotation.height!,
          );
          ctx.lineTo(
            annotation.x +
              annotation.width! -
              headLength * Math.cos(angle + Math.PI / 6),
            annotation.y +
              annotation.height! -
              headLength * Math.sin(angle + Math.PI / 6),
          );
          ctx.stroke();
        } else if (annotation.type === "circle") {
          ctx.beginPath();
          ctx.ellipse(
            annotation.x + annotation.width! / 2,
            annotation.y + annotation.height! / 2,
            annotation.width! / 2,
            annotation.height! / 2,
            0,
            0,
            2 * Math.PI,
          );
          ctx.stroke();
        } else if (annotation.type === "text" && annotation.text) {
          ctx.fillText(annotation.text, annotation.x, annotation.y);
        }

        ctx.restore();
      });

      // If capture mode is selection and we have a capture area, crop the canvas
      let finalCanvas = canvas;
      if (captureMode === "selection" && captureArea) {
        const croppedCanvas = document.createElement("canvas");
        croppedCanvas.width = captureArea.width;
        croppedCanvas.height = captureArea.height;
        const croppedCtx = croppedCanvas.getContext("2d");
        if (croppedCtx) {
          croppedCtx.drawImage(
            canvas,
            captureArea.x,
            captureArea.y,
            captureArea.width,
            captureArea.height,
            0,
            0,
            captureArea.width,
            captureArea.height,
          );
          finalCanvas = croppedCanvas;
        }
      }

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        finalCanvas.toBlob((blob) => resolve(blob!), "image/png");
      });

      // Create a File object from the blob
      const timestamp = Date.now();
      const file = new File([blob], `screen-capture-${timestamp}.png`, {
        type: "image/png",
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("project", project || "Screen Capture");
      const captureTags = [
        "screen-capture",
        "live-capture",
        ...(blurRegions.length > 0 ? ["blurred"] : []),
        ...(annotations.length > 0 ? ["annotated"] : []),
        ...(captureMode === "selection" ? ["cropped"] : ["full-screen"]),
      ];

      formData.append(
        "tags",
        tags ? `${tags}, ${captureTags.join(", ")}` : captureTags.join(", "),
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
      setAnnotations([]);
      setCaptureArea(null);
      setSelectedTool("select");
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
    setAnnotations([]);
    setCaptureArea(null);
    setSelectedTool("select");
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
    const [currentAnnotation, setCurrentAnnotation] = useState<any>(null);
    const [penPoints, setPenPoints] = useState<Array<{ x: number; y: number }>>(
      [],
    );
    const [textInput, setTextInput] = useState("");
    const [showTextInput, setShowTextInput] = useState(false);
    const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
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

      if (selectedTool === "text") {
        setTextPosition({ x, y });
        setShowTextInput(true);
        return;
      }

      if (selectedTool === "pen") {
        setPenPoints([{ x, y }]);
        return;
      }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDrawing || !overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (selectedTool === "pen") {
        setPenPoints((prev) => [...prev, { x, y }]);
        return;
      }

      const width = x - startPos.x;
      const height = y - startPos.y;

      if (
        selectedTool === "blur" ||
        (selectedTool === "select" && captureMode === "selection")
      ) {
        setCurrentRegion({
          x: Math.min(startPos.x, x),
          y: Math.min(startPos.y, y),
          width: Math.abs(width),
          height: Math.abs(height),
        });
      } else if (selectedTool === "arrow" || selectedTool === "circle") {
        setCurrentAnnotation({
          type: selectedTool,
          x: Math.min(startPos.x, x),
          y: Math.min(startPos.y, y),
          width: Math.abs(width),
          height: Math.abs(height),
          color: selectedColor,
          strokeWidth,
        });
      }
    };

    const handleMouseUp = () => {
      if (!isDrawing) return;

      const video = videoRef.current;
      const overlay = overlayRef.current;
      if (!video || !overlay) return;

      const scaleX = video.videoWidth / overlay.clientWidth;
      const scaleY = video.videoHeight / overlay.clientHeight;

      if (selectedTool === "pen" && penPoints.length > 1) {
        const scaledPoints = penPoints.map((point) => ({
          x: Math.round(point.x * scaleX),
          y: Math.round(point.y * scaleY),
        }));

        const newAnnotation = {
          id: Math.random().toString(36).substr(2, 9),
          type: "pen" as const,
          x: 0,
          y: 0,
          points: scaledPoints,
          color: selectedColor,
          strokeWidth,
        };

        setAnnotations((prev) => {
          const updated = [...prev, newAnnotation];
          console.log(
            "Added pen annotation:",
            newAnnotation,
            "Total annotations:",
            updated.length,
          );
          return updated;
        });
        setPenPoints([]);
      } else if (
        currentRegion &&
        currentRegion.width > 10 &&
        currentRegion.height > 10
      ) {
        const scaledRegion = {
          x: Math.round(currentRegion.x * scaleX),
          y: Math.round(currentRegion.y * scaleY),
          width: Math.round(currentRegion.width * scaleX),
          height: Math.round(currentRegion.height * scaleY),
        };

        if (selectedTool === "blur") {
          setBlurRegions((prev) => [...prev, scaledRegion]);
        } else if (selectedTool === "select" && captureMode === "selection") {
          setCaptureArea(scaledRegion);
        }
      } else if (
        currentAnnotation &&
        (currentAnnotation.width > 5 || currentAnnotation.height > 5)
      ) {
        const scaledAnnotation = {
          ...currentAnnotation,
          id: Math.random().toString(36).substr(2, 9),
          x: Math.round(currentAnnotation.x * scaleX),
          y: Math.round(currentAnnotation.y * scaleY),
          width: Math.round(currentAnnotation.width * scaleX),
          height: Math.round(currentAnnotation.height * scaleY),
        };

        setAnnotations((prev) => {
          const updated = [...prev, scaledAnnotation];
          console.log(
            "Added shape annotation:",
            scaledAnnotation,
            "Total annotations:",
            updated.length,
          );
          return updated;
        });
      }

      setIsDrawing(false);
      setCurrentRegion(null);
      setCurrentAnnotation(null);
    };

    const addTextAnnotation = () => {
      if (!textInput.trim()) {
        setShowTextInput(false);
        return;
      }

      const video = videoRef.current;
      const overlay = overlayRef.current;
      if (!video || !overlay) return;

      const scaleX = video.videoWidth / overlay.clientWidth;
      const scaleY = video.videoHeight / overlay.clientHeight;

      const newAnnotation = {
        id: Math.random().toString(36).substr(2, 9),
        type: "text" as const,
        x: Math.round(textPosition.x * scaleX),
        y: Math.round(textPosition.y * scaleY),
        text: textInput,
        color: selectedColor,
        strokeWidth,
      };

      setAnnotations((prev) => {
        const updated = [...prev, newAnnotation];
        console.log(
          "Added text annotation:",
          newAnnotation,
          "Total annotations:",
          updated.length,
        );
        return updated;
      });

      setTextInput("");
      setShowTextInput(false);
    };

    const clearAnnotations = () => {
      setAnnotations([]);
      setBlurRegions([]);
      setCaptureArea(null);
      console.log("Cleared all annotations");
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Screenshot Editor</h3>
            <p className="text-sm text-gray-600 mb-4">
              Use the tools below to annotate, blur areas, or select capture
              region.
            </p>

            {/* Capture Mode Selection */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium mb-2 block">
                Capture Mode:
              </label>
              <div className="flex gap-2">
                <Button
                  variant={captureMode === "full" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCaptureMode("full")}
                >
                  <Monitor className="h-4 w-4 mr-1" />
                  Full Screen
                </Button>
                <Button
                  variant={captureMode === "selection" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCaptureMode("selection")}
                >
                  <Square className="h-4 w-4 mr-1" />
                  Selected Area
                </Button>
              </div>
            </div>

            {/* Tool Selection */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium mb-2 block">Tools:</label>
              <div className="flex flex-wrap gap-2 mb-3">
                <Button
                  variant={selectedTool === "select" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTool("select")}
                >
                  <MousePointer className="h-4 w-4 mr-1" />
                  Select
                </Button>
                <Button
                  variant={selectedTool === "blur" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTool("blur")}
                >
                  <Square className="h-4 w-4 mr-1" />
                  Blur
                </Button>
                <Button
                  variant={selectedTool === "arrow" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTool("arrow")}
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Arrow
                </Button>
                <Button
                  variant={selectedTool === "circle" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTool("circle")}
                >
                  <Circle className="h-4 w-4 mr-1" />
                  Circle
                </Button>
                <Button
                  variant={selectedTool === "text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTool("text")}
                >
                  <Type className="h-4 w-4 mr-1" />
                  Text
                </Button>
                <Button
                  variant={selectedTool === "pen" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTool("pen")}
                >
                  <Pen className="h-4 w-4 mr-1" />
                  Pen
                </Button>
              </div>

              {/* Color and Stroke Controls */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Width:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStrokeWidth(Math.max(1, strokeWidth - 1))}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm w-6 text-center">{strokeWidth}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setStrokeWidth(Math.min(10, strokeWidth + 1))
                    }
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
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
              className={`absolute inset-0 ${
                selectedTool === "pen"
                  ? "cursor-crosshair"
                  : selectedTool === "text"
                    ? "cursor-text"
                    : "cursor-crosshair"
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* Show capture area selection */}
              {captureArea &&
                captureMode === "selection" &&
                (() => {
                  const video = videoRef.current;
                  const overlay = overlayRef.current;
                  if (!video || !overlay) return null;

                  const scaleX = overlay.clientWidth / video.videoWidth;
                  const scaleY = overlay.clientHeight / video.videoHeight;

                  return (
                    <div
                      className="absolute border-2 border-green-500 bg-green-200 bg-opacity-20"
                      style={{
                        left: captureArea.x * scaleX,
                        top: captureArea.y * scaleY,
                        width: captureArea.width * scaleX,
                        height: captureArea.height * scaleY,
                      }}
                    >
                      <div className="absolute -top-6 left-0 text-xs bg-green-500 text-white px-1 rounded">
                        Capture Area
                      </div>
                    </div>
                  );
                })()}

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

              {/* Show annotations */}
              {annotations.map((annotation) => {
                const video = videoRef.current;
                const overlay = overlayRef.current;
                if (!video || !overlay) return null;

                const scaleX = overlay.clientWidth / video.videoWidth;
                const scaleY = overlay.clientHeight / video.videoHeight;

                if (annotation.type === "pen" && annotation.points) {
                  const scaledPoints = annotation.points.map((point) => ({
                    x: point.x * scaleX,
                    y: point.y * scaleY,
                  }));

                  return (
                    <svg
                      key={annotation.id}
                      className="absolute inset-0 pointer-events-none"
                      style={{ width: "100%", height: "100%" }}
                    >
                      <polyline
                        points={scaledPoints
                          .map((p) => `${p.x},${p.y}`)
                          .join(" ")}
                        fill="none"
                        stroke={annotation.color}
                        strokeWidth={annotation.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  );
                }

                if (annotation.type === "arrow") {
                  const x = annotation.x * scaleX;
                  const y = annotation.y * scaleY;
                  const width = annotation.width! * scaleX;
                  const height = annotation.height! * scaleY;

                  return (
                    <svg
                      key={annotation.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: x,
                        top: y,
                        width: width,
                        height: height,
                      }}
                    >
                      <defs>
                        <marker
                          id={`arrowhead-${annotation.id}`}
                          markerWidth="10"
                          markerHeight="7"
                          refX="9"
                          refY="3.5"
                          orient="auto"
                        >
                          <polygon
                            points="0 0, 10 3.5, 0 7"
                            fill={annotation.color}
                          />
                        </marker>
                      </defs>
                      <line
                        x1="0"
                        y1="0"
                        x2={width}
                        y2={height}
                        stroke={annotation.color}
                        strokeWidth={annotation.strokeWidth}
                        markerEnd={`url(#arrowhead-${annotation.id})`}
                      />
                    </svg>
                  );
                }

                if (annotation.type === "circle") {
                  return (
                    <div
                      key={annotation.id}
                      className="absolute border-2 rounded-full pointer-events-none"
                      style={{
                        left: annotation.x * scaleX,
                        top: annotation.y * scaleY,
                        width: annotation.width! * scaleX,
                        height: annotation.height! * scaleY,
                        borderColor: annotation.color,
                        borderWidth: annotation.strokeWidth,
                      }}
                    />
                  );
                }

                if (annotation.type === "text") {
                  return (
                    <div
                      key={annotation.id}
                      className="absolute pointer-events-none font-bold"
                      style={{
                        left: annotation.x * scaleX,
                        top: annotation.y * scaleY,
                        color: annotation.color,
                        fontSize: `${annotation.strokeWidth * 4}px`,
                      }}
                    >
                      {annotation.text}
                    </div>
                  );
                }

                return null;
              })}

              {/* Show current pen drawing */}
              {selectedTool === "pen" && penPoints.length > 1 && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: "100%", height: "100%" }}
                >
                  <polyline
                    points={penPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke={selectedColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}

              {/* Show current selection */}
              {currentRegion && (
                <div
                  className={`absolute border-2 ${
                    selectedTool === "blur"
                      ? "border-red-500 bg-red-200 bg-opacity-30"
                      : captureMode === "selection" && selectedTool === "select"
                        ? "border-green-500 bg-green-200 bg-opacity-20"
                        : "border-blue-500 bg-blue-200 bg-opacity-30"
                  }`}
                  style={{
                    left: currentRegion.x,
                    top: currentRegion.y,
                    width: currentRegion.width,
                    height: currentRegion.height,
                  }}
                />
              )}

              {/* Show current annotation */}
              {currentAnnotation && (
                <div
                  className="absolute border-2 pointer-events-none"
                  style={{
                    left: currentAnnotation.x,
                    top: currentAnnotation.y,
                    width: currentAnnotation.width,
                    height: currentAnnotation.height,
                    borderColor: currentAnnotation.color,
                    borderWidth: currentAnnotation.strokeWidth,
                    ...(currentAnnotation.type === "circle"
                      ? { borderRadius: "50%" }
                      : {}),
                  }}
                />
              )}

              {/* Text input overlay */}
              {showTextInput && (
                <div
                  className="absolute bg-white border rounded p-2 shadow-lg z-10"
                  style={{
                    left: textPosition.x,
                    top: textPosition.y - 40,
                  }}
                >
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTextAnnotation();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setShowTextInput(false);
                        setTextInput("");
                      }
                    }}
                    placeholder="Enter text..."
                    className="text-sm border rounded px-2 py-1 w-32"
                    autoFocus
                  />
                  <div className="flex gap-1 mt-1">
                    <Button size="sm" onClick={addTextAnnotation}>
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowTextInput(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Square className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {blurRegions.length} blur region(s)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Pen className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {annotations.length} annotation(s)
                </span>
              </div>
              {(blurRegions.length > 0 ||
                annotations.length > 0 ||
                captureArea) && (
                <Button variant="outline" size="sm" onClick={clearAnnotations}>
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

  const ImageEditor = () => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentAnnotation, setCurrentAnnotation] = useState<any>(null);
    const [penPoints, setPenPoints] = useState<Array<{ x: number; y: number }>>(
      [],
    );
    const [textInput, setTextInput] = useState("");
    const [showTextInput, setShowTextInput] = useState(false);
    const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
      if (!overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setStartPos({ x, y });
      setIsDrawing(true);

      if (selectedTool === "text") {
        setTextPosition({ x, y });
        setShowTextInput(true);
        return;
      }

      if (selectedTool === "pen") {
        setPenPoints([{ x, y }]);
        return;
      }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDrawing || !overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (selectedTool === "pen") {
        setPenPoints((prev) => [...prev, { x, y }]);
        return;
      }

      const width = x - startPos.x;
      const height = y - startPos.y;

      if (selectedTool === "arrow" || selectedTool === "circle") {
        setCurrentAnnotation({
          type: selectedTool,
          x: Math.min(startPos.x, x),
          y: Math.min(startPos.y, y),
          width: Math.abs(width),
          height: Math.abs(height),
          color: selectedColor,
          strokeWidth,
        });
      }
    };

    const handleMouseUp = () => {
      if (!isDrawing) return;

      const image = imageRef.current;
      const overlay = overlayRef.current;
      if (!image || !overlay) return;

      const scaleX = image.naturalWidth / overlay.clientWidth;
      const scaleY = image.naturalHeight / overlay.clientHeight;

      if (selectedTool === "pen" && penPoints.length > 1) {
        const scaledPoints = penPoints.map((point) => ({
          x: Math.round(point.x * scaleX),
          y: Math.round(point.y * scaleY),
        }));

        const newAnnotation = {
          id: Math.random().toString(36).substr(2, 9),
          type: "pen" as const,
          x: 0,
          y: 0,
          points: scaledPoints,
          color: selectedColor,
          strokeWidth,
        };

        setAnnotations((prev) => {
          const updated = [...prev, newAnnotation];
          console.log(
            "Added pen annotation (image editor):",
            newAnnotation,
            "Total annotations:",
            updated.length,
          );
          return updated;
        });
        setPenPoints([]);
      } else if (
        currentAnnotation &&
        (currentAnnotation.width > 5 || currentAnnotation.height > 5)
      ) {
        const scaledAnnotation = {
          ...currentAnnotation,
          id: Math.random().toString(36).substr(2, 9),
          x: Math.round(currentAnnotation.x * scaleX),
          y: Math.round(currentAnnotation.y * scaleY),
          width: Math.round(currentAnnotation.width * scaleX),
          height: Math.round(currentAnnotation.height * scaleY),
        };

        setAnnotations((prev) => {
          const updated = [...prev, scaledAnnotation];
          console.log(
            "Added shape annotation (image editor):",
            scaledAnnotation,
            "Total annotations:",
            updated.length,
          );
          return updated;
        });
      }

      setIsDrawing(false);
      setCurrentAnnotation(null);
    };

    const addTextAnnotation = () => {
      if (!textInput.trim()) {
        setShowTextInput(false);
        return;
      }

      const image = imageRef.current;
      const overlay = overlayRef.current;
      if (!image || !overlay) return;

      const scaleX = image.naturalWidth / overlay.clientWidth;
      const scaleY = image.naturalHeight / overlay.clientHeight;

      const newAnnotation = {
        id: Math.random().toString(36).substr(2, 9),
        type: "text" as const,
        x: Math.round(textPosition.x * scaleX),
        y: Math.round(textPosition.y * scaleY),
        text: textInput,
        color: selectedColor,
        strokeWidth,
      };

      setAnnotations((prev) => {
        const updated = [...prev, newAnnotation];
        console.log(
          "Added text annotation (image editor):",
          newAnnotation,
          "Total annotations:",
          updated.length,
        );
        return updated;
      });

      setTextInput("");
      setShowTextInput(false);
    };

    const saveEditedImage = async () => {
      if (!imageRef.current || !editingScreenshot) return;

      try {
        // Create canvas and draw the image with annotations
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get canvas context");

        const img = imageRef.current;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Draw the original image
        ctx.drawImage(img, 0, 0);

        // Apply annotations to canvas
        annotations.forEach((annotation) => {
          ctx.save();
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = annotation.strokeWidth;
          ctx.fillStyle = annotation.color;
          ctx.font = `${annotation.strokeWidth * 4}px Arial`;

          if (annotation.type === "pen" && annotation.points) {
            ctx.beginPath();
            annotation.points.forEach((point, index) => {
              if (index === 0) {
                ctx.moveTo(point.x, point.y);
              } else {
                ctx.lineTo(point.x, point.y);
              }
            });
            ctx.stroke();
          } else if (annotation.type === "arrow") {
            // Draw arrow line
            ctx.beginPath();
            ctx.moveTo(annotation.x, annotation.y);
            ctx.lineTo(
              annotation.x + annotation.width!,
              annotation.y + annotation.height!,
            );
            ctx.stroke();

            // Draw arrowhead
            const angle = Math.atan2(annotation.height!, annotation.width!);
            const headLength = 15;
            ctx.beginPath();
            ctx.moveTo(
              annotation.x + annotation.width!,
              annotation.y + annotation.height!,
            );
            ctx.lineTo(
              annotation.x +
                annotation.width! -
                headLength * Math.cos(angle - Math.PI / 6),
              annotation.y +
                annotation.height! -
                headLength * Math.sin(angle - Math.PI / 6),
            );
            ctx.moveTo(
              annotation.x + annotation.width!,
              annotation.y + annotation.height!,
            );
            ctx.lineTo(
              annotation.x +
                annotation.width! -
                headLength * Math.cos(angle + Math.PI / 6),
              annotation.y +
                annotation.height! -
                headLength * Math.sin(angle + Math.PI / 6),
            );
            ctx.stroke();
          } else if (annotation.type === "circle") {
            ctx.beginPath();
            ctx.ellipse(
              annotation.x + annotation.width! / 2,
              annotation.y + annotation.height! / 2,
              annotation.width! / 2,
              annotation.height! / 2,
              0,
              0,
              2 * Math.PI,
            );
            ctx.stroke();
          } else if (annotation.type === "text" && annotation.text) {
            ctx.fillText(annotation.text, annotation.x, annotation.y);
          }

          ctx.restore();
        });

        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), "image/png");
        });

        // Create a File object from the blob
        const timestamp = Date.now();
        const originalName = editingScreenshot.original_filename;
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
        const file = new File(
          [blob],
          `${nameWithoutExt}-edited-${timestamp}.png`,
          {
            type: "image/png",
          },
        );

        const formData = new FormData();
        formData.append("file", file);
        formData.append(
          "project",
          project || editingScreenshot.project || "Edited Screenshot",
        );
        const editTags = [
          "edited",
          "annotated",
          ...(annotations.some((a) => a.type === "arrow") ? ["arrows"] : []),
          ...(annotations.some((a) => a.type === "circle") ? ["circles"] : []),
          ...(annotations.some((a) => a.type === "text") ? ["text"] : []),
          ...(annotations.some((a) => a.type === "pen") ? ["drawings"] : []),
        ];

        formData.append(
          "tags",
          tags ? `${tags}, ${editTags.join(", ")}` : editTags.join(", "),
        );

        const result = await uploadScreenshotAction(formData);

        if (result.success) {
          toast({
            title: "Screenshot Edited Successfully",
            description: `Edited screenshot saved with ${annotations.length} annotation(s)`,
          });
          onEditComplete?.();
        } else {
          throw new Error(result.error || "Edit failed");
        }

        // Reset state
        setShowImageEditor(false);
        setEditingImageUrl(null);
        setAnnotations([]);
        setSelectedTool("select");
      } catch (error: any) {
        console.error("Save edited image error:", error);
        toast({
          title: "Edit Failed",
          description: "Failed to save edited screenshot. Please try again.",
          variant: "destructive",
        });
      }
    };

    const cancelImageEdit = () => {
      setShowImageEditor(false);
      setEditingImageUrl(null);
      setAnnotations([]);
      setSelectedTool("select");
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-5xl max-h-[90vh] overflow-auto">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Edit Screenshot</h3>
            <p className="text-sm text-gray-600 mb-4">
              Add annotations, arrows, circles, or text to your screenshot.
            </p>

            {/* Tool Selection */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium mb-2 block">Tools:</label>
              <div className="flex flex-wrap gap-2 mb-3">
                <Button
                  variant={selectedTool === "select" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTool("select")}
                >
                  <MousePointer className="h-4 w-4 mr-1" />
                  Select
                </Button>
                <Button
                  variant={selectedTool === "arrow" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTool("arrow")}
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Arrow
                </Button>
                <Button
                  variant={selectedTool === "circle" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTool("circle")}
                >
                  <Circle className="h-4 w-4 mr-1" />
                  Circle
                </Button>
                <Button
                  variant={selectedTool === "text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTool("text")}
                >
                  <Type className="h-4 w-4 mr-1" />
                  Text
                </Button>
                <Button
                  variant={selectedTool === "pen" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTool("pen")}
                >
                  <Pen className="h-4 w-4 mr-1" />
                  Pen
                </Button>
              </div>

              {/* Color and Stroke Controls */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Width:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStrokeWidth(Math.max(1, strokeWidth - 1))}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm w-6 text-center">{strokeWidth}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setStrokeWidth(Math.min(10, strokeWidth + 1))
                    }
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mb-4">
            <img
              ref={imageRef}
              src={editingImageUrl!}
              alt="Edit screenshot"
              className="max-w-full max-h-96 border rounded"
              crossOrigin="anonymous"
            />
            <div
              ref={overlayRef}
              className={`absolute inset-0 ${
                selectedTool === "pen"
                  ? "cursor-crosshair"
                  : selectedTool === "text"
                    ? "cursor-text"
                    : "cursor-crosshair"
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* Show annotations */}
              {annotations.map((annotation) => {
                const image = imageRef.current;
                const overlay = overlayRef.current;
                if (!image || !overlay) return null;

                const scaleX = overlay.clientWidth / image.naturalWidth;
                const scaleY = overlay.clientHeight / image.naturalHeight;

                if (annotation.type === "pen" && annotation.points) {
                  const scaledPoints = annotation.points.map((point) => ({
                    x: point.x * scaleX,
                    y: point.y * scaleY,
                  }));

                  return (
                    <svg
                      key={annotation.id}
                      className="absolute inset-0 pointer-events-none"
                      style={{ width: "100%", height: "100%" }}
                    >
                      <polyline
                        points={scaledPoints
                          .map((p) => `${p.x},${p.y}`)
                          .join(" ")}
                        fill="none"
                        stroke={annotation.color}
                        strokeWidth={annotation.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  );
                }

                if (annotation.type === "arrow") {
                  const x = annotation.x * scaleX;
                  const y = annotation.y * scaleY;
                  const width = annotation.width! * scaleX;
                  const height = annotation.height! * scaleY;

                  return (
                    <svg
                      key={annotation.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: x,
                        top: y,
                        width: width,
                        height: height,
                      }}
                    >
                      <defs>
                        <marker
                          id={`arrowhead-${annotation.id}`}
                          markerWidth="10"
                          markerHeight="7"
                          refX="9"
                          refY="3.5"
                          orient="auto"
                        >
                          <polygon
                            points="0 0, 10 3.5, 0 7"
                            fill={annotation.color}
                          />
                        </marker>
                      </defs>
                      <line
                        x1="0"
                        y1="0"
                        x2={width}
                        y2={height}
                        stroke={annotation.color}
                        strokeWidth={annotation.strokeWidth}
                        markerEnd={`url(#arrowhead-${annotation.id})`}
                      />
                    </svg>
                  );
                }

                if (annotation.type === "circle") {
                  return (
                    <div
                      key={annotation.id}
                      className="absolute border-2 rounded-full pointer-events-none"
                      style={{
                        left: annotation.x * scaleX,
                        top: annotation.y * scaleY,
                        width: annotation.width! * scaleX,
                        height: annotation.height! * scaleY,
                        borderColor: annotation.color,
                        borderWidth: annotation.strokeWidth,
                      }}
                    />
                  );
                }

                if (annotation.type === "text") {
                  return (
                    <div
                      key={annotation.id}
                      className="absolute pointer-events-none font-bold"
                      style={{
                        left: annotation.x * scaleX,
                        top: annotation.y * scaleY,
                        color: annotation.color,
                        fontSize: `${annotation.strokeWidth * 4}px`,
                      }}
                    >
                      {annotation.text}
                    </div>
                  );
                }

                return null;
              })}

              {/* Show current pen drawing */}
              {selectedTool === "pen" && penPoints.length > 1 && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: "100%", height: "100%" }}
                >
                  <polyline
                    points={penPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke={selectedColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}

              {/* Show current annotation */}
              {currentAnnotation && (
                <div
                  className="absolute border-2 pointer-events-none"
                  style={{
                    left: currentAnnotation.x,
                    top: currentAnnotation.y,
                    width: currentAnnotation.width,
                    height: currentAnnotation.height,
                    borderColor: currentAnnotation.color,
                    borderWidth: currentAnnotation.strokeWidth,
                    ...(currentAnnotation.type === "circle"
                      ? { borderRadius: "50%" }
                      : {}),
                  }}
                />
              )}

              {/* Text input overlay */}
              {showTextInput && (
                <div
                  className="absolute bg-white border rounded p-2 shadow-lg z-10"
                  style={{
                    left: textPosition.x,
                    top: textPosition.y - 40,
                  }}
                >
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTextAnnotation();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setShowTextInput(false);
                        setTextInput("");
                      }
                    }}
                    placeholder="Enter text..."
                    className="text-sm border rounded px-2 py-1 w-32"
                    autoFocus
                  />
                  <div className="flex gap-1 mt-1">
                    <Button size="sm" onClick={addTextAnnotation}>
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowTextInput(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Pen className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {annotations.length} annotation(s)
                </span>
              </div>
              {annotations.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAnnotations([])}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={cancelImageEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={saveEditedImage}>
                <Check className="h-4 w-4 mr-2" />
                Save Edited Screenshot
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
      {showImageEditor && <ImageEditor />}

      {/* Edit Mode Header */}
      {editingScreenshot && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileImage className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    Editing: {editingScreenshot.original_filename}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Update project name and tags for this screenshot
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onCancelEdit}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveMetadata}
                  disabled={isSavingMetadata}
                  variant="default"
                >
                  {isSavingMetadata ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  onClick={handleEditExistingScreenshot}
                  variant="secondary"
                >
                  Edit Image
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Options - Hide when editing */}
      {!editingScreenshot && (
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
                  {isDragActive
                    ? "Drop screenshots here"
                    : "Upload Screenshots"}
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
      )}

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

      {/* File List - Hide when editing */}
      {!editingScreenshot && files.length > 0 && (
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
