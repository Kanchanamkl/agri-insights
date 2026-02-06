import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchRecommendation} from '@/lib/recommendationEngine';
import { checkBackendHealth } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { REGIONS, PREVIOUS_CROPS, IRRIGATION_TYPES, MOISTURE_LEVELS, SOIL_TYPES } from '@/types';
import { 
  ArrowLeft, 
  ArrowRight, 
  Beaker, 
  CloudRain, 
  MapPin, 
  Info, 
  Sparkles,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

const stepInfo = [
  { 
    step: 1, 
    title: 'Soil Information', 
    description: 'Enter your soil nutrient levels and properties',
    icon: Beaker
  },
  { 
    step: 2, 
    title: 'Environmental Data', 
    description: 'Provide weather and climate information',
    icon: CloudRain
  },
  { 
    step: 3, 
    title: 'Field Context', 
    description: 'Tell us about your land and farming history',
    icon: MapPin
  },
];

function ProgressIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {stepInfo.map((item, i) => (
        <div key={item.step} className="flex items-center">
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
              currentStep >= item.step
                ? "bg-primary border-primary text-primary-foreground"
                : "border-muted-foreground/30 text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
          </div>
          <div className="hidden sm:block ml-2 mr-4">
            <p className={cn(
              "text-sm font-medium",
              currentStep >= item.step ? "text-foreground" : "text-muted-foreground"
            )}>
              {item.title}
            </p>
          </div>
          {i < stepInfo.length - 1 && (
            <div 
              className={cn(
                "w-12 sm:w-20 h-0.5 mx-2 transition-colors duration-300",
                currentStep > item.step ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  tooltip,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
  tooltip: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{label}</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={min}
            max={max}
            step={step}
            className="w-20 h-8 text-right"
          />
          <span className="text-sm text-muted-foreground w-12">{unit}</span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="py-2"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function InputForm() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');

  const { formData, currentStep } = state;
  const { soil, environmental, field } = formData;

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await checkBackendHealth();
        if (health.status === 'healthy') {
          setBackendStatus('healthy');
          toast({
            title: 'Backend Connected',
            description: `ML models loaded (${health.model_version})`,
          });
        } else {
          setBackendStatus('unhealthy');
          toast({
            title: 'Backend Initializing',
            description: 'Models are loading, please wait...',
            variant: 'default',
          });
        }
      } catch (error) {
        setBackendStatus('unhealthy');
        console.warn('Backend not available, will use fallback mode');
      }
    };
    
    checkHealth();
  }, [toast]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (soil.nitrogen < 0 || soil.nitrogen > 400) newErrors.nitrogen = 'Must be 0-400 ppm';
      if (soil.phosphorus < 0 || soil.phosphorus > 150) newErrors.phosphorus = 'Must be 0-150 ppm';
      if (soil.potassium < 0 || soil.potassium > 300) newErrors.potassium = 'Must be 0-300 ppm';
      if (soil.pH < 3.5 || soil.pH > 9.0) newErrors.pH = 'Must be 3.5-9.0';
      if (!soil.soilType) newErrors.soilType = 'Please select a soil type'; // Add validation
    }

    if (step === 2) {
      if (environmental.rainfall < 0 || environmental.rainfall > 500) newErrors.rainfall = 'Must be 0-500 mm';
      if (environmental.temperature < 15 || environmental.temperature > 40) newErrors.temperature = 'Must be 15-40 °C';
      if (environmental.humidity < 0 || environmental.humidity > 100) newErrors.humidity = 'Must be 0-100 %';
    }

    if (step === 3) {
      if (!field.previousCrop) newErrors.previousCrop = 'Please select a crop';
      if (!field.region) newErrors.region = 'Please select a region';
      if (field.landSize <= 0) newErrors.landSize = 'Must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      dispatch({ type: 'SET_STEP', payload: currentStep + 1 });
    }
  };

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: currentStep - 1 });
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
  
    setIsSubmitting(true);
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Call the ML backend
      const recommendation = await fetchRecommendation(formData);
      
      dispatch({ type: 'ADD_RECOMMENDATION', payload: recommendation });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      toast({
        title: 'Recommendation Generated',
        description: `Recommended crop: ${recommendation.crop.crop} with ${recommendation.crop.confidence}% confidence`,
      });
      
      setIsSubmitting(false);
      navigate(`/recommendations/${recommendation.id}`);
      
    } catch (error) {
      console.error('Failed to generate recommendation:', error);
      
      dispatch({ type: 'SET_LOADING', payload: false });
      
      toast({
        title: 'Backend Error',
        description: error instanceof Error 
          ? error.message 
          : 'Failed to connect to ML backend. Please check if the backend is running.',
        variant: 'destructive',
      });
      
      setIsSubmitting(false);
    }
  };
  const handleQuickFill = () => {
    dispatch({ type: 'QUICK_FILL' });
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_FORM' });
  };


  return (
    <div className="container py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        {/* Backend Status Indicator */}
        {backendStatus === 'healthy' && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
              <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              ML Backend Connected
            </p>
          </div>
        )}
        {backendStatus === 'unhealthy' && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <span className="h-2 w-2 bg-yellow-500 rounded-full" />
              Using fallback mode (backend unavailable)
            </p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Get Your Recommendation
          </h1>
          <p className="text-muted-foreground">
            Fill in your field data to receive personalized crop and fertilizer advice
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <Button variant="outline" size="sm" onClick={handleQuickFill}>
            <Sparkles className="h-4 w-4 mr-2" />
            Quick Fill (Demo)
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          {/* <Select onValueChange={(v) => handleDemoSelect(Number(v))}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Load demo scenario..." />
            </SelectTrigger>
            <SelectContent>
              {demoRecommendations.map((demo, i) => (
                <SelectItem key={i} value={String(i)}>
                  {demo.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select> */}
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator currentStep={currentStep} />

        {/* Form Card */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 1 && <Beaker className="h-5 w-5 text-primary" />}
              {currentStep === 2 && <CloudRain className="h-5 w-5 text-primary" />}
              {currentStep === 3 && <MapPin className="h-5 w-5 text-primary" />}
              {stepInfo[currentStep - 1].title}
            </CardTitle>
            <CardDescription>{stepInfo[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Soil Information */}
            {currentStep === 1 && (
              <>
                <SliderInput
                  label="Nitrogen (N)"
                  value={soil.nitrogen}
                  onChange={(v) => dispatch({ type: 'SET_SOIL_DATA', payload: { nitrogen: v } })}
                  min={0}
                  max={400}
                  unit="ppm"
                  tooltip="Nitrogen is essential for leaf growth and green color. Low levels may require urea application."
                />
                
                <SliderInput
                  label="Phosphorus (P)"
                  value={soil.phosphorus}
                  onChange={(v) => dispatch({ type: 'SET_SOIL_DATA', payload: { phosphorus: v } })}
                  min={0}
                  max={150}
                  unit="ppm"
                  tooltip="Phosphorus promotes root development and flowering. Important for energy transfer in plants."
                />
                
                <SliderInput
                  label="Potassium (K)"
                  value={soil.potassium}
                  onChange={(v) => dispatch({ type: 'SET_SOIL_DATA', payload: { potassium: v } })}
                  min={0}
                  max={300}
                  unit="ppm"
                  tooltip="Potassium strengthens stems and improves disease resistance. Crucial for fruit quality."
                />
                
                <SliderInput
                  label="Soil pH"
                  value={soil.pH}
                  onChange={(v) => dispatch({ type: 'SET_SOIL_DATA', payload: { pH: v } })}
                  min={3.5}
                  max={9.0}
                  step={0.1}
                  unit=""
                  tooltip="pH affects nutrient availability. Most crops prefer 6.0-7.0. Acidic soils may need lime."
                />
                
                {/* Add Soil Type Selection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Soil Type</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Type of soil in your field. Different soil types have different water retention and nutrient characteristics.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={soil.soilType}
                    onValueChange={(v) => dispatch({ type: 'SET_SOIL_DATA', payload: { soilType: v } })}
                  >
                    <SelectTrigger className={errors.soilType ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select soil type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SOIL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.soilType && (
                    <p className="text-sm text-destructive">{errors.soilType}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Soil Moisture</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Current moisture level in your soil. Affects irrigation recommendations.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={soil.moisture}
                    onValueChange={(v) => dispatch({ type: 'SET_SOIL_DATA', payload: { moisture: v as 'low' | 'medium' | 'high' } })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOISTURE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Step 2: Environmental Data */}
            {currentStep === 2 && (
              <>
                <SliderInput
                  label="Rainfall"
                  value={environmental.rainfall}
                  onChange={(v) => dispatch({ type: 'SET_ENVIRONMENTAL_DATA', payload: { rainfall: v } })}
                  min={0}
                  max={500}
                  unit="mm"
                  tooltip="Average monthly rainfall in your area. Affects crop selection and irrigation needs."
                />
                
                <SliderInput
                  label="Temperature"
                  value={environmental.temperature}
                  onChange={(v) => dispatch({ type: 'SET_ENVIRONMENTAL_DATA', payload: { temperature: v } })}
                  min={15}
                  max={40}
                  unit="°C"
                  tooltip="Average temperature during growing season. Different crops have different temperature preferences."
                />
                
                <SliderInput
                  label="Humidity"
                  value={environmental.humidity}
                  onChange={(v) => dispatch({ type: 'SET_ENVIRONMENTAL_DATA', payload: { humidity: v } })}
                  min={0}
                  max={100}
                  unit="%"
                  tooltip="Relative humidity in your area. High humidity can increase disease risk for some crops."
                />
              </>
            )}

            {/* Step 3: Field Context */}
            {currentStep === 3 && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Previous Crop</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Crop grown in the last season. Helps with crop rotation recommendations.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={field.previousCrop}
                    onValueChange={(v) => dispatch({ type: 'SET_FIELD_DATA', payload: { previousCrop: v } })}
                  >
                    <SelectTrigger className={errors.previousCrop ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select previous crop..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PREVIOUS_CROPS.map((crop) => (
                        <SelectItem key={crop} value={crop}>
                          {crop}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.previousCrop && (
                    <p className="text-sm text-destructive">{errors.previousCrop}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Irrigation Type</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Your primary irrigation method. Affects water management recommendations.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={field.irrigationType}
                    onValueChange={(v) => dispatch({ type: 'SET_FIELD_DATA', payload: { irrigationType: v as any } })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IRRIGATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Land Size</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total cultivable area in acres. Used for quantity calculations.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={field.landSize}
                      onChange={(e) => dispatch({ type: 'SET_FIELD_DATA', payload: { landSize: Number(e.target.value) } })}
                      min={0.1}
                      step={0.1}
                      className={errors.landSize ? 'border-destructive' : ''}
                    />
                    <span className="text-sm text-muted-foreground">acres</span>
                  </div>
                  {errors.landSize && (
                    <p className="text-sm text-destructive">{errors.landSize}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Region</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Your province in Sri Lanka. Affects regional crop recommendations.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={field.region}
                    onValueChange={(v) => dispatch({ type: 'SET_FIELD_DATA', payload: { region: v } })}
                  >
                    <SelectTrigger className={errors.region ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select region..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.region && (
                    <p className="text-sm text-destructive">{errors.region}</p>
                  )}
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              {currentStep < 3 ? (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  variant="hero" 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Get Recommendation
                      <Sparkles className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
