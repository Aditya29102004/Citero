import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BlogCard } from "@/components/blogs/BlogCard";
import { Plus, Search, FileText, Calendar, Edit } from "lucide-react";
import { toast } from "sonner";

const Blogs = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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
    if (session?.user?.id) {
      fetchBlogs();
    }
  }, [session]);

  useEffect(() => {
    filterBlogs();
  }, [searchQuery, blogs]);

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("user_id", session?.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBlogs(data || []);
    } catch (error: any) {
      console.error("Error fetching blogs:", error);
      toast.error("Failed to load blogs");
    }
  };

  const filterBlogs = () => {
    let filtered = [...blogs];

    if (searchQuery) {
      filtered = filtered.filter(
        (blog) => {
          const searchLower = searchQuery.toLowerCase();
          const titleMatch = blog.title?.toLowerCase().includes(searchLower);
          const topicMatch = blog.topic?.toLowerCase().includes(searchLower);
          const keywordsMatch = blog.seo_keywords?.some((kw: string) => 
            kw.toLowerCase().includes(searchLower)
          );
          return titleMatch || topicMatch || keywordsMatch;
        }
      );
    }

    setFilteredBlogs(filtered);
  };

  const handleExport = async (blogId: string) => {
    const blog = blogs.find((b) => b.id === blogId);
    if (!blog) return;

    const markdown = `# ${blog.title}\n\n${blog.content}`;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${blog.title?.replace(/[^a-z0-9]/gi, "_") || "blog"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Blog exported as Markdown");
  };


  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-white">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <DashboardHeader />
            <main className="flex-1 overflow-auto bg-white">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
                <div className="text-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading blogs...</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-white">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto bg-white">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">Blogs</h1>
                    <p className="text-sm text-gray-600">SEO-optimized blogs to improve your AI visibility</p>
                  </div>
                  <Button
                    onClick={() => navigate("/blogs/new")}
                    className="bg-gray-900 text-white hover:bg-gray-800 shadow-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Blog
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search blogs by title, topic, or keywords..."
                    className="pl-10 h-10 text-sm border-gray-300 bg-white shadow-sm focus:border-gray-400 focus:ring-gray-400"
                  />
                </div>
              </div>

              {/* Blogs Table */}
              {filteredBlogs.length === 0 ? (
                <Card className="p-12 text-center border border-gray-200 bg-white shadow-sm">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2 text-lg font-medium">
                    {searchQuery ? "No blogs found matching your search." : "You haven't created any blogs yet."}
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    {searchQuery 
                      ? "Try a different search term."
                      : "Create your first blog to improve your AI visibility."}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => navigate("/blogs/new")}
                      className="bg-gray-900 text-white hover:bg-gray-800"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Blog
                    </Button>
                  )}
                </Card>
              ) : (
                <Card className="border border-gray-200 bg-white shadow-sm">
                  {/* Table Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      <div className="col-span-4">Title</div>
                      <div className="col-span-5">Keywords</div>
                      <div className="col-span-2">Created</div>
                      <div className="col-span-1 text-right">Actions</div>
                    </div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-gray-200">
                    {filteredBlogs.map((blog) => {
                      const keywords = blog.seo_keywords || [];
                      const formatDate = (dateString: string) => {
                        const date = new Date(dateString);
                        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      };

                      return (
                        <div
                          key={blog.id}
                          className="px-6 py-4 hover:bg-gray-50 transition-colors group"
                        >
                          <div className="grid grid-cols-12 gap-4 items-center">
                            {/* Title */}
                            <div className="col-span-4">
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
                                  {blog.title || "Untitled Blog"}
                                </h3>
                              </div>
                              {blog.topic && (
                                <p className="text-xs text-gray-500 ml-6">{blog.topic}</p>
                              )}
                            </div>

                            {/* Keywords */}
                            <div className="col-span-5">
                              {keywords.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {keywords.slice(0, 5).map((keyword: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                                    >
                                      {keyword}
                                    </span>
                                  ))}
                                  {keywords.length > 5 && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs text-gray-500">
                                      +{keywords.length - 5} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">No keywords</span>
                              )}
                            </div>

                            {/* Created Date */}
                            <div className="col-span-2">
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span>{formatDate(blog.created_at)}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="col-span-1 flex items-center justify-end gap-2">
                              <Button
                                onClick={() => navigate(`/blogs/${blog.id}`)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600">
                        Showing {filteredBlogs.length} {filteredBlogs.length === 1 ? 'blog' : 'blogs'}
                        {searchQuery && ` matching "${searchQuery}"`}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Blogs;
