import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, Globe, Plus } from "lucide-react";
import { CATEGORIES } from "./EditDocumentModal";

interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  onAddWebsite: () => void;
  onAddDocument: () => void;
}

export function SearchAndFilter({ 
  searchTerm, 
  onSearchChange, 
  selectedCategory, 
  onCategoryChange,
  onAddWebsite,
  onAddDocument
}: SearchAndFilterProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search documents..."
          className="pl-10"
        />
      </div>
      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-64">
          <Filter className="w-4 h-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All Categories">All Categories</SelectItem>
          {CATEGORIES.map(category => (
            <SelectItem key={category} value={category}>{category}</SelectItem>
          ))}
        </SelectContent>
      </Select>
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
  );
}