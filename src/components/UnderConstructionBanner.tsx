import { AlertCircle } from "lucide-react";

export const UnderConstructionBanner = () => {
  return (
    <div className="fixed top-16 left-0 right-0 z-50 bg-amber-50 border-b-2 border-amber-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 lg:px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm md:text-base text-amber-900 font-medium text-center">
            <span className="font-semibold">Website Under Construction:</span>{" "}
            Please do not attempt to login or make payments at this time. Thank you for your patience!
          </p>
        </div>
      </div>
    </div>
  );
};

