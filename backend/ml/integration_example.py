import sys
import os

# Add the parent directory to path so we can import rag_service
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ml.rag_service import AgriScheduler

def run_integration_mockup():
    print("--- Agri-Insights RAG Integration Mockup ---")
    
    # 1. Mock ML Model Outputs
    # These would normally come from your Random Forest model (e.g., joblib.load('model.pkl').predict(features))
    predicted_crop = "Banana"
    predicted_fertilizer = "NPK 14-14-14"
    soil_type = "Sandy Loam" 
    
    print(f"Input from ML Model: Crop={predicted_crop}, Fertilizer={predicted_fertilizer}")
    print(f"Contextual Info: Soil Type={soil_type}")
    print("Initializing RAG Scheduler (Loading Index & Gemini)...")
    
    try:
        # 2. Initialize Scheduler
        # Note: Ensure you've run ingest_kb.py first!
        scheduler = AgriScheduler()
        
        # 3. Generate the "A to Z" Plan
        print("\nQuerying Knowledge Base for Fertilizer & Watering Schedule...")
        final_plan = scheduler.get_schedule(predicted_crop, predicted_fertilizer, soil_type)
        
        print("\n--- GENERATED PLAN ---")
        print(final_plan)
        print("-----------------------")
        
    except FileNotFoundError:
        print("\nERROR: FAISS index not found. Please run 'python backend/ml/ingest_kb.py' first.")
    except ValueError as e:
        print(f"\nERROR: {e}. Please check your .env file.")
    except Exception as e:
        print(f"\nAN UNEXPECTED ERROR OCCURRED: {e}")

if __name__ == "__main__":
    run_integration_mockup()
