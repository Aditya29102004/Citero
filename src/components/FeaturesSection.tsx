import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, TrendingUp, BarChart3, LineChart, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "AI-Powered GEO Scans",
    description: "Discover how AI models perceive your brand across multiple search scenarios and contexts."
  },
  {
    icon: TrendingUp,
    title: "Visibility Scoring",
    description: "Get a comprehensive visibility score that tracks your brand's presence in AI responses."
  },
  {
    icon: BarChart3,
    title: "Sentiment Analysis",
    description: "Understand the sentiment behind AI mentions with detailed positive, neutral, and negative tracking."
  },
  {
    icon: LineChart,
    title: "Trend Monitoring",
    description: "Track changes in your brand's AI visibility over time with intuitive charts and reports."
  },
  {
    icon: Shield,
    title: "Competitor Insights",
    description: "Compare your brand against competitors to see who's winning the AI perception battle."
  },
  {
    icon: Zap,
    title: "Real-Time Updates",
    description: "Stay informed with live updates as scans complete and new insights become available."
  }
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-muted/50">
      <div className="container px-4 mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powerful Features for Brand Intelligence
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to understand and optimize your brand's AI visibility
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-border hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
