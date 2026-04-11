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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, User, Mail } from "lucide-react";

const FoundersNote = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [brandReview, setBrandReview] = useState<string>("");
  const [actionSteps, setActionSteps] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [existingNote, setExistingNote] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        checkAdminStatus(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else if (session) {
        checkAdminStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchBrands();
      fetchUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedBrandId && selectedUserId) {
      fetchExistingNote();
    } else {
      setExistingNote(null);
      setBrandReview("");
      setActionSteps("");
    }
  }, [selectedBrandId, selectedUserId]);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("is_admin, email")
      .eq("id", userId)
      .single();

    if (data) {
      const admin = data.is_admin === true || data.email === 'admin@citero.com';
      setIsAdmin(admin);
      if (!admin) {
        navigate("/dashboard");
      }
    }
  };

  const fetchBrands = async () => {
    const { data } = await supabase
      .from("brands")
      .select("id, name, user_id")
      .order("name");

    if (data) {
      setBrands(data);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/fetch-all-users`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${currentSession.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok && result.success && result.users) {
        // Map name to full_name for backward compatibility
        const usersWithFullName = result.users.map((user: any) => ({
          ...user,
          full_name: user.name || null,
        }));
        setUsers(usersWithFullName);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
  };

  const fetchExistingNote = async () => {
    if (!selectedBrandId || !selectedUserId) return;

    const { data, error } = await supabase
      .from("founder_notes")
      .select("*")
      .eq("brand_id", selectedBrandId)
      .eq("user_id", selectedUserId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching note:", error);
      return;
    }

    if (data) {
      setExistingNote(data);
      setBrandReview(data.brand_review || "");
      setActionSteps(data.action_steps || "");
    } else {
      setExistingNote(null);
      setBrandReview("");
      setActionSteps("");
    }
  };

  const handleSave = async () => {
    if (!selectedBrandId || !selectedUserId) {
      toast.error("Please select both a brand and a user");
      return;
    }

    if (!brandReview.trim() || !actionSteps.trim()) {
      toast.error("Please fill in both brand review and action steps");
      return;
    }

    setSaving(true);

    try {
      if (existingNote) {
        // Update existing note
        const { error } = await supabase
          .from("founder_notes")
          .update({
            brand_review: brandReview.trim(),
            action_steps: actionSteps.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingNote.id);

        if (error) throw error;
        toast.success("Founder's note updated successfully!");
      } else {
        // Create new note
        const { error } = await supabase
          .from("founder_notes")
          .insert({
            brand_id: selectedBrandId,
            user_id: selectedUserId,
            brand_review: brandReview.trim(),
            action_steps: actionSteps.trim(),
            created_by: session?.user?.id,
          });

        if (error) throw error;
        toast.success("Founder's note created successfully!");
      }

      await fetchExistingNote();
    } catch (error: any) {
      console.error("Error saving note:", error);
      toast.error(error.message || "Failed to save founder's note");
    } finally {
      setSaving(false);
    }
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
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-600" />
                  <p className="text-gray-600 mt-4">Loading...</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-white">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto bg-white">
            <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Founder's Note</h1>
                <p className="text-gray-600">Write personalized notes to guide users on their brand journey</p>
              </div>

              <Card className="p-6 border border-gray-200 bg-white shadow-sm mb-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="brand">Select Brand</Label>
                    <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                      <SelectTrigger id="brand" className="mt-1">
                        <SelectValue placeholder="Choose a brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="user">Select User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger id="user" className="mt-1">
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-gray-400" />
                              <span>{user.email}</span>
                              {user.full_name && (
                                <span className="text-gray-500">({user.full_name})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {selectedBrandId && selectedUserId && (
                <Card className="p-6 border border-gray-200 bg-white shadow-sm">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {existingNote ? "Edit Founder's Note" : "Create Founder's Note"}
                      </h2>
                      {existingNote && (
                        <span className="text-xs text-gray-500">
                          Last updated: {new Date(existingNote.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Writing for <span className="font-medium">{selectedBrand?.name}</span> • 
                      User: <span className="font-medium">{selectedUser?.email}</span>
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="brandReview">
                        Brand Review <span className="text-gray-500">(First paragraph)</span>
                      </Label>
                      <p className="text-xs text-gray-500 mb-2 mt-1">
                        Write a personalized review of the brand's current state, strengths, and opportunities
                      </p>
                      <Textarea
                        id="brandReview"
                        value={brandReview}
                        onChange={(e) => setBrandReview(e.target.value)}
                        placeholder="Example: I've been closely following [Brand Name]'s journey, and I'm impressed by your positioning in the market. Your visibility scores show strong potential, especially in the [topic] space..."
                        className="min-h-[120px] mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="actionSteps">
                        Action Steps <span className="text-gray-500">(Second paragraph)</span>
                      </Label>
                      <p className="text-xs text-gray-500 mb-2 mt-1">
                        Provide clear, actionable steps the user should take to improve their brand visibility
                      </p>
                      <Textarea
                        id="actionSteps"
                        value={actionSteps}
                        onChange={(e) => setActionSteps(e.target.value)}
                        placeholder="Example: Here's what I recommend focusing on next: 1) Strengthen your presence on [platform] by... 2) Consider creating content around [topic] to... 3) Build relationships with [sources]..."
                        className="min-h-[120px] mt-1"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedBrandId("");
                          setSelectedUserId("");
                          setBrandReview("");
                          setActionSteps("");
                          setExistingNote(null);
                        }}
                      >
                        Clear
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={saving || !brandReview.trim() || !actionSteps.trim()}
                        className="bg-gray-900 text-white hover:bg-gray-800"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {existingNote ? "Update Note" : "Create Note"}
                          </>
                        )}
                      </Button>
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

export default FoundersNote;

