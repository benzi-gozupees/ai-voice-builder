import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface AddWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScrape: (url: string) => void;
  isLoading: boolean;
}

export function AddWebsiteModal({ 
  isOpen, 
  onClose, 
  onScrape, 
  isLoading 
}: AddWebsiteModalProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = () => {
    if (url.trim()) {
      onScrape(url.trim());
      setUrl(""); // Clear the form after submission
    }
  };

  const handleClose = () => {
    setUrl("");
    onClose();
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Website Content</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <p className="text-sm text-gray-600">
            Enter a website URL to automatically scrape and categorize content
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="website-url" className="text-sm font-medium">
              Website URL
            </Label>
            <Input
              id="website-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full"
              disabled={isLoading}
            />
          </div>
          
          <p className="text-xs text-gray-500">
            We'll detect if it's WordPress/Shopify and automatically categorize content
          </p>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isLoading || !url.trim() || !isValidUrl(url)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Website'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}