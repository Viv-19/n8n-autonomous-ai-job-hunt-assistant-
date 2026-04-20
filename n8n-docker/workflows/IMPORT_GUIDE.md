# 📥 n8n Workflow Setup Guide: Step-by-Step

Welcome! This guide will walk you through setting up the AI Job Hunt Assistant workflows in n8n. Follow these exact steps, and you'll have everything running in just a few minutes.

---

### Step 1: Start n8n
First, we need to make sure the n8n application is running on your machine.
1. Open your terminal (or command prompt).
2. Navigate to the `n8n-docker` folder inside this project.
3. Run the command: `docker compose up -d`
4. Wait a few seconds for the service to start.

### Step 2: Open the n8n Dashboard
1. Open your web browser (Chrome, Firefox, Safari, Edge, etc.).
2. Go to [http://localhost:5678](http://localhost:5678).
3. If this is your first time, it might ask you to set up an admin account. Go ahead and create one.

### Step 3: Import the Main Router Workflow
We have 3 workflows to import. Let's start with the most important one.
1. In the n8n dashboard, look at the left sidebar and click on **Workflows**.
2. Click the **"Add Workflow"** button at the top right.
3. Click the **"..."** (Options) menu in the top right corner of the blank workflow screen.
4. Select **"Import from File"**.
5. Browse your computer to find the project folder, go into `n8n-docker/workflows/`, and select `WF-001-main-chat-router.json`.
6. Click **Save** in the top right corner.

### Step 4: Import the Sub-Workflows
Now, repeat the exact same process from Step 3 for the remaining two files:
1. Import `WF-002-email-draft-send.json` and save it.
2. Import `WF-003-calendar-manager.json` and save it.

*Now all your workflows are loaded in n8n!* Let's connect them to your Google accounts.

### Step 5: Fix Credentials (The Red Warnings)
Because you imported these from a file, n8n doesn't have your personal Google logins yet. You will see some nodes with a **Red Warning Icon**.

For **every single node** with a red warning in *each* workflow:
1. **Double-click** the node to open its settings on the right panel.
2. Look for the **Credential** dropdown near the top.
3. Click the dropdown and select **"Create New Credential"** (if you haven't yet) or select your existing **"Google OAuth2 API"** credential.
4. If creating a new one, follow the prompts to safely log in with your Google account.
5. Once selected and the warning disappears, close the node window.
6. Remember to click **Save** on the whole workflow!

*Nodes that will need fixing across your workflows:*
- **Google Drive:** Fetch Resume
- **Gmail:** Send Email
- **Google Sheets:** Log Draft, Log Email Sent, Lookup Draft, Log Meeting
- **Google Calendar:** Check Conflicts, Create Event, Follow-up Reminder

### Step 6: Configure Environment Variables
The workflows need to know your specific API keys and file IDs to work outside of n8n.
1. In your project files on your computer, go to the `n8n-docker` folder.
2. Open the file named `.env` in a text editor (like VS Code or Notepad).
3. Fill in your exact values next to these lines:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   RESUME_FILE_ID=your_google_drive_resume_file_id_here
   SPREADSHEET_ID=your_google_sheets_id_here
   ```
4. Save the file.
5. **Restart n8n** so it can read the new `.env` file. You can do this by opening your terminal in the `n8n-docker` folder and running: `docker compose restart`

### Step 7: Activate Everything
Workflows won't run automatically to receive messages unless they are activated.
1. Open the n8n dashboard again at [http://localhost:5678](http://localhost:5678).
2. Open each workflow one by one (`WF-001`, `WF-002`, `WF-003`).
3. In the top-right corner of the screen, toggle the switch from **Inactive** to **Active**.

### Step 8: Final Test
Let's make sure it's working properly!
1. Open your terminal.
2. Run this exact command to send a test message to your AI Assistant's brain:
   ```bash
   curl -X POST http://localhost:5678/webhook/chat \
     -H "Content-Type: application/json" \
     -d '{"sessionId":"test-1","message":"Hello! Are you working?","action":"chat"}'
   ```
3. If everything is set up right, you should get a successful text response back to your terminal!

---

### ❓ Troubleshooting FAQ

- **"Webhook returns 404"**
  You probably forgot to turn the workflow toggle to **Active** in Step 7.
- **"Google Auth Error" or Permission Denied**
  One of your nodes still has a red warning. Go back to Step 5 and double-check every single Google node in all 3 workflows.
- **"Gemini returns empty"**
  Double-check your `GEMINI_API_KEY` in the `.env` file. You can generate a free key at [Google AI Studio](https://aistudio.google.com).
- **"Sheets/Drive ID Not Found"**
  Make sure you entered the correct `SPREADSHEET_ID` and `RESUME_FILE_ID` in your `.env` file. Do not include the whole URL, just the ID part.
