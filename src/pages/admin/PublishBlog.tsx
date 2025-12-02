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
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .eq("user_id", userId)
        .order("name", { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setBrands(data);
        setSelectedBrandId(data[0].id); // Set first brand as default
      } else {
        // Create a default brand for admin if none exists
        const { data: newBrand, error: createError } = await supabase
          .from("brands")
          .insert({
            user_id: userId,
            name: "Admin Blog",
            description: "Default brand for admin blog posts",
          })
          .select()
          .single();

        if (!createError && newBrand) {
          setBrands([newBrand]);
          setSelectedBrandId(newBrand.id);
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
                <h1 className="text-2xl font-bold text-gray-900">Publish Blog Post</h1>
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

                {brands.length > 0 && (
                  <div>
                    <Label htmlFor="brand" className="text-sm font-semibold text-gray-700">
                      Brand
                    </Label>
                    <select
                      id="brand"
                      value={selectedBrandId}
                      onChange={(e) => setSelectedBrandId(e.target.value)}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      disabled={saving}
                    >
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
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

