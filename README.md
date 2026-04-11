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


## Local Setup & Run Instruction

Follow these steps to set up the project on your machine.

### 1. Prerequisites
- **Node.js**: [Install Node.js](https://nodejs.org/)
- **Python 3.10+**: [Install Python](https://www.python.org/)

### 2. General Setup
```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd agri-insights

# Install Frontend Dependencies
npm install
```

### 3. Backend Setup (AI & RAG)
The expert system requires a Python backend with a vector database.

```bash
cd backend
# Create and activate virtual environment
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install AI dependencies
pip install -r requirements.txt
```

### 4. Knowledge Base Ingestion (Crucial)
You must initialize the FAISS vector store to enable the Expert Cultivation Plans.
```bash
# From the backend directory with venv activated
python ml/ingest_kb.py
```

### 5. Environment Variables
Create a file named `.env` in the `backend/` directory:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
```

---

## Running the Application

### Start Backend (API)
In the `backend/` directory with `venv` activated:
```bash
python app.py
```

### Start Frontend (UI)
In a new terminal at the project root:
```bash
npm run dev
```

---


