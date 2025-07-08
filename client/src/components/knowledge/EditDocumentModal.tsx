import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export type KnowledgeEntry = {
  id: string;
  title: string;
  content: string;
  source: string;
  favicon: string;
  category?: string;
  createdAt: string;
};

export const CATEGORIES = [
  'Business Overview',
  'Products & Services', 
  'Pricing Information',
  'Customer Support Protocols',
  'Locations & Contact Information',
  'Policies',
  'Internal SOPs',
  'Agent Scripts'
];

interface EditDocumentModalProps {
  entry: KnowledgeEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (updates: Partial<KnowledgeEntry>) => void;
  isLoading: boolean;
}

export function EditDocumentModal({ 
  entry, 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading 
}: EditDocumentModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");

  // Update form when entry changes
  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
      setCategory(entry.category || 'Business Overview');
    }
  }, [entry]);

  const handleSubmit = () => {
    onSubmit({
      title,
      content,
      category
    });
  };

  if (!entry) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
          <p className="text-sm text-gray-600">Update your document content</p>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="category" className="text-sm font-medium">
              Category *
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title" className="text-sm font-medium">
              Title *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="content" className="text-sm font-medium">
              Content *
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="mt-1 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isLoading || !title.trim() || !content.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Document'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}