import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

export interface OutreachFilters {
  status: string;
  search: string;
}

interface OutreachFiltersProps {
  filters: OutreachFilters;
  onFiltersChange: (filters: OutreachFilters) => void;
  onDetectTargets: () => void;
  detecting?: boolean;
}

export function OutreachFilters({
  filters,
  onFiltersChange,
  onDetectTargets,
  detecting = false,
}: OutreachFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="status" className="text-sm font-medium text-gray-700 mb-2 block">
          Status
        </Label>
        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger id="status" className="w-full">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="email_drafted">Email Drafted</SelectItem>
            <SelectItem value="email_sent">Email Sent</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
          Search
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            id="search"
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Search by name, domain, or role..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex-shrink-0">
        <Button
          onClick={onDetectTargets}
          disabled={detecting}
          className="bg-gray-900 text-white hover:bg-gray-800 h-10 px-6"
        >
          {detecting ? "Detecting..." : "Detect Targets"}
        </Button>
      </div>
    </div>
  );
}

