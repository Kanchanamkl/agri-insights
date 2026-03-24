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
    question: "What if the recommendation doesn't work for my field?",
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
      <div className="max-w-2xl mx-auto mb-12 text-center">
        <h1 className="text-3xl font-bold mb-3">About MICFRS</h1>
        <p className="text-muted-foreground">
          Multi-Input Crop and Fertilizer Recommendation System — empowering Sri Lankan
          farmers with AI-driven agricultural insights since 2024.
        </p>
      </div>

      {/* How It Works */}
      <section id="how-it-works" className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">How MICFRS Works</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {howItWorks.map((item, i) => (
            <Card key={i} className="border">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {item.step}
                  </span>
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{item.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/input">
            <Button>
              Try It Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Video Placeholder */}
      <section className="mb-16">
        <Card className="border">
          <div className="aspect-video bg-muted flex items-center justify-center">
            <div className="text-center">
              <Video className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Video Tutorial Coming Soon</p>
              <p className="text-sm text-muted-foreground mt-1">Learn how to use MICFRS in under 5 minutes</p>
            </div>
          </div>
        </Card>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-3">Frequently Asked Questions</h2>
        <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto">
          Find answers to common questions about using MICFRS
        </p>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border rounded-lg px-4 bg-card"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm">{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pl-7">
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Resources */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Resources</h2>
        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          <Card className="border">
            <CardHeader className="pb-2">
              <FileText className="h-5 w-5 text-muted-foreground mb-2" />
              <CardTitle className="text-base">Research Paper</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4 text-sm">
                Read the academic paper behind MICFRS methodology and validation.
              </CardDescription>
              <Button variant="outline" size="sm" className="w-full">
                Download PDF
              </Button>
            </CardContent>
          </Card>

          <Card className="border">
            <CardHeader className="pb-2">
              <FileText className="h-5 w-5 text-muted-foreground mb-2" />
              <CardTitle className="text-base">API Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4 text-sm">
                Integrate MICFRS with your existing farm management systems.
              </CardDescription>
              <Button variant="outline" size="sm" className="w-full">
                View Docs
              </Button>
            </CardContent>
          </Card>

          <Card className="border">
            <CardHeader className="pb-2">
              <Mail className="h-5 w-5 text-muted-foreground mb-2" />
              <CardTitle className="text-base">Newsletter</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4 text-sm">
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
      <section id="contact" className="max-w-xl mx-auto">
        <Card className="border">
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
            <CardDescription>Have questions or need help? Send us a message.</CardDescription>
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