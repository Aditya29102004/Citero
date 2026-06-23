import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

const DEFAULT_FEATURED_BLOG = {
  id: "default-seo-geo-guide",
  title: "The Complete Guide to Generative Engine Optimization (GEO): How to Get Cited in ChatGPT & Gemini",
  topic: "GEO Strategy",
  content: `# The Complete Guide to Generative Engine Optimization (GEO)

Traditional search engine optimization (SEO) is undergoing the most significant shift since the birth of search. With over 800 million active users checking ChatGPT, Gemini, Claude, and Perplexity for product recommendations, brand citations have become the new currency of organic traffic.

If your brand is not mentioned in these generative AI answers, you are effectively invisible to a major segment of your audience.

Here is how Generative Engine Optimization (GEO) works and how you can optimize your digital footprint to get cited:

## 1. What is Generative Engine Optimization (GEO)?
GEO is the process of optimizing your website and content structure so that LLMs (Large Language Models) ingest, understand, and reference your brand as a primary source for conversational answers. 

Unlike traditional SEO which relies heavily on page titles and backlinks, GEO focuses on authority context, structured formatting, and citation compatibility.

## 2. Key GEO Optimization Strategies

### A. Format Content for LLM Ingestion
Generative engines process information structured in logical patterns. To optimize for them:
* **Direct Q&A Sections:** Use clear headers like "How does [Brand] solve team alignment?" followed by a single-sentence direct answer.
* **Markdown Bullet Points:** Bullet points are easier for retrieval-augmented generation (RAG) pipelines to extract and cite.
* **Define Key Concepts Early:** Place definitions at the very beginning of your pages.

### B. Cite High-Authority Datasets
LLMs validate facts by cross-referencing public repositories. Linking to reliable external databases like Wikipedia, GitHub, GitBook, and academic papers signals to the AI model that your content is trustworthy and reference-worthy.

### C. Build Cohesive Topic Clusters
Rather than writing sparse, disconnected blog posts, compile thorough knowledge bases. The deeper your contextual mapping on a specific query space, the more likely the model will cite you as a category authority.

---

## 3. Measuring Your AI Visibility
Tracking your search footprint manually is impossible. Using automated trackers like **Citero** allows you to simulate queries across multiple engines, trace source references, and build visual dashboards to benchmark competitor citation growth.

Start auditing your GEO index today to stay ahead of the AI shift.`,
  created_at: "2026-06-18T22:37:51.000Z",
  published_at: "2026-06-18T22:37:51.000Z",
  word_count: 385,
  seo_keywords: ["Generative Engine Optimization", "GEO", "AI Search Optimization", "SGE SEO"],
  status: "published",
  is_platform_blog: true
};

const BlogPublic = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedBlog, setSelectedBlog] = useState<any | null>(null);

  useEffect(() => {
    fetchBlogs();
  }, []);

  // Update selected blog based on URL parameter id
  useEffect(() => {
    const loadSelectedBlog = async () => {
      if (!id) {
        setSelectedBlog(null);
        return;
      }

      if (id === "default-seo-geo-guide") {
        setSelectedBlog(DEFAULT_FEATURED_BLOG);
        return;
      }

      // First check if it exists in the fetched blogs list
      const found = blogs.find((b) => b.id === id);
      if (found) {
        setSelectedBlog(found);
        return;
      }

      // If not found in memory (could be direct navigation), fetch from database
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("blogs")
          .select("id, title, topic, created_at, published_at, word_count, seo_keywords, content, status, is_platform_blog")
          .eq("id", id)
          .eq("status", "published")
          .single();

        if (error) {
          console.error("Error fetching single blog:", error);
          navigate("/blog", { replace: true });
        } else if (data) {
          setSelectedBlog(data);
        } else {
          navigate("/blog", { replace: true });
        }
      } catch (err) {
        console.error("Exception fetching single blog:", err);
        navigate("/blog", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadSelectedBlog();
  }, [id, blogs, navigate]);

  // Dynamically update document title and description for SEO based on active blog post
  useEffect(() => {
    if (selectedBlog) {
      document.title = `${selectedBlog.title} | Citero Blog`;
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        const preview = extractPreview(selectedBlog.content || "", 160);
        metaDescription.setAttribute("content", preview);
      }
    } else {
      document.title = "Citero Blog - AI Visibility & GEO Insights";
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute("content", "Insights and strategies about AI visibility, brand tracking, and digital marketing.");
      }
    }
  }, [selectedBlog]);

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

      if (!error && data && data.length > 0) {
        setBlogs(data);
      } else {
        setBlogs([DEFAULT_FEATURED_BLOG]);
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
              onClick={() => navigate("/blog")}
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
                      onClick={() => navigate(`/blog/${blog.id}`)}
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

