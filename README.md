# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)


Train model : python -m ml.train
Run model : python app.py






python backend/ml/ingest_kb.

backend\venv\Scripts\python -m pip install langchain langchain-community langchain-google-genai faiss-cpu pypdf sentence-transformers python-dotenv
.\venv\Scripts\python -m pip install langchain langchain-community langchain-google-genai faiss-cpu pypdf sentence-transformers python-dotenv
grep GOOGLE_API_KEY backend/.env

.\venv\Scripts\python ..\ml\ingest_kb.py



ls backend/data/vectorstores

.\venv\Scripts\python -m pip list

.\venv\Scripts\python.exe -c "import langchain; print('success')"


c:\Users\kanchana_m\Desktop\Susandi-FYP\agri-insights\backend\venv\Scripts\python.exe c:\Users\kanchana_m\Desktop\Susandi-FYP\agri-insights\backend\ml\ingest_kb.py


c:\Users\kanchana_m\Desktop\Susandi-FYP\agri-insights\backend\venv\Scripts\python.exe -m pip install langchain-community pypdf faiss-cpu langchain-huggingface langchain-google-genai



.\venv\Scripts\python.exe ml/ingest_kb.py








.\venv\Scripts\Activate.ps1
python ml/ingest_kb.py
python app.py
python ml/integration_example.py








(venv) PS C:\Users\kanchana_m\Desktop\Susandi-FYP\agri-insights\backend> python ml/ingest_kb.py
Loading C:\Users\kanchana_m\Desktop\Susandi-FYP\agri-insights\backend\data\HORTICULTURE.pdf...
Splitting 442 pages into chunks...
Adding metadata to chunks...
Creating vector store for 920 chunks...
Warning: You are sending unauthenticated requests to the HF Hub. Please set a HF_TOKEN to enable higher rate limits and faster downloads.
Loading weights: 100%|██████████████████| 103/103 [00:00<00:00, 2084.98it/s]
BertModel LOAD REPORT from: sentence-transformers/all-MiniLM-L6-v2
Key                     | Status     |  |
------------------------+------------+--+-
embeddings.position_ids | UNEXPECTED |  |

Notes:
- UNEXPECTED:   can be ignored when loading from different task/architecture; not ok if you expect identical arch.
Saving FAISS index to C:\Users\kanchana_m\Desktop\Susandi-FYP\agri-insights\backend\data\vectorstores...
Ingestion complete!