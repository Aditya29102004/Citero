import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ShimmerCard() {
  return (
    <Card className="p-6 border border-gray-200 bg-white">
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-48" />
    </Card>
  );
}

export function ShimmerTable() {
  return (
    <Card className="p-6 border border-gray-200 bg-white">
      <Skeleton className="h-6 w-48 mb-6" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ShimmerChart() {
  return (
    <Card className="p-6 border border-gray-200 bg-white">
      <Skeleton className="h-6 w-48 mb-6" />
      <Skeleton className="h-64 w-full" />
    </Card>
  );
}

