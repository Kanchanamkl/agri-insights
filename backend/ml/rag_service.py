"""
Standard RAG (Retrieval-Augmented Generation) Expert Knowledge Service.
Architecture: FAISS Vector Store → LangChain Retrieval → Gemini LLM
"""
import os
import sys
import time

# Mock 'pwd' module for Windows compatibility with LangChain
if os.name == 'nt':
    from types import ModuleType
    pwd = ModuleType('pwd')
    pwd.getpwuid = lambda uid: None
    pwd.getpwnam = lambda name: None
    sys.modules['pwd'] = pwd

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain

# Load environment variables
load_dotenv()


class AgriScheduler:
    """
    Standard RAG pipeline using FAISS + LangChain + Gemini LLM.
    """

    def __init__(self, vectorstores_path=None):
        print("🔧 [INIT] Initializing AgriScheduler (FAISS + LLM RAG)...", flush=True)

        if vectorstores_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            vectorstores_path = os.path.join(base_dir, "data", "vectorstores")

        # --- 1. Google API Key ---
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        if not self.google_api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables.")

        # --- 2. LLM (Gemini) ---
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.2,
            max_output_tokens=2048,
            google_api_key=self.google_api_key,
        )

        # --- 3. Embeddings ---
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

        # --- 4. FAISS Vector Store ---
        if not os.path.exists(vectorstores_path):
            raise FileNotFoundError(
                f"FAISS index not found at {vectorstores_path}. Run ingest_kb.py first."
            )
        self.vectorstore = FAISS.load_local(
            vectorstores_path,
            self.embeddings,
            allow_dangerous_deserialization=True,
        )
        print("✅ [INIT] AgriScheduler Ready.", flush=True)

    def get_schedule(self, predicted_crop: str, predicted_fertilizer: str) -> str | None:
        """
        Full RAG pipeline:
          1. FAISS retrieval (k=1, metadata-filtered)
          2. LangChain prompt construction
          3. Gemini LLM generation
        Returns the LLM-generated expert plan as a markdown string.
        """
        t0 = time.time()
        crop_key = predicted_crop.lower().strip()
        print(f"\n🔍 [RAG] Starting pipeline for crop='{crop_key}'...", flush=True)

        # --- Step 1: FAISS Retriever ---
        retriever = self.vectorstore.as_retriever(
            search_kwargs={"k": 1, "filter": {"crop": crop_key}},
        )

        # --- Step 2: Prompt Template ---
        system_prompt = (
            "You are a Senior Horticultural Scientist specialized in TNAU (Tamil Nadu) guidelines.\n"
            "Using ONLY the context below, create a concise cultivation plan for the predicted crop.\n\n"
            "FORMAT RULES (STRICT):\n"
            "1. Output a Markdown table with EXACTLY 3 columns: Category | Expert Recommendation | Technical Notes\n"
            "2. Rows MUST cover: [Soil & Climate], [Irrigation / Watering], [Micronutrients / Pests], [Variety & Yield Tips].\n"
            "3. DO NOT include rows for NPK fertilizer (Basal or Top Dressing) as those are handled by a separate model.\n"
            "4. Each cell MUST be technical and brief (max 15 words).\n"
            "5. After the table, add one short 'Pro-Tip' for maximum yield based on the varieties mentioned in the context.\n"
            "6. Total response MUST be under 200 words.\n\n"
            "CONTEXT:\n{context}"
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "Generate the expert horticultural plan for {predicted_crop}."),
        ])

        # --- Step 3: LangChain RAG Chain ---
        print("   - Building LangChain retrieval chain...", flush=True)
        question_answer_chain = create_stuff_documents_chain(self.llm, prompt)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)

        # --- Step 4: Invoke ---
        print("   - Invoking Gemini LLM...", flush=True)
        response = rag_chain.invoke({
            "input": f"Expert plan for {predicted_crop}",
            "predicted_crop": predicted_crop,
            "predicted_fertilizer": predicted_fertilizer,
        })

        duration = time.time() - t0

        # --- Diagnostics ---
        docs_found = len(response.get("context", []))
        answer = response.get("answer", "")
        print(f"   - Documents retrieved: {docs_found}", flush=True)
        print(f"   - Answer length: {len(answer)} chars", flush=True)
        print(f"✅ [RAG] Pipeline complete! Duration: {duration:.2f}s", flush=True)

        return answer if answer else None


# Quick self-test
if __name__ == "__main__":
    try:
        scheduler = AgriScheduler()
        result = scheduler.get_schedule("papaya", "General Purpose Fertilizer")
        if result:
            print("\n--- Papaya Expert Plan ---")
            print(result)
        else:
            print("No result.")
    except Exception as e:
        print(f"Init failed: {e}")
