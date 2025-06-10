"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import {
  Share2,
  Download,
  Copy,
  Calendar,
  Hash,
  Globe,
  Monitor,
  FileText,
  Tag,
  HardDrive,
  Shield,
  Trash2,
  Edit,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  generateShareableLinkAction,
  generatePDFReportAction,
  deleteScreenshotAction,
} from "@/app/actions";

interface Screenshot {
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
}

interface ScreenshotDetailModalProps {
  screenshot: Screenshot;
  open: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onEdit?: (screenshot: Screenshot) => void;
}

export default function ScreenshotDetailModal({
  screenshot,
  open,
  onClose,
  onDelete,
  onEdit,
}: ScreenshotDetailModalProps) {
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownloadImage = () => {
    const link = document.createElement("a");
    link.href = screenshot.file_url;
    link.download = screenshot.original_filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Download Started",
      description: `Downloading ${screenshot.original_filename}`,
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteScreenshotAction(screenshot.id);
      if (result.success) {
        toast({
          title: "Screenshot Deleted",
          description: "Screenshot has been permanently deleted",
        });
        onClose();
        onDelete?.();
      } else {
        throw new Error(result.error || "Failed to delete screenshot");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete screenshot",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateShareableLink = async () => {
    setIsGeneratingLink(true);
    try {
      const result = await generateShareableLinkAction(screenshot.id);
      if (result.success && result.shareUrl) {
        await copyToClipboard(result.shareUrl, "Shareable link");
      } else {
        throw new Error(result.error || "Failed to generate link");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate shareable link",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const result = await generatePDFReportAction(screenshot.id);
      if (result.success && result.pdfData) {
        // Dynamic import of jsPDF
        const { jsPDF } = await import("jspdf");

        const pdf = new jsPDF();
        const { screenshot: data } = result.pdfData;

        // Add title
        pdf.setFontSize(20);
        pdf.text("ProofSnap Verification Report", 20, 30);

        // Add report details
        pdf.setFontSize(12);
        let yPos = 50;

        pdf.text(`Report ID: ${result.pdfData.reportId}`, 20, yPos);
        yPos += 10;
        pdf.text(
          `Generated: ${new Date(result.pdfData.generatedAt).toLocaleString()}`,
          20,
          yPos,
        );
        yPos += 20;

        // File information
        pdf.setFontSize(14);
        pdf.text("File Information", 20, yPos);
        yPos += 10;
        pdf.setFontSize(10);
        pdf.text(`Filename: ${data.original_filename}`, 20, yPos);
        yPos += 8;
        pdf.text(
          `File Size: ${(data.file_size / 1024 / 1024).toFixed(2)} MB`,
          20,
          yPos,
        );
        yPos += 8;
        pdf.text(`File Type: ${data.file_type}`, 20, yPos);
        yPos += 15;

        // Verification details
        pdf.setFontSize(14);
        pdf.text("Verification Details", 20, yPos);
        yPos += 10;
        pdf.setFontSize(10);
        pdf.text(`SHA256 Hash: ${data.sha256_hash}`, 20, yPos);
        yPos += 8;
        pdf.text(
          `Timestamp: ${new Date(data.created_at).toLocaleString()}`,
          20,
          yPos,
        );
        yPos += 8;
        if (data.ip_address) {
          pdf.text(`IP Address: ${data.ip_address}`, 20, yPos);
          yPos += 8;
        }
        if (data.project) {
          pdf.text(`Project: ${data.project}`, 20, yPos);
          yPos += 8;
        }
        if (data.tags && data.tags.length > 0) {
          pdf.text(`Tags: ${data.tags.join(", ")}`, 20, yPos);
          yPos += 8;
        }

        // Add image if possible
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);

            const imgData = canvas.toDataURL("image/jpeg", 0.8);
            const imgWidth = 170;
            const imgHeight = (img.height * imgWidth) / img.width;

            if (yPos + imgHeight > 280) {
              pdf.addPage();
              yPos = 20;
            }

            pdf.addImage(imgData, "JPEG", 20, yPos, imgWidth, imgHeight);

            // Save the PDF
            pdf.save(`proof-report-${data.original_filename}.pdf`);

            toast({
              title: "PDF Generated",
              description: "Proof report downloaded successfully",
            });
          };
          img.onerror = () => {
            // Save PDF without image
            pdf.save(`proof-report-${data.original_filename}.pdf`);
            toast({
              title: "PDF Generated",
              description:
                "Proof report downloaded (image could not be included)",
            });
          };
          img.src = data.file_url;
        } catch (imgError) {
          // Save PDF without image
          pdf.save(`proof-report-${data.original_filename}.pdf`);
          toast({
            title: "PDF Generated",
            description:
              "Proof report downloaded (image could not be included)",
          });
        }
      } else {
        throw new Error(result.error || "Failed to generate PDF");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Screenshot Verification Details
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Preview */}
          <div className="space-y-4">
            <div className="relative">
              <img
                src={screenshot.file_url}
                alt={screenshot.original_filename}
                className="w-full rounded-lg border shadow-sm max-h-96 object-contain bg-gray-50"
                onError={(e) => {
                  console.error("Image failed to load in detail modal:", {
                    url: screenshot.file_url,
                    filename: screenshot.original_filename,
                    id: screenshot.id,
                    fileSize: screenshot.file_size,
                    fileType: screenshot.file_type,
                    error: e,
                  });
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent) {
                    const errorDiv = document.createElement("div");
                    errorDiv.className =
                      "w-full min-h-96 flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 text-gray-600 border-2 border-dashed border-red-200 rounded-lg";
                    errorDiv.innerHTML = `
                      <div class="text-center p-8 max-w-md">
                        <svg class="h-20 w-20 mx-auto mb-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                        <h3 class="text-xl font-semibold text-red-800 mb-3">Image Load Error</h3>
                        <p class="text-sm text-red-600 mb-4">Unable to load screenshot from storage</p>
                        
                        <div class="bg-white rounded-lg p-4 border border-red-200 mb-4">
                          <h4 class="font-medium text-red-700 mb-2">File Information:</h4>
                          <div class="text-xs text-gray-600 space-y-1 text-left">
                            <p><span class="font-medium">Name:</span> ${screenshot.original_filename}</p>
                            <p><span class="font-medium">Size:</span> ${(screenshot.file_size / 1024 / 1024).toFixed(2)} MB</p>
                            <p><span class="font-medium">Type:</span> ${screenshot.file_type}</p>
                            <p><span class="font-medium">ID:</span> ${screenshot.id}</p>
                          </div>
                        </div>
                        
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          <h4 class="font-medium text-blue-800 mb-2">Storage URL:</h4>
                          <div class="text-xs text-blue-700 font-mono break-all bg-blue-100 p-2 rounded">
                            ${screenshot.file_url}
                          </div>
                        </div>
                        
                        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <h4 class="font-medium text-amber-800 mb-2">Possible Solutions:</h4>
                          <ul class="text-xs text-amber-700 text-left space-y-1">
                            <li>• Storage bucket may not be public</li>
                            <li>• File might be missing from storage</li>
                            <li>• Check storage policies in Supabase</li>
                            <li>• Verify bucket permissions</li>
                          </ul>
                        </div>
                      </div>
                    `;
                    parent.insertBefore(errorDiv, target);
                  }
                }}
              />
              <div className="absolute top-2 right-2">
                <Badge
                  variant={
                    screenshot.verification_status === "verified"
                      ? "default"
                      : screenshot.verification_status === "pending"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {screenshot.verification_status}
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateShareableLink}
                  disabled={isGeneratingLink}
                  className="flex-1"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {isGeneratingLink ? "Generating..." : "Share Link"}
                </Button>
                <Button
                  onClick={handleGeneratePDF}
                  disabled={isGeneratingPDF}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isGeneratingPDF ? "Generating..." : "PDF Report"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    onEdit?.(screenshot);
                    onClose();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Screenshot
                </Button>
                <Button
                  onClick={handleDownloadImage}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Image
                </Button>
              </div>
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Screenshot</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "
                        {screenshot.original_filename}"? This action cannot be
                        undone and will permanently remove the screenshot and
                        all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-6">
            {/* File Information */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                File Information
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Filename:</span>
                  <span className="font-mono text-right break-all">
                    {screenshot.original_filename}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">File Size:</span>
                  <span>{formatFileSize(screenshot.file_size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">File Type:</span>
                  <span className="uppercase">{screenshot.file_type}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Verification Details */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Verification Details
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-gray-600">SHA256 Hash:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(screenshot.sha256_hash, "SHA256 hash")
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                    {screenshot.sha256_hash}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Timestamp:</span>
                  <span className="text-right">
                    {formatDate(screenshot.created_at)}
                  </span>
                </div>
                {screenshot.ip_address && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      IP Address:
                    </span>
                    <span>{screenshot.ip_address}</span>
                  </div>
                )}
                {screenshot.browser_info && (
                  <div>
                    <span className="text-gray-600 flex items-center gap-1 mb-1">
                      <Monitor className="h-3 w-3" />
                      Browser Info:
                    </span>
                    <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                      {screenshot.browser_info}
                    </code>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Project and Tags */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Organization
              </h3>
              <div className="space-y-3 text-sm">
                {screenshot.project && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Project:</span>
                    <Badge variant="outline">{screenshot.project}</Badge>
                  </div>
                )}
                {screenshot.tags && screenshot.tags.length > 0 && (
                  <div>
                    <span className="text-gray-600 block mb-2">Tags:</span>
                    <div className="flex flex-wrap gap-1">
                      {screenshot.tags.map((tag: string, index: number) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
