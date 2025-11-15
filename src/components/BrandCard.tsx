import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2, Calendar, MessageSquare, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Brand = {
  id: string;
  name: string;
  aliases: string | null;
  website_url: string | null;
  description: string | null;
  date_added: string;
};

type BrandCardProps = {
  brand: Brand;
  onDelete: (id: string) => void;
};

export function BrandCard({ brand, onDelete }: BrandCardProps) {
  const navigate = useNavigate();
  const [visibilityScore, setVisibilityScore] = useState<number | null>(null);
  const [latestScan, setLatestScan] = useState<any>(null);
  const aliases = brand.aliases?.split(",").map((a) => a.trim()).filter(Boolean) || [];
  const dateAdded = new Date(brand.date_added).toLocaleDateString();

  useEffect(() => {
    fetchVisibilityScore();
  }, [brand.id]);

  const fetchVisibilityScore = async () => {
    const { data: score } = await supabase
      .from("brand_visibility_scores")
      .select("score")
      .eq("brand_id", brand.id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (score) setVisibilityScore(score.score);

    const { data: scan } = await supabase
      .from("scans")
      .select("status")
      .eq("brand_id", brand.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (scan) setLatestScan(scan);
  };

  return (
    <Card className="border border-gray-200/80 bg-white shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden group hover:-translate-y-1">
      <CardHeader className="pb-5 px-6 pt-7">
        <CardTitle className="flex items-start justify-between gap-3">
          <span className="text-xl font-bold text-gray-900 leading-tight pr-2">{brand.name}</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Brand</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{brand.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(brand.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-0 px-6 pb-7">
        <div className="flex items-center justify-between text-sm pt-1">
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
            <span className="font-normal">Added {dateAdded}</span>
          </div>
          {visibilityScore !== null && (
            <div className="flex items-center gap-1.5 text-teal-600 font-semibold bg-teal-50 px-2.5 py-1 rounded-md">
              <TrendingUp className="h-4 w-4" />
              <span>{visibilityScore}/100</span>
            </div>
          )}
        </div>

        <div className="flex gap-2.5 pt-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium h-10 text-xs shadow-sm hover:shadow-md transition-all duration-200"
            onClick={() => navigate(`/brand/${brand.id}`)}
          >
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            Dashboard
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 rounded-lg font-medium h-10 text-xs transition-all duration-200"
            onClick={() => navigate(`/mentions/${brand.id}`)}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Mentions
          </Button>
          {brand.website_url ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 rounded-lg font-medium h-10 text-xs transition-all duration-200"
              onClick={() => window.open(brand.website_url, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Website
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-gray-200 text-gray-400 rounded-lg font-medium h-10 text-xs cursor-not-allowed opacity-60"
              disabled
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Website
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
