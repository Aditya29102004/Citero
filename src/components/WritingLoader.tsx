import { useEffect, useState } from "react";
import { Check } from "lucide-react";

interface WritingLoaderProps {
  steps: string[];
  onComplete?: () => void;
  currentStepIndex?: number;
}

export function WritingLoader({ steps, onComplete, currentStepIndex }: WritingLoaderProps) {
  const [displayedSteps, setDisplayedSteps] = useState<number[]>([]);
  const [currentTypingIndex, setCurrentTypingIndex] = useState<number | null>(null);
  const [typedText, setTypedText] = useState<string>("");

  useEffect(() => {
    if (currentStepIndex !== undefined && currentStepIndex < steps.length) {
      // Show steps up to currentStepIndex as completed
      const completedSteps = Array.from({ length: currentStepIndex }, (_, i) => i);
      setDisplayedSteps(completedSteps);

      // Start typing current step
      if (!displayedSteps.includes(currentStepIndex)) {
        setCurrentTypingIndex(currentStepIndex);
        setTypedText("");
      }
    }
  }, [currentStepIndex, steps.length]);

  useEffect(() => {
    if (currentTypingIndex === null) return;

    const stepText = steps[currentTypingIndex];
    if (!stepText) return;

    let charIndex = 0;
    const typingInterval = setInterval(() => {
      if (charIndex < stepText.length) {
        setTypedText(stepText.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        // Mark step as completed
        setDisplayedSteps((prev) => [...prev, currentTypingIndex]);
        setCurrentTypingIndex(null);
        setTypedText("");

        // If this was the last step, call onComplete
        if (currentTypingIndex === steps.length - 1 && onComplete) {
          setTimeout(onComplete, 500);
        }
      }
    }, 30); // Typing speed

    return () => clearInterval(typingInterval);
  }, [currentTypingIndex, steps, onComplete]);

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isCompleted = displayedSteps.includes(index);
        const isTyping = currentTypingIndex === index;

        return (
          <div key={index} className="flex items-center gap-3">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                isCompleted
                  ? "bg-green-600"
                  : isTyping
                  ? "bg-gray-900"
                  : "bg-gray-200"
              }`}
            >
              {isCompleted ? (
                <Check className="h-4 w-4 text-white" />
              ) : isTyping ? (
                <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-gray-400" />
              )}
            </div>
            <p
              className={`text-sm ${
                isCompleted
                  ? "text-gray-600"
                  : isTyping
                  ? "text-gray-900 font-medium"
                  : "text-gray-400"
              }`}
            >
              {isTyping ? (
                <>
                  {typedText}
                  <span className="animate-pulse">|</span>
                </>
              ) : (
                step
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}

