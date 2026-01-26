import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Sprout, 
  BarChart3, 
  CloudRain, 
  Brain, 
  Sparkles, 
  TrendingUp,
  Users,
  Shield,
  ArrowRight,
  CheckCircle2,
  Star
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Predictions',
    description: 'Machine learning models trained on real agricultural data for accurate crop and fertilizer recommendations.',
  },
  {
    icon: BarChart3,
    title: 'Multi-Input Analysis',
    description: 'Analyzes soil nutrients, weather patterns, and market trends to provide holistic advice.',
  },
  {
    icon: CloudRain,
    title: 'Real-Time Updates',
    description: 'Recommendations adapt based on current weather conditions and seasonal changes.',
  },
  {
    icon: Sparkles,
    title: 'Explainable Results',
    description: 'Understand WHY each recommendation is made with visual SHAP-style explanations.',
  },
];

const stats = [
  { value: '89%', label: 'Users prefer field-specific advice', icon: Users },
  { value: '86.6%', label: 'Find recommendations very useful', icon: Star },
  { value: '30%', label: 'Potential cost reduction', icon: TrendingUp },
  { value: '95%', label: 'Prediction accuracy', icon: Shield },
];

const testimonials = [
  {
    quote: "MICFRS helped me understand exactly what my paddy field needed. My yield increased by 20% after following their recommendations.",
    author: "Sunil Perera",
    role: "Rice Farmer, Kurunegala",
    avatar: "SP",
  },
  {
    quote: "The visual explanations are excellent. I can now explain to farmers exactly why certain fertilizers are recommended for their specific conditions.",
    author: "Dr. Kamani Silva",
    role: "Agriculture Officer, Kandy",
    avatar: "KS",
  },
  {
    quote: "As a student researcher, the data insights from MICFRS have been invaluable for my thesis on sustainable farming practices.",
    author: "Tharaka Fernando",
    role: "Agri-tech Researcher, Peradeniya",
    avatar: "TF",
  },
];

const steps = [
  { step: 1, title: 'Enter Soil Data', description: 'Input your soil nutrient levels and pH' },
  { step: 2, title: 'Add Weather Info', description: 'Provide rainfall, temperature, and humidity' },
  { step: 3, title: 'Field Context', description: 'Tell us about your land and previous crops' },
  { step: 4, title: 'Get Recommendations', description: 'Receive personalized crop and fertilizer advice' },
];

export default function Index() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative gradient-hero overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
        </div>
        
        <div className="container relative py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sprout className="h-4 w-4" />
                Smart Farming Through Data-Driven Decisions
              </div>
              
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Get <span className="text-gradient-primary">Personalized</span> Crop & Fertilizer Recommendations
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
                MICFRS analyzes your soil nutrients, weather conditions, and market data to provide 
                field-specific advice—not generic regional guidelines.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/input">
                  <Button variant="hero" size="xl" className="w-full sm:w-auto">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/about">
                  <Button variant="heroOutline" size="xl" className="w-full sm:w-auto">
                    Learn More
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {['SP', 'KS', 'TF', 'NR'].map((initials, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-semibold text-primary"
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-medium">Trusted by 5,000+ farmers</p>
                  <p className="text-xs text-muted-foreground">across Sri Lanka</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative bg-card rounded-2xl shadow-xl border border-border/50 p-6 space-y-4 animate-float">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                    <Sprout className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Recommendation Ready</p>
                    <p className="text-sm text-muted-foreground">Based on your field data</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="flex items-center gap-2">
                      <span className="text-2xl">🌾</span>
                      <span className="font-medium">Rice (Paddy)</span>
                    </span>
                    <span className="text-sm font-semibold text-success">95% suitable</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">Expected Yield</span>
                    <span className="font-medium">4.5 - 5.5 tons/ha</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">Fertilizer</span>
                    <span className="font-medium text-right">Urea + TSP + MOP</span>
                  </div>
                </div>
                
                <div className="pt-2">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-[95%] gradient-primary rounded-full" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Confidence Score: 95%</p>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-accent/10 rounded-2xl -z-10 animate-pulse-glow" />
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-primary/10 rounded-xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="text-center p-6 rounded-xl bg-card shadow-card hover:shadow-card-hover transition-shadow"
              >
                <stat.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="text-3xl md:text-4xl font-display font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Why Choose MICFRS?
            </h2>
            <p className="text-muted-foreground text-lg">
              Our intelligent system combines multiple data sources to deliver 
              recommendations tailored specifically to your field conditions.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-xl bg-card border border-border/50 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg">
              Get personalized recommendations in just four simple steps.
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((item, i) => (
              <div key={i} className="relative">
                <div className="text-center p-6">
                  <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border">
                    <ArrowRight className="absolute -right-3 -top-2 h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/input">
              <Button variant="hero" size="lg">
                Start Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                Make Smarter Farming Decisions
              </h2>
              <div className="space-y-4">
                {[
                  'Get personalized crop recommendations based on YOUR field conditions',
                  'Optimize fertilizer use and reduce costs by up to 30%',
                  'Understand WHY each recommendation is made with AI explanations',
                  'Real-time updates based on weather and market changes',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-success shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-8">
                <Link to="/input">
                  <Button variant="default" size="lg">
                    Try It Free
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="p-6 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-3xl font-display font-bold text-primary">30%</p>
                  <p className="text-sm text-muted-foreground mt-1">Cost Reduction</p>
                </div>
                <div className="p-6 rounded-xl bg-accent/5 border border-accent/20">
                  <p className="text-3xl font-display font-bold text-accent">24/7</p>
                  <p className="text-sm text-muted-foreground mt-1">Available Anytime</p>
                </div>
              </div>
              <div className="space-y-4 mt-8">
                <div className="p-6 rounded-xl bg-success/5 border border-success/20">
                  <p className="text-3xl font-display font-bold text-success">20%</p>
                  <p className="text-sm text-muted-foreground mt-1">Yield Increase</p>
                </div>
                <div className="p-6 rounded-xl bg-secondary/10 border border-secondary/20">
                  <p className="text-3xl font-display font-bold text-secondary">50+</p>
                  <p className="text-sm text-muted-foreground mt-1">Crop Varieties</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Trusted by Farmers & Experts
            </h2>
            <p className="text-muted-foreground text-lg">
              See what our users say about their experience with MICFRS.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-card border border-border/50 shadow-card"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="relative rounded-2xl overflow-hidden gradient-primary p-8 md:p-16 text-center">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Optimize Your Farm?
              </h2>
              <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-8">
                Join thousands of Sri Lankan farmers using MICFRS to make 
                data-driven decisions and improve their yields.
              </p>
              <Link to="/input">
                <Button 
                  size="xl" 
                  className="bg-background text-primary hover:bg-background/90 font-semibold"
                >
                  Get Your Free Recommendation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
