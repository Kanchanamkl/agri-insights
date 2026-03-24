import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type {
  FormData,
  Recommendation,
  SoilData,
  EnvironmentalData,
  FieldData,
} from '@/types';

// ─── Default form values ──────────────────────────────────────────────────────

const initialSoilData: SoilData = {
  nitrogen: 100,
  phosphorus: 50,
  potassium: 100,
  carbon: 30,
  pH: 6.5,
  soilType: 'Loamy',
  moisture: 0.5,
};

const initialEnvironmentalData: EnvironmentalData = {
  rainfall: 0,
  temperature: 0,
  humidity: 0,
  // weather metadata fields are intentionally absent on initial load
};

const initialFieldData: FieldData = {
  previousCrop: 'Rice',
  irrigationType: 'rainfed',
  landSize: 1,
  region: 'Southern',
};

const initialFormData: FormData = {
  soil: initialSoilData,
  environmental: initialEnvironmentalData,
  field: initialFieldData,
};

// ─── Weather fetch state (kept outside formData to avoid polluting payloads) ──

export type WeatherFetchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface WeatherState {
  status: WeatherFetchStatus;
  /** District name currently selected by the farmer */
  selectedDistrict: string;
  /** Province of the selected district (used to drive the province dropdown) */
  selectedProvince: string;
  /** User-facing error message when status === 'error' */
  errorMessage: string;
  /**
   * When true the farmer has opened the manual-override panel and the
   * sliders are editable regardless of fetch status.
   */
  manualOverride: boolean;
}

const initialWeatherState: WeatherState = {
  status: 'idle',
  selectedDistrict: '',
  selectedProvince: '',
  errorMessage: '',
  manualOverride: false,
};

// ─── State shape ──────────────────────────────────────────────────────────────

interface AppState {
  formData: FormData;
  currentStep: number;
  recommendations: Recommendation[];
  isLoading: boolean;
  isDarkMode: boolean;
  demoMode: boolean;
  /** Weather-fetch lifecycle state — separate from formData */
  weather: WeatherState;
}

