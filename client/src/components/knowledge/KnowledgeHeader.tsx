import { Button } from "@/components/ui/button";
import { Globe, Plus } from "lucide-react";

interface KnowledgeHeaderProps {
  onAddWebsite: () => void;
  onAddDocument: () => void;
}

export function KnowledgeHeader({ onAddWebsite, onAddDocument }: KnowledgeHeaderProps) {
  return (
    <div className="flex items-center justify-end">
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={onAddWebsite}
        >
          <Globe className="w-4 h-4" />
          Add Website
        </Button>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          onClick={onAddDocument}
        >
          <Plus className="w-4 h-4" />
          Add Document
        </Button>
      </div>
    </div>
  );
}