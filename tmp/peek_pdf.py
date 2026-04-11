import os
from pypdf import PdfReader

pdf_path = r"c:\Users\kanchana_m\Desktop\Susandi-FYP\agri-insights\backend\data\HORTICULTURE.pdf"

if os.path.exists(pdf_path):
    reader = PdfReader(pdf_path)
    print(f"Total Pages: {len(reader.pages)}")
    for i in range(min(10, len(reader.pages))):
        print(f"--- Page {i+1} ---")
        print(reader.pages[i].extract_text()[:500])
else:
    print("PDF not found")
