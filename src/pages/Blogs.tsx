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
import { Badge } from "@/components/ui/badge";
import { BlogCard } from "@/components/blogs/BlogCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Plus, 
  Search, 
  FileText, 
  Calendar, 
  Edit, 
  LayoutGrid, 
  List, 
  Trash2, 
  Download, 
  BookOpen, 
  Tag
} from "lucide-react";
import { toast } from "sonner";

const Blogs = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filters & View State
  const [selectedBrandId, setSelectedBrandId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

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
      fetchBlogsAndBrands();
    }
  }, [session]);

  useEffect(() => {
    filterAndSortBlogs();
  }, [searchQuery, blogs, selectedBrandId, selectedStatus, sortBy]);

  const fetchBlogsAndBrands = async () => {
    setLoading(true);
    try {
      // Fetch user's blogs
      const { data: blogsData, error: blogsError } = await supabase
        .from("blogs")
        .select("*")
        .eq("user_id", session?.user.id)
        .order("created_at", { ascending: false });

      if (blogsError) throw blogsError;

      // Fetch user's brands for mapping & filtering
      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("id, name")
        .eq("user_id", session?.user.id)
        .order("created_at", { ascending: false });

      if (brandsError) throw brandsError;

      setBlogs(blogsData || []);
      setBrands(brandsData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortBlogs = () => {
    let result = [...blogs];

    // Apply Search Filter
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      result = result.filter((blog) => {
        const titleMatch = blog.title?.toLowerCase().includes(queryLower);
        const topicMatch = blog.topic?.toLowerCase().includes(queryLower);
        const keywordsMatch = blog.seo_keywords?.some((kw: string) => 
          kw.toLowerCase().includes(queryLower)
        );
        return titleMatch || topicMatch || keywordsMatch;
      });
    }

    // Apply Brand Filter
    if (selectedBrandId !== "all") {
      result = result.filter((blog) => blog.brand_id === selectedBrandId);
    }

    // Apply Status Filter
    if (selectedStatus !== "all") {
      result = result.filter((blog) => blog.status === selectedStatus);
    }

    // Apply Sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === "words_desc") {
        return (b.word_count || 0) - (a.word_count || 0);
      } else if (sortBy === "words_asc") {
        return (a.word_count || 0) - (b.word_count || 0);
      } else if (sortBy === "title_asc") {
        return (a.title || "").localeCompare(b.title || "");
      } else if (sortBy === "title_desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      return 0;
    });

    setFilteredBlogs(result);
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

  const handleDelete = async (blogId: string) => {
    if (!window.confirm("Are you sure you want to delete this blog? This action cannot be undone.")) return;
    
    try {
      const { error } = await supabase
        .from("blogs")
        .delete()
        .eq("id", blogId);

      if (error) throw error;
      
      toast.success("Blog deleted successfully");
      // Update state locally
      setBlogs(blogs.filter((blog) => blog.id !== blogId));
    } catch (error: any) {
      console.error("Error deleting blog:", error);
      toast.error("Failed to delete blog");
    }
  };

  const getBrandName = (brandId: string) => {
    const brand = brands.find((b) => b.id === brandId);
    return brand ? brand.name : undefined;
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
                  <p className="text-slate-600 font-medium">Loading your blogs...</p>
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
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto bg-slate-50/50">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
              
              {/* Header section */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Blogs</h1>
                  <p className="text-sm text-slate-500 font-medium">Manage and generate SEO-optimized blogs to improve your brand's AI visibility</p>
                </div>
                <Button
                  onClick={() => navigate("/blogs/new")}
                  className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm px-4 py-2 rounded-xl transition-all duration-200 flex items-center self-start md:self-auto"
                >
                  <Plus className="h-4.5 w-4.5 mr-2" />
                  New Blog
                </Button>
              </div>
              {/* Filters and Control Bar */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-6 shadow-sm flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                
                {/* Search box */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, topic, keywords..."
                    className="pl-10 h-10 text-sm border-slate-200 focus:border-slate-300 focus:ring-slate-300 rounded-xl bg-slate-50/30"
                  />
                </div>

                {/* Filter and View controls */}
                <div className="flex flex-wrap items-center gap-3.5">
                  
                  {/* Brand Filter */}
                  {brands.length > 0 && (
                    <div className="w-[180px]">
                      <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                        <SelectTrigger className="h-10 text-xs border-slate-200 bg-white rounded-xl shadow-sm">
                          <SelectValue placeholder="Filter by Brand" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all">All Brands</SelectItem>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Status Filter */}
                  <div className="w-[140px]">
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="h-10 text-xs border-slate-200 bg-white rounded-xl shadow-sm">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort Filter */}
                  <div className="w-[160px]">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-10 text-xs border-slate-200 bg-white rounded-xl shadow-sm">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="words_desc">Words (High to Low)</SelectItem>
                        <SelectItem value="words_asc">Words (Low to High)</SelectItem>
                        <SelectItem value="title_asc">Title (A-Z)</SelectItem>
                        <SelectItem value="title_desc">Title (Z-A)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* View Toggles */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded-lg transition-all ${
                        viewMode === "grid"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("table")}
                      className={`p-1.5 rounded-lg transition-all ${
                        viewMode === "table"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>

                </div>
              </div>

              {/* Blogs Content Rendering */}
              {filteredBlogs.length === 0 ? (
                <Card className="p-16 text-center border border-slate-200/80 bg-white shadow-sm rounded-2xl">
                  <FileText className="h-14 w-14 text-slate-300 mx-auto mb-5" />
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {searchQuery || selectedBrandId !== "all" || selectedStatus !== "all"
                      ? "No blogs match your filter criteria."
                      : "You haven't created any blogs yet."}
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
                    {searchQuery || selectedBrandId !== "all" || selectedStatus !== "all"
                      ? "Try tweaking your search term, changing filters, or clearing status/brand selections."
                      : "Generate search-optimized, high-authority blog articles written specifically for your brand tracking."}
                  </p>
                  
                  {searchQuery || selectedBrandId !== "all" || selectedStatus !== "all" ? (
                    <Button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedBrandId("all");
                        setSelectedStatus("all");
                        setSortBy("newest");
                      }}
                      variant="outline"
                      className="border-slate-200 hover:bg-slate-50 rounded-xl"
                    >
                      Clear Filters
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate("/blogs/new")}
                      className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm px-5 py-2.5 rounded-xl"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Blog
                    </Button>
                  )}
                </Card>
              ) : viewMode === "grid" ? (
                /* Card Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBlogs.map((blog) => (
                    <BlogCard
                      key={blog.id}
                      blog={blog}
                      brandName={getBrandName(blog.brand_id)}
                      onExport={handleExport}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              ) : (
                /* Table View */
                <Card className="border border-slate-200/80 bg-white shadow-sm rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <th className="px-6 py-4">Title & Topic</th>
                          <th className="px-6 py-4">Brand</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Keywords</th>
                          <th className="px-6 py-4">Word Count</th>
                          <th className="px-6 py-4">Created At</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredBlogs.map((blog) => {
                          const keywords = blog.seo_keywords || [];
                          const isPublished = blog.status === "published";
                          const brandName = getBrandName(blog.brand_id);

                          return (
                            <tr key={blog.id} className="hover:bg-slate-50/50 transition-colors group">
                              {/* Title and Topic */}
                              <td className="px-6 py-4.5 max-w-[280px]">
                                <div className="flex items-start gap-2.5">
                                  <FileText className="h-4.5 w-4.5 text-slate-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <span
                                      onClick={() => navigate(`/blogs/${blog.id}`)}
                                      className="text-sm font-semibold text-slate-900 hover:text-slate-700 hover:underline transition-colors cursor-pointer line-clamp-1"
                                    >
                                      {blog.title || "Untitled Blog"}
                                    </span>
                                    {blog.topic && (
                                      <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                        {blog.topic}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Brand */}
                              <td className="px-6 py-4.5">
                                {brandName ? (
                                  <Badge 
                                    variant="outline" 
                                    className="bg-slate-100 text-slate-800 border-slate-200 font-medium px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider"
                                  >
                                    {brandName}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="px-6 py-4.5">
                                <Badge
                                  className={`font-medium px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1.5 w-fit border ${
                                    isPublished
                                      ? "bg-slate-900 text-white border-slate-900"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  <span className={`h-1.2 w-1.2 rounded-full ${isPublished ? "bg-white" : "bg-slate-400"}`} />
                                  {isPublished ? "Published" : "Draft"}
                                </Badge>
                              </td>

                              {/* Keywords */}
                              <td className="px-6 py-4.5">
                                {keywords.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-[220px]">
                                    {keywords.slice(0, 2).map((keyword: string, idx: number) => (
                                      <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="bg-slate-50 text-slate-600 border border-slate-100/80 px-1.5 py-0.5 rounded text-[10px] font-normal"
                                      >
                                        {keyword}
                                      </Badge>
                                    ))}
                                    {keywords.length > 2 && (
                                      <span className="text-[10px] text-slate-400 font-medium align-middle ml-0.5">
                                        +{keywords.length - 2}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">No keywords</span>
                                )}
                              </td>

                              {/* Word Count */}
                              <td className="px-6 py-4.5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                  <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{blog.word_count?.toLocaleString() || 0}</span>
                                </div>
                              </td>

                              {/* Created At */}
                              <td className="px-6 py-4.5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  <span>
                                    {new Date(blog.created_at).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-4.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          onClick={() => navigate(`/blogs/${blog.id}`)}
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Edit Blog</p>
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          onClick={() => handleExport(blog.id)}
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Export Markdown</p>
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          onClick={() => handleDelete(blog.id)}
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Delete Blog</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer */}
                  <div className="px-6 py-4 border-t border-slate-150 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <div>
                      Showing {filteredBlogs.length} {filteredBlogs.length === 1 ? "article" : "articles"}
                      {searchQuery && ` matching "${searchQuery}"`}
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

