import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Sparkles, Check, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const GetDemo = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    workEmail: "",
    company: "",
    companySize: "",
    heardAbout: "",
    isAgency: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isAgency: checked }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, companySize: value }));
    if (errors.companySize) {
      setErrors((prev) => ({ ...prev, companySize: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.workEmail.trim()) {
      newErrors.workEmail = "Work email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.workEmail)) {
      newErrors.workEmail = "Please enter a valid email address";
    }
    if (!formData.company.trim()) newErrors.company = "Company name is required";
    if (!formData.companySize) newErrors.companySize = "Company size is required";
    if (!formData.heardAbout.trim()) newErrors.heardAbout = "This field is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Save data directly in Supabase
      const { error } = await supabase
        .from("demo_submissions")
        .insert({
          full_name: formData.fullName,
          work_email: formData.workEmail,
          company: formData.company,
          company_size: formData.companySize,
          heard_about: formData.heardAbout,
          is_agency: formData.isAgency,
        });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast({
        title: "Demo Request Submitted!",
        description: "Thank you! Our sales team will get back to you shortly.",
      });
    } catch (error: any) {
      console.error("Error submitting demo request:", error);
      toast({
        title: "Submission failed",
        description: error.message || "An error occurred while submitting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50/50 min-h-screen text-gray-900 font-sans relative overflow-hidden flex flex-col justify-between selection:bg-indigo-600/10 selection:text-indigo-900">
      <SEO
        title="Book a Demo - Talk to Sales | Citero AI Visibility"
        description="Schedule a customized demo with the Citero team. Learn how to track and optimize your brand's AI search visibility and convert conversational traffic."
        keywords="citero demo, book demo, contact sales, AI visibility optimization, GEO tracking trial"
        canonical="https://citero.ai/demo"
      />

      {/* Subtle Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-indigo-500/5 to-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      {/* Brand Header */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-start">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors py-2 px-4 rounded-lg bg-gray-50 border border-gray-200/60 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Dual-Column Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 flex items-center justify-center z-10">
        {isSuccess ? (
          /* Submission Success State */
          <div className="max-w-xl text-center bg-white border border-gray-200 rounded-2xl p-8 sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden animate-fade-in">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-8 relative">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">
              Request Received Successfully!
            </h1>
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-8">
              Thank you for requesting a demo of Citero, <span className="text-gray-900 font-semibold">{formData.fullName}</span>. 
              Our enterprise sales team will analyze your company (<span className="text-gray-900 font-semibold">{formData.company}</span>) and reach out to <span className="text-gray-900 font-semibold">{formData.workEmail}</span> within 24 hours to schedule your personalized live demo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate("/")}
                className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl py-3 px-6 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-250"
              >
                Return Home
              </Button>
              <Button
                onClick={() => {
                  setIsSuccess(false);
                  setFormData({
                    fullName: "",
                    workEmail: "",
                    company: "",
                    companySize: "",
                    heardAbout: "",
                    isAgency: false,
                  });
                }}
                variant="outline"
                className="border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded-xl py-3 px-6 text-base font-medium transition-colors"
              >
                Submit another request
              </Button>
            </div>
          </div>
        ) : (
          /* Active Form / Value Proposition Columns */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 w-full items-center">
            
            {/* Left Column: Heading & Introduction */}
            <div className="lg:col-span-5 flex flex-col space-y-6 lg:pr-6">
              <div className="space-y-4">
                <span className="text-indigo-600 font-semibold uppercase tracking-wider text-xs sm:text-sm">
                  Contact sales
                </span>
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-[1.15]">
                  Talk to our Sales team
                </h1>
                <p className="text-gray-600 text-lg leading-relaxed max-w-xl">
                  Connect with our sales team to explore how we can support your use case and capture traffic from AI search engines.
                </p>
              </div>
            </div>

            {/* Right Column: Premium Form Card */}
            <div className="lg:col-span-7 relative">
              <div className="bg-white border border-gray-200/80 rounded-2xl p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  How can we help?
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-gray-700 text-sm font-medium">
                      Full name<span className="text-rose-500 ml-0.5">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      placeholder="Full name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="bg-white border-gray-200 hover:border-gray-300 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-gray-950 rounded-lg h-11 placeholder:text-gray-400 text-sm transition-all duration-200"
                    />
                    {errors.fullName && (
                      <span className="text-xs text-rose-500 block mt-1">{errors.fullName}</span>
                    )}
                  </div>

                  {/* Work Email */}
                  <div className="space-y-2">
                    <Label htmlFor="workEmail" className="text-gray-700 text-sm font-medium">
                      Work email<span className="text-rose-500 ml-0.5">*</span>
                    </Label>
                    <Input
                      id="workEmail"
                      name="workEmail"
                      type="email"
                      placeholder="Work email"
                      value={formData.workEmail}
                      onChange={handleInputChange}
                      className="bg-white border-gray-200 hover:border-gray-300 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-gray-950 rounded-lg h-11 placeholder:text-gray-400 text-sm transition-all duration-200"
                    />
                    {errors.workEmail && (
                      <span className="text-xs text-rose-500 block mt-1">{errors.workEmail}</span>
                    )}
                  </div>

                  {/* Company & Company Size (Grid layout) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Company */}
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-gray-700 text-sm font-medium">
                        Company<span className="text-rose-500 ml-0.5">*</span>
                      </Label>
                      <Input
                        id="company"
                        name="company"
                        type="text"
                        placeholder="Company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="bg-white border-gray-200 hover:border-gray-300 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-gray-950 rounded-lg h-11 placeholder:text-gray-400 text-sm transition-all duration-200"
                      />
                      {errors.company && (
                        <span className="text-xs text-rose-500 block mt-1">{errors.company}</span>
                      )}
                    </div>

                    {/* Company Size */}
                    <div className="space-y-2">
                      <Label htmlFor="companySize" className="text-gray-700 text-sm font-medium">
                        Company size<span className="text-rose-500 ml-0.5">*</span>
                      </Label>
                      <select
                        id="companySize"
                        name="companySize"
                        value={formData.companySize}
                        onChange={(e) => handleSelectChange(e.target.value)}
                        className="w-full bg-white border border-gray-200 hover:border-gray-300 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-gray-950 rounded-lg h-11 px-3 text-sm transition-all duration-200 outline-none appearance-none cursor-pointer"
                        style={{
                          backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                          backgroundPosition: "right 0.75rem center",
                          backgroundSize: "1.25rem",
                          backgroundRepeat: "no-repeat",
                        }}
                      >
                        <option value="" disabled hidden>Company size</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-500">201-500 employees</option>
                        <option value="501-1000">501-1000 employees</option>
                        <option value="1000+">1000+ employees</option>
                      </select>
                      {errors.companySize && (
                        <span className="text-xs text-rose-500 block mt-1">{errors.companySize}</span>
                      )}
                    </div>
                  </div>

                  {/* Heard About */}
                  <div className="space-y-2">
                    <Label htmlFor="heardAbout" className="text-gray-700 text-sm font-medium">
                      How did you hear about Citero?<span className="text-rose-500 ml-0.5">*</span>
                    </Label>
                    <Textarea
                      id="heardAbout"
                      name="heardAbout"
                      placeholder="How did you hear about Citero?"
                      value={formData.heardAbout}
                      onChange={handleInputChange}
                      className="bg-white border border-gray-200 hover:border-gray-300 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 text-gray-950 rounded-lg min-h-[90px] placeholder:text-gray-400 text-sm transition-all duration-200 resize-none"
                    />
                    {errors.heardAbout && (
                      <span className="text-xs text-rose-500 block mt-1">{errors.heardAbout}</span>
                    )}
                  </div>

                  {/* We're an agency checkbox */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleCheckboxChange(!formData.isAgency)}
                      className={`w-5 h-5 rounded flex items-center justify-center border transition-all duration-200 ${
                        formData.isAgency
                          ? "bg-gray-900 border-gray-900 shadow-sm"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {formData.isAgency && (
                        <Check className="h-3.5 w-3.5 text-white stroke-[3px] animate-scale-in" />
                      )}
                    </button>
                    <span 
                      onClick={() => handleCheckboxChange(!formData.isAgency)}
                      className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer transition-colors select-none"
                    >
                      We're an agency
                    </span>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gray-900 hover:bg-gray-800 hover:scale-[1.01] active:scale-[0.99] text-white rounded-xl h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200 mt-6 relative overflow-hidden group/btn"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Request a Demo
                        <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-0.5 transition-transform" />
                      </span>
                    )}
                  </Button>
                </form>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Sleek Minimalist Footer */}
      <footer className="w-full border-t border-gray-250/30 py-8 text-center text-xs text-gray-500 max-w-7xl mx-auto px-4 mt-12">
        <p>© {new Date().getFullYear()} Citero. All rights reserved. Built with pride for enterprise brand safety and growth.</p>
      </footer>
    </div>
  );
};

export default GetDemo;
