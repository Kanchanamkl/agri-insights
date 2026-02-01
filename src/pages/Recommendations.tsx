import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  ArrowLeft, 
  Sprout, 
  Beaker, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  DollarSign,
  Leaf,
  AlertTriangle,
  Info,
  Share2,
  Download,
  Clock,
  CheckCircle2
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
  const width = Math.abs(impact) * 100;
  
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
          style={{ width: `${width}%` }}
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

  console.log('Recommendations State:', state);
  
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

  const { crop, fertilizer, featureImportance, alternativeCrops, riskFactors, inputData } = recommendation;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `MICFRS Recommendation: ${crop.crop}`,
        text: `Check out my personalized crop recommendation from MICFRS!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
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
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Main Recommendations Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Crop Recommendation Card */}
          <Card className="shadow-card overflow-hidden">
            <div className="h-2 gradient-primary" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-3xl">
                    {crop.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{crop.crop}</CardTitle>
                    <CardDescription>Recommended Crop</CardDescription>
                  </div>
                </div>
                <Sprout className="h-6 w-6 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Confidence Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Suitability Score</span>
                  <span className="font-bold text-lg text-success">{crop.confidence}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full gradient-primary rounded-full transition-all duration-1000"
                    style={{ width: `${crop.confidence}%` }}
                  />
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Expected Yield</p>
                  <p className="font-semibold">{crop.expectedYieldMin} - {crop.expectedYieldMax}</p>
                  <p className="text-xs text-muted-foreground">{crop.yieldUnit}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Market Trend</p>
                  <div className="flex items-center gap-1 font-semibold">
                    {crop.marketPriceTrend === 'rising' && (
                      <>
                        <TrendingUp className="h-4 w-4 text-success" />
                        <span className="text-success">Rising</span>
                      </>
                    )}
                    {crop.marketPriceTrend === 'stable' && (
                      <>
                        <Minus className="h-4 w-4 text-muted-foreground" />
                        <span>Stable</span>
                      </>
                    )}
                    {crop.marketPriceTrend === 'falling' && (
                      <>
                        <TrendingDown className="h-4 w-4 text-destructive" />
                        <span className="text-destructive">Falling</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Growing Season */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Growing Season</p>
                  <p className="font-medium">
                    {crop.growingSeasonStart}
                    {crop.growingSeasonEnd && ` to ${crop.growingSeasonEnd}`}
                  </p>
                </div>
              </div>
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
                    <CardDescription>Recommended Application</CardDescription>
                  </div>
                </div>
                <Badge 
                  variant={fertilizer.environmentalImpact === 'low' ? 'default' : 'secondary'}
                  className={cn(
                    fertilizer.environmentalImpact === 'low' && "bg-success text-success-foreground",
                    fertilizer.environmentalImpact === 'medium' && "bg-warning text-warning-foreground",
                    fertilizer.environmentalImpact === 'high' && "bg-destructive text-destructive-foreground"
                  )}
                >
                  {fertilizer.environmentalImpact} impact
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fertilizer Type */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Recommended Mix</p>
                <p className="font-semibold text-sm">{fertilizer.type}</p>
              </div>

              {/* Quantity */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Quantity per Acre</p>
                <p className="font-medium text-sm">{fertilizer.quantityPerAcre}</p>
              </div>

              {/* Cost */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Estimated Cost</p>
                  <p className="font-semibold">
                    {fertilizer.estimatedCost.toLocaleString()} {fertilizer.costUnit}
                  </p>
                </div>
              </div>

              {/* Application Schedule */}
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Application Schedule
                </p>
                <div className="space-y-2">
                  {fertilizer.applicationSchedule.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      <span className="text-muted-foreground">Week {item.week}:</span>
                      <span>{item.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Importance - Visual Explanation */}
        <Card className="shadow-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Why This Recommendation?
            </CardTitle>
            <CardDescription>
              Key factors that influenced your personalized recommendation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {featureImportance.map((item, i) => (
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
          {/* Alternative Crops */}
          <AccordionItem value="alternatives" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                <span>Alternative Crops ({alternativeCrops.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pb-4">
                {alternativeCrops.map((alt, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{alt.crop}</p>
                      <p className="text-xs text-muted-foreground">{alt.reason}</p>
                    </div>
                    <Badge variant="outline">{alt.confidence}% suitable</Badge>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Risk Factors */}
          {riskFactors.length > 0 && (
            <AccordionItem value="risks" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <span>Risk Factors & Mitigation ({riskFactors.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pb-4">
                  {riskFactors.map((risk, i) => (
                    <div key={i} className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                      <p className="font-medium text-sm mb-1">{risk.factor}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-success font-medium">Mitigation:</span> {risk.mitigation}
                      </p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Input Summary */}
          <AccordionItem value="input" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-muted-foreground" />
                <span>Your Input Data Summary</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid sm:grid-cols-3 gap-4 pb-4">
                <div className="space-y-2">
                  <p className="font-medium text-sm">Soil Data</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>N: {inputData.soil.nitrogen} ppm</p>
                    <p>P: {inputData.soil.phosphorus} ppm</p>
                    <p>K: {inputData.soil.potassium} ppm</p>
                    <p>pH: {inputData.soil.pH}</p>
                    <p>Moisture: {inputData.soil.moisture}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-sm">Environmental</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Rainfall: {inputData.environmental.rainfall} mm</p>
                    <p>Temperature: {inputData.environmental.temperature}°C</p>
                    <p>Humidity: {inputData.environmental.humidity}%</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-sm">Field Context</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Previous: {inputData.field.previousCrop}</p>
                    <p>Irrigation: {inputData.field.irrigationType}</p>
                    <p>Size: {inputData.field.landSize} acres</p>
                    <p>Region: {inputData.field.region}</p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
          <Link to="/input">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              New Recommendation
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="default" size="lg" className="w-full sm:w-auto">
              View Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
