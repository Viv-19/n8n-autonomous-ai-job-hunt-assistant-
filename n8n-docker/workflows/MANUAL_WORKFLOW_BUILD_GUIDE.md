# 🤖 AI Job Hunt Assistant — Autonomous Agent Build Guide

> **Architecture**: Single autonomous AI Agent powered by Groq (Llama 3.3 70B) with conversational memory and Google tools.
> **Rate Limits**: 30 requests/minute, 1000 requests/day (FREE — no credit card needed).

---

## 📋 What You Are Building

Instead of multiple workflows with manual routing, you are building **ONE intelligent agent** that:
- 💬 **Chats naturally** — remembers your conversation like ChatGPT
- 📧 **Sends emails** — when you ask it to, it uses Gmail automatically
- 📅 **Manages calendar** — checks schedule, books meetings via Google Calendar
- 📊 **Logs activity** — tracks your job search in Google Sheets

```
React UI  ──POST──▶  Webhook  ──▶  AI Agent  ──▶  Respond to Webhook  ──▶  React UI
                                     │  │  │
                              ┌──────┘  │  └──────┐
                              ▼         ▼         ▼
                         Groq Chat   Memory    Tools
                          Model    (sessions)  (Gmail, Calendar, Sheets)
```

---

## 🔧 BEFORE YOU START — Prerequisites Checklist

Before touching n8n, complete these 3 setup tasks:

### ✅ Task A: Restart Docker with New Environment Variables

Your Groq API key is already saved in the `.env` file. Restart the container to load it:

1. Open your terminal/PowerShell
2. Navigate to `n8n-docker` folder
3. Run: `docker compose down; docker compose up -d`
4. Wait 10 seconds, then open `http://localhost:5678`

### ✅ Task B: Set up Google Cloud OAuth2 (for Gmail + Calendar)

This is a one-time setup. Follow every step exactly:

#### Step B1: Create a Google Cloud Project
1. Open your browser → go to **https://console.cloud.google.com**
2. Sign in with your Google account (the one whose Gmail you want the agent to use)
3. At the very top of the page, click the project dropdown (it may say "Select a project")
4. Click **"New Project"** in the top-right of the popup
5. Name it: **`n8n-job-assistant`**
6. Click **Create**
7. Wait 5 seconds. Now click the project dropdown again and **select** `n8n-job-assistant`

#### Step B2: Enable the APIs
1. In the left sidebar, click **"APIs & Services"** → **"Library"**
2. In the search bar, type **"Gmail API"** → click it → click the blue **"Enable"** button
3. Go back to the Library. Search **"Google Calendar API"** → click it → click **"Enable"**
4. Go back to the Library. Search **"Google Sheets API"** → click it → click **"Enable"**

#### Step B3: Configure the OAuth Consent Screen
1. In the left sidebar, click **"APIs & Services"** → **"OAuth consent screen"**
2. Click **"Get Started"** or select **"External"** → click **"Create"**
3. Fill in:
   - **App name**: `n8n-job-assistant`
   - **User support email**: Select your email from the dropdown
4. Scroll down → **Developer contact email**: Type your email
5. Click **"Save and Continue"**
6. On the **Scopes** page → just click **"Save and Continue"** (skip it)
7. On the **Test users** page → click **"+ Add Users"**
   - Type your **Gmail address** (example: `viveshkumarsingh19@gmail.com`)
   - Click **"Add"**
8. Click **"Save and Continue"** → Click **"Back to Dashboard"**

#### Step B4: Create OAuth Credentials
1. In the left sidebar, click **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → select **"OAuth client ID"**
3. **Application type**: Select **"Web application"**
4. **Name**: `n8n-client`
5. Under **"Authorized redirect URIs"**, click **"+ Add URI"**
   - Paste: `https://n8n.example.com/rest/oauth2-credential/callback`
   - ⚠️ **WAIT!** Don't save yet — you need to get the REAL redirect URI from n8n first. I'll tell you exactly when in the n8n steps below.
6. **For now, just save what you have.** We'll come back to add the correct redirect URI.
7. After clicking **Create**, a popup shows your **Client ID** and **Client Secret**
8. **Copy both** and save them somewhere (like Notepad) — you'll need them in n8n

### ✅ Task C: Create Your Job Hunt Spreadsheet
1. Go to **https://docs.google.com/spreadsheets**
2. Click **"+ Blank spreadsheet"**
3. Name it: **Job Hunt Tracker**
4. In the first row (Row 1), type these column headers:
   | A | B | C | D | E |
   |---|---|---|---|---|
   | Timestamp | Action | Details | Recipient | Status |
5. Rename the sheet tab at the bottom to: **Activity Log**
6. Look at the URL in your browser. It looks like:
   `https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXX/edit`
