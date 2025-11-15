import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

const Compare = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<any[]>([]);
  const [brand1Id, setBrand1Id] = useState<string>("");
  const [brand2Id, setBrand2Id] = useState<string>("");
  const [brand1Data, setBrand1Data] = useState<any>(null);
  const [brand2Data, setBrand2Data] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session) fetchBrands();
  }, [session]);

  useEffect(() => {
    if (brand1Id) fetchBrandData(brand1Id, setBrand1Data);
  }, [brand1Id]);

  useEffect(() => {
    if (brand2Id) fetchBrandData(brand2Id, setBrand2Data);
  }, [brand2Id]);

  const fetchBrands = async () => {
    const { data } = await supabase
      .from("brands")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setBrands(data);
  };

  const fetchBrandData = async (brandId: string, setData: Function) => {
    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .eq("id", brandId)
      .single();

    const { data: score } = await supabase
      .from("brand_visibility_scores")
      .select("*")
      .eq("brand_id", brandId)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .single();

    const { data: scan } = await supabase
      .from("scans")
      .select("*")
      .eq("brand_id", brandId)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    setData({ brand, score, scan });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) return null;

  const BrandComparison = ({ data, label }: { data: any; label: string }) => (
    <Card className="p-6 space-y-4">
      <h3 className="text-xl font-semibold">{label}</h3>
      {data ? (
        <>
          <div>
            <p className="text-sm text-muted-foreground">Brand Name</p>
            <p className="text-2xl font-bold">{data.brand?.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Visibility Score</p>
            <div className="flex items-center gap-2">
              <p className="text-4xl font-bold">
                {data.score?.score || 0}
                <span className="text-xl text-muted-foreground">/100</span>
              </p>
              <TrendingUp className="h-8 w-8 text-primary opacity-20" />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Sentiment Breakdown</p>
            <div className="flex gap-2">
              <Badge variant="default">
                Positive: {data.score?.positive_mentions || 0}
              </Badge>
              <Badge variant="secondary">
                Neutral: {data.score?.neutral_mentions || 0}
              </Badge>
              <Badge variant="destructive">
                Negative: {data.score?.negative_mentions || 0}
              </Badge>
            </div>
          </div>
          {data.scan?.ai_summary && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">AI Summary</p>
              <p className="text-sm leading-relaxed">{data.scan.ai_summary}</p>
            </div>
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-center py-8">
          Select a brand to compare
        </p>
      )}
    </Card>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 space-y-6">
            <div>
              <h2 className="text-3xl font-bold">Compare Brands</h2>
              <p className="text-muted-foreground">
                Compare AI perception and visibility scores side by side
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={brand1Id} onValueChange={setBrand1Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={brand2Id} onValueChange={setBrand2Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second brand" />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BrandComparison data={brand1Data} label="Brand 1" />
              <BrandComparison data={brand2Data} label="Brand 2" />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Compare;
