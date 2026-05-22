import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { HomeHeader } from "@/components/HomeHeader";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
// Simple markdown renderer with security sanitization
const renderMarkdown = (text: string): string => {
  if (!text) return "";
  
  // XSS protection: Escape all raw HTML tags first
  let safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  return safeText
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4 mt-6">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-3 mt-6">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mb-2 mt-4">$1</h3>')
    .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n\n/gim, '</p><p class="mb-4 text-gray-700 leading-relaxed">')
    .replace(/\n/gim, '<br>')
    .replace(/^(.+)$/gim, '<p class="mb-4 text-gray-700 leading-relaxed">$1</p>');
};

const BlogPublic = () => {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedBlog, setSelectedBlog] = useState<any | null>(null);

  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
    filterBlogs();
  }, [searchQuery, blogs]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      // Fetch published official platform blogs
      const { data, error } = await supabase
        .from("blogs")
        .select("id, title, topic, created_at, published_at, word_count, seo_keywords, content, status, is_platform_blog")
        .eq("status", "published")
        .eq("is_platform_blog", true)
        .order("published_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setBlogs(data);
      } else {
        setBlogs([]);
      }
    } catch (error) {
      console.log("Blogs not accessible:", error);
      // Set empty array on error to prevent crashes
      setBlogs([]);
    } finally {
      // Always set loading to false, even on error
      setLoading(false);
    }
  };

  const filterBlogs = () => {
    let filtered = [...blogs];

    if (searchQuery) {
      filtered = filtered.filter((blog) => {
        const searchLower = searchQuery.toLowerCase();
        const titleMatch = blog.title?.toLowerCase().includes(searchLower);
        const topicMatch = blog.topic?.toLowerCase().includes(searchLower);
        const contentMatch = blog.content?.toLowerCase().includes(searchLower);
        const keywordsMatch = blog.seo_keywords?.some((kw: string) =>
          kw.toLowerCase().includes(searchLower)
        );
        return titleMatch || topicMatch || contentMatch || keywordsMatch;
      });
    }

    setFilteredBlogs(filtered);
  };

  const extractPreview = (content: string, maxLength: number = 200) => {
    if (!content) return "";
    const text = content.replace(/[#*`]/g, "").replace(/\n/g, " ").trim();
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <HomeHeader />
        <main className="pt-16">
          <div className="max-w-6xl mx-auto px-4 py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading blog posts...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If a blog is selected, show the full blog view
  if (selectedBlog) {
    return (
      <div className="min-h-screen bg-white">
        <HomeHeader />
        <main className="pt-16">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <Button
              variant="ghost"
              onClick={() => setSelectedBlog(null)}
              className="mb-6 text-gray-600 hover:text-gray-900"
            >
              ← Back to Blog Posts
            </Button>

            <article className="bg-white">
              {selectedBlog.topic && (
                <div className="mb-4">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    {selectedBlog.topic}
                  </span>
                </div>
              )}
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {selectedBlog.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-8 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(selectedBlog.published_at || selectedBlog.created_at).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </span>
                </div>
                {selectedBlog.word_count > 0 && (
                  <span>{selectedBlog.word_count.toLocaleString()} words</span>
                )}
              </div>

              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedBlog.content || "") }}
              />

              {selectedBlog.seo_keywords && selectedBlog.seo_keywords.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedBlog.seo_keywords.map((keyword: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <HomeHeader />
      <main className="pt-16">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Blog
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Insights and strategies about AI visibility, brand tracking, and digital marketing
            </p>
          </div>

          {/* Search */}
          <div className="mb-8">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search blog posts..."
                className="pl-10 h-11 text-sm border-gray-300 bg-white shadow-sm focus:border-gray-400 focus:ring-gray-400"
              />
            </div>
          </div>

          {/* Blog Posts Grid */}
          {filteredBlogs.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2 text-lg font-medium">
                {searchQuery ? "No blog posts found matching your search." : "No blog posts available yet."}
              </p>
              <p className="text-sm text-gray-500">
                {searchQuery ? "Try a different search term." : "Check back soon for new content."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {filteredBlogs.map((blog) => {
                  const contentPreview = extractPreview(blog.content || "", 150);

                  return (
                    <article
                      key={blog.id}
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer group"
                      onClick={() => setSelectedBlog(blog)}
                    >
                      {blog.topic && (
                        <div className="mb-3">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {blog.topic}
                          </span>
                        </div>
                      )}
                      <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-gray-700 transition-colors">
                        {blog.title}
                      </h3>
                      {contentPreview && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                          {contentPreview}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(blog.published_at || blog.created_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </div>
                        {blog.word_count > 0 && (
                          <span>{blog.word_count.toLocaleString()} words</span>
                        )}
                      </div>
                      <div className="mt-4 flex items-center text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                        Read more
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Showing {filteredBlogs.length} {filteredBlogs.length === 1 ? "post" : "posts"}
                  {searchQuery && ` matching "${searchQuery}"`}
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default BlogPublic;

