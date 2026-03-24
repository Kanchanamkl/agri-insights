import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { fetchRecommendation } from '@/lib/recommendationEngine';
import { fetchWeatherForDistrict, clearWeatherCache } from '@/lib/weatherService';
import { checkBackendHealth } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { SOIL_TYPES, SRI_LANKA_DISTRICTS, SRI_LANKA_PROVINCES } from '@/types';

// ─── Step metadata ────────────────────────────────────────────────────────────

const stepInfo = [
  { step: 1, title: 'Soil Information' },
  { step: 2, title: 'Environmental Data' },
];

// ─── Shared styles ────────────────────────────────────────────────────────────

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
  } as React.CSSProperties,
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
  } as React.CSSProperties,
  buttonOutline: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#2c5f2d',
    border: '1px solid #2c5f2d',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: 'inherit',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '8px',
    border: '1px solid #d4d4d4',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  select: {
    width: '100%',
    padding: '8px',
    border: '1px solid #d4d4d4',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
  } as React.CSSProperties,
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
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '8px',
  } as React.CSSProperties,
  fieldGroup: {
    marginBottom: '24px',
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
  tooltip?: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginBottom: '24px', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <label style={{ fontSize: '14px', fontWeight: 500 }}>{label}</label>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
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
        disabled={disabled}
        style={{ width: '100%', margin: '8px 0', cursor: disabled ? 'not-allowed' : 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
        <span>{min}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

/** Read-only card shown after a successful weather fetch */
function WeatherValueCard({
  label,
  value,
  unit,
  icon,
}: {
  label: string;
  value: number;
  unit: string;
  icon: string;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      border: '1px solid #d1fae5',
      borderRadius: '8px',
      backgroundColor: '#f0fdf4',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#166534' }}>{label}</span>
      </div>
      <span style={{ fontSize: '20px', fontWeight: 600, color: '#14532d' }}>
        {value} <span style={{ fontSize: '13px', fontWeight: 400 }}>{unit}</span>
      </span>
    </div>
  );
}

/** Formats an ISO timestamp into a friendly relative string like "5 mins ago" */
function formatFetchedAt(isoString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60)  return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min${Math.floor(diff / 60) === 1 ? '' : 's'} ago`;
    return `${Math.floor(diff / 3600)} hr${Math.floor(diff / 3600) === 1 ? '' : 's'} ago`;
  } catch {
    return '';
  }
}

// ─── Step 2: Environmental / Weather section ──────────────────────────────────

function EnvironmentalStep() {
  const { state, dispatch } = useApp();
  const { toast } = useToast();

  const { weather, formData } = state;
  const environmental = formData.environmental;

  // Derive the districts for the selected province
  const districtsForProvince = useMemo(
    () => SRI_LANKA_DISTRICTS.filter((d) => d.province === weather.selectedProvince),
    [weather.selectedProvince]
  );

  const handleProvinceChange = (province: string) => {
    // When province changes, clear the district selection too
    dispatch({ type: 'CLEAR_WEATHER_METADATA' });
    dispatch({
      type: 'SET_SELECTED_DISTRICT',
      payload: { district: '', province },
    });
  };

  const handleDistrictChange = (districtName: string) => {
    if (!districtName) {
      dispatch({ type: 'CLEAR_WEATHER_METADATA' });
      return;
    }
    const found = SRI_LANKA_DISTRICTS.find((d) => d.name === districtName);
    if (found) {
      dispatch({
        type: 'SET_SELECTED_DISTRICT',
        payload: { district: found.name, province: found.province },
      });
    }
  };

  const handleFetchWeather = useCallback(async (forceRefresh = false) => {
    const districtName = weather.selectedDistrict;
    if (!districtName) return;

    const district = SRI_LANKA_DISTRICTS.find((d) => d.name === districtName);
    if (!district) return;

    if (forceRefresh) clearWeatherCache(districtName);

    dispatch({ type: 'SET_WEATHER_LOADING' });

    try {
      const result = await fetchWeatherForDistrict(district.lat, district.lng, districtName);
      dispatch({
        type: 'SET_WEATHER_SUCCESS',
        payload: {
          temperature: result.temperature,
          humidity:    result.humidity,
          rainfall:    result.rainfall,
          fetchedAt:   result.fetchedAt,
          district:    districtName,
        },
      });
      toast({
        title: 'Weather data loaded',
        description: `7-day data for ${districtName} fetched successfully.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch weather data.';
      dispatch({ type: 'SET_WEATHER_ERROR', payload: message });
      toast({
        title: 'Weather fetch failed',
        description: message,
        variant: 'destructive',
      });
    }
  }, [weather.selectedDistrict, dispatch, toast]);

  // Auto-fetch when a district is selected (user-friendly: no extra button click needed)
  useEffect(() => {
    if (weather.selectedDistrict && weather.status === 'idle') {
      handleFetchWeather(false);
    }
  }, [weather.selectedDistrict, weather.status, handleFetchWeather]);

  const showOverrideSliders = weather.manualOverride || weather.status === 'idle' && !weather.selectedDistrict;
  const dataIsFromApi = weather.status === 'success' && environmental.weatherSource === 'api';

  return (
    <>
      {/* ── District selector ─────────────────────────────────────── */}
      <div style={{
        marginBottom: '28px',
        padding: '20px',
        border: '1px solid #e5e5e5',
        borderRadius: '8px',
        backgroundColor: '#fafafa',
      }}>
        <p style={{ fontSize: '13px', color: '#555', marginBottom: '16px', marginTop: 0 }}>
          Select your farming location to automatically load real-time weather data.
        </p>

        {/* Province picker */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Province</label>
          <select
            value={weather.selectedProvince}
            onChange={(e) => handleProvinceChange(e.target.value)}
            style={styles.select}
          >
            <option value="">Select province...</option>
            {SRI_LANKA_PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* District picker — only shown after province is chosen */}
        {weather.selectedProvince && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>District</label>
            <select
              value={weather.selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              style={styles.select}
            >
              <option value="">Select district...</option>
              {districtsForProvince.map((d) => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Loading state ─────────────────────────────────────────── */}
      {weather.status === 'loading' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '16px',
          border: '1px solid #dbeafe',
          borderRadius: '8px',
          backgroundColor: '#eff6ff',
          marginBottom: '24px',
          fontSize: '14px',
          color: '#1e40af',
        }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
          Fetching weather data for {weather.selectedDistrict}…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────── */}
      {weather.status === 'error' && (
        <div style={{
          padding: '14px',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          backgroundColor: '#fef2f2',
          marginBottom: '24px',
          fontSize: '13px',
          color: '#991b1b',
        }}>
          <strong>Could not fetch weather:</strong> {weather.errorMessage}
          <br />
          <span style={{ color: '#6b7280' }}>You can enter values manually below.</span>
        </div>
      )}

      {/* ── Success: read-only weather cards ─────────────────────── */}
      {dataIsFromApi && (
        <div style={{ marginBottom: '24px' }}>
          {/* Header row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#166534',
                backgroundColor: '#dcfce7',
                padding: '2px 8px',
                borderRadius: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Live data
              </span>
              {environmental.weatherFetchedAt && (
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {formatFetchedAt(environmental.weatherFetchedAt)}
                </span>
              )}
            </div>
            <button
              onClick={() => handleFetchWeather(true)}
              style={{ ...styles.button, fontSize: '12px', padding: '4px 10px' }}
            >
              Refresh
            </button>
          </div>

          <WeatherValueCard label="Rainfall (7-day total)"   value={environmental.rainfall}    unit="mm" icon="🌧️" />
          <WeatherValueCard label="Temperature (7-day mean)" value={environmental.temperature}  unit="°C" icon="🌡️" />
          <WeatherValueCard label="Humidity (7-day mean)"    value={environmental.humidity}     unit="%" icon="💧" />

          {/* Override toggle */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_WEATHER_OVERRIDE' })}
            style={{ ...styles.buttonOutline, width: '100%', marginTop: '8px' }}
          >
            {weather.manualOverride ? '▲ Hide manual override' : '✎ Override values manually'}
          </button>
        </div>
      )}

      {/* ── Manual sliders ────────────────────────────────────────── */}
      {/* Shown when: no district selected, fetch failed, or override is open */}
      {(showOverrideSliders || weather.manualOverride) && (
        <div style={
          weather.manualOverride
            ? {
                padding: '16px',
                border: '1px dashed #d4d4d4',
                borderRadius: '8px',
                backgroundColor: '#fafafa',
                marginTop: '16px',
              }
            : {}
        }>
          {weather.manualOverride && (
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: 0, marginBottom: '16px' }}>
              Values entered here will override the fetched data.
            </p>
          )}

          <SliderInput
            label="Rainfall"
            value={environmental.rainfall}
            onChange={(v) => dispatch({ type: 'SET_ENVIRONMENTAL_DATA', payload: { rainfall: v, weatherSource: 'manual' } })}
            min={0} max={500} unit="mm"
          />
          <SliderInput
            label="Temperature"
            value={environmental.temperature}
            onChange={(v) => dispatch({ type: 'SET_ENVIRONMENTAL_DATA', payload: { temperature: v, weatherSource: 'manual' } })}
            min={15} max={40} unit="°C"
          />
          <SliderInput
            label="Humidity"
            value={environmental.humidity}
            onChange={(v) => dispatch({ type: 'SET_ENVIRONMENTAL_DATA', payload: { humidity: v, weatherSource: 'manual' } })}
            min={0} max={100} unit="%"
          />
        </div>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function InputForm() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');

  const { formData, currentStep } = state;
  const { soil } = formData;
  const environmental = formData.environmental;

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
      } catch {
        setBackendStatus('unhealthy');
        console.warn('Backend not available, will use fallback mode');
      }
    };
    checkHealth();
  }, [toast]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (soil.nitrogen < 0 || soil.nitrogen > 400)       newErrors.nitrogen    = 'Must be 0–400 ppm';
      if (soil.phosphorus < 0 || soil.phosphorus > 150)   newErrors.phosphorus  = 'Must be 0–150 ppm';
      if (soil.potassium < 0 || soil.potassium > 300)     newErrors.potassium   = 'Must be 0–300 ppm';
      if (soil.pH < 3.5 || soil.pH > 9.0)                 newErrors.pH          = 'Must be 3.5–9.0';
      if (!soil.soilType)                                  newErrors.soilType    = 'Please select a soil type';
    }

    if (step === 2) {
      if (environmental.rainfall < 0 || environmental.rainfall > 500)
        newErrors.rainfall    = 'Must be 0–500 mm';
      if (environmental.temperature < 15 || environmental.temperature > 40)
        newErrors.temperature = 'Must be 15–40 °C';
      if (environmental.humidity < 0 || environmental.humidity > 100)
        newErrors.humidity    = 'Must be 0–100 %';
      // Warn (not block) if no district selected
      if (!environmental.district && !state.weather.manualOverride)
        newErrors.district    = 'Select a district or enter values manually';
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
        description: `Recommended crop: ${recommendation.crop.label ?? recommendation.crop.crop} with ${recommendation.crop.confidence}% confidence`,
      });

      setIsSubmitting(false);
      navigate(`/recommendations/${recommendation.id}`);
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      toast({
        title: 'Backend Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to connect to ML backend. Please check if the backend is running.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = () => dispatch({ type: 'QUICK_FILL' });
  const handleReset     = () => dispatch({ type: 'RESET_FORM' });

  return (
    <div style={styles.container}>
      {/* Backend status */}
      {backendStatus === 'healthy' && (
        <div style={styles.statusHealthy}>✓ ML Backend Connected</div>
      )}
      {backendStatus === 'unhealthy' && (
        <div style={styles.statusUnhealthy}>⚠ Using fallback mode (backend unavailable)</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '8px' }}>
          Get Your Recommendation
        </h1>
        <p style={{ fontSize: '16px', color: '#4a4a4a' }}>
          Fill in your field data to receive personalised crop and fertilizer advice
        </p>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <button onClick={handleQuickFill} style={styles.button}>Quick Fill</button>
        <button onClick={handleReset}     style={styles.button}>Reset</button>
      </div>

      <ProgressIndicator currentStep={currentStep} />

      {/* Form card */}
      <div style={styles.card}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>
          {stepInfo[currentStep - 1].title}
        </h2>

        {/* ── Step 1: Soil ──────────────────────────────────────── */}
        {currentStep === 1 && (
          <>
            <SliderInput
              label="Nitrogen (N)"
              value={soil.nitrogen}
              onChange={(v) => dispatch({ type: 'SET_SOIL_DATA', payload: { nitrogen: v } })}
              min={0} max={400} unit="ppm"
            />
            <SliderInput
              label="Phosphorus (P)"
              value={soil.phosphorus}
              onChange={(v) => dispatch({ type: 'SET_SOIL_DATA', payload: { phosphorus: v } })}
              min={0} max={150} unit="ppm"
            />
            <SliderInput
              label="Potassium (K)"
              value={soil.potassium}
              onChange={(v) => dispatch({ type: 'SET_SOIL_DATA', payload: { potassium: v } })}
              min={0} max={300} unit="ppm"
            />
            <SliderInput
              label="Soil pH"
              value={soil.pH}
              onChange={(v) => dispatch({ type: 'SET_SOIL_DATA', payload: { pH: v } })}
              min={3.5} max={9.0} step={0.1} unit=""
            />

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Soil Type</label>
              <select
                value={(soil as any).soil_type ?? (soil as any).soilType ?? ''}
                onChange={(e) =>
                  dispatch({ type: 'SET_SOIL_DATA', payload: { soil_type: e.target.value } as any })
                }
                style={styles.select}
              >
                <option value="">Select soil type...</option>
                {SOIL_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.soilType && <div style={styles.error}>{errors.soilType}</div>}
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Soil Moisture</label>
              <input
                type="number"
                step="0.0001"
                min={0}
                max={1}
                value={soil.moisture ?? ''}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_SOIL_DATA',
                    payload: {
                      moisture:
                        e.target.value === '' ? (undefined as any) : Number(e.target.value),
                    },
                  })
                }
                placeholder="0.72"
                style={styles.input}
              />
            </div>
          </>
        )}

        {/* ── Step 2: Environmental / Weather ──────────────────── */}
        {currentStep === 2 && <EnvironmentalStep />}

        {/* Validation errors for step 2 */}
        {currentStep === 2 && errors.district && (
          <div style={{ ...styles.error, marginBottom: '16px' }}>{errors.district}</div>
        )}

        {/* Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e5e5',
        }}>
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
              {isSubmitting ? 'Analysing…' : 'Get Recommendation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}