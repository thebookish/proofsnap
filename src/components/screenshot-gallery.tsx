"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  Filter,
  Eye,
  Share2,
  Download,
  Calendar,
  Hash,
  Clock,
} from "lucide-react";
import { createClient } from "../../supabase/client";
import ScreenshotDetailModal from "./screenshot-detail-modal";

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
  tags: string[];
  verification_status: string;
  created_at: string;
  updated_at: string;
}

interface ScreenshotGalleryProps {
  refreshTrigger?: number;
}

export default function ScreenshotGallery({
  refreshTrigger,
}: ScreenshotGalleryProps) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [filteredScreenshots, setFilteredScreenshots] = useState<Screenshot[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedScreenshot, setSelectedScreenshot] =
    useState<Screenshot | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const { toast } = useToast();
  const supabase = createClient();

  const fetchScreenshots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("screenshots")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Fetched screenshots:", data?.length || 0, "items");
      if (data && data.length > 0) {
        console.log("Sample screenshot:", data[0]);
      }

      setScreenshots(data || []);

      // Extract unique projects
      const uniqueProjects = [
        ...new Set((data || []).map((s) => s.project).filter(Boolean)),
      ];
      setProjects(uniqueProjects);
    } catch (error) {
      console.error("Error fetching screenshots:", error);
      toast({
        title: "Error",
        description:
          "Failed to load screenshots. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenshots();
  }, [refreshTrigger]);

  useEffect(() => {
    let filtered = screenshots;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (screenshot) =>
          screenshot.original_filename
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          screenshot.project
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          screenshot.tags?.some((tag) =>
            tag.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      );
    }

    // Project filter
    if (projectFilter !== "all") {
      filtered = filtered.filter(
        (screenshot) => screenshot.project === projectFilter,
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (screenshot) => screenshot.verification_status === statusFilter,
      );
    }

    setFilteredScreenshots(filtered);
  }, [screenshots, searchTerm, projectFilter, statusFilter]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 bg-white">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-48 w-full mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search screenshots, projects, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project} value={project}>
                {project}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filteredScreenshots.length} of {screenshots.length} screenshots
        </p>
      </div>

      {/* Gallery Grid */}
      {filteredScreenshots.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Hash className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No screenshots found
            </h3>
            <p className="text-gray-500">
              {screenshots.length === 0
                ? "Upload your first screenshot to get started"
                : "Try adjusting your search or filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredScreenshots.map((screenshot) => (
            <Card
              key={screenshot.id}
              className="group hover:shadow-lg transition-shadow cursor-pointer"
            >
              <CardContent className="p-0">
                {/* Image */}
                <div className="relative aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                  <img
                    src={screenshot.file_url}
                    alt={screenshot.original_filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                    onError={(e) => {
                      console.error("Image failed to load:", {
                        url: screenshot.file_url,
                        filename: screenshot.original_filename,
                        id: screenshot.id,
                        error: e,
                      });
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 text-gray-600 border-2 border-dashed border-red-200 rounded-lg">
                            <div class="text-center p-4">
                              <svg class="h-12 w-12 mx-auto mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                              </svg>
                              <h3 class="text-sm font-semibold text-red-800 mb-2">Image Load Failed</h3>
                              <p class="text-xs text-red-600 mb-2">${screenshot.original_filename}</p>
                              <div class="text-xs text-red-500 space-y-1">
                                <p>ID: ${screenshot.id.substring(0, 8)}...</p>
                                <p class="font-mono text-xs break-all bg-red-100 p-1 rounded">${screenshot.file_url}</p>
                              </div>
                              <div class="mt-3 px-2 py-1 bg-amber-100 border border-amber-300 rounded text-xs text-amber-800">
                                <p class="font-medium mb-1">Debug Info:</p>
                                <ul class="text-left space-y-1">
                                  <li>• Check storage bucket setup</li>
                                  <li>• Verify file exists in Supabase</li>
                                  <li>• Check bucket public access</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        `;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setSelectedScreenshot(screenshot)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                  {/* Status Badge */}
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

                {/* Content */}
                <div className="p-4">
                  <h3
                    className="font-medium text-sm mb-2 truncate"
                    title={screenshot.original_filename}
                  >
                    {screenshot.original_filename}
                  </h3>

                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(screenshot.created_at)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      <span className="truncate">
                        {screenshot.sha256_hash.substring(0, 12)}...
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>{formatFileSize(screenshot.file_size)}</span>
                      {screenshot.project && (
                        <Badge variant="outline" className="text-xs">
                          {screenshot.project}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {screenshot.tags && screenshot.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {screenshot.tags.slice(0, 3).map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {screenshot.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{screenshot.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedScreenshot && (
        <ScreenshotDetailModal
          screenshot={selectedScreenshot}
          open={!!selectedScreenshot}
          onClose={() => setSelectedScreenshot(null)}
        />
      )}
    </div>
  );
}
