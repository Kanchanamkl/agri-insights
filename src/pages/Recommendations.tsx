import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Sprout, 
  Beaker, 
  Leaf,
  AlertTriangle,
  Info,
  Share2,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

function FeatureImportanceBar({ 
  feature, 
  impact, 
  explanation 
}: { 
  feature: string; 
  impact: number; 
  explanation: string;
}) {
  const isPositive = impact > 0;
  // Adjusted scaling for visual representation
  const width = Math.min(Math.abs(impact) * 100, 100);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{feature}</span>
        <span className={cn(
          "font-semibold",
          isPositive ? "text-success" : "text-warning"
        )}>
          {isPositive ? '+' : ''}{impact.toFixed(2)}
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        <div 
          className={cn(
            "absolute top-0 h-full rounded-full transition-all duration-500",
            isPositive ? "bg-success left-1/2" : "bg-warning right-1/2"
          )}
          style={{ width: `${width / 2}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-px h-full bg-border" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{explanation}</p>
    </div>
  );
}

export default function Recommendations() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();

  const recommendation = state.recommendations.find(r => r.id === id);
  
  if (!recommendation) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-2xl font-bold mb-4">Recommendation Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This recommendation may have expired or doesn't exist.
        </p>
        <Link to="/input">
          <Button>Get New Recommendation</Button>
        </Link>
      </div>
    );
  }

  const { crop, fertilizer, featureImportance, alternativeCrops, riskFactors, inputData, warnings } = recommendation;

  // UPDATED: Check for metadata using the new backend field structure
  const showCropExtras = !!crop.expectedYieldMin || !!crop.marketPriceTrend;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `MICFRS Recommendation: ${crop.label}`,
        text: `Check out my personalized crop recommendation from MICFRS!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleDownload = () => {
    const reportData = {
      generatedAt: recommendation.timestamp.toLocaleString(),
      region: inputData.field.region,
      cropRecommendation: crop,
      fertilizerPlan: fertilizer,
      featureImportance,
      alternativeCrops,
      riskFactors,
      inputData
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MICFRS_Recommendation_${crop.label}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Your Recommendation
            </h1>
            <p className="text-muted-foreground mt-1">
              Based on your field conditions in {inputData.field.region}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Warnings Section */}
        {warnings && warnings.length > 0 && (
          <div className="mb-6 space-y-3">
            {warnings.map((warning, i) => (
              <Alert key={i} variant="destructive" className="bg-warning/10 border-warning text-warning-foreground">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="font-semibold capitalize">
                  {warning.type.replace(/_/g, ' ').toLowerCase()}
                </AlertTitle>
                <AlertDescription className="text-sm">
                  {warning.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Main Recommendations Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Crop Recommendation Card */}
          <Card className="shadow-card overflow-hidden">
            <div className="h-2 gradient-primary" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-3xl">
                    {crop.icon || '🌱'}
                  </div>
                  <div>
                    {/* UPDATED: Use crop.label */}
                    <CardTitle className="text-xl capitalize">{crop.label}</CardTitle>
                    <CardDescription>Recommended Crop</CardDescription>
                  </div>
                </div>
                <Sprout className="h-6 w-6 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Suitability Score - Updated to handle 0.77 -> 77% */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Suitability Score</span>
                  <span className="font-bold text-lg text-success">
                    {Math.round(crop.suitabilityScore * 100)}%
                  </span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full gradient-primary rounded-full transition-all duration-1000"
                    style={{ width: `${crop.suitabilityScore * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Confidence based on ML Analysis ({(crop.modelConfidence * 100).toFixed(1)}%) and Suitability Rules.
                </p>
              </div>

              {showCropExtras ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Expected Yield</p>
                    <p className="font-semibold text-sm">{crop.expectedYieldMin} - {crop.expectedYieldMax}</p>
                    <p className="text-[10px] text-muted-foreground">{crop.yieldUnit}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Market Trend</p>
                    <p className="font-semibold text-sm capitalize">{crop.marketPriceTrend}</p>
                    <p className="text-[10px] text-muted-foreground">Current Trend</p>
                  </div>
                </div>
              ) : (
                <Alert className="bg-muted/30 border-muted">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <AlertDescription className="text-xs text-muted-foreground">
                    Agronomic yield and season data are not available for this specific variety.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Fertilizer Recommendation Card */}
          <Card className="shadow-card overflow-hidden">
            <div className="h-2 gradient-earth" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Beaker className="h-7 w-7 text-secondary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Fertilizer Plan</CardTitle>
                    <CardDescription>Targeted Soil Nutrition</CardDescription>
                  </div>
                </div>
                <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/10 capitalize">
                  {fertilizer.environmentalImpact} Impact
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Application Confidence</span>
                  <span className="font-bold text-lg text-success">
                    {Math.round(fertilizer.suitabilityScore * 100)}%
                  </span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full gradient-earth rounded-full transition-all duration-1000"
                    style={{ width: `${fertilizer.suitabilityScore * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Recommended Fertilizer</p>
                <p className="font-semibold text-sm">{fertilizer.label}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {fertilizer.components?.map((component: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-[10px] py-0">
                      {component}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Quantity</p>
                  <p className="font-semibold text-sm">{fertilizer.quantityPerAcre}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Est. Cost</p>
                  <p className="font-semibold text-sm">{fertilizer.estimatedCost.toLocaleString()} {fertilizer.costUnit}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Importance */}
        <Card className="shadow-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Why This Recommendation?
            </CardTitle>
            <CardDescription>
              Environmental and soil factors influencing this result
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {featureImportance?.map((item, i) => (
              <FeatureImportanceBar
                key={i}
                feature={item.feature}
                impact={item.impact}
                explanation={item.explanation}
              />
            ))}
          </CardContent>
        </Card>

        {/* Expandable Sections */}
        <Accordion type="single" collapsible className="space-y-4">
          {alternativeCrops && alternativeCrops.length > 0 && (
            <AccordionItem value="alternatives" className="border rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-primary" />
                  <span>Alternative Crops</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pb-4">
                  {alternativeCrops.map((alt, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-transparent hover:border-primary/20 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium capitalize">{alt.crop}</p>
                        <p className="text-xs text-muted-foreground">{alt.reason}</p>
                      </div>
                      <Badge variant="secondary" className="ml-4">
                        {alt.confidence}% Match
                      </Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="risks" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span>Risk Factors & Mitigation</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pb-4">
                {riskFactors?.map((risk, i) => (
                  <div key={i} className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                    <p className="font-medium text-sm mb-1">{risk.factor}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-success font-medium">Action:</span> {risk.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Fertilizer Schedule */}
          <AccordionItem value="schedule" className="border rounded-lg px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-secondary" />
                <span>Fertilization Schedule</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pb-4">
                {fertilizer.applicationSchedule?.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-[10px] font-bold text-secondary">
                      W{item.week}
                    </div>
                    <p className="text-sm">{item.action}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-12">
          <Link to="/input">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              New Prediction
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="lg" className="w-full sm:w-auto">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}