const initialState: AppState = {
  formData: initialFormData,
  currentStep: 1,
  recommendations: [],
  isLoading: false,
  isDarkMode: false,
  demoMode: false,
  weather: initialWeatherState,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  // ── existing actions (unchanged) ──────────────────────────────────────────
  | { type: 'SET_SOIL_DATA';         payload: Partial<SoilData> }
  | { type: 'SET_ENVIRONMENTAL_DATA'; payload: Partial<EnvironmentalData> }
  | { type: 'SET_FIELD_DATA';        payload: Partial<FieldData> }
  | { type: 'SET_STEP';              payload: number }
  | { type: 'RESET_FORM' }
  | { type: 'QUICK_FILL' }
  | { type: 'ADD_RECOMMENDATION';    payload: Recommendation }
  | { type: 'SET_LOADING';           payload: boolean }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'TOGGLE_DEMO_MODE' }
  // ── new weather actions ────────────────────────────────────────────────────
  /**
   * Called when the farmer picks a district from the dropdown.
   * Resets fetch status so the UI shows the "Fetch weather" button again.
   */
  | { type: 'SET_SELECTED_DISTRICT'; payload: { district: string; province: string } }
  /**
   * Called just before the API request fires.
   */
  | { type: 'SET_WEATHER_LOADING' }
  /**
   * Called on a successful fetch.  Merges temperature/humidity/rainfall +
   * metadata (district, fetchedAt, weatherSource) into formData.environmental.
   */
  | {
      type: 'SET_WEATHER_SUCCESS';
      payload: {
        temperature: number;
        humidity: number;
        rainfall: number;
        fetchedAt: string;
        district: string;
      };
    }
  /**
   * Called when the fetch fails.  Keeps the previous environmental values
   * intact so the farmer can still submit manually.
   */
  | { type: 'SET_WEATHER_ERROR'; payload: string }
  /**
   * Toggles the manual-override slider panel on Step 2.
   */
  | { type: 'TOGGLE_WEATHER_OVERRIDE' }
  /**
   * Clears only the weather metadata (district, fetchedAt, weatherSource)
   * without changing the numeric values.  Useful when the user resets the
   * district picker back to the placeholder.
   */
  | { type: 'CLEAR_WEATHER_METADATA' };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    // ── soil / field (unchanged) ─────────────────────────────────────────────
    case 'SET_SOIL_DATA':
      return {
        ...state,
        formData: {
          ...state.formData,
          soil: { ...state.formData.soil, ...action.payload },
        },
      };

    case 'SET_FIELD_DATA':
      return {
        ...state,
        formData: {
          ...state.formData,
          field: { ...state.formData.field, ...action.payload },
        },
      };

    // ── environmental — used for manual slider edits ─────────────────────────
    case 'SET_ENVIRONMENTAL_DATA':
      return {
        ...state,
        formData: {
          ...state.formData,
          environmental: { ...state.formData.environmental, ...action.payload },
        },
      };

    // ── step ─────────────────────────────────────────────────────────────────
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };

    // ── reset / quick-fill ───────────────────────────────────────────────────
    case 'RESET_FORM':
      return {
        ...state,
        formData: initialFormData,
        currentStep: 1,
        weather: initialWeatherState,
      };

    case 'QUICK_FILL':
      return { ...state, formData: initialFormData };

    // ── recommendations ──────────────────────────────────────────────────────
    case 'ADD_RECOMMENDATION': {
      const rec = action.payload;
      const withId: Recommendation = rec.id
        ? rec
        : { ...rec, id: String(Date.now()) };
      return {
        ...state,
        recommendations: [withId, ...state.recommendations].slice(0, 20),
      };
    }

    // ── loading ───────────────────────────────────────────────────────────────
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    // ── dark mode / demo mode ─────────────────────────────────────────────────
    case 'TOGGLE_DARK_MODE':
      return { ...state, isDarkMode: !state.isDarkMode };

    case 'TOGGLE_DEMO_MODE':
      return { ...state, demoMode: !state.demoMode };

    // ── weather: district selection ───────────────────────────────────────────
    case 'SET_SELECTED_DISTRICT':
      return {
        ...state,
        weather: {
          ...state.weather,
          selectedDistrict: action.payload.district,
          selectedProvince: action.payload.province,
          // Reset fetch state so the "Fetch weather" button appears fresh
          status: 'idle',
          errorMessage: '',
          manualOverride: false,
        },
        // Clear stale metadata from a previous district selection
        formData: {
          ...state.formData,
          environmental: {
            ...state.formData.environmental,
            district: undefined,
            weatherFetchedAt: undefined,
            weatherSource: undefined,
          },
        },
      };

    // ── weather: fetch started ────────────────────────────────────────────────
    case 'SET_WEATHER_LOADING':
      return {
        ...state,
        weather: {
          ...state.weather,
          status: 'loading',
          errorMessage: '',
        },
      };

    // ── weather: fetch succeeded ──────────────────────────────────────────────
    case 'SET_WEATHER_SUCCESS':
      return {
        ...state,
        weather: {
          ...state.weather,
          status: 'success',
          errorMessage: '',
          manualOverride: false, // collapse override panel on fresh fetch
        },
        formData: {
          ...state.formData,
          environmental: {
            ...state.formData.environmental,
            temperature:    action.payload.temperature,
            humidity:       action.payload.humidity,
            rainfall:       action.payload.rainfall,
            district:       action.payload.district,
            weatherFetchedAt: action.payload.fetchedAt,
            weatherSource:  'api',
          },
        },
      };

    // ── weather: fetch failed ─────────────────────────────────────────────────
    case 'SET_WEATHER_ERROR':
      return {
        ...state,
        weather: {
          ...state.weather,
          status: 'error',
          errorMessage: action.payload,
          // Automatically open manual override so the farmer is not stuck
          manualOverride: true,
        },
      };

    // ── weather: toggle manual override ──────────────────────────────────────
    case 'TOGGLE_WEATHER_OVERRIDE':
      return {
        ...state,
        weather: {
          ...state.weather,
          manualOverride: !state.weather.manualOverride,
        },
        // Mark environmental data as manually sourced when the farmer edits it
        formData: {
          ...state.formData,
          environmental: {
            ...state.formData.environmental,
            weatherSource: !state.weather.manualOverride ? 'manual' : state.formData.environmental.weatherSource,
          },
        },
      };

    // ── weather: clear metadata only (district picker reset to placeholder) ───
    case 'CLEAR_WEATHER_METADATA':
      return {
        ...state,
        weather: initialWeatherState,
        formData: {
          ...state.formData,
          environmental: {
            ...state.formData.environmental,
            district:        undefined,
            weatherFetchedAt: undefined,
            weatherSource:   undefined,
          },
        },
      };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  React.useEffect(() => {
    if (state.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.isDarkMode]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}