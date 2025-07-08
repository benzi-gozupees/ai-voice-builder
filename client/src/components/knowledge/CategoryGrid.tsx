import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { CATEGORIES } from "./EditDocumentModal";

interface CategoryGridProps {
  categoryCounts: Record<string, number>;
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

export function CategoryGrid({ 
  categoryCounts, 
  selectedCategory, 
  onCategorySelect 
}: CategoryGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {CATEGORIES.map(category => (
        <Card 
          key={category} 
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedCategory === category ? 'ring-2 ring-blue-500 shadow-md' : ''
          }`}
          onClick={() => onCategorySelect(category)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{category}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-bold text-blue-600">
                    {categoryCounts[category]}
                  </span>
                  <span className="text-sm text-gray-500">
                    {categoryCounts[category] === 1 ? 'doc' : 'docs'}
                  </span>
                </div>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}