import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy load non-critical pages for smooth, fast performance
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Mentions = React.lazy(() => import("./pages/Mentions"));
const BrandDashboard = React.lazy(() => import("./pages/BrandDashboard"));
const Compare = React.lazy(() => import("./pages/Compare"));
const AdminWaitlist = React.lazy(() => import("./pages/AdminWaitlist"));
const FoundersNoteAdmin = React.lazy(() => import("./pages/admin/FoundersNote"));
const UserManagement = React.lazy(() => import("./pages/admin/UserManagement"));
const FoundersNoteView = React.lazy(() => import("./pages/FoundersNote"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Terms = React.lazy(() => import("./pages/Terms"));
const Refund = React.lazy(() => import("./pages/Refund"));
const About = React.lazy(() => import("./pages/About"));
const Privacy = React.lazy(() => import("./pages/Privacy"));
const Contact = React.lazy(() => import("./pages/Contact"));
const GetDemo = React.lazy(() => import("./pages/GetDemo"));
const Payment = React.lazy(() => import("./pages/Payment"));
const Pricing = React.lazy(() => import("./pages/Pricing"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Brands = React.lazy(() => import("./pages/Brands"));
const Competitors = React.lazy(() => import("./pages/Competitors"));
const Sentiment = React.lazy(() => import("./pages/Sentiment"));
const Sources = React.lazy(() => import("./pages/Sources"));
const Blogs = React.lazy(() => import("./pages/Blogs"));
const BlogPublic = React.lazy(() => import("./pages/BlogPublic"));
const NewBlog = React.lazy(() => import("./pages/blogs/New"));
const EditBlog = React.lazy(() => import("./pages/blogs/Edit"));
const Audits = React.lazy(() => import("./pages/Audits"));
const Prompts = React.lazy(() => import("./pages/Prompts"));
const Team = React.lazy(() => import("./pages/Team"));
const Settings = React.lazy(() => import("./pages/Settings"));
const KnowledgeBase = React.lazy(() => import("./pages/KnowledgeBase"));
const Logo = React.lazy(() => import("./pages/Logo"));
const Feedback = React.lazy(() => import("./pages/Feedback"));
const WebsiteOnboarding = React.lazy(() => import("./pages/onboarding/Website"));
const DescriptionOnboarding = React.lazy(() => import("./pages/onboarding/Description"));
const TopicsOnboarding = React.lazy(() => import("./pages/onboarding/Topics"));
const CompetitorsOnboarding = React.lazy(() => import("./pages/onboarding/Competitors"));
const AnalysisOnboarding = React.lazy(() => import("./pages/onboarding/Analysis"));
const CompleteOnboarding = React.lazy(() => import("./pages/onboarding/Complete"));

const queryClient = new QueryClient();

// A beautiful fast minimal loading fallback for chunks
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/logo" element={<Logo />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/blog" element={<BlogPublic />} />
            <Route path="/blog/:id" element={<BlogPublic />} />
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
            <Route path="/demo" element={<GetDemo />} />
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
        </Suspense>
      </BrowserRouter>
      <Analytics />
      <SpeedInsights />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
