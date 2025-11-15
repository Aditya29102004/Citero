import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { BrandCard } from "./BrandCard";
import { AddBrandDialog } from "./AddBrandDialog";
import { toast } from "sonner";

type Brand = {
  id: string;
  name: string;
  aliases: string | null;
  website_url: string | null;
  description: string | null;
  date_added: string;
};

export function BrandList() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("date_added", { ascending: false });

      if (error) throw error;
      setBrands(data || []);
    } catch (error: any) {
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
      
      setBrands(brands.filter((brand) => brand.id !== id));
      toast.success("Brand deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete brand");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading brands...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10 lg:mb-12">
        <div className="space-y-2">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">Your Brands</h2>
          <p className="text-base text-gray-600 font-normal">
            {brands.length} {brands.length === 1 ? "brand tracked" : "brands tracked"}
          </p>
        </div>
        <Button 
          onClick={() => setDialogOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-6 h-11 font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Brand
        </Button>
      </div>

      {brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 border-2 border-dashed border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm">
          <p className="text-gray-600 mb-6 text-base font-medium">No brands added yet</p>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-6 h-11 font-medium shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Brand
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <AddBrandDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchBrands}
      />
    </div>
  );
}
