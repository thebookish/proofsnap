import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Calendar,
  Hash,
  Globe,
  Monitor,
  FileText,
  Tag,
} from "lucide-react";
import DownloadButton from "@/components/download-button";
import Footer from "@/components/footer";
import { createClient } from "../../../../supabase/server";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // Get shareable link and screenshot data
  const { data: shareData, error } = await supabase
    .from("shareable_links")
    .select(
      `
      *,
      screenshots (*)
    `,
    )
    .eq("share_token", token)
    .single();

  if (error || !shareData) {
    notFound();
  }

  const screenshot = shareData.screenshots;

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">ProofSnap Verification</h1>
          </div>
          <p className="text-gray-600">
            Verified screenshot evidence with tamper-proof metadata
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Screenshot Evidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <img
                  src={screenshot.file_url}
                  alt={screenshot.original_filename}
                  className="w-full rounded-lg border shadow-sm"
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
              <div className="mt-4 space-y-3">
                <div className="text-sm text-gray-600">
                  <p>
                    <strong>Filename:</strong> {screenshot.original_filename}
                  </p>
                  <p>
                    <strong>Size:</strong>{" "}
                    {formatFileSize(screenshot.file_size)}
                  </p>
                  <p>
                    <strong>Type:</strong> {screenshot.file_type.toUpperCase()}
                  </p>
                </div>
                <DownloadButton
                  fileUrl={screenshot.file_url}
                  filename={screenshot.original_filename}
                />
              </div>
            </CardContent>
          </Card>

          {/* Verification Details */}
          <div className="space-y-6">
            {/* Verification Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Verification Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Badge
                    variant={
                      screenshot.verification_status === "verified"
                        ? "default"
                        : "destructive"
                    }
                    className="text-sm"
                  >
                    {screenshot.verification_status === "verified"
                      ? "✓ Verified"
                      : "✗ Unverified"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  This screenshot has been cryptographically verified and
                  timestamped to ensure authenticity and prevent tampering.
                </p>
              </CardContent>
            </Card>

            {/* Cryptographic Hash */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Cryptographic Proof
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      SHA256 Hash:
                    </p>
                    <code className="text-xs bg-gray-100 p-2 rounded block break-all font-mono">
                      {screenshot.sha256_hash}
                    </code>
                  </div>
                  <p className="text-xs text-gray-500">
                    This unique fingerprint proves the image hasn't been
                    modified since verification.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Timestamp Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timestamp Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Verified At:</span>
                    <span className="font-mono">
                      {formatDate(screenshot.created_at)}
                    </span>
                  </div>
                  {screenshot.ip_address && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        IP Address:
                      </span>
                      <span className="font-mono">{screenshot.ip_address}</span>
                    </div>
                  )}
                  {screenshot.browser_info && (
                    <div>
                      <span className="text-gray-600 flex items-center gap-1 mb-1">
                        <Monitor className="h-3 w-3" />
                        Browser:
                      </span>
                      <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                        {screenshot.browser_info}
                      </code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Project and Tags */}
            {(screenshot.project ||
              (screenshot.tags && screenshot.tags.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Classification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {screenshot.project && (
                      <div className="flex justify-between items-center">
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
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <Separator className="mb-4" />
          <p>Powered by ProofSnap - Secure Screenshot Verification</p>
          <p className="mt-1">
            This verification report was generated on{" "}
            {formatDate(new Date().toISOString())}
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
