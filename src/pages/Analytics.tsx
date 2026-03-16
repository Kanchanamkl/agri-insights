import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  AreaChart,
  Area
} from 'recharts';
import { 
  Activity, 
  Users, 
  TrendingUp, 
  Target,
  Map,
  Sprout,
  Beaker,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const COLORS = ['#10B981', '#0EA5E9', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F97316'];

// Mock analytics data
const usageData = [
  { name: 'Mon', users: 120 },
  { name: 'Tue', users: 150 },
  { name: 'Wed', users: 180 },
  { name: 'Thu', users: 165 },
  { name: 'Fri', users: 200 },
  { name: 'Sat', users: 145 },
  { name: 'Sun', users: 110 },
];

const cropPopularity = [
  { name: 'Rice', value: 35 },
  { name: 'Vegetables', value: 25 },
  { name: 'Tea', value: 15 },
  { name: 'Coconut', value: 12 },
  { name: 'Maize', value: 8 },
  { name: 'Others', value: 5 },
];

const fertilizerEfficiency = [
  { month: 'Jan', efficiency: 75 },
  { month: 'Feb', efficiency: 78 },
  { month: 'Mar', efficiency: 82 },
  { month: 'Apr', efficiency: 79 },
  { month: 'May', efficiency: 85 },
  { month: 'Jun', efficiency: 88 },
];

function GaugeChart({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            className="stroke-muted"
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="10"
          />
          <circle
            className="transition-all duration-1000"
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="10"
            stroke={color}
            strokeLinecap="round"
            strokeDasharray={`${value * 2.51} 251`}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold">{value}%</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{label}</p>
    </div>
  );
}

export default function Analytics() {
  const { state } = useApp();
  const { recommendations } = state;

  // Calculate some real metrics from recommendations if available
  const totalRecs = Math.max(recommendations.length, 5423); // Mock or real
  const avgConfidence = recommendations.length > 0
    ? Math.round(recommendations.reduce((sum, r) => sum + r.crop.confidence, 0) / recommendations.length)
    : 86;

  return (
    <div className="container py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="bg-accent/10">
            <Activity className="h-3 w-3 mr-1" />
            Live Analytics
          </Badge>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          System performance and regional insights for agriculture officers
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-primary" />
              <Badge className="bg-success/10 text-success hover:bg-success/20">+12.5%</Badge>
            </div>
            <p className="text-2xl font-display font-bold">{totalRecs.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Recommendations</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-5 w-5 text-success" />
              <Badge className="bg-success/10 text-success hover:bg-success/20">+2.3%</Badge>
            </div>
            <p className="text-2xl font-display font-bold">{avgConfidence}%</p>
            <p className="text-sm text-muted-foreground">Avg. Accuracy</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              <Badge className="bg-warning/10 text-warning hover:bg-warning/20">-1.2%</Badge>
            </div>
            <p className="text-2xl font-display font-bold">892</p>
            <p className="text-sm text-muted-foreground">Daily Active Users</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Map className="h-5 w-5 text-secondary" />
            </div>
            <p className="text-2xl font-display font-bold">9</p>
            <p className="text-sm text-muted-foreground">Provinces Covered</p>
          </CardContent>
        </Card>
      </div>

      {/* Model Performance Gauges */}
      <Card className="shadow-card mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Model Performance Metrics
          </CardTitle>
          <CardDescription>Machine learning model accuracy indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-8">
            <GaugeChart value={95} label="Accuracy" color="hsl(var(--success))" />
            <GaugeChart value={92} label="Precision" color="hsl(var(--primary))" />
            <GaugeChart value={89} label="Recall" color="hsl(var(--accent))" />
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Usage */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Weekly Usage Trend
            </CardTitle>
            <CardDescription>Active users over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
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
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorUsers)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Crop Popularity */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-primary" />
              Popular Crop Recommendations
            </CardTitle>
            <CardDescription>Distribution by crop type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cropPopularity}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {cropPopularity.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fertilizer Efficiency */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-primary" />
              Fertilizer Optimization Trend
            </CardTitle>
            <CardDescription>Efficiency improvement over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fertilizerEfficiency}>
                  <defs>
                    <linearGradient id="colorEfficiency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" domain={[60, 100]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="hsl(var(--success))" 
                    fillOpacity={1} 
                    fill="url(#colorEfficiency)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            System Health
          </CardTitle>
          <CardDescription>Current status of system components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'ML Model API', status: 'healthy', uptime: 99.9 },
              { name: 'Database', status: 'healthy', uptime: 99.95 },
              { name: 'Weather API', status: 'healthy', uptime: 98.5 },
              { name: 'Market Data', status: 'warning', uptime: 95.2 },
            ].map((service) => (
              <div key={service.name} className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{service.name}</span>
                  {service.status === 'healthy' ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-warning" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Uptime</span>
                    <span className="font-medium">{service.uptime}%</span>
                  </div>
                  <Progress value={service.uptime} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
