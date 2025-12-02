import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";

interface BlogGeneratorFormProps {
  brands: Array<{ id: string; name: string }>;
  onGenerate: (data: {
    brandId: string;
    topic: string;
    blogGoal: string;
    competitorFocus?: string;
    tone: string;
  }) => Promise<void>;
  loading?: boolean;
  blogUsage?: number;
  blogLimit?: number;
}

export function BlogGeneratorForm({ brands, onGenerate, loading, blogUsage = 0, blogLimit = 5 }: BlogGeneratorFormProps) {
  const [formData, setFormData] = useState({
    brandId: "",
    topic: "",
    blogGoal: "increase_visibility",
    competitorFocus: "",
    tone: "professional",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brandId || !formData.topic) {
      return;
    }
    await onGenerate({
      brandId: formData.brandId,
      topic: formData.topic,
      blogGoal: formData.blogGoal,
      competitorFocus: formData.competitorFocus || undefined,
      tone: formData.tone,
    });
  };

  return (
    <Card className="p-6 border border-gray-200 bg-white shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Generate GEO Keywords</h2>
        <p className="text-sm text-gray-600 mt-1">Create keywords optimized for AI search visibility</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="brand">Brand *</Label>
          <Select value={formData.brandId} onValueChange={(value) => setFormData({ ...formData, brandId: value })}>
            <SelectTrigger id="brand" className="mt-1">
              <SelectValue placeholder="Select a brand" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="topic">Topic *</Label>
          <Input
            id="topic"
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            placeholder="e.g., AI-powered customer support, cloud infrastructure, etc."
            className="mt-1"
            required
          />
          <p className="text-xs text-gray-500 mt-1">What topic should this blog focus on?</p>
        </div>

        <div>
          <Label htmlFor="goal">Blog Goal *</Label>
          <Select value={formData.blogGoal} onValueChange={(value) => setFormData({ ...formData, blogGoal: value })}>
            <SelectTrigger id="goal" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="increase_visibility">Increase Visibility</SelectItem>
              <SelectItem value="fix_sentiment">Fix Sentiment Issue</SelectItem>
              <SelectItem value="compete_rival">Compete with Rival</SelectItem>
              <SelectItem value="rank_topic">Rank for Specific Topic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="competitor">Competitor Focus (Optional)</Label>
          <Input
            id="competitor"
            value={formData.competitorFocus}
            onChange={(e) => setFormData({ ...formData, competitorFocus: e.target.value })}
            placeholder="e.g., Competitor name or URL"
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">If competing with a specific rival, mention them here</p>
        </div>

        <div>
          <Label htmlFor="tone">Tone *</Label>
          <Select value={formData.tone} onValueChange={(value) => setFormData({ ...formData, tone: value })}>
            <SelectTrigger id="tone" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
              <SelectItem value="founder">Founder-Style</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {blogLimit > 0 && (
          <div className="text-sm text-gray-600 mb-2">
            Blog generations this month: {blogUsage} / {blogLimit}
            {blogUsage >= blogLimit && (
              <span className="text-red-600 ml-2 font-medium">(Limit reached)</span>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !formData.brandId || !formData.topic || (blogLimit > 0 && blogUsage >= blogLimit)}
          className="w-full bg-gray-900 text-white hover:bg-gray-800 shadow-sm"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Keywords...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Keywords
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}

