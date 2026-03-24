import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { fetchRecommendation } from '@/lib/recommendationEngine';
import { checkBackendHealth } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { SOIL_TYPES } from '@/types';

const stepInfo = [
  { step: 1, title: 'Soil Information' },
  { step: 2, title: 'Environmental Data' },
];

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: 1.5,
    color: '#1a1a1a',
  },
  card: {
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    padding: '32px',
    backgroundColor: '#ffffff',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #d4d4d4',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: 'inherit',
  },
  buttonPrimary: {
    padding: '8px 20px',
    backgroundColor: '#2c5f2d',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: 'inherit',
  },
  input: {
    width: '100%',
    padding: '8px',
    border: '1px solid #d4d4d4',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  select: {
    width: '100%',
    padding: '8px',
    border: '1px solid #d4d4d4',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    backgroundColor: '#ffffff',
  },
  error: {
    fontSize: '12px',
    color: '#dc2626',
    marginTop: '4px',
  },
  statusHealthy: {
    marginBottom: '16px',
    padding: '12px',
    border: '1px solid #d1fae5',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#f0fdf4',
    color: '#166534',
  },
  statusUnhealthy: {
    marginBottom: '16px',
    padding: '12px',
    border: '1px solid #fed7aa',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fffbeb',
    color: '#92400e',
  },
};

function ProgressIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', justifyContent: 'center' }}>
      {stepInfo.map((item) => (
        <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: currentStep >= item.step ? '#2c5f2d' : '#e5e5e5',
            color: currentStep >= item.step ? '#ffffff' : '#666',
            fontSize: '14px',
            fontWeight: 500,
          }}>
            {item.step}
          </span>
          <span style={{ fontSize: '14px', fontWeight: currentStep >= item.step ? 500 : 400 }}>
            {item.title}
          </span>
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
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <label style={{ fontSize: '14px', fontWeight: 500 }}>{label}</label>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          style={{ width: '80px', padding: '4px 8px', border: '1px solid #d4d4d4', borderRadius: '4px', textAlign: 'right' }}
        />
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        style={{ width: '100%', margin: '8px 0' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
        <span>{min}</span>
        <span>{max} {unit}</span>
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
  const { soil } = formData;
  const environmental = (formData as any).environmental ?? (formData as any).environment;

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
      if (!soil.soilType) newErrors.soilType = 'Please select a soil type';
    }

    if (step === 2) {
      if (environmental.rainfall < 0 || environmental.rainfall > 500) newErrors.rainfall = 'Must be 0-500 mm';
      if (environmental.temperature < 15 || environmental.temperature > 40) newErrors.temperature = 'Must be 15-40 °C';
      if (environmental.humidity < 0 || environmental.humidity > 100) newErrors.humidity = 'Must be 0-100 %';
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
  const payload = useMemo(
    () => ({
      field: (formData as any).field ?? {},
      soil,
      environmental,
    }),
    [formData, soil, environmental]
  );


  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    setIsSubmitting(true);
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const recommendation = await fetchRecommendation(payload as any);
      dispatch({ type: 'ADD_RECOMMENDATION', payload: recommendation });
      dispatch({ type: 'SET_LOADING', payload: false });

      toast({
        title: 'Recommendation Generated',
        description: `Recommended crop: ${recommendation.crop.crop} with ${recommendation.crop.confidence}% confidence`,
      });

      setIsSubmitting(false);
      navigate(`/recommendations/${recommendation.id}`);
    } catch (error) {
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

  const handleQuickFill = () => dispatch({ type: 'QUICK_FILL' });
  const handleReset = () => dispatch({ type: 'RESET_FORM' });

  return (
    <div style={styles.container}>
      {/* Backend Status */}
      {backendStatus === 'healthy' && (
        <div style={styles.statusHealthy}>
          ✓ ML Backend Connected
        </div>
      )}
      {backendStatus === 'unhealthy' && (
        <div style={styles.statusUnhealthy}>
          ⚠ Using fallback mode (backend unavailable)
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '8px' }}>
          Get Your Recommendation
        </h1>
        <p style={{ fontSize: '16px', color: '#4a4a4a' }}>
          Fill in your field data to receive personalized crop and fertilizer advice
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <button onClick={handleQuickFill} style={styles.button}>
          Quick Fill
        </button>
        <button onClick={handleReset} style={styles.button}>
          Reset
        </button>
      </div>

      {/* Progress Indicator */}
      <ProgressIndicator currentStep={currentStep} />

      {/* Form */}
      <div style={styles.card}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>
          {stepInfo[currentStep - 1].title}
        </h2>
        
        {/* Step 1: Soil Information */}
        {currentStep === 1 && (
          <>
            <SliderInput
              label="Nitrogen (N)"
              value={soil.nitrogen}
              onChange={(v) => dispatch({ type: 'SET_SOIL_DATA', payload: { nitrogen: v } })}
              min={0} max={400} unit="ppm"
              tooltip=""
            />
            <SliderInput
              label="Phosphorus (P)"
              value={soil.phosphorus}
              onChange={(v) => dispatch({ type: 'SET_SOIL_DATA', payload: { phosphorus: v } })}
              min={0} max={150} unit="ppm"
              tooltip=""
            />
            <SliderInput
              label="Potassium (K)"
              value={soil.potassium}
              onChange={(v) => dispatch({ type: 'SET_SOIL_DATA', payload: { potassium: v } })}
              min={0} max={300} unit="ppm"
              tooltip=""
            />
            <SliderInput
              label="Soil pH"
              value={soil.pH}
              onChange={(v) => dispatch({ type: 'SET_SOIL_DATA', payload: { pH: v } })}
              min={3.5} max={9.0} step={0.1} unit=""
              tooltip=""
            />

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                Soil Type
              </label>
              <select
                value={(soil as any).soil_type ?? (soil as any).soilType ?? ''}
                onChange={(e) => dispatch({ type: 'SET_SOIL_DATA', payload: { soil_type: e.target.value } as any })}
                style={styles.select}
              >
                <option value="">Select soil type...</option>
                {SOIL_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.soilType && <div style={styles.error}>{errors.soilType}</div>}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                Soil Moisture
              </label>
              <input
                type="number"
                step="0.0001"
                min={0}
                max={1}
                value={soil.moisture ?? ''}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_SOIL_DATA',
                    payload: { moisture: e.target.value === '' ? (undefined as any) : Number(e.target.value) },
                  })
                }
                placeholder="0.72"
                style={styles.input}
              />
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
              min={0} max={500} unit="mm"
              tooltip=""
            />
            <SliderInput
              label="Temperature"
              value={environmental.temperature}
              onChange={(v) => dispatch({ type: 'SET_ENVIRONMENTAL_DATA', payload: { temperature: v } })}
              min={15} max={40} unit="°C"
              tooltip=""
            />
            <SliderInput
              label="Humidity"
              value={environmental.humidity}
              onChange={(v) => dispatch({ type: 'SET_ENVIRONMENTAL_DATA', payload: { humidity: v } })}
              min={0} max={100} unit="%"
              tooltip=""
            />
          </>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e5e5' }}>
          <button 
            onClick={handleBack} 
            disabled={currentStep === 1}
            style={{
              ...styles.button,
              opacity: currentStep === 1 ? 0.5 : 1,
              cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Back
          </button>

          {currentStep < 2 ? (
            <button onClick={handleNext} style={styles.buttonPrimary}>
              Next →
            </button>
          ) : (
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              style={{
                ...styles.buttonPrimary,
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? 'wait' : 'pointer',
              }}
            >
              {isSubmitting ? 'Analyzing...' : 'Get Recommendation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}