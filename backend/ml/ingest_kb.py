import os
import pandas as pd
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "data", "crop_knowledge_base.csv")
DB_FAISS_PATH = os.path.join(BASE_DIR, "data", "vectorstores")

def ingest_csv():
    """
    Transforms the structured CSV into a FAISS vector store for high-speed RAG.
    """
    if not os.path.exists(CSV_PATH):
        print(f"❌ Error: CSV not found at {CSV_PATH}")
        return

    print(f"📥 Loading structured knowledge from: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    
    # Fill NA values to prevent errors
    df = df.fillna("Not specified in the expert documentation.")

    documents = []
    
    print(f"🧠 Processing {len(df)} crop records...")
    for index, row in df.iterrows():
        crop_name = str(row['crop']).lower().strip()
        
        # Combine column data into a clear, descriptive text block for the LLM
        content = (
            f"Crop: {crop_name}\n"
            f"Soil Requirements: {row['soil_type']}\n"
            f"Watering Guidelines: {row['watering_guideline']}\n"
            f"Basal Fertilizer: {row['basal_fertilizer']}\n"
            f"Top Dressing 1: {row['top_dressing_1']}\n"
            f"Top Dressing 2: {row['top_dressing_2']}\n"
            f"Micronutrient Needs: {row['micronutrients']}\n"
            f"Expert Variety Tips: {row['variety_tips']}"
        )
        
        # Create LangChain Document
        doc = Document(
            page_content=content,
            metadata={
                "crop": crop_name,
                "source": "crop_knowledge_base.csv",
                "row": index
            }
        )
        documents.append(doc)

    # Initialize Embeddings
    print("✨ Initializing embeddings (all-MiniLM-L6-v2)...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # Create and save FAISS index
    print(f"🏗 Building vector store for {len(documents)} crops...")
    vectorstore = FAISS.from_documents(documents, embeddings)
    
    print(f"💾 Saving FAISS index to {DB_FAISS_PATH}...")
    vectorstore.save_local(DB_FAISS_PATH)
    
    print("\n✅ Ingestion complete! The Expert System is now CSV-powered.")

if __name__ == "__main__":
    ingest_csv()
