import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Globe, Edit, Trash, Loader2, Calendar, FileText, Copy, ExternalLink, Tag, Clock } from "lucide-react";
import { KnowledgeEntry } from "./EditDocumentModal";
import { useToast } from "@/hooks/use-toast";

interface DocumentDetailsModalProps {
  entry: KnowledgeEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (entry: KnowledgeEntry) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  formatDate: (iso: string) => string;
}

export function DocumentDetailsModal({ 
  entry, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete, 
  isDeleting, 
  formatDate 
}: DocumentDetailsModalProps) {
  const { toast } = useToast();
  
  if (!entry) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied to your clipboard."
    });
  };

  const getSourceIcon = (source: string) => {
    if (source?.startsWith('http')) return <Globe className="w-4 h-4" />;
    if (source?.includes('File Upload')) return <FileText className="w-4 h-4" />;
    return <Edit className="w-4 h-4" />;
  };

  const getSourceLabel = (source: string) => {
    if (source?.startsWith('http')) return 'Website';
    if (source?.includes('File Upload')) return 'File Upload';
    return 'Manual Entry';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden" aria-describedby="document-content">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-gray-900 mb-3">
                {entry.title}
              </DialogTitle>
              <div className="flex items-center gap-4 mb-4">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {entry.category || 'Business Overview'}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  Added {formatDate(entry.createdAt)}
                </div>
                {entry.source && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    {getSourceIcon(entry.source)}
                    {getSourceLabel(entry.source)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(entry.content)}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(entry)}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(entry.id)}
                disabled={isDeleting}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash className="w-4 h-4" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <Separator className="my-4" />
        
        <div className="flex-1 overflow-y-auto">
          {/* Source Section */}
          {entry.source && entry.source.startsWith('http') && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Source Website
              </h4>
              <a
                href={entry.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center gap-2 transition-colors"
              >
                <span className="truncate">{new URL(entry.source).hostname}</span>
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
              </a>
            </div>
          )}

          {/* Content Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Content
              </h3>
              <div className="text-sm text-gray-500 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {entry.content.length.toLocaleString()} characters
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg border p-6 min-h-[300px]">
              <div 
                id="document-content" 
                className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm font-mono"
                style={{ maxHeight: '400px', overflowY: 'auto' }}
              >
                {entry.content}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}