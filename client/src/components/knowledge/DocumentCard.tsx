import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Globe, Edit, Trash, Loader2 } from "lucide-react";
import { KnowledgeEntry } from "./EditDocumentModal";

interface DocumentCardProps {
  entry: KnowledgeEntry;
  onEdit: (entry: KnowledgeEntry) => void;
  onDelete: (id: string) => void;
  onViewDetails: (entry: KnowledgeEntry) => void;
  isDeleting: boolean;
  formatDate: (iso: string) => string;
}

export function DocumentCard({ 
  entry, 
  onEdit, 
  onDelete, 
  onViewDetails,
  isDeleting, 
  formatDate 
}: DocumentCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on buttons or links
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }
    onViewDetails(entry);
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleCardClick}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg mb-1">{entry.title}</h3>
            <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
              {entry.category || 'Business Overview'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(entry)}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4 text-blue-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(entry.id)}
              disabled={isDeleting}
              className="h-8 w-8 p-0"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
              ) : (
                <Trash className="w-4 h-4 text-red-600" />
              )}
            </Button>
          </div>
        </div>
        
        {entry.source && (
          <>
            {entry.source.startsWith('http') ? (
              <a
                href={entry.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-blue-600 mb-3 flex items-center gap-1 transition-colors"
              >
                <Globe className="w-3 h-3" />
                Source: {new URL(entry.source).hostname}
              </a>
            ) : (
              <div className="text-sm text-gray-500 mb-3 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Source: {entry.source}
              </div>
            )}
          </>
        )}
        
        <p className="text-sm text-gray-600 line-clamp-3">
          {entry.content.substring(0, 200)}...
        </p>
      </CardContent>
    </Card>
  );
}