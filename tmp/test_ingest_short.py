import os
import sys

# Mock 'pwd'
if os.name == 'nt':
    from types import ModuleType
    pwd = ModuleType('pwd')
    pwd.getpwuid = lambda uid: None
    pwd.getpwnam = lambda name: None
    sys.modules['pwd'] = pwd

from langchain_community.document_loaders import PyPDFLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

def test():
    pdf_path = r"c:\Users\kanchana_m\Desktop\Susandi-FYP\agri-insights\backend\data\HORTICULTURE.pdf"
    print(f"Loading page 1 of {pdf_path}...")
    loader = PyPDFLoader(pdf_path)
    # Just load first 2 pages
    pages = loader.load()[:2]
    print(f"Loaded {len(pages)} pages.")
    
    print("Initializing embeddings (this might download a model)...")
    embeddings = HuggingFaceEmbeddings(model_name="all-mpnet-base-v2")
    
    print("Creating tiny vector store...")
    vector_store = FAISS.from_documents(pages, embeddings)
    print("Success!")

if __name__ == "__main__":
    test()
