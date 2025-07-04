import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Loader2, BookOpen, Link, Edit, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {Accordion,AccordionItem,AccordionTrigger,AccordionContent,} from "@/components/ui/accordion"
  
type KnowledgeEntry = {
  id: string;
  title: string;
  content: string;
  source: string;
  favicon: string;
  createdAt: string;
};

export function Knowledge() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
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

  const handleEdit = (entry: KnowledgeEntry) => {
    toast({
        title: "Coming Soon",
        description: "Feature to edit knowledge entries is under development.",
      });
      
  };
  
  const handleDelete = async (id: string) => {
    const confirmDelete = confirm("Are you sure you want to delete this entry?");
    if (!confirmDelete) return;
    try {
      const res = await fetch(`${baseUrl}/knowledge/${id}/${user.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          token: import.meta.env.VITE_API_KEY || "",
        },
        credentials: "include",
      });
  
      if (!res.ok) throw new Error("Failed to delete entry");
  
      toast({
        title: "Entry deleted",
        description: "The knowledge entry was removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/knowledge"] });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Deletion failed",
            description: "Could not delete the entry. Please try again.",
          });
    }
  };
  
  const baseUrl = import.meta.env.VITE_KNOWLEDGE_BASE_URL;
  const { data: knowledgeEntries, isLoading } = useQuery({
    queryKey: ["/knowledge"],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/knowledge/${user.id}`, {
        headers: { "Content-Type": "application/json", "token": import.meta.env.VITE_API_KEY || "" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch knowledge base");
      return res.json() as Promise<KnowledgeEntry[]>;
    },
  });
  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/knowledge/scrape/${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "token": import.meta.env.VITE_API_KEY || "" },
        credentials: "include",
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error("Failed to scrape URL");
      return res.json();
    },
    onSuccess: (data) => {
        toast({
            title: "Scraping successful",
            description: `Content from ${new URL(data.source).hostname} added.`,
          });
        setUrl("");
        queryClient.invalidateQueries({ queryKey: ["/knowledge"] });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Knowledge Base</h2>
        <div className="flex items-center gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to scrape"
            className="w-72 rounded-xl"
          />
          <Button
            disabled={scrapeMutation.isPending || !url}
            onClick={() => scrapeMutation.mutate()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-4"
          >
            {scrapeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 mr-2" />
                Scrape
              </>
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                  <div className="space-y-1">
                    <div className="w-48 h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="w-32 h-3 bg-gray-150 rounded animate-pulse" />
                  </div>
                </div>
                <div className="w-full h-3 bg-gray-150 rounded animate-pulse" />
                <div className="w-3/4 h-3 bg-gray-150 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !knowledgeEntries || knowledgeEntries.length === 0 ? (
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Knowledge Entries</h3>
            <p className="text-gray-600 mb-6">
              Enter a URL above to scrape and store content in your knowledge base.
            </p>
          </CardContent>
        </Card>
      ) : (
<div className="grid gap-4">
  <Accordion type="single" collapsible>
    {knowledgeEntries.map((entry) => (
      <AccordionItem value={entry.id} key={entry.id}>
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 border-0 rounded-2xl overflow-hidden group mb-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {entry.favicon ? (
                  <img
                    src={entry.favicon}
                    alt="favicon"
                    className="w-8 h-8 rounded"
                  />
                ) : (
                  <Globe className="w-6 h-6 text-gray-400" />
                )}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {entry.title}
                  </h3>
                  <a
                    href={entry.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center"
                  >
                    <Link className="w-3 h-3" />{" "}
                    {new URL(entry.source).hostname}
                  </a>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {formatDate(entry.createdAt)}
              </p>
            </div>

            {/* Accordion trigger here */}
            <AccordionTrigger className="text-sm text-gray-700">
              Show content
            </AccordionTrigger>

            {/* Accordion content */}
            <AccordionContent>
              <p className="text-sm text-gray-700 ">
                {entry.content}
              </p>
            </AccordionContent>

            <div className="flex justify-end">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleEdit(entry)}
                className="hover:bg-blue-100"
              >
                <Edit className="w-4 h-4 text-blue-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDelete(entry.id)}
                className="hover:bg-red-100"
              >
                <Trash className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </AccordionItem>
    ))}
  </Accordion>
</div>

      )}
    </div>
  );
}
