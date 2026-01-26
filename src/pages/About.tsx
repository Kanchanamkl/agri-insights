import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Sprout, 
  Beaker, 
  CloudRain, 
  Brain, 
  ArrowRight,
  Mail,
  FileText,
  Video,
  HelpCircle,
  Send
} from 'lucide-react';
import { useState } from 'react';

const howItWorks = [
  {
    step: 1,
    title: 'Input Your Data',
    description: 'Enter soil nutrient levels (N, P, K, pH), weather conditions, and field details.',
    icon: Beaker,
  },
  {
    step: 2,
    title: 'AI Analysis',
    description: 'Our machine learning model analyzes your data against thousands of successful farming cases.',
    icon: Brain,
  },
  {
    step: 3,
    title: 'Weather Integration',
    description: 'Real-time weather data is factored in to optimize timing and quantities.',
    icon: CloudRain,
  },
  {
    step: 4,
    title: 'Get Recommendations',
    description: 'Receive personalized crop and fertilizer advice with clear explanations.',
    icon: Sprout,
  },
];

const faqs = [
  {
    question: 'How accurate are the recommendations?',
    answer: 'MICFRS achieves 95% accuracy in crop recommendations based on validation with agricultural experts and field trials. The system continuously improves as more data is collected.',
  },
  {
    question: 'Do I need special equipment to test my soil?',
    answer: 'While professional soil testing provides the most accurate results, you can use affordable home testing kits available at agricultural supply stores. We also accept estimates based on past soil reports.',
  },
  {
    question: 'How often should I get new recommendations?',
    answer: 'We recommend getting a new analysis at the start of each growing season or whenever you significantly change your land use. For continuous cropping, quarterly updates are ideal.',
  },
  {
    question: 'Can I use MICFRS for large-scale commercial farming?',
    answer: 'Yes! MICFRS scales from small home gardens to large commercial operations. For farms over 50 acres, we offer batch processing and integration with farm management systems.',
  },
  {
    question: 'How does the system explain its recommendations?',
    answer: 'We use SHAP (SHapley Additive exPlanations) values to show which factors most influenced each recommendation. This makes our AI transparent and helps you understand the reasoning.',
  },
  {
    question: 'Is my data secure and private?',
    answer: 'Absolutely. All data is encrypted and stored securely. We never share individual farm data. Aggregated, anonymized data may be used to improve the model.',
  },
  {
    question: 'What if the recommendation doesn\'t work for my field?',
    answer: 'Agricultural outcomes depend on many factors. If you experience issues, please contact our support team. Your feedback helps improve the system and we can assist with adjustments.',
  },
];

export default function About() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you soon.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="container py-8 md:py-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
          About MICFRS
        </h1>
        <p className="text-lg text-muted-foreground">
          Multi-Input Crop and Fertilizer Recommendation System — empowering Sri Lankan 
          farmers with AI-driven agricultural insights since 2024.
        </p>
      </div>

      {/* How It Works */}
      <section id="how-it-works" className="mb-20">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-12">
          How MICFRS Works
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {howItWorks.map((item, i) => (
            <Card key={i} className="shadow-card relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 gradient-primary" />
              <CardHeader>
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {item.step}
                  </span>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {item.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-10">
          <Link to="/input">
            <Button variant="hero" size="lg">
              Try It Now
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Video Placeholder */}
      <section className="mb-20">
        <Card className="shadow-card overflow-hidden">
          <div className="aspect-video bg-muted flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Video className="h-10 w-10 text-primary" />
              </div>
              <p className="text-lg font-semibold">Video Tutorial Coming Soon</p>
              <p className="text-muted-foreground mt-1">
                Learn how to use MICFRS in under 5 minutes
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="mb-20">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Find answers to common questions about using MICFRS
        </p>
        
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem 
                key={i} 
                value={`faq-${i}`} 
                className="border rounded-lg px-4 bg-card shadow-sm"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                    <span className="font-medium">{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pl-8">
                  <p className="text-muted-foreground">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Resources */}
      <section className="mb-20">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-12">
          Resources
        </h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Research Paper</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Read the academic paper behind MICFRS methodology and validation.
              </CardDescription>
              <Button variant="outline" size="sm" className="w-full">
                Download PDF
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>API Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Integrate MICFRS with your existing farm management systems.
              </CardDescription>
              <Button variant="outline" size="sm" className="w-full">
                View Docs
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-success" />
              </div>
              <CardTitle>Newsletter</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Get agricultural tips and MICFRS updates in your inbox.
              </CardDescription>
              <Button variant="outline" size="sm" className="w-full">
                Subscribe
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="max-w-2xl mx-auto">
        <Card className="shadow-card">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Contact Support</CardTitle>
            <CardDescription>
              Have questions or need help? Send us a message.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea 
                  id="message" 
                  placeholder="How can we help you?"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