7. Copy that long `XXXXXXXXXXXXXXX` part — that's your **Spreadsheet ID**
8. Open `n8n-docker/.env` and replace `your-spreadsheet-id-here` with it

---

## 🏗️ BUILD THE WORKFLOW — Step by Step

### Step 0: Deactivate Your Old Workflow
1. Open n8n at `http://localhost:5678`
2. Go to **"Overview"** or **"Personal"** in the left sidebar
3. Find your old "My workflow"
4. Click the **3 dots** (⋮) next to it → click **"Deactivate"**
5. Now click **"+ Create Workflow"** at the top to start fresh
6. Name it: **JobHunt AI Agent**

---

### Step 1: Add the Webhook Node

This receives messages from your React chat UI.

1. Click the **+** button on the canvas
2. Search for **"Webhook"** → click it to add
3. Configure:
   - **HTTP Method**: `POST`
   - **Path**: `chat`
   - **Respond**: Select **"Using 'Respond to Webhook' Node"**
4. Close the node settings

---

### Step 2: Add the "Parse Input" Node

This extracts the message and session ID from the incoming request.

1. Click the **+** button on the right side of the Webhook node (the grey dot)
2. Search for **"Edit Fields"** (also called "Set") → click it
3. **Name** it: `Parse Input` (click the name at the top of the node and type it)
4. Click **"Add Field"** → **"String"**:
   - **Name**: `chatInput`
   - **Value**: Click the **"Expression"** tab → type: `{{ $json.body.message }}`
5. Click **"Add Field"** → **"String"** again:
   - **Name**: `sessionId`
   - **Value**: Expression → `{{ $json.body.sessionId }}`
6. Close the node

> ⚠️ **CRITICAL**: The field MUST be named exactly `chatInput` — the AI Agent node reads this name automatically.

---

### Step 3: Add the AI Agent Node

This is the brain of the entire system.

1. Click the **+** on the right of "Parse Input"
2. Search for **"AI Agent"** → click it
3. **Name** it: `JobHunt Agent`
4. **CRITICAL UI SETUP**: 
   - Under **Source for Prompt**, change **"Connected Chat Trigger Node"** to **"Define Below"**.
   - Make sure **Prompt (User Message)** says `={{ $json.chatInput }}` (it should default to this).
   - Under the **Options** section at the bottom, click the **"Add Option"** dropdown.
   - Select **"System Message"**. A new large text box will appear!
5. In that new **System Message** box, paste this entire prompt:

```
You are JobHunt AI, an intelligent and friendly job-search productivity assistant for Vivesh Kumar Singh.

## Your Capabilities
1. **Natural Conversation**: Chat naturally about career advice, interview tips, job search strategies, and any general questions.
2. **Email Management**: Draft and send professional job application emails, follow-ups, and thank-you notes.
3. **Calendar Management**: Schedule interviews, meetings, and follow-up reminders.
4. **Activity Tracking**: Log important job search actions.

## CRITICAL: Email Drafting Protocol (YOU MUST FOLLOW THIS)
When the user asks you to draft, compose, write, or send an email:

**STEP 1 — ALWAYS show the draft first. NEVER call the Gmail tool immediately.**
Format your response EXACTLY like this:

Here is your draft email:

To: recipient@example.com
Subject: Your subject line here

Dear [Name],

[Body paragraph 1]

[Body paragraph 2]

[Closing]

Best regards,
Vivesh Kumar Singh

📎 Resume: https://drive.google.com/file/d/1QYL3zKgU7CFZlEtBxQnDcduUVpFM0JsU/view?usp=sharing

Should I send this email?

**STEP 2 — ONLY call the Gmail tool AFTER the user explicitly says "yes", "send it", "mail it", "looks good", or similar approval.**
When sending via Gmail, format the email body using proper HTML:
- Use <p> tags for paragraphs
- Use <br> for line breaks within a paragraph
- Use <strong> for emphasis
- Always include the resume link at the bottom as: <p>📎 My resume is available here: <a href="https://drive.google.com/file/d/1QYL3zKgU7CFZlEtBxQnDcduUVpFM0JsU/view?usp=sharing">View Resume</a></p>
- Sign off as "Vivesh Kumar Singh"

## Resume Information
Vivesh's resume is on Google Drive. ALWAYS include this link in job application and referral emails:
https://drive.google.com/file/d/1QYL3zKgU7CFZlEtBxQnDcduUVpFM0JsU/view?usp=sharing

## Response Rules
- Be conversational, warm, and helpful — like a smart friend who knows about jobs.
- Keep responses concise but valuable.
- NEVER send an email without showing the draft first and getting user approval.
- When scheduling, confirm the date/time/attendees before creating the event.
- If a request is unclear, ask a clarifying question.
- Do NOT wrap your responses in JSON or code blocks. Respond in plain, natural text.
```

