import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Mentions from "./pages/Mentions";
import BrandDashboard from "./pages/BrandDashboard";
import Compare from "./pages/Compare";
import AdminWaitlist from "./pages/AdminWaitlist";
import FoundersNoteAdmin from "./pages/admin/FoundersNote";
import UserManagement from "./pages/admin/UserManagement";
import FoundersNoteView from "./pages/FoundersNote";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import Payment from "./pages/Payment";
import Pricing from "./pages/Pricing";
import Profile from "./pages/Profile";
import Brands from "./pages/Brands";
import Competitors from "./pages/Competitors";
import Sentiment from "./pages/Sentiment";
import Sources from "./pages/Sources";
import Blogs from "./pages/Blogs";
import BlogPublic from "./pages/BlogPublic";
import NewBlog from "./pages/blogs/New";
import EditBlog from "./pages/blogs/Edit";
import Audits from "./pages/Audits";
import Prompts from "./pages/Prompts";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import KnowledgeBase from "./pages/KnowledgeBase";
import Leads from "./pages/Leads";
import WebsiteOnboarding from "./pages/onboarding/Website";
import DescriptionOnboarding from "./pages/onboarding/Description";
import TopicsOnboarding from "./pages/onboarding/Topics";
import CompetitorsOnboarding from "./pages/onboarding/Competitors";
import AnalysisOnboarding from "./pages/onboarding/Analysis";
import CompleteOnboarding from "./pages/onboarding/Complete";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/blog" element={<BlogPublic />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/brands" element={<Brands />} />
          <Route path="/competitors" element={<Competitors />} />
          <Route path="/sentiment" element={<Sentiment />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/blogs/new" element={<NewBlog />} />
          <Route path="/blogs/:id" element={<EditBlog />} />
          <Route path="/audits" element={<Audits />} />
          <Route path="/prompts" element={<Prompts />} />
          <Route path="/team" element={<Team />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/admin/waitlist" element={<AdminWaitlist />} />
          <Route path="/admin/founders-note" element={<FoundersNoteAdmin />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/founders-note" element={<FoundersNoteView />} />
          <Route path="/founders-note/:brandId" element={<FoundersNoteView />} />
          <Route path="/brand/:brandId" element={<BrandDashboard />} />
          <Route path="/mentions/:brandId" element={<Mentions />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/profile" element={<Profile />} />
          {/* Onboarding Routes */}
          <Route path="/onboarding/website" element={<WebsiteOnboarding />} />
          <Route path="/onboarding/description" element={<DescriptionOnboarding />} />
          <Route path="/onboarding/topics" element={<TopicsOnboarding />} />
          <Route path="/onboarding/competitors" element={<CompetitorsOnboarding />} />
          <Route path="/onboarding/analysis" element={<AnalysisOnboarding />} />
          <Route path="/onboarding/complete" element={<CompleteOnboarding />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Analytics />
      <SpeedInsights />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
