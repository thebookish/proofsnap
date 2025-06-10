"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface DownloadButtonProps {
  fileUrl: string;
  filename: string;
}

export default function DownloadButton({
  fileUrl,
  filename,
}: DownloadButtonProps) {
  const handleDownloadImage = () => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button onClick={handleDownloadImage} className="w-full" variant="outline">
      <Download className="h-4 w-4 mr-2" />
      Download Original Image
    </Button>
  );
}
