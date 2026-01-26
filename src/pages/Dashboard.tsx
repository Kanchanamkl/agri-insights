import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  ClipboardList, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  ArrowRight,
  Sprout,
  FileText,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#10B981', '#0EA5E9', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Dashboard() {
  const { state } = useApp();
  const { recommendations } = state;

  // Calculate stats
  const totalRecommendations = recommendations.length;
  const avgConfidence = recommendations.length > 0
    ? Math.round(recommendations.reduce((sum, r) => sum + r.crop.confidence, 0) / recommendations.length)
    : 0;
  const totalCostSaved = recommendations.length * 2500; // Mock calculation

  // Crop distribution for pie chart
  const cropDistribution = recommendations.reduce((acc, r) => {
    acc[r.crop.crop] = (acc[r.crop.crop] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(cropDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  // Fertilizer cost trend (mock data)
  const costTrendData = recommendations.slice(0, 10).map((r, i) => ({
    date: `Rec ${i + 1}`,
    cost: r.fertilizer.estimatedCost,
  })).reverse();

  // Soil nutrient comparison
  const nutrientData = recommendations.slice(0, 5).map((r, i) => ({
    name: `Field ${i + 1}`,
    nitrogen: r.inputData.soil.nitrogen,
    phosphorus: r.inputData.soil.phosphorus * 2, // Scale for visibility
    potassium: r.inputData.soil.potassium,
  })).reverse();

  if (recommendations.length === 0) {
    return (
      <div className="container py-20 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <ClipboardList className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-4">No Recommendations Yet</h1>
          <p className="text-muted-foreground mb-6">
            Start by getting your first crop and fertilizer recommendation. 
            Your history and analytics will appear here.
          </p>
          <Link to="/input">
            <Button variant="hero" size="lg">
              Get Started
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track your recommendations and farming insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Link to="/input">
            <Button size="sm">
              New Recommendation
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Recommendations</p>
                <p className="text-3xl font-display font-bold">{totalRecommendations}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Confidence Score</p>
                <p className="text-3xl font-display font-bold">{avgConfidence}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Est. Cost Optimized</p>
                <p className="text-3xl font-display font-bold">
                  {totalCostSaved.toLocaleString()} <span className="text-lg">LKR</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Crop Distribution */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-primary" />
              Crop Distribution
            </CardTitle>
            <CardDescription>Recommended crops breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fertilizer Cost Trend */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Fertilizer Cost Trend
            </CardTitle>
            <CardDescription>Cost per recommendation over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Soil Nutrients Comparison */}
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-primary" />
              Soil Nutrient Levels
            </CardTitle>
            <CardDescription>NPK levels across recent submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nutrientData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="nitrogen" name="Nitrogen (N)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="phosphorus" name="Phosphorus (P) x2" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="potassium" name="Potassium (K)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Recommendations */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Recent Recommendations
          </CardTitle>
          <CardDescription>Your latest crop and fertilizer advice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.slice(0, 10).map((rec) => (
              <Link
                key={rec.id}
                to={`/recommendations/${rec.id}`}
                className="block p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                      {rec.crop.icon}
                    </div>
                    <div>
                      <p className="font-semibold">{rec.crop.crop}</p>
                      <p className="text-sm text-muted-foreground">
                        {rec.inputData.field.region} • {rec.inputData.field.landSize} acres
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        rec.crop.confidence >= 90 && "border-success text-success",
                        rec.crop.confidence >= 70 && rec.crop.confidence < 90 && "border-warning text-warning",
                        rec.crop.confidence < 70 && "border-destructive text-destructive"
                      )}
                    >
                      {rec.crop.confidence}% suitable
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(rec.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
