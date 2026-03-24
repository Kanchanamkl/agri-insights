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
      <div className="relative w-28 h-28 mx-auto">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" className="stroke-muted" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="8"
            stroke={color}
            strokeLinecap="round"
            strokeDasharray={`${value * 2.51} 251`}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{value}%</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{label}</p>
    </div>
  );
}

export default function Analytics() {
  const { state } = useApp();
  const { recommendations } = state;

  const totalRecs = Math.max(recommendations.length, 5423);
  const avgConfidence = recommendations.length > 0
    ? Math.round(recommendations.reduce((sum, r) => sum + r.crop.confidence, 0) / recommendations.length)
    : 86;

  return (
    <div className="container py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          System performance and regional insights for agriculture officers
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs">+12.5%</Badge>
            </div>
            <p className="text-2xl font-bold">{totalRecs.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Recommendations</p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs">+2.3%</Badge>
            </div>
            <p className="text-2xl font-bold">{avgConfidence}%</p>
            <p className="text-sm text-muted-foreground">Avg. Accuracy</p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs">-1.2%</Badge>
            </div>
            <p className="text-2xl font-bold">892</p>
            <p className="text-sm text-muted-foreground">Daily Active Users</p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Map className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">9</p>
            <p className="text-sm text-muted-foreground">Provinces Covered</p>
          </CardContent>
        </Card>
      </div>

      {/* Model Performance Gauges */}
      <Card className="border mb-8">
        <CardHeader>
          <CardTitle className="text-base">Model Performance Metrics</CardTitle>
          <CardDescription>Machine learning model accuracy indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <GaugeChart value={95} label="Accuracy" color="hsl(var(--primary))" />
            <GaugeChart value={92} label="Precision" color="hsl(var(--primary))" />
            <GaugeChart value={89} label="Recall" color="hsl(var(--primary))" />
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-4 mb-8">
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-base">Weekly Usage Trend</CardTitle>
            <CardDescription>Active users over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.1)"
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader>
            <CardTitle className="text-base">Popular Crop Recommendations</CardTitle>
            <CardDescription>Distribution by crop type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cropPopularity}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={75}
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

        <Card className="border">
          <CardHeader>
            <CardTitle className="text-base">Fertilizer Optimization Trend</CardTitle>
            <CardDescription>Efficiency improvement over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fertilizerEfficiency}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" domain={[60, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="efficiency"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.1)"
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-base">System Health</CardTitle>
          <CardDescription>Current status of system components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'ML Model API', status: 'healthy', uptime: 99.9 },
              { name: 'Database', status: 'healthy', uptime: 99.95 },
              { name: 'Weather API', status: 'healthy', uptime: 98.5 },
              { name: 'Market Data', status: 'warning', uptime: 95.2 },
            ].map((service) => (
              <div key={service.name} className="p-3 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{service.name}</span>
                  {service.status === 'healthy' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uptime</span>
                    <span>{service.uptime}%</span>
                  </div>
                  <Progress value={service.uptime} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}