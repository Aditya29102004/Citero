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
    <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 rounded-xl overflow-hidden group">
      <CardHeader className="pb-4 px-6 pt-6 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-bold text-gray-900 mb-2 leading-tight">
              {brand.name}
            </CardTitle>
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
              <span>Added {dateAdded}</span>
            </div>
          </div>
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
        </div>
      </CardHeader>
      <CardContent className="px-6 py-5 space-y-4">
        {/* Visibility Score */}
        {visibilityScore !== null && (
          <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg border border-teal-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium text-gray-700">Visibility Score</span>
            </div>
            <span className="text-lg font-bold text-teal-600">{visibilityScore}/100</span>
          </div>
        )}

        {/* Website URL Display */}
        {brand.website_url && (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Website</span>
            </div>
            <a 
              href={brand.website_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-teal-600 hover:text-teal-700 font-medium truncate block hover:underline"
            >
              {brand.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium h-10 text-sm shadow-sm hover:shadow-md transition-all duration-200"
            onClick={() => navigate(`/brand/${brand.id}`)}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            View Dashboard
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 rounded-lg font-medium h-10 text-sm transition-all duration-200"
              onClick={() => navigate(`/mentions/${brand.id}`)}
            >
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Mentions
            </Button>
            {brand.website_url ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 rounded-lg font-medium h-10 text-sm transition-all duration-200"
                onClick={() => window.open(brand.website_url!, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Visit Site
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-gray-200 text-gray-400 rounded-lg font-medium h-10 text-sm cursor-not-allowed opacity-60"
                disabled
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                No URL
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
