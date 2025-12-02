import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  path: string;
}

interface OnboardingStepperProps {
  steps: Step[];
  currentStep: string;
  completedSteps: string[];
}

export function OnboardingStepper({ steps, currentStep, completedSteps }: OnboardingStepperProps) {
  return (
    <div className="w-64 border-r border-gray-200 bg-white p-6">
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isUpcoming = !isCompleted && !isCurrent;

          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                    isCompleted && "border-green-600 bg-green-600",
                    isCurrent && "border-gray-900 bg-gray-900",
                    isUpcoming && "border-gray-300 bg-white"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 text-white" />
                  ) : (
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isCurrent && "text-white",
                        isUpcoming && "text-gray-400"
                      )}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mt-2 h-12 w-0.5",
                      isCompleted ? "bg-green-600" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
              <div className="flex-1 pt-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCurrent && "text-gray-900",
                    isCompleted && "text-gray-600",
                    isUpcoming && "text-gray-400"
                  )}
                >
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

