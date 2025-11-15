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
import { format } from "date-fns";

interface ScanResponsesTableProps {
  brandId: string;
}

export const ScanResponsesTable = ({ brandId }: ScanResponsesTableProps) => {
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    fetchResponses();
  }, [brandId]);

  const fetchResponses = async () => {
    const { data } = await supabase
      .from("scan_responses")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) setResponses(data);
  };

  const getSentimentColor = (sentiment: string | null) => {
    if (!sentiment) return "secondary";
    switch (sentiment) {
      case "positive":
        return "default";
      case "negative":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Question</TableHead>
            <TableHead>AI Response</TableHead>
            <TableHead>Mentioned</TableHead>
            <TableHead>Sentiment</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {responses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No scan responses yet. Run a GEO scan to see results.
              </TableCell>
            </TableRow>
          ) : (
            responses.map((response) => (
              <TableRow key={response.id}>
                <TableCell className="font-medium max-w-xs truncate">
                  {response.question_text}
                </TableCell>
                <TableCell className="max-w-md">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {response.ai_response}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={response.brand_mentioned ? "default" : "secondary"}>
                    {response.brand_mentioned ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {response.sentiment ? (
                    <Badge variant={getSentimentColor(response.sentiment)}>
                      {response.sentiment}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(response.created_at), "MMM dd, HH:mm")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