5. Close the node for now (we'll attach the Chat Model, Memory, and Tools next)

---

### Step 4: Attach the Groq Chat Model

This gives the AI Agent its "brain" — powered by Llama 3.3 70B via Groq (super fast, 100% free).

1. Look at the **AI Agent** node — you'll see a small dot/connector labeled **"Chat Model"** at the bottom
2. Click the **+** icon on that "Chat Model" connector
3. Search for **"Groq Chat Model"** → click it
4. It will ask for a **Credential**:
   - Click **"Create New Credential"**
   - **API Key**: Paste your API key from Groq Console (`YOUR_GROQ_API_KEY_HERE`)
   - Click **"Save"**
5. Now configure the model:
   - **Model**: Select **`llama-3.3-70b-versatile`** from the dropdown
     - (If you don't see it, type it manually)
   - **Temperature**: `0.4` (makes it focused but not too robotic)
6. Close the node

> 💡 **Why Groq?** It runs Llama 3.3 70B at 30 requests/min for FREE. Gemini's free tier only allows 5 req/min and 20 per day. Groq gives you 1000 requests per day!

---

### Step 5: Attach Simple Memory

This makes the agent remember your conversation — just like ChatGPT sessions.

1. On the **AI Agent** node, find the **"Memory"** connector dot
2. Click the **+** icon
3. Click **"Simple Memory"** (under the "For beginners" section)
4. Configure:
   - **Session Key**: Type the plain text `sessionId` (Do NOT use an expression. Just type the word exactly like that so it knows which JSON column to read).
   - **Context Window Length**: `10` (remembers the last 10 messages back-and-forth)
5. Close the node

> 💡 Each browser tab gets a unique `sessionId`, so different tabs = different conversations, just like ChatGPT's sidebar!

---

### Step 6: Add the Respond to Webhook Node

This sends the agent's reply back to your React chat UI.

1. Click the **+** on the right side of the **AI Agent** node
2. Search for **"Respond to Webhook"** → click it
3. Configure:
   - **Respond With**: `Text`
   - **Response Body**: Click **"Expression"** → type: `{{ $json.output }}`
4. Click **"Add Option"** → **"Response Headers"**
   - Click **"Add Response Header"**
   - **Name**: `Content-Type`
   - **Value**: `application/json`
5. Close the node

---

### Step 7: (Optional) Add Gmail Tool — Send Email

Skip this step if you haven't completed the Google OAuth2 setup (Task B) yet.
You can always come back and add tools later.

1. On the **AI Agent** node, find the **"Tool"** connector dot at the bottom
2. Click the **+** icon
3. Search for **"Gmail"** → click it
4. **Credential Setup** (first time only):
   - Click **"Create New Credential"**
   - Select **"Google OAuth2 API"**
   - **Client ID**: Paste from Step B4
   - **Client Secret**: Paste from Step B4
   - **IMPORTANT**: Look at the **"OAuth Redirect URL"** shown in n8n — copy it!
   - Go back to Google Cloud Console → Credentials → Edit your OAuth Client
   - Under **"Authorized redirect URIs"**, replace the placeholder with this copied URL
   - Click **Save** in Google Console
   - Come back to n8n → Click **"Sign in with Google"**
   - If you see "Google hasn't verified this app", click **"Advanced"** → **"Go to n8n-job-assistant (unsafe)"**
   - Grant permissions → Click **"Save"** in n8n
5. **Configure Fields** (this is where the magic happens):
   - **Resource**: `Message` (keep this fixed — do NOT let model decide)
   - **Operation**: `Send` (keep this fixed — do NOT let model decide)
   - **To**: Click the ✨ icon → **"Let the model decide"** ← The AI extracts the email from your chat
   - **Subject**: Click the ✨ icon → **"Let the model decide"** ← The AI writes a smart subject line
   - **Message**: Click the ✨ icon → **"Let the model decide"** ← The AI writes the email body
6. Close the node

> 💡 **Rule of Thumb**: Use ✨ "Let the model decide" on fields that *change* based on what you type in the chat (To, Subject, Body). Keep fields *fixed* that define what the tool does (Resource = Message, Operation = Send).

---

### Step 8: (Optional) Add Google Calendar Tool — Create Event

1. Click **+** on the **Tool** connector of the AI Agent (again)
2. Search for **"Google Calendar"** → click it
3. Configure:
   - **Operation**: `Create Event` (keep fixed)
   - **Credential**: Select the **same** Google OAuth2 credential you created in Step 7
   - **Calendar**: Select `Primary` (keep fixed)
   - **Start Time**: Click ✨ → **"Let the model decide"** ← AI calculates the date/time from your chat
   - **End Time**: Click ✨ → **"Let the model decide"** ← AI calculates when the meeting ends
   - **Summary/Title**: Click ✨ → **"Let the model decide"** ← AI writes a title like "Interview at Google"
   - **Description**: Click ✨ → **"Let the model decide"** ← AI adds notes about the meeting
   - **Attendees**: Click ✨ → **"Let the model decide"** ← AI extracts attendee emails from your chat
4. Close the node

**Add a second Calendar tool** (for checking your schedule):
1. Click **+** on Tool connector again → Google Calendar
2. Configure:
   - **Operation**: `Get Many` (keep fixed — this lets the agent READ your calendar)
   - **Credential**: Same Google OAuth2 credential
   - **Calendar**: `Primary` (keep fixed)
   - **Return All**: Toggle ON (keep fixed)
   - **After**: Click ✨ → **"Let the model decide"** ← AI figures out the start date to search
   - **Before**: Click ✨ → **"Let the model decide"** ← AI figures out the end date to search
3. Close the node

---

### Step 9: (Optional) Add Google Sheets Tool — Activity Log

1. Click **+** on Tool connector → Search **"Google Sheets"**
2. Configure:
   - **Operation**: `Append Row` (keep fixed)
   - **Credential**: Same Google OAuth2 credential
   - **Document**: Select your **"Job Hunt Tracker"** spreadsheet (keep fixed)
   - **Sheet**: Select **"Activity Log"** (keep fixed)
   - **Timestamp** (Column A): Click ✨ → **"Let the model decide"** ← AI fills in current date/time
   - **Action** (Column B): Click ✨ → **"Let the model decide"** ← AI writes "Email Sent", "Meeting Booked", etc.
   - **Details** (Column C): Click ✨ → **"Let the model decide"** ← AI writes a summary of what happened
   - **Recipient** (Column D): Click ✨ → **"Let the model decide"** ← AI fills in who was involved
   - **Status** (Column E): Click ✨ → **"Let the model decide"** ← AI writes "Completed", "Pending", etc.
3. Close the node

> 💡 **Why keep Sheets fields on "Let the model decide"?** Because every log entry is different! When you send an email, the AI logs "Email Sent to john@google.com — Thank you note for SWE interview". When you book a meeting, it logs something completely different. The AI adapts automatically.

---

### Step 10: Publish & Test! 🚀

1. Click **"Save"** (top right)
2. Toggle the **"Published"** switch at the top right (it should turn green and say "Active")
3. Open your React app: `http://localhost:5173`
4. Type: **"Hello! What can you help me with?"**
5. You should get a natural, conversational response! 🎉

#### Test Memory:
1. Type: **"My name is Vivesh"**
2. Then type: **"What is my name?"**
3. It should correctly say **"Vivesh"** — proving memory works!

#### Test Email (only if Gmail tool is connected):
1. Type: **"Draft an email to john@example.com about the Software Engineer role at Google"**
2. It should return a professional draft email!

---

## 🐛 Troubleshooting

### "Service unavailable" or "Too many requests"
- **Groq free tier**: Max 30 requests per minute. Wait 60 seconds and try again.
- Add retry: Click the **AI Agent** node → **Settings** tab → **Retry on Fail** → ON → Max Tries: 3 → Wait: 5000ms

### "Node not found" or "Cannot find Chat Model"
- Make sure you are running the latest n8n Docker image: `docker pull docker.n8n.io/n8nio/n8n`
- Restart container: `docker compose down; docker compose up -d`

### React shows "Unexpected end of JSON input"
- Check the **Respond to Webhook** node:
  - Make sure **Respond With** = `Text`
  - Make sure **Response Body** = `{{ $json.output }}`
  - Make sure **Response Header** `Content-Type` = `application/json`

### "Google hasn't verified this app" popup
- This is normal! Click **"Advanced"** at the bottom → **"Go to n8n-job-assistant (unsafe)"**
- This only appears because your OAuth app is in "Testing" mode (perfectly fine for personal use)

### Agent gives weird/unstructured responses
- Double-check the **System Message** in the AI Agent node — make sure it includes the JSON format instructions
- Lower the **Temperature** in the Groq Chat Model to `0.2` for stricter output

---

## 📊 Rate Limits Comparison

| Provider | Model | RPM | RPD | Cost |
|----------|-------|-----|-----|------|
| **Groq (CURRENT)** | Llama 3.3 70B | **30** | **1,000** | **FREE** |
| Google Gemini | 2.5 Flash | 5 | 20 | FREE |
| OpenAI | GPT-4o-mini | 3 | 200 | FREE |

Groq gives you **50x more requests** than Gemini for free. 🎯
