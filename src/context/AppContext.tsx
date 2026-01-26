import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { FormData, Recommendation, SoilData, EnvironmentalData, FieldData } from '@/types';

// Initial form data
const initialSoilData: SoilData = {
  nitrogen: 100,
  phosphorus: 50,
  potassium: 100,
  pH: 6.5,
  moisture: 'medium',
};

const initialEnvironmentalData: EnvironmentalData = {
  rainfall: 200,
  temperature: 28,
  humidity: 70,
};

const initialFieldData: FieldData = {
  previousCrop: '',
  irrigationType: 'rainfed',
  landSize: 1,
  region: '',
};

const initialFormData: FormData = {
  soil: initialSoilData,
  environmental: initialEnvironmentalData,
  field: initialFieldData,
};

// App State
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

// Actions
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

// Reducer
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
      return {
        ...state,
        formData: {
          soil: { nitrogen: 140, phosphorus: 45, potassium: 80, pH: 6.2, moisture: 'medium' },
          environmental: { rainfall: 180, temperature: 27, humidity: 75 },
          field: { previousCrop: 'Rice', irrigationType: 'flood', landSize: 2.5, region: 'Central' },
        },
      };
    case 'ADD_RECOMMENDATION':
      return {
        ...state,
        recommendations: [action.payload, ...state.recommendations].slice(0, 20),
      };
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

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Apply dark mode class to document
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

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
