import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Link, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CreateMethod = "manual" | "file" | "url";

const CATEGORIES = [
  "Business Overview",
  "Products & Services", 
  "FAQ",
  "Policies",
  "Contact Information",
  "Pricing",
  "Customer Support Protocols",
  "Agent Scripts",
  "General"
];

export function CreateDocumentModal({ isOpen, onClose }: CreateDocumentModalProps) {
  const [method, setMethod] = useState<CreateMethod>("manual");
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
    url: "",
    file: null as File | null
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      category: "",
      url: "",
      file: null
    });
    setMethod("manual");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'text/plain',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/csv',
        'application/json'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a TXT, PDF, DOC, DOCX, CSV, or JSON file.",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive"
        });
        return;
      }
      
      setFormData({ ...formData, file, title: file.name });
    }
  };

  const handleUrlFetch = async () => {
    if (!formData.url) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/knowledge/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: formData.url })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }
      
      const data = await response.json();
      setFormData({
        ...formData,
        title: data.title || new URL(formData.url).hostname,
        content: data.content || ''
      });
      
      toast({
        title: "Content fetched successfully",
        description: "You can now edit the content and save the document."
      });
    } catch (error) {
      toast({
        title: "Failed to fetch content",
        description: "Please check the URL and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.file) {
        // Handle file upload
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('category', data.category);
        
        const response = await fetch('/api/knowledge/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
          throw new Error(errorData.message || 'Upload failed');
        }
        
        return response.json();
      } else if (data.url) {
        // Handle URL import via scraping
        const payload = {
          url: data.url
        };
        
        const response = await fetch('/api/knowledge/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'URL import failed' }));
          throw new Error(errorData.message || 'URL import failed');
        }
        
        return response.json();
      } else {
        // Handle manual entry
        const payload = {
          title: data.title,
          content: data.content,
          category: data.category,
          source: data.source || undefined
        };
        
        return apiRequest('POST', '/api/knowledge/entries', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge/entries'] });
      toast({
        title: "Document created successfully",
        description: "Your document has been added to the knowledge base."
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create document",
        description: error.message || "An error occurred while creating the document.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Different validation for different methods
    if (method === "file") {
      if (!formData.file || !formData.category) {
        toast({
          title: "Missing required fields",
          description: "Please select a file and category.",
          variant: "destructive"
        });
        return;
      }
      
      const submitData = {
        file: formData.file,
        category: formData.category
      };
      
      createDocumentMutation.mutate(submitData);
    } else if (method === "url") {
      if (!formData.url) {
        toast({
          title: "Missing required fields",
          description: "Please enter a URL.",
          variant: "destructive"
        });
        return;
      }
      
      const submitData = {
        url: formData.url
      };
      
      createDocumentMutation.mutate(submitData);
    } else {
      // Manual entry
      if (!formData.title || !formData.content || !formData.category) {
        toast({
          title: "Missing required fields",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }

      const submitData = {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        source: formData.source
      };

      createDocumentMutation.mutate(submitData);
    }
  };

  const isFormValid = method === "file" 
    ? formData.file && formData.category
    : method === "url" 
      ? formData.url
      : formData.title && formData.content && formData.category;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Document</DialogTitle>
          <p className="text-sm text-gray-500">
            Add a new document to your knowledge base using one of the methods below
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Method Selection */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={method === "manual" ? "default" : "outline"}
              onClick={() => setMethod("manual")}
              className="flex-1 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Manual Entry
            </Button>
            <Button
              type="button"
              variant={method === "file" ? "default" : "outline"}
              onClick={() => setMethod("file")}
              className="flex-1 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              File Upload
            </Button>
            <Button
              type="button"
              variant={method === "url" ? "default" : "outline"}
              onClick={() => setMethod("url")}
              className="flex-1 flex items-center gap-2"
            >
              <Link className="w-4 h-4" />
              URL Import
            </Button>
          </div>

          {/* Category Selection */}
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Method-specific inputs */}
          {method === "file" && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-8 h-8 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Upload a file</h3>
              <p className="text-sm text-gray-500 mb-4">
                Supports: TXT, PDF, DOC, DOCX, CSV, JSON (Max: 10MB)
              </p>
              <Input
                type="file"
                accept=".txt,.pdf,.doc,.docx,.csv,.json"
                onChange={handleFileChange}
                className="max-w-xs mx-auto"
              />
              {formData.file && (
                <p className="text-sm text-green-600 mt-2">
                  Selected: {formData.file.name}
                </p>
              )}
            </div>
          )}

          {method === "url" && (
            <div>
              <Label htmlFor="url">URL</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/page"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleUrlFetch}
                  disabled={!formData.url || isLoading}
                  variant="outline"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Fetch Content"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Title Input */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter document title"
              required
            />
          </div>

          {/* Content Input */}
          <div>
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter document content"
              className="min-h-[200px]"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isFormValid || createDocumentMutation.isPending}
            >
              {createDocumentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Document"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}