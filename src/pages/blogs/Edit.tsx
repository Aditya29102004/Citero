import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { BlogEditor } from "@/components/blogs/BlogEditor";
import { BlogToolbar } from "@/components/blogs/BlogToolbar";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const EditBlog = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blog, setBlog] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (id && session?.user?.id) {
      fetchBlog();
    }
  }, [id, session]);

  useEffect(() => {
    if (blog) {
      setTitle(blog.title || "");
      setContent(blog.content || "");
      setSeoKeywords(blog.seo_keywords || []);
    }
  }, [blog]);

  const fetchBlog = async () => {
    try {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("id", id)
        .eq("user_id", session?.user.id)
        .single();

      if (error) throw error;
      setBlog(data);
    } catch (error: any) {
      console.error("Error fetching blog:", error);
      toast.error("Failed to load blog");
      navigate("/blogs");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length;

      const { error } = await supabase
        .from("blogs")
        .update({
          title,
          content,
          seo_keywords: seoKeywords,
          word_count: wordCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Blog saved");
    } catch (error: any) {
      console.error("Error saving blog:", error);
      toast.error("Failed to save blog");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length;

      const { error } = await supabase
        .from("blogs")
        .update({
          title,
          content,
          seo_keywords: seoKeywords,
          word_count: wordCount,
          status: "published",
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Blog published!");
      navigate("/blogs");
    } catch (error: any) {
      console.error("Error publishing blog:", error);
      toast.error("Failed to publish blog");
    } finally {
      setSaving(false);
    }
  };

  const handleExportMarkdown = () => {
    const markdown = `# ${title}\n\n${content}`;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title?.replace(/[^a-z0-9]/gi, "_") || "blog"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Blog exported as Markdown");
  };

  const handleExportPDF = () => {
    toast.info("PDF export coming soon");
    // TODO: Implement PDF export using react-pdf or server-side generation
  };

  const handleAIRewrite = async (prompt: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("rewrite-blog-section", {
        body: { content, prompt },
      });

      if (error) throw error;
      if (data?.rewritten) {
        setContent(data.rewritten);
        toast.success("Section rewritten");
      }
    } catch (error: any) {
      console.error("Error rewriting:", error);
      toast.error("Failed to rewrite section");
    }
  };


  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-slate-50/50">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <DashboardHeader />
            <main className="flex-1 overflow-auto bg-slate-50/50">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
                <div className="text-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
                  <p className="text-slate-600 font-medium">Loading blog...</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!blog) {
    return null;
  }

  const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="flex-1 flex min-h-0">
              {/* Editor Section */}
              <div className="flex-1 flex flex-col min-w-0">
                <BlogToolbar
                  wordCount={wordCount}
                  onSave={handleSave}
                  onPublish={handlePublish}
                  onExportMarkdown={handleExportMarkdown}
                  onExportPDF={handleExportPDF}
                  status={blog.status}
                  saving={saving}
                  onBack={() => navigate("/blogs")}
                />
                <BlogEditor
                  title={title}
                  content={content}
                  onTitleChange={setTitle}
                  onContentChange={setContent}
                  onAIRewrite={handleAIRewrite}
                  seoKeywords={seoKeywords}
                  onAddKeyword={(keyword) => setSeoKeywords([...seoKeywords, keyword])}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default EditBlog;

