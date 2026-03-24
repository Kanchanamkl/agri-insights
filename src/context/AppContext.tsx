import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { FormData, Recommendation, SoilData, EnvironmentalData, FieldData } from '@/types';

// ─── Default form values ──────────────────────────────────────────────────────

const initialSoilData: SoilData = {
  nitrogen: 100,
  phosphorus: 50,
  potassium: 100,
  carbon: 30,
  pH: 6.5,
  soilType: 'Loamy',
  moisture: 0.5, // numeric; 0.5 = medium/moist
};

const initialEnvironmentalData: EnvironmentalData = {
  rainfall: 200,
  temperature: 28,
  humidity: 70,
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

// ─── State shape ──────────────────────────────────────────────────────────────

interface AppState {
  formData: FormData;
  currentStep: number;
  recommendations: Recommendation[];
  isLoading: boolean;
  isDarkMode: boolean;
  demoMode: boolean;
}

const initialState: AppState = {
  formData: initialFormData,
  currentStep: 1,
  recommendations: [],
  isLoading: false,
  isDarkMode: false,
  demoMode: false,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_SOIL_DATA'; payload: Partial<SoilData> }
  | { type: 'SET_ENVIRONMENTAL_DATA'; payload: Partial<EnvironmentalData> }
  | { type: 'SET_FIELD_DATA'; payload: Partial<FieldData> }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'RESET_FORM' }
  | { type: 'QUICK_FILL' }
  | { type: 'ADD_RECOMMENDATION'; payload: Recommendation }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'TOGGLE_DEMO_MODE' };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SOIL_DATA':
      return {
        ...state,
        formData: {
          ...state.formData,
          soil: { ...state.formData.soil, ...action.payload },
        },
      };

    case 'SET_ENVIRONMENTAL_DATA':
      return {
        ...state,
        formData: {
          ...state.formData,
          environmental: { ...state.formData.environmental, ...action.payload },
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

    case 'SET_STEP':
      return { ...state, currentStep: action.payload };

    case 'RESET_FORM':
      return { ...state, formData: initialFormData, currentStep: 1 };

    case 'QUICK_FILL':
      return { ...state, formData: initialFormData };

    case 'ADD_RECOMMENDATION': {
      // Guarantee every stored recommendation has an id (Recommendations.tsx relies on it)
      const rec = action.payload;
      const withId: Recommendation = rec.id ? rec : { ...rec, id: String(Date.now()) };
      return {
        ...state,
        recommendations: [withId, ...state.recommendations].slice(0, 20),
      };
    }

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'TOGGLE_DARK_MODE':
      return { ...state, isDarkMode: !state.isDarkMode };

    case 'TOGGLE_DEMO_MODE':
      return { ...state, demoMode: !state.demoMode };

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