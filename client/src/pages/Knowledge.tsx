import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Loader2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { KnowledgeHeader } from "@/components/knowledge/KnowledgeHeader";
import { SearchAndFilter } from "@/components/knowledge/SearchAndFilter";
import { CategoryGrid } from "@/components/knowledge/CategoryGrid";
import { DocumentCard } from "@/components/knowledge/DocumentCard";
import { EditDocumentModal, KnowledgeEntry, CATEGORIES } from "@/components/knowledge/EditDocumentModal";
import { AddWebsiteModal } from "@/components/knowledge/AddWebsiteModal";
import { DocumentDetailsModal } from "@/components/knowledge/DocumentDetailsModal";
import { CreateDocumentModal } from "@/components/knowledge/CreateDocumentModal";

export function Knowledge() {
  const [url, setUrl] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailsEntry, setDetailsEntry] = useState<KnowledgeEntry | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch(`/api/auth/user`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Not authenticated");
      return response.json();
    }
  });

  const { data: knowledgeEntries = [], refetch: refetchEntries, isLoading } = useQuery<KnowledgeEntry[]>({
    queryKey: ['/api/knowledge/entries'],
    enabled: !!user?.id,
  });


  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/knowledge/entries/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete entry' }));
        throw new Error(errorData.message || 'Failed to delete entry');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Entry deleted",
        description: "Knowledge base entry has been removed successfully.",
      });
      refetchEntries(); // Refresh the list
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entry. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<KnowledgeEntry> }) => {
      const response = await fetch(`/api/knowledge/entries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update entry' }));
        throw new Error(errorData.message || 'Failed to update entry');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Entry updated",
        description: "Knowledge base entry has been updated successfully.",
      });
      refetchEntries(); // Refresh the list
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update entry. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleDelete = async (id: string) => {
    deleteMutation.mutate(id);
  };

  const openEditModal = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingEntry(null);
    setIsEditModalOpen(false);
  };

  const handleEditSubmit = (updatedEntry: Partial<KnowledgeEntry>) => {
    if (editingEntry) {
      updateMutation.mutate({ 
        id: editingEntry.id, 
        updates: updatedEntry 
      });
      closeEditModal();
    }
  };

  const openWebsiteModal = () => {
    setIsWebsiteModalOpen(true);
  };

  const closeWebsiteModal = () => {
    setIsWebsiteModalOpen(false);
  };

  const handleWebsiteScrape = (websiteUrl: string) => {
    setUrl(websiteUrl);
    // Wait for state to update, then call mutation
    setTimeout(() => {
      scrapeMutation.mutate();
    }, 0);
    closeWebsiteModal();
  };

  const handleAddDocument = () => {
    setIsCreateModalOpen(true);
  };

  const openDetailsModal = (entry: KnowledgeEntry) => {
    setDetailsEntry(entry);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setDetailsEntry(null);
    setIsDetailsModalOpen(false);
  };

  const handleDetailsEdit = (entry: KnowledgeEntry) => {
    closeDetailsModal();
    openEditModal(entry);
  };

  const handleDetailsDelete = (id: string) => {
    handleDelete(id);
    closeDetailsModal();
  };
  const scrapeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!url.trim()) throw new Error("URL is required");
      
      try {
        const res = await fetch('/api/knowledge/scrape', {
          method: "POST",
          headers: { 
            "Content-Type": "application/json"
          },
          credentials: 'include',
          body: JSON.stringify({ url }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: 'Failed to scrape URL' }));
          throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('Cannot connect to scraping service. Please check your internet connection.');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
        toast({
            title: "Scraping successful",
            description: data.message || "Content successfully scraped and processed",
          });
        setUrl("");
        refetchEntries(); // Refresh the knowledge base entries
      },
      onError: () => {
        toast({
            title: "Error scraping URL",
            description: "Could not fetch content. Please check the URL and try again.",
            variant: "destructive",
          });
          
      },
  });

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Group entries by category
  const groupedEntries = knowledgeEntries.reduce((acc: Record<string, KnowledgeEntry[]>, entry) => {
    const category = entry.category || 'Business Overview';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(entry);
    return acc;
  }, {});

  // Filter entries based on search and category
  const filteredEntries = knowledgeEntries.filter(entry => {
    const matchesSearch = searchTerm === "" || 
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All Categories" || 
      (entry.category || 'Business Overview') === selectedCategory;
      
    return matchesSearch && matchesCategory;
  });

  const categoryCounts = CATEGORIES.reduce((acc, category) => {
    acc[category] = groupedEntries[category]?.length || 0;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Search, Filter, and Action Buttons */}
      <SearchAndFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onAddWebsite={openWebsiteModal}
        onAddDocument={handleAddDocument}
      />

      {/* Category Grid */}
      <CategoryGrid
        categoryCounts={categoryCounts}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />



      {/* Documents List Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-4">
          All Documents
          <span className="text-sm font-normal text-gray-500 ml-2">
            {filteredEntries.length} documents
          </span>
        </h3>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {selectedCategory === "All Categories" ? "No Documents Found" : `No ${selectedCategory} Documents`}
            </h3>
            <p className="text-gray-600">
              {searchTerm ? "Try adjusting your search terms." : "Start by adding some documents to your knowledge base."}
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Documents Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntries.map((entry) => (
            <DocumentCard
              key={entry.id}
              entry={entry}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onViewDetails={openDetailsModal}
              isDeleting={deleteMutation.isPending}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <EditDocumentModal
        entry={editingEntry}
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSubmit={handleEditSubmit}
        isLoading={updateMutation.isPending}
      />

      {/* Add Website Modal */}
      <AddWebsiteModal
        isOpen={isWebsiteModalOpen}
        onClose={closeWebsiteModal}
        onScrape={handleWebsiteScrape}
        isLoading={scrapeMutation.isPending}
      />

      {/* Document Details Modal */}
      <DocumentDetailsModal
        entry={detailsEntry}
        isOpen={isDetailsModalOpen}
        onClose={closeDetailsModal}
        onEdit={handleDetailsEdit}
        onDelete={handleDetailsDelete}
        isDeleting={deleteMutation.isPending}
        formatDate={formatDate}
      />

      {/* Create Document Modal */}
      <CreateDocumentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}


