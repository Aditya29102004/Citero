import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, FileText } from "lucide-react";

const PublishBlog = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        checkAdminStatus(session.user.id);
        fetchBrands(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else if (session) {
        checkAdminStatus(session.user.id);
        fetchBrands(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin, email")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
        return;
      }

      const adminStatus = profile?.is_admin === true || profile?.email === "admin@unifr.com";
      setIsAdmin(adminStatus);

      if (!adminStatus) {
        toast.error("Admin access required");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error:", error);
      setIsAdmin(false);
    }
  };

  const fetchBrands = async (userId: string) => {
    try {
      // First, try to find or create a "Website Blog" brand for SEO posts
      let { data: websiteBrand, error: websiteError } = await supabase
        .from("brands")
        .select("id, name")
        .eq("user_id", userId)
        .eq("name", "Website Blog")
        .maybeSingle();

      if (websiteError && websiteError.code !== 'PGRST116') {
        throw websiteError;
      }

      if (!websiteBrand) {
        // Create "Website Blog" brand for SEO blog posts
        const { data: newBrand, error: createError } = await supabase
          .from("brands")
          .insert({
            user_id: userId,
            name: "Website Blog",
            description: "Blog posts for website SEO",
          })
          .select()
          .single();

        if (createError) throw createError;
        websiteBrand = newBrand;
      }

      // Set the website blog brand as selected
      if (websiteBrand) {
        setBrands([websiteBrand]);
        setSelectedBrandId(websiteBrand.id);
      } else {
        // Fallback: get any brand or create default
        const { data: anyBrands, error: anyError } = await supabase
          .from("brands")
          .select("id, name")
          .eq("user_id", userId)
          .order("name", { ascending: true })
          .limit(1);

        if (!anyError && anyBrands && anyBrands.length > 0) {
          setBrands(anyBrands);
          setSelectedBrandId(anyBrands[0].id);
        } else {
          // Create a default brand
          const { data: defaultBrand, error: createDefaultError } = await supabase
            .from("brands")
            .insert({
              user_id: userId,
              name: "Website Blog",
              description: "Blog posts for website SEO",
            })
            .select()
            .single();

          if (!createDefaultError && defaultBrand) {
            setBrands([defaultBrand]);
            setSelectedBrandId(defaultBrand.id);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching brands:", error);
      toast.error("Failed to load brands");
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }

    if (!selectedBrandId) {
      toast.error("Please select a brand");
      return;
    }

    if (!session?.user?.id) {
      toast.error("Please log in");
      return;
    }

    setSaving(true);
    try {
      const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length;

      const { data, error } = await supabase
        .from("blogs")
        .insert({
          brand_id: selectedBrandId,
          user_id: session.user.id,
          title: title.trim(),
          content: content.trim(),
          status: "published",
          published_at: new Date().toISOString(),
          word_count: wordCount,
          topic: "General",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Blog published successfully!");
      setTitle("");
      setContent("");
      navigate("/blog");
    } catch (error: any) {
      console.error("Error publishing blog:", error);
      toast.error(`Failed to publish blog: ${error.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-col w-full">
        <DashboardHeader />
        <main className="flex-1 p-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="h-6 w-6 text-gray-700" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Publish Blog Post</h1>
                  <p className="text-sm text-gray-600 mt-1">Create SEO blog posts for your website</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="title" className="text-sm font-semibold text-gray-700">
                    Title *
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter blog post title..."
                    className="mt-2"
                    disabled={saving}
                  />
                </div>

                <div>
                  <Label htmlFor="content" className="text-sm font-semibold text-gray-700">
                    Content *
                  </Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste your full blog content here..."
                    className="mt-2 min-h-[400px] font-mono text-sm"
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Supports markdown formatting. Word count: {content.split(/\s+/).filter((word) => word.length > 0).length}
                  </p>
                </div>

                {/* Brand is automatically set to "Website Blog" - hidden from user */}
                {brands.length > 0 && selectedBrandId && (
                  <div className="hidden">
                    <input type="hidden" value={selectedBrandId} />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handlePublish}
                    disabled={saving || !title.trim() || !content.trim()}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Publish Blog
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/blog")}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default PublishBlog;

