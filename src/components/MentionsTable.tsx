import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

type Mention = {
  id: string;
  source: string;
  title: string;
  snippet: string | null;
  date: string;
  sentiment: "positive" | "neutral" | "negative";
  ai_summary: string | null;
};

type MentionsTableProps = {
  brandId: string;
};

export function MentionsTable({ brandId }: MentionsTableProps) {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchMentions = async () => {
    try {
      let query = supabase
        .from("mentions")
        .select("*")
        .eq("brand_id", brandId);

      if (sentimentFilter !== "all") {
        query = query.eq("sentiment", sentimentFilter);
      }

      query = query.order("date", { ascending: sortOrder === "asc" });

      const { data, error } = await query;

      if (error) throw error;
      setMentions((data || []) as Mention[]);
    } catch (error: any) {
      toast.error("Failed to load mentions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentions();
  }, [brandId, sentimentFilter, sortOrder]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchMentions();
    };
    
    window.addEventListener('refresh-mentions', handleRefresh);
    return () => window.removeEventListener('refresh-mentions', handleRefresh);
  }, [brandId, sentimentFilter, sortOrder]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "negative":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading mentions...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Sentiment:</label>
          <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {mentions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-2">No mentions found</p>
          <p className="text-sm text-muted-foreground">
            Click "Refresh Mentions" to fetch new data
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Snippet</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSortOrder}
                    className="h-8 px-2"
                  >
                    Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>AI Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mentions.map((mention) => (
                <TableRow key={mention.id}>
                  <TableCell className="font-medium">{mention.source}</TableCell>
                  <TableCell>{mention.title}</TableCell>
                  <TableCell className="max-w-xs truncate">{mention.snippet}</TableCell>
                  <TableCell>
                    {new Date(mention.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={getSentimentColor(mention.sentiment)}>
                      {mention.sentiment}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-sm truncate">
                    {mention.ai_summary}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
