# AI Job Hunt Assistant — System Architecture & Implementation Guide

> **Author**: Senior AI Systems Architect  
> **Version**: 1.0.0  
> **Date**: April 2026  
> **Status**: Blueprint — Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Component Deep Dive](#3-component-deep-dive)
4. [Data Flow Architectures](#4-data-flow-architectures)
5. [n8n Workflow Specifications](#5-n8n-workflow-specifications)
6. [Google Cloud Platform Setup](#6-google-cloud-platform-setup)
7. [Gemini API Strategy (Free Tier)](#7-gemini-api-strategy-free-tier)
8. [Frontend Architecture (React + Vite)](#8-frontend-architecture-react--vite)
9. [Security Architecture](#9-security-architecture)
10. [Error Handling & Resilience](#10-error-handling--resilience)
11. [Step-by-Step Implementation Guide](#11-step-by-step-implementation-guide)
12. [Google Sheets Schema](#12-google-sheets-schema)
13. [API Contracts](#13-api-contracts)
14. [Deployment Topology](#14-deployment-topology)
15. [Testing Strategy](#15-testing-strategy)

---

## 1. Executive Summary

The **AI Job Hunt Assistant** is a controlled productivity assistant with a chat-based UI that automates repetitive job-hunting tasks while keeping the user in full control. The system follows a **Human-in-the-Loop (HITL)** pattern — the AI drafts, the human approves.

### Architecture Philosophy

| Principle | Implementation |
|-----------|----------------|
| **User stays in control** | Approval gates on all outbound actions (emails) |
| **No paid LLM APIs** | Gemini Flash free tier with intelligent rate-limit management |
| **Auditable actions** | Every action logged to Google Sheets with timestamps |
| **Low infrastructure cost** | Self-hosted n8n on Docker, static React frontend |
| **Separation of concerns** | React handles UI, n8n handles orchestration, Gemini handles intelligence |

### Technology Stack Summary

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND          React 18 + Vite (localhost:5173)         │
│  ORCHESTRATION     n8n self-hosted Docker (localhost:5678)   │
│  INTELLIGENCE      Gemini 2.0 Flash (Free Tier API)         │
│  SERVICES          Gmail, Google Drive, Google Calendar,    │
│                    Google Sheets (all via n8n nodes)         │
│  RUNTIME           Docker Desktop (Windows + WSL2)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. High-Level System Architecture

```
                    ┌──────────────────────────────────────┐
                    │         USER'S BROWSER               │
                    │  ┌────────────────────────────────┐  │
                    │  │     React Chat Interface       │  │
                    │  │  ┌──────────┐ ┌─────────────┐  │  │
                    │  │  │ Chat     │ │ Draft       │  │  │
                    │  │  │ Panel    │ │ Preview     │  │  │
                    │  │  │          │ │ Panel       │  │  │
                    │  │  └──────────┘ └─────────────┘  │  │
                    │  │  ┌──────────────────────────┐   │  │
                    │  │  │ Action Bar              │   │  │
                    │  │  │ [Approve] [Reject] [Edit]│   │  │
                    │  │  └──────────────────────────┘   │  │
                    │  └───────────────┬────────────────┘  │
                    └─────────────────┼────────────────────┘
                                      │ HTTP POST (JSON)
                                      ▼
                    ┌──────────────────────────────────────┐
                    │      n8n ORCHESTRATION LAYER         │
                    │         (Docker: port 5678)          │
                    │                                      │
                    │  ┌──────────────────────────────┐    │
                    │  │  Webhook Receiver             │    │
                    │  │  (Entry Point for all flows)  │    │
                    │  └──────────┬───────────────────┘    │
                    │             │                         │
                    │  ┌──────────▼───────────────────┐    │
                    │  │  Intent Router (Switch Node)  │    │
                    │  │  Routes to correct workflow   │    │
                    │  └──┬────────┬────────┬────────┘    │
                    │     │        │        │              │
                    │  ┌──▼──┐ ┌──▼──┐ ┌──▼──┐           │
                    │  │Email│ │Cal. │ │Log  │           │
                    │  │Flow │ │Flow │ │Flow │           │
                    │  └──┬──┘ └──┬──┘ └──┬──┘           │
                    │     │        │        │              │
                    └─────┼────────┼────────┼──────────────┘
                          │        │        │
              ┌───────────┼────────┼────────┼──────────────┐
              │           ▼        ▼        ▼              │
              │  ┌─────────────────────────────────────┐   │
              │  │       GOOGLE CLOUD SERVICES          │   │
              │  │                                      │   │
              │  │  ┌────────┐  ┌────────┐  ┌────────┐ │   │
              │  │  │ Gmail  │  │Calendar│  │ Sheets │ │   │
              │  │  │  API   │  │  API   │  │  API   │ │   │
              │  │  └────────┘  └────────┘  └────────┘ │   │
              │  │  ┌────────┐  ┌──────────────────┐   │   │
              │  │  │ Drive  │  │ Gemini API       │   │   │
              │  │  │  API   │  │ (AI Studio Free) │   │   │
              │  │  └────────┘  └──────────────────┘   │   │
              │  └─────────────────────────────────────┘   │
              └────────────────────────────────────────────┘
```

### Component Responsibility Matrix

| Component | Responsibility | Communication |
|-----------|---------------|---------------|
| **React Frontend** | UI rendering, user input, draft display, approval UX | HTTP POST → n8n webhooks |
| **n8n Webhooks** | Receive all frontend requests, validate, route | Inbound HTTP, Outbound JSON response |
| **n8n Intent Router** | Classify request type (email/calendar/log/query) | Internal n8n Switch node |
| **Gemini Flash API** | Intent parsing, email drafting, NLP understanding | HTTP API via n8n HTTP Request node |
| **Gmail API** | Send emails with attachments | n8n Gmail node (OAuth2) |
| **Google Drive API** | Fetch resume PDF | n8n Google Drive node (OAuth2) |
| **Google Calendar API** | Create events, check conflicts | n8n Google Calendar node (OAuth2) |
| **Google Sheets API** | Log all actions, store contacts, store draft history | n8n Google Sheets node (OAuth2) |

---

## 3. Component Deep Dive

### 3.1 React Frontend (Presentation Layer)

The frontend is a **single-page application (SPA)** built with React 18 and Vite. It serves as the command center for the user.

#### UI Layout Architecture

```
┌────────────────────────────────────────────────────────────┐
│  HEADER — "AI Job Hunt Assistant"            [⚙ Settings] │
├────────────────────────┬───────────────────────────────────┤
│                        │                                   │
│   SIDEBAR              │   MAIN AREA                      │
│   ┌──────────────┐     │   ┌───────────────────────────┐  │
│   │ Quick Actions │     │   │   CHAT MESSAGE FEED       │  │
│   │ • Send Email  │     │   │                           │  │
│   │ • Schedule    │     │   │   [User] Send mail to     │  │
│   │ • View Logs   │     │   │   recruiter@company.com   │  │
│   │ • Contacts    │     │   │   about SDE position      │  │
│   ├──────────────┤     │   │                           │  │
│   │ Recent        │     │   │   [Bot] I've drafted an   │  │
│   │ Activity      │     │   │   email for you. Please   │  │
│   │ • Email sent  │     │   │   review below:           │  │
│   │   to John     │     │   │                           │  │
│   │ • Meeting     │     │   │   ┌─────────────────────┐ │  │
│   │   scheduled   │     │   │   │ DRAFT PREVIEW CARD  │ │  │
│   │               │     │   │   │ To: recruiter@co... │ │  │
│   │               │     │   │   │ Subject: Interest...│ │  │
│   │               │     │   │   │ Body: Dear ...      │ │  │
│   │               │     │   │   │ Attachment: resume  │ │  │
│   │               │     │   │   │ [✓ Approve] [✗ Rej] │ │  │
│   │               │     │   │   │ [✎ Edit]            │ │  │
│   │               │     │   │   └─────────────────────┘ │  │
│   └──────────────┘     │   │                           │  │
│                        │   └───────────────────────────┘  │
│                        │   ┌───────────────────────────┐  │
│                        │   │ MESSAGE INPUT              │  │
│                        │   │ [Type your command...]     │  │
│                        │   │                    [Send ▶]│  │
│                        │   └───────────────────────────┘  │
├────────────────────────┴───────────────────────────────────┤
│  STATUS BAR — Connected to n8n ● | Last action: 2m ago    │
└────────────────────────────────────────────────────────────┘
```

#### Component Tree

```
App
├── Header
│   ├── Logo
│   └── SettingsButton
├── Sidebar
│   ├── QuickActions
│   │   ├── ActionButton (Send Email)
│   │   ├── ActionButton (Schedule Meeting)
│   │   ├── ActionButton (View Logs)
│   │   └── ActionButton (Contacts)
│   └── RecentActivity
│       └── ActivityItem[]
├── MainArea
│   ├── ChatFeed
│   │   ├── MessageBubble (user)
│   │   ├── MessageBubble (assistant)
│   │   ├── DraftPreviewCard
│   │   │   ├── EmailPreview
│   │   │   ├── ApproveButton
│   │   │   ├── RejectButton
│   │   │   └── EditButton
│   │   ├── CalendarConfirmCard
│   │   └── TypingIndicator
│   └── MessageInput
│       ├── TextArea
│       └── SendButton
└── StatusBar
    ├── ConnectionStatus
    └── LastActionTimestamp
```

#### Frontend State Management

```javascript
// Core application state (React Context + useReducer)
const initialState = {
  // Chat state
  messages: [],           // Array of { id, role, content, timestamp, type }
  isTyping: false,        // Bot typing indicator
  sessionId: uuid(),      // Unique session for n8n memory

  // Draft state (for approval flow)
  pendingDraft: null,     // { to, subject, body, attachmentName, draftId }
  draftStatus: 'idle',    // 'idle' | 'reviewing' | 'approved' | 'rejected'

  // Calendar state
  pendingMeeting: null,   // { title, date, time, duration, attendees }
  
  // UI state
  sidebarOpen: true,
  recentActivity: [],     // Last 10 logged actions
  connectionStatus: 'connected',

  // Settings
  defaultResumeId: null,  // Google Drive file ID
  userEmail: '',
  userName: '',
};
```

### 3.2 n8n Orchestration Layer (Business Logic)

n8n acts as the **brain** of the system — it receives user commands, orchestrates API calls, and returns structured responses. The user never directly calls Gmail/Drive/Sheets APIs; everything goes through n8n workflows.

#### Why n8n (Not a Custom Backend)

| Concern | n8n Advantage |
|---------|---------------|
| Google OAuth2 management | Built-in credential manager with token refresh |
| Workflow visualization | Visual canvas shows exact execution path |
| Error handling | Built-in retry, error workflows, and execution logs |
| Rapid iteration | Drag-and-drop workflow changes, no code deploys |
| Integration library | 400+ pre-built nodes for Google services |

#### n8n Workflow Registry

| Workflow ID | Name | Trigger | Purpose |
|------------|------|---------|---------|
| `WF-001` | Main Chat Router | Webhook POST `/chat` | Entry point: receives all user messages |
| `WF-002` | Email Draft & Send | Internal (called by WF-001) | Generates draft, handles approval, sends email |
| `WF-003` | Calendar Manager | Internal (called by WF-001) | Creates events, checks conflicts |
| `WF-004` | Action Logger | Internal (called by all) | Writes action logs to Google Sheets |
| `WF-005` | Contact Manager | Webhook POST `/contacts` | CRUD operations on contact list |
| `WF-006` | Draft History | Webhook POST `/drafts` | Fetch/store previous drafts |

### 3.3 Gemini API Layer (Intelligence)

The Gemini API provides two core capabilities:

1. **Intent Classification** — Understanding what the user wants
2. **Content Generation** — Drafting professional emails

#### Intent Classification Prompt Design

```
SYSTEM: You are an intent classifier for a job hunt assistant.
Classify the user's message into exactly ONE of these intents:

- SEND_EMAIL: User wants to draft/send an email to someone
- SCHEDULE_MEETING: User wants to create a calendar event
- CHECK_CALENDAR: User wants to see their schedule
- VIEW_LOGS: User wants to see activity history
- VIEW_CONTACTS: User wants to see or manage contacts
- GENERAL_QUERY: General question or conversation

Return a JSON object with this structure:
{
  "intent": "<INTENT_TYPE>",
  "confidence": <0.0-1.0>,
  "entities": {
    "recipient_email": "<if detected>",
    "recipient_name": "<if detected>",
    "company": "<if detected>",
    "role": "<if detected>",
    "date": "<if detected, ISO format>",
    "time": "<if detected, 24hr>",
    "context": "<extracted context/purpose>"
  }
}

USER: {{user_message}}
```

#### Email Drafting Prompt Design

```
SYSTEM: You are a professional email writer for job applications.
Write a professional, concise email based on the following context.

Rules:
- Keep the tone professional but warm
- Keep the email under 200 words
- Include a clear call-to-action
- Mention the attached resume
- Use the sender's name in the signature

Context:
- Sender Name: {{user_name}}
- Sender Email: {{user_email}}
- Recipient: {{recipient_name}} at {{company}}
- Role: {{role}}
- Purpose: {{context}}

Return a JSON object:
{
  "subject": "<email subject line>",
  "body": "<complete email body>",
  "summary": "<one-line summary of what this email does>"
}
```

---

## 4. Data Flow Architectures

### 4.1 Email Flow (Complete Lifecycle)

```
 USER                    REACT UI                 n8n                     GOOGLE SERVICES        GEMINI
  │                        │                       │                          │                     │
  │  "Send mail to John    │                       │                          │                     │
  │   at Acme Corp about   │                       │                          │                     │
  │   SDE role"            │                       │                          │                     │
  │───────────────────────>│                       │                          │                     │
  │                        │                       │                          │                     │
  │                        │  POST /chat           │                          │                     │
  │                        │  {                    │                          │                     │
  │                        │   sessionId,          │                          │                     │
  │                        │   message,            │                          │                     │
  │                        │   action: "chat"      │                          │                     │
  │                        │  }                    │                          │                     │
  │                        │──────────────────────>│                          │                     │
  │                        │                       │                          │                     │
  │                        │                       │  ── Step 1: Intent ──    │                     │
  │                        │                       │  POST /v1/generateContent│                     │
  │                        │                       │──────────────────────────────────────────────>│
  │                        │                       │                          │                     │
  │                        │                       │  { intent: "SEND_EMAIL", │                     │
  │                        │                       │    entities: {           │                     │
  │                        │                       │      recipient: "john",  │                     │
  │                        │                       │      company: "Acme",    │                     │
  │                        │                       │      role: "SDE"         │                     │
  │                        │                       │    }                     │                     │
  │                        │                       │  }                       │                     │
  │                        │                       │<──────────────────────────────────────────────│
  │                        │                       │                          │                     │
  │                        │                       │  ── Step 2: Fetch Resume ──                   │
  │                        │                       │  GET file (Drive API)    │                     │
  │                        │                       │─────────────────────────>│                     │
  │                        │                       │  <resume.pdf binary>     │                     │
  │                        │                       │<─────────────────────────│                     │
  │                        │                       │                          │                     │
  │                        │                       │  ── Step 3: Draft Email ──                    │
  │                        │                       │  POST /v1/generateContent│                     │
  │                        │                       │──────────────────────────────────────────────>│
  │                        │                       │  { subject, body }       │                     │
  │                        │                       │<──────────────────────────────────────────────│
  │                        │                       │                          │                     │
  │                        │                       │  ── Step 4: Log Draft ── │                     │
  │                        │                       │  Append to Sheets        │                     │
  │                        │                       │─────────────────────────>│                     │
  │                        │                       │<─────────────────────────│                     │
  │                        │                       │                          │                     │
  │                        │  Response:            │                          │                     │
  │                        │  {                    │                          │                     │
  │                        │   type: "draft",      │                          │                     │
  │                        │   draft: {subject,    │                          │                     │
  │                        │     body, to, attach},│                          │                     │
  │                        │   draftId: "d-123",   │                          │                     │
  │                        │   message: "Review.." │                          │                     │
  │                        │  }                    │                          │                     │
  │                        │<──────────────────────│                          │                     │
  │                        │                       │                          │                     │
  │  Shows Draft Preview   │                       │                          │                     │
  │  with Approve/Reject   │                       │                          │                     │
  │<───────────────────────│                       │                          │                     │
  │                        │                       │                          │                     │
  │  Clicks [APPROVE]      │                       │                          │                     │
  │───────────────────────>│                       │                          │                     │
  │                        │                       │                          │                     │
  │                        │  POST /chat           │                          │                     │
  │                        │  {                    │                          │                     │
  │                        │   action: "approve",  │                          │                     │
  │                        │   draftId: "d-123"    │                          │                     │
  │                        │  }                    │                          │                     │
  │                        │──────────────────────>│                          │                     │
  │                        │                       │                          │                     │
  │                        │                       │  ── Step 5: Send Email ──│                     │
  │                        │                       │  Gmail.send({to, subject,│                     │
  │                        │                       │   body, attachment})     │                     │
  │                        │                       │─────────────────────────>│                     │
  │                        │                       │  <sent confirmation>     │                     │
  │                        │                       │<─────────────────────────│                     │
  │                        │                       │                          │                     │
  │                        │                       │  ── Step 6: Log Send ──  │                     │
  │                        │                       │  Append to Sheets        │                     │
  │                        │                       │─────────────────────────>│                     │
  │                        │                       │                          │                     │
  │                        │                       │  ── Step 7: Follow-up ── │                     │
  │                        │                       │  Create Calendar reminder│                     │
  │                        │                       │  (3 days later)          │                     │
  │                        │                       │─────────────────────────>│                     │
  │                        │                       │                          │                     │
  │                        │  { type: "confirmation",                         │                     │
  │                        │    message: "Email    │                          │                     │
  │                        │    sent successfully! │                          │                     │
  │                        │    Follow-up reminder │                          │                     │
  │                        │    set for Apr 22" }  │                          │                     │
  │                        │<──────────────────────│                          │                     │
  │                        │                       │                          │                     │
  │  Shows confirmation    │                       │                          │                     │
  │<───────────────────────│                       │                          │                     │
```

### 4.2 Calendar Flow

```
 USER                    REACT UI                 n8n                     GOOGLE SERVICES        GEMINI
  │                        │                       │                          │                     │
  │  "Schedule interview   │                       │                          │                     │
  │   with Acme Corp on    │                       │                          │                     │
  │   April 25 at 2pm"     │                       │                          │                     │
  │───────────────────────>│                       │                          │                     │
  │                        │  POST /chat           │                          │                     │
  │                        │──────────────────────>│                          │                     │
  │                        │                       │                          │                     │
  │                        │                       │  ── Step 1: Parse Intent ──                   │
  │                        │                       │──────────────────────────────────────────────>│
  │                        │                       │  { intent: "SCHEDULE_MEETING",                │
  │                        │                       │    entities: {date: "2026-04-25",             │
  │                        │                       │     time: "14:00", title: "Interview..."} }   │
  │                        │                       │<──────────────────────────────────────────────│
  │                        │                       │                          │                     │
  │                        │                       │  ── Step 2: Check Conflicts ──                │
  │                        │                       │  Calendar.getEvents(date)│                     │
  │                        │                       │─────────────────────────>│                     │
  │                        │                       │  <existing events list>  │                     │
  │                        │                       │<─────────────────────────│                     │
  │                        │                       │                          │                     │
  │                        │                       │  ── Step 3: Create Event ──                   │
  │                        │                       │  Calendar.createEvent()  │                     │
  │                        │                       │─────────────────────────>│                     │
  │                        │                       │  <event created>         │                     │
  │                        │                       │<─────────────────────────│                     │
  │                        │                       │                          │                     │
  │                        │                       │  ── Step 4: Log Action ──│                     │
  │                        │                       │  Sheets.append()         │                     │
  │                        │                       │─────────────────────────>│                     │
  │                        │                       │                          │                     │
  │                        │  { type: "calendar_confirm",                     │                     │
  │                        │    event: {title, date, time, link},             │                     │
  │                        │    conflicts: [] }    │                          │                     │
  │                        │<──────────────────────│                          │                     │
  │                        │                       │                          │                     │
  │  Shows Calendar Card   │                       │                          │                     │
  │<───────────────────────│                       │                          │                     │
```

---

## 5. n8n Workflow Specifications

### 5.1 WF-001: Main Chat Router

This is the **single entry point** for all frontend requests.

```
┌─────────────────┐
│  Webhook Node   │ ◄── POST /chat
│  (receives all  │     Body: { sessionId, message, action, draftId }
│   requests)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Set Node       │ ◄── Extract & sanitize: sessionId, message, action
│  (parse input)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     action === "approve"  ┌──────────────────┐
│  Switch Node    │────────────────────────────│  WF-002: Send    │
│  (route by      │                            │  Approved Email  │
│   action type)  │     action === "reject"   ┌──────────────────┐
│                 │────────────────────────────│  Log Rejection   │
│                 │                            │  Return confirm  │
│                 │     action === "chat"      └──────────────────┘
│                 │──────────┐
└─────────────────┘          │
                             ▼
                  ┌─────────────────┐
                  │  HTTP Request   │ ◄── Gemini API: Intent Classification
                  │  (Gemini Call)  │     Prompt: classify user message
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Switch Node    │ ◄── Route by intent
                  │  (intent router)│
                  └──┬─────┬────┬──┘
                     │     │    │
          ┌──────────┘     │    └──────────┐
          ▼                ▼               ▼
   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │ Email      │  │ Calendar   │  │ General    │
   │ SubWorkflow│  │ SubWorkflow│  │ Response   │
   │ (WF-002)   │  │ (WF-003)   │  │ (direct)   │
   └────────────┘  └────────────┘  └────────────┘
```

#### Webhook Configuration

```json
{
  "node": "Webhook",
  "parameters": {
    "httpMethod": "POST",
    "path": "chat",
    "responseMode": "responseNode",
    "options": {
      "allowedOrigins": "http://localhost:5173"
    }
  }
}
```

### 5.2 WF-002: Email Draft & Send Workflow

```
                    ┌─────────────────────┐
                    │  ENTRY: From Router  │
                    │  (intent = EMAIL)    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Google Drive Node   │
                    │  Download resume.pdf │
                    │  (by predefined ID)  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  HTTP Request Node   │
                    │  Gemini API Call     │
                    │  (Email Drafting     │
                    │   Prompt)            │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Code Node          │
                    │  Parse Gemini JSON  │
                    │  Generate draftId   │
                    │  Structure response │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Google Sheets Node  │
                    │  Log "DRAFT_CREATED" │
                    │  Store draft content │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Respond to Webhook  │
                    │  Return draft to UI  │
                    │  { type: "draft",    │
                    │    draft: {...},      │
                    │    draftId: "..." }   │
                    └─────────────────────┘

         ═══════════════════════════════════════
         User approves → new request hits WF-001
         → Switch routes to "approve" branch:
         ═══════════════════════════════════════

                    ┌─────────────────────┐
                    │  ENTRY: Approve      │
                    │  (action = "approve")│
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Google Sheets Node  │
                    │  Lookup draftId      │
                    │  Fetch draft content │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Gmail Node          │
                    │  Send email:         │
                    │  - To: recipient     │
                    │  - Subject: from draft│
                    │  - Body: from draft  │
                    │  - Attachment: resume │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Google Sheets Node  │
                    │  Log "EMAIL_SENT"    │
                    │  Update draft status │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Google Calendar Node│
                    │  Create follow-up    │
                    │  reminder (T+3 days) │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Respond to Webhook  │
                    │  { type: "confirm",  │
                    │    message: "Sent!"} │
                    └─────────────────────┘
```

### 5.3 WF-003: Calendar Manager

```
┌─────────────────────┐
│  ENTRY: From Router  │
│  (intent = CALENDAR) │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Code Node           │
│  Parse date/time     │
│  from Gemini entities│
│  Set start/end times │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Google Calendar     │
│  Get Events          │
│  (for that day)      │
│  → Check conflicts   │
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │  IF Node    │ ◄── Conflict detected?
    │  (conflict  │
    │   check)    │
    └──┬──────┬───┘
       │      │
   YES │      │ NO
       │      │
       ▼      ▼
 ┌──────────┐ ┌──────────────────┐
 │ Respond   │ │ Google Calendar   │
 │ with      │ │ Create Event      │
 │ conflict  │ │                   │
 │ warning   │ └────────┬─────────┘
 └──────────┘          │
                ┌──────▼──────────┐
                │ Google Sheets    │
                │ Log "MEETING_    │
                │ CREATED"         │
                └────────┬────────┘
                         │
                ┌────────▼────────┐
                │ Respond to      │
                │ Webhook with    │
                │ confirmation    │
                └─────────────────┘
```

### 5.4 WF-004: Action Logger (Sub-Workflow)

Called internally by all other workflows.

```
Input: { action_type, details, status, timestamp }

┌───────────────────┐
│  Google Sheets    │
│  Append Row to    │
│  "Action Log" tab │
│                   │
│  Columns:         │
│  - Timestamp      │
│  - Action Type    │
│  - Details        │
│  - Status         │
│  - Session ID     │
└───────────────────┘
```

---

## 6. Google Cloud Platform Setup

### 6.1 GCP Project Configuration

All Google services are accessed through a **single GCP project** with OAuth2 credentials shared via n8n's credential manager.

#### Required APIs to Enable

| API | Purpose | Enable URL |
|-----|---------|-----------|
| Gmail API | Send emails with attachments | `console.cloud.google.com/apis/library/gmail.googleapis.com` |
| Google Drive API | Download resume file | `console.cloud.google.com/apis/library/drive.googleapis.com` |
| Google Calendar API | Create events, check availability | `console.cloud.google.com/apis/library/calendar-json.googleapis.com` |
| Google Sheets API | Read/write logs and contacts | `console.cloud.google.com/apis/library/sheets.googleapis.com` |

#### OAuth2 Scopes Required

```
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.compose
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/spreadsheets
```

#### OAuth Consent Screen Setup

```
App Name:        AI Job Hunt Assistant
App Type:        External (Testing mode — up to 100 test users)
Authorized User: your-email@gmail.com
Scopes:          All scopes listed above
Status:          Testing (no Google review needed for personal use)
```

> **IMPORTANT**: In "Testing" status, your OAuth tokens expire every 7 days.
> You need to re-authorize in n8n periodically. To avoid this, you can
> publish the app (it will show a "This app isn't verified" warning, 
> which is fine for personal use).

#### OAuth2 Credential Creation

```
Type:              Web Application
Name:              n8n-job-assistant
Authorized JS Origin:  http://localhost:5678
Redirect URI:          http://localhost:5678/rest/oauth2-credential/callback
```

### 6.2 Google Drive Setup

```
Resume Storage Strategy:
├── Google Drive Root
│   └── Job Hunt Assistant (folder)
│       └── Resume_Current.pdf    ◄── Single predefined file
│           File ID: <copy from Drive URL>
│           Shared: Only with yourself
│
│  The file ID is stored as an n8n credential variable.
│  This avoids any file-selection complexity.
│
│  To update the resume: simply replace the file in Drive
│  (the file ID remains the same).
```

### 6.3 Google Sheets Structure

Create a single Google Spreadsheet with multiple tabs:

**Spreadsheet Name:** `AI Job Hunt Assistant - Data`

See [Section 12](#12-google-sheets-schema) for complete schema.

---

## 7. Gemini API Strategy (Free Tier)

### 7.1 Model Selection

| Model | Use Case | Why |
|-------|----------|-----|
| **Gemini 2.0 Flash** | Intent classification + email drafting | Best free-tier model: fast, capable, generous limits |

> **Do NOT use Gemini Pro** — It has stricter rate limits on free tier.
> Flash is specifically optimized for speed and has higher RPM/RPD allowances.

### 7.2 Free Tier Rate Limits (Gemini 2.0 Flash)

| Metric | Limit | Strategy |
|--------|-------|----------|
| **RPM** (Requests/Minute) | ~15 | Max 1 request per 4 seconds |
| **RPD** (Requests/Day) | ~1500 | Plenty for personal use (~50 emails/day max) |
| **TPM** (Tokens/Minute) | ~1,000,000 | Not a concern for short prompts |

### 7.3 Rate Limit Defense Strategy

```
┌─────────────────────────────────────────────────┐
│           RATE LIMIT DEFENSE LAYERS              │
├─────────────────────────────────────────────────┤
│                                                  │
│  Layer 1: REQUEST MINIMIZATION                   │
│  ─────────────────────────────                   │
│  • Each user message = MAX 2 Gemini calls:       │
│    1. Intent classification (~200 tokens)         │
│    2. Content generation (~500 tokens)            │
│  • Simple intents (view logs, contacts) skip     │
│    Gemini entirely — handled by n8n Switch node  │
│                                                  │
│  Layer 2: SMART CACHING (n8n Code Node)          │
│  ──────────────────────────────────               │
│  • Cache intent classifications for identical    │
│    message patterns (store in n8n static data)   │
│  • Cache draft templates for repeat contexts     │
│                                                  │
│  Layer 3: RETRY WITH BACKOFF (n8n built-in)      │
│  ──────────────────────────────────────           │
│  • On 429 response: wait 5s → retry              │
│  • Max 3 retries with exponential backoff        │
│  • After 3 failures: return friendly error msg   │
│                                                  │
│  Layer 4: PROMPT EFFICIENCY                      │
│  ──────────────────────────                      │
│  • Keep prompts under 300 tokens (input)         │
│  • Use structured JSON output format             │
│  • Avoid chain-of-thought (save tokens)          │
│  • Use system instructions (cached by Google)    │
│                                                  │
│  Layer 5: GRACEFUL DEGRADATION                   │
│  ────────────────────────────                    │
│  • If Gemini is unavailable, use local fallback  │
│    templates for common email types              │
│  • Template library stored in n8n static data    │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 7.4 Gemini API Call Structure (via n8n HTTP Request Node)

```json
{
  "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "queryParameters": {
    "key": "{{$credentials.geminiApiKey}}"
  },
  "body": {
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "{{$node['Set'].json.prompt}}"
          }
        ]
      }
    ],
    "generationConfig": {
      "temperature": 0.3,
      "maxOutputTokens": 1024,
      "responseMimeType": "application/json"
    },
    "systemInstruction": {
      "parts": [
        {
          "text": "You are a professional email assistant for job hunting..."
        }
      ]
    }
  }
}
```

### 7.5 API Key Management

```
Step 1: Go to https://aistudio.google.com/apikey
Step 2: Create API key (free, no credit card needed)
Step 3: Store in n8n as a Credential:
        - Type: "Header Auth" or custom credential
        - Name: "Gemini API Key"
        - Value: your-api-key

NEVER hardcode the key in workflows.
NEVER expose it to the frontend.
The key stays server-side in n8n's encrypted credential store.
```

---

## 8. Frontend Architecture (React + Vite)

### 8.1 Project Structure

```
ai-job-hunt-ui/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   │   ├── fonts/
│   │   └── icons/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Spinner.jsx
│   │   │   └── Toast.jsx
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── MainArea.jsx
│   │   │   └── StatusBar.jsx
│   │   ├── chat/
│   │   │   ├── ChatFeed.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── MessageInput.jsx
│   │   │   ├── TypingIndicator.jsx
│   │   │   └── QuickActions.jsx
│   │   └── cards/
│   │       ├── DraftPreviewCard.jsx
│   │       ├── CalendarConfirmCard.jsx
│   │       ├── ConflictWarningCard.jsx
│   │       └── ActivityCard.jsx
│   ├── context/
│   │   └── AppContext.jsx          # Global state (useReducer + Context)
│   ├── hooks/
│   │   ├── useChat.js              # Chat logic + n8n webhook calls
│   │   ├── useN8nConnection.js     # Health check + connection status
│   │   └── useDraftApproval.js     # Approve/reject/edit draft
│   ├── services/
│   │   └── n8nService.js           # HTTP client for n8n webhooks
│   ├── utils/
│   │   ├── formatters.js           # Date, time, message formatting
│   │   └── constants.js            # API URLs, config
│   ├── styles/
│   │   ├── index.css               # Global styles + design tokens
│   │   ├── chat.css                # Chat-specific styles
│   │   └── cards.css               # Card component styles
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
└── .env.local                      # N8N_WEBHOOK_URL=http://localhost:5678
```

### 8.2 Core Service Layer

```javascript
// src/services/n8nService.js
const N8N_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678';

class N8nService {
  constructor() {
    this.baseUrl = `${N8N_BASE_URL}/webhook`;
    this.sessionId = this._getOrCreateSession();
  }

  _getOrCreateSession() {
    let id = sessionStorage.getItem('chat_session_id');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('chat_session_id', id);
    }
    return id;
  }

  async sendMessage(message) {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        message: message,
        action: 'chat',
        timestamp: new Date().toISOString()
      })
    });
    if (!response.ok) throw new Error(`n8n error: ${response.status}`);
    return response.json();
  }

  async approveDraft(draftId) {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        action: 'approve',
        draftId: draftId,
        timestamp: new Date().toISOString()
      })
    });
    if (!response.ok) throw new Error(`Approval failed: ${response.status}`);
    return response.json();
  }

  async rejectDraft(draftId, reason = '') {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        action: 'reject',
        draftId: draftId,
        reason: reason,
        timestamp: new Date().toISOString()
      })
    });
    return response.json();
  }

  async healthCheck() {
    try {
      const response = await fetch(`${N8N_BASE_URL}/healthz`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const n8nService = new N8nService();
```

### 8.3 Design System Tokens

```css
/* src/styles/index.css — Design System */
:root {
  /* Color Palette — Dark Mode Primary */
  --bg-primary:     #0a0a0f;
  --bg-secondary:   #12121a;
  --bg-tertiary:    #1a1a2e;
  --bg-card:        #16213e;
  --bg-hover:       #1f2b47;

  /* Accent Colors */
  --accent-primary:   #6c63ff;    /* Purple — main brand */
  --accent-secondary: #00d4aa;    /* Teal — success/confirm */
  --accent-warning:   #ffa726;    /* Amber — warnings */
  --accent-danger:    #ef5350;    /* Red — reject/error */
  --accent-info:      #42a5f5;    /* Blue — information */

  /* Text */
  --text-primary:   #e8e8f0;
  --text-secondary: #9e9eb8;
  --text-muted:     #6b6b80;
  --text-accent:    #a5a0ff;

  /* Gradients */
  --gradient-brand:   linear-gradient(135deg, #6c63ff 0%, #4834d4 100%);
  --gradient-success: linear-gradient(135deg, #00d4aa 0%, #00b894 100%);
  --gradient-glass:   linear-gradient(135deg, rgba(108,99,255,0.1), rgba(0,212,170,0.05));

  /* Borders */
  --border-subtle:  1px solid rgba(108, 99, 255, 0.15);
  --border-active:  1px solid rgba(108, 99, 255, 0.4);
  --border-radius:  12px;
  --border-radius-lg: 20px;
  --border-radius-pill: 9999px;

  /* Shadows */
  --shadow-sm:   0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md:   0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-lg:   0 8px 32px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 20px rgba(108, 99, 255, 0.3);

  /* Typography */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* Animation */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 400ms ease;

  /* Layout */
  --sidebar-width: 280px;
  --header-height: 64px;
  --statusbar-height: 36px;
  --chat-max-width: 800px;
}
```

---

## 9. Security Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 SECURITY LAYERS                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  1. FRONTEND SECURITY                                     │
│     • No API keys stored in frontend code                 │
│     • No direct Google API calls from browser             │
│     • Input sanitization before sending to n8n            │
│     • Session ID is UUID, no auth tokens exposed          │
│                                                           │
│  2. n8n SECURITY                                          │
│     • N8N_ENCRYPTION_KEY set (encrypts all credentials)   │
│     • Webhook CORS restricted to localhost:5173            │
│     • All Google OAuth tokens managed by n8n              │
│     • Gemini API key in n8n credential store              │
│                                                           │
│  3. NETWORK SECURITY                                      │
│     • All services run on localhost only                   │
│     • No public endpoints (development mode)              │
│     • Docker network isolation                            │
│                                                           │
│  4. DATA SECURITY                                         │
│     • Gemini free tier: prompts MAY be used by Google     │
│       for model improvement — avoid sending PII in prompts│
│     • Strip email addresses from Gemini prompts where     │
│       possible (pass as n8n variables instead)            │
│     • Google Sheets data stays in your Google account     │
│                                                           │
│  5. APPROVAL GATES                                        │
│     • Email sending requires explicit user click          │
│     • Draft must be displayed before approval             │
│     • Reject option always available                      │
│     • No auto-send under any circumstances                │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 10. Error Handling & Resilience

### Error Categories & Responses

| Error | Detection | User-Facing Response | Recovery |
|-------|-----------|---------------------|----------|
| n8n unreachable | `healthCheck()` fails | "⚠ Assistant offline. Check n8n." | Retry every 10s |
| Gemini 429 (rate limit) | HTTP 429 response | "Processing... taking a moment." | Auto-retry with 5s backoff |
| Gemini 500 (server error) | HTTP 5xx | "AI temporarily unavailable." | Use template fallback |
| Gmail send failure | n8n Gmail node error | "Email failed to send. Try again?" | Log error, allow retry |
| Drive file not found | 404 from Drive API | "Resume not found in Drive." | Prompt user to check Drive |
| Calendar conflict | Events overlap detected | Show conflict card with alternatives | User decides |
| Invalid input | Empty/garbage message | "I didn't understand that. Try again." | Stay in chat |
| Sheets API error | 4xx/5xx from Sheets | Action proceeds, logging degraded | Retry log later |

### n8n Error Workflow Pattern

```
Main Workflow
     │
     ├── On Error ──► Error Handler Sub-Workflow
     │                     │
     │                     ├── Log error to Google Sheets "Error Log" tab
     │                     ├── Format user-friendly error message  
     │                     └── Return error response to frontend
     │
     └── On Success ──► Normal response
```

---

## 11. Step-by-Step Implementation Guide

### Phase 0: Environment Setup (Day 1)

#### Step 0.1: Install Prerequisites

```bash
# Windows prerequisites:
# 1. Install Node.js 20+ LTS from https://nodejs.org
# 2. Install Docker Desktop from https://docker.com
#    → Enable WSL2 backend during installation
# 3. Install Git from https://git-scm.com

# Verify installations:
node --version      # Should be v20.x or later
npm --version       # Should be v10.x or later
docker --version    # Should show Docker version
```

#### Step 0.2: Create Project Structure

```bash
# Navigate to your project directory
cd "d:\autonomous ai agent project\AI Job Hunt Assistant"

# Create top-level structure
mkdir n8n-docker
mkdir ai-job-hunt-ui
mkdir docs
mkdir docs\screenshots
```

#### Step 0.3: Set Up n8n with Docker

```bash
cd n8n-docker
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    container_name: n8n-job-assistant
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - NODE_ENV=production
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - WEBHOOK_URL=http://localhost:5678
      - N8N_RUNNERS_ENABLED=true
    volumes:
      - ./n8n_data:/home/node/.n8n
    networks:
      - job-assistant-net

networks:
  job-assistant-net:
    driver: bridge
```

Create `.env` file:

```env
# Generate a random encryption key (run in PowerShell):
# [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
N8N_ENCRYPTION_KEY=your-generated-key-here
```

Start n8n:

```bash
docker compose up -d
# Access n8n at http://localhost:5678
# Create your admin account on first visit
```

#### Step 0.4: Create GCP Project & Enable APIs

```
1. Go to https://console.cloud.google.com
2. Create new project: "AI Job Hunt Assistant"
3. Enable these APIs (APIs & Services → Library):
   - Gmail API
   - Google Drive API
   - Google Calendar API
   - Google Sheets API
4. Configure OAuth Consent Screen:
   - User Type: External
   - App Name: "AI Job Hunt Assistant"
   - Support Email: your-email
   - Scopes: gmail.send, gmail.compose, drive.readonly, calendar, 
             calendar.events, spreadsheets
   - Test Users: add your email
5. Create OAuth2 Credentials:
   - Type: Web Application
   - Authorized redirect URIs: 
     http://localhost:5678/rest/oauth2-credential/callback
   - Save Client ID and Client Secret
```

#### Step 0.5: Get Gemini API Key

```
1. Go to https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Select or create a Google Cloud project
4. Copy the API key
5. Store it securely — you'll add it to n8n in Phase 1
```

#### Step 0.6: Set Up Google Sheets

```
1. Go to https://sheets.google.com
2. Create new spreadsheet: "AI Job Hunt Assistant - Data"
3. Create these tabs (sheets):
   - "Action Log"     → See schema in Section 12
   - "Contacts"       → See schema in Section 12
   - "Draft History"  → See schema in Section 12
   - "Error Log"      → See schema in Section 12
4. Add header rows to each tab (see Section 12)
5. Copy the Spreadsheet ID from the URL:
   https://docs.google.com/spreadsheets/d/{THIS-IS-THE-ID}/edit
```

#### Step 0.7: Upload Resume to Google Drive

```
1. Go to https://drive.google.com
2. Create folder: "Job Hunt Assistant"
3. Upload your resume PDF to this folder
4. Right-click → "Get link" or note the File ID from URL:
   https://drive.google.com/file/d/{THIS-IS-THE-FILE-ID}/view
5. Save this File ID — you'll use it in n8n
```

---

### Phase 1: n8n Credential & Core Workflow Setup (Day 2-3)

#### Step 1.1: Configure Google OAuth2 in n8n

```
1. Open n8n at http://localhost:5678
2. Go to Credentials → Add Credential
3. Search for "Google OAuth2 API"
4. Enter:
   - Client ID: (from GCP)
   - Client Secret: (from GCP)
5. Click "Connect my account"
6. Authorize with your Google account
7. Grant all requested permissions
8. Save credential as "Google OAuth2 - Job Assistant"
```

#### Step 1.2: Configure Gemini API Key in n8n

```
1. Go to Credentials → Add Credential
2. Search for "Header Auth"
3. Create with:
   - Name: "Gemini API Key"
   - Name: x-goog-api-key  (OR use query parameter approach)
   
   Alternative (recommended): Store as a custom credential
   or use the n8n environment variable approach:
   
   In docker-compose.yml, add:
     - GEMINI_API_KEY=your-api-key-here
   
   Access in n8n Code nodes via:
     process.env.GEMINI_API_KEY
```

#### Step 1.3: Build WF-001 — Main Chat Router

Build this workflow in n8n's visual editor:

```
Node 1: Webhook
  - Method: POST
  - Path: chat
  - Response Mode: "Using 'Respond to Webhook' node"
  - Options → Allowed Origins: http://localhost:5173

Node 2: Set (Parse Input)
  - Set variables from webhook body:
    sessionId = {{ $json.body.sessionId }}
    message   = {{ $json.body.message }}
    action    = {{ $json.body.action }}
    draftId   = {{ $json.body.draftId }}
    timestamp = {{ $json.body.timestamp }}

Node 3: Switch (Route by Action)
  - Rule 1: action === "approve" → Go to Approve Branch
  - Rule 2: action === "reject"  → Go to Reject Branch
  - Default (action === "chat")  → Go to Gemini Intent Classification

Node 4: HTTP Request (Gemini — Intent Classification)
  - Method: POST
  - URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={{process.env.GEMINI_API_KEY}}
  - Body: (see Section 3.3 for prompt structure)
  - Content Type: JSON

Node 5: Code (Parse Gemini Response)
  - Extract intent and entities from Gemini JSON response
  - Handle malformed responses gracefully

Node 6: Switch (Route by Intent)
  - Rule 1: intent === "SEND_EMAIL"      → Email Sub-Workflow
  - Rule 2: intent === "SCHEDULE_MEETING" → Calendar Sub-Workflow
  - Rule 3: intent === "CHECK_CALENDAR"   → Calendar Query
  - Rule 4: intent === "VIEW_LOGS"        → Sheets Query
  - Default:                              → General Response
```

#### Step 1.4: Build WF-002 — Email Draft & Send

```
DRAFT GENERATION BRANCH:
─────────────────────────
Node 1: Google Drive → Download File
  - File ID: (your resume file ID)
  - Credential: Google OAuth2 - Job Assistant

Node 2: HTTP Request → Gemini (Email Drafting)
  - Prompt includes: recipient info, context, user name
  - Returns: { subject, body, summary }

Node 3: Code → Structure Draft Response
  - Generate unique draftId (UUID)
  - Format response for frontend

Node 4: Google Sheets → Append Row (Draft History)
  - Tab: "Draft History"
  - Data: draftId, timestamp, recipient, subject, body, status="PENDING"

Node 5: Respond to Webhook
  - Body: { type: "draft", draft: {...}, draftId, message }

APPROVAL BRANCH (called from WF-001 Switch):
─────────────────────────────────────────────
Node 1: Google Sheets → Lookup Row
  - Tab: "Draft History"
  - Filter: draftId matches

Node 2: Google Drive → Download File (resume)

Node 3: Gmail → Send Email
  - To: recipient from draft
  - Subject: from draft
  - Body: from draft  
  - Attachments: resume.pdf from Drive

Node 4: Google Sheets → Update Row
  - Tab: "Draft History"
  - Update status to "SENT"

Node 5: Google Sheets → Append Row
  - Tab: "Action Log"
  - Data: EMAIL_SENT, details, timestamp

Node 6: Google Calendar → Create Event
  - Title: "Follow up: [recipient]"
  - Date: 3 days from now
  - Description: "Sent email about [context]. Follow up!"

Node 7: Respond to Webhook
  - Body: { type: "confirmation", message: "Email sent! Follow-up set." }
```

#### Step 1.5: Build WF-003 — Calendar Manager

```
Node 1: Code → Parse Date/Time from Gemini entities
  - Convert natural language date to ISO format
  - Set start time and end time (default 1 hour)

Node 2: Google Calendar → Get Events
  - Time Min: start of target day
  - Time Max: end of target day

Node 3: IF → Check for time conflicts
  - Condition: any existing event overlaps with requested time

Node 4a (Conflict): Respond to Webhook
  - Body: { type: "conflict", conflicts: [...], message: "Time slot busy" }

Node 4b (No Conflict): Google Calendar → Create Event
  - Summary: from Gemini entities
  - Start: parsed date/time
  - End: start + 1 hour

Node 5: Google Sheets → Append Row (Action Log)
  - Action: MEETING_CREATED

Node 6: Respond to Webhook
  - Body: { type: "calendar_confirm", event: {...} }
```

#### Step 1.6: Test All Workflows with n8n Test URLs

```
Use n8n's "Test URL" (available in webhook node) to test each workflow
with Postman or curl:

# Test intent classification:
curl -X POST http://localhost:5678/webhook-test/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-123","message":"Send mail to john@acme.com about SDE role","action":"chat"}'

# Test calendar:
curl -X POST http://localhost:5678/webhook-test/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-123","message":"Schedule interview on April 25 at 2pm","action":"chat"}'

# Verify in Google Sheets that logs are being written
```

---

### Phase 2: React Frontend Development (Day 4-6)

#### Step 2.1: Initialize React + Vite Project

```bash
cd "d:\autonomous ai agent project\AI Job Hunt Assistant"

# Create Vite React project
npx -y create-vite@latest ai-job-hunt-ui -- --template react

cd ai-job-hunt-ui
npm install

# Create environment file
echo "VITE_N8N_WEBHOOK_URL=http://localhost:5678" > .env.local
```

#### Step 2.2: Implement Design System

Create `src/styles/index.css` with the design tokens from Section 8.3.

#### Step 2.3: Build Component Library (Bottom-Up)

Build in this order:

```
1. src/components/common/Button.jsx       — Reusable button with variants
2. src/components/common/Card.jsx         — Glass-effect card container
3. src/components/common/Badge.jsx        — Status badges
4. src/components/common/Spinner.jsx      — Loading animation
5. src/components/common/Toast.jsx        — Notification toasts
6. src/components/chat/MessageBubble.jsx  — Chat message display
7. src/components/chat/TypingIndicator.jsx — "..." animation
8. src/components/chat/MessageInput.jsx   — Text input + send button
9. src/components/chat/ChatFeed.jsx       — Scrollable message list
10. src/components/cards/DraftPreviewCard.jsx — Email draft display
11. src/components/cards/CalendarConfirmCard.jsx — Event confirmation
12. src/components/layout/Header.jsx
13. src/components/layout/Sidebar.jsx
14. src/components/layout/StatusBar.jsx
```

#### Step 2.4: Implement State & Hooks

```
1. src/context/AppContext.jsx    — Global state with useReducer
2. src/hooks/useChat.js          — Chat send/receive logic
3. src/hooks/useN8nConnection.js — Health check polling
4. src/hooks/useDraftApproval.js — Approve/reject handling
5. src/services/n8nService.js    — HTTP client (see Section 8.2)
```

#### Step 2.5: Assemble Main App

```
1. src/App.jsx — Compose layout with all components
2. Wire up context provider
3. Connect hooks to components
4. Add responsive design breakpoints
5. Add micro-animations and transitions
```

#### Step 2.6: Test Frontend ↔ n8n Integration

```bash
# Terminal 1: Start n8n
cd n8n-docker
docker compose up

# Terminal 2: Start React dev server
cd ai-job-hunt-ui
npm run dev
# Open http://localhost:5173

# Test flow:
# 1. Type "Send mail to recruiter@company.com about engineer role"
# 2. Verify draft appears in UI
# 3. Click Approve
# 4. Verify email sent confirmation
# 5. Check Google Sheets for log entries
```

---

### Phase 3: Polish & Integration Testing (Day 7-8)

#### Step 3.1: End-to-End Testing

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Email draft | "Send mail to john@acme.com about SDE" | Draft card appears with subject, body |
| Email approve | Click Approve on draft | "Email sent" confirmation |
| Email reject | Click Reject on draft | "Draft discarded" message |
| Calendar create | "Meeting on Apr 25 at 2pm" | Calendar confirmation card |
| Calendar conflict | Schedule on occupied slot | Conflict warning with existing events |
| Rate limit | Send 20 messages in 1 minute | Graceful "Processing..." message |
| n8n down | Stop Docker container | "Assistant offline" status bar |
| Empty input | Send empty message | "Please type a message" validation |
| Logs check | "Show my activity log" | Recent activity display |

#### Step 3.2: UI Polish

```
- Add smooth scroll-to-bottom on new messages
- Add message timestamps with relative time ("2m ago")
- Add glassmorphism effect to draft cards
- Add subtle hover animations on buttons
- Add keyboard shortcut: Enter to send, Shift+Enter for newline
- Add dark mode toggle (optional, dark by default)
- Add responsive layout for smaller screens
```

#### Step 3.3: Error Handling Polish

```
- Add toast notifications for errors
- Add retry buttons on failed actions
- Add connection status indicator (green/red dot)
- Add loading states for all async operations
```

---

### Phase 4: Additional Features (Day 9-10)

#### Step 4.1: Contact Tracker

```
- New n8n workflow: WF-005 (Contact Manager)
- Webhook: POST /contacts
- Actions: add, update, list, search
- Data stored in Google Sheets "Contacts" tab
- Frontend: Contacts panel in sidebar (collapsible)
```

#### Step 4.2: Draft History

```
- New n8n workflow: WF-006 (Draft History)
- Webhook: POST /drafts
- Actions: list recent drafts, reuse a draft
- Data from Google Sheets "Draft History" tab
- Frontend: "Recent Drafts" section in sidebar
```

#### Step 4.3: Follow-up Reminders

```
- Already built into the email approval flow (Phase 1)
- Creates a Google Calendar event 3 days after email sent
- Title: "Follow up with [contact name]"
- Description: includes email context
```

---

## 12. Google Sheets Schema

### Tab: "Action Log"

| Column | Header | Type | Example |
|--------|--------|------|---------|
| A | Timestamp | DateTime | 2026-04-20T10:30:00Z |
| B | Action Type | String | DRAFT_CREATED, EMAIL_SENT, MEETING_CREATED, EMAIL_REJECTED |
| C | Details | String | "Email to john@acme.com about SDE role" |
| D | Status | String | SUCCESS, FAILED, PENDING |
| E | Session ID | String | uuid-xxx-xxx |
| F | Draft ID | String | d-uuid-xxx (if applicable) |
| G | Notes | String | Additional context |

### Tab: "Contacts"

| Column | Header | Type | Example |
|--------|--------|------|---------|
| A | Contact ID | String | c-uuid-xxx |
| B | Company Name | String | Acme Corp |
| C | Person Name | String | John Smith |
| D | Email | String | john@acme.com |
| E | Role/Title | String | Engineering Manager |
| F | Contact Type | String | Recruiter, Hiring Manager, Referral |
| G | Status | String | Not Contacted, Emailed, Interviewing, Offer, Rejected |
| H | Last Contacted | DateTime | 2026-04-20T10:30:00Z |
| I | Notes | String | Met at career fair |

### Tab: "Draft History"

| Column | Header | Type | Example |
|--------|--------|------|---------|
| A | Draft ID | String | d-uuid-xxx |
| B | Created At | DateTime | 2026-04-20T10:30:00Z |
| C | Recipient Email | String | john@acme.com |
| D | Recipient Name | String | John Smith |
| E | Company | String | Acme Corp |
| F | Subject | String | Interest in SDE Position |
| G | Body | String | Dear John, ... |
| H | Status | String | PENDING, SENT, REJECTED, EDITED |
| I | Sent At | DateTime | 2026-04-20T11:00:00Z (if sent) |
| J | Session ID | String | uuid-xxx |

### Tab: "Error Log"

| Column | Header | Type | Example |
|--------|--------|------|---------|
| A | Timestamp | DateTime | 2026-04-20T10:30:00Z |
| B | Workflow | String | WF-002 |
| C | Node | String | Gmail Send |
| D | Error Type | String | AUTH_ERROR, RATE_LIMIT, TIMEOUT |
| E | Error Message | String | "Token expired" |
| F | Input Data | String | Sanitized request data |
| G | Resolution | String | Auto-retried, Manual fix needed |

---

## 13. API Contracts

### Frontend → n8n Webhook

#### POST `/webhook/chat`

**Request:**
```json
{
  "sessionId": "string (UUID)",
  "message": "string (user's chat message)",
  "action": "chat | approve | reject",
  "draftId": "string (required for approve/reject)",
  "reason": "string (optional, for reject)",
  "timestamp": "string (ISO 8601)"
}
```

**Response — Chat (Draft Generated):**
```json
{
  "type": "draft",
  "message": "I've drafted an email for you. Please review:",
  "draft": {
    "draftId": "d-uuid-xxx",
    "to": "john@acme.com",
    "toName": "John Smith",
    "company": "Acme Corp",
    "subject": "Interest in Software Development Engineer Position",
    "body": "Dear John,\n\nI hope this message finds you well...",
    "attachmentName": "Resume_Current.pdf",
    "summary": "Outreach email for SDE position at Acme Corp"
  },
  "sessionId": "string"
}
```

**Response — Chat (Calendar Created):**
```json
{
  "type": "calendar_confirm",
  "message": "Meeting scheduled successfully!",
  "event": {
    "title": "Interview with Acme Corp",
    "date": "2026-04-25",
    "startTime": "14:00",
    "endTime": "15:00",
    "calendarLink": "https://calendar.google.com/event?eid=xxx"
  },
  "conflicts": [],
  "sessionId": "string"
}
```

**Response — Chat (Calendar Conflict):**
```json
{
  "type": "conflict",
  "message": "That time slot is already occupied.",
  "conflicts": [
    {
      "title": "Team Standup",
      "startTime": "14:00",
      "endTime": "14:30"
    }
  ],
  "suggestion": "Would you like to schedule at 15:00 instead?",
  "sessionId": "string"
}
```

**Response — Approve:**
```json
{
  "type": "confirmation",
  "message": "✅ Email sent to john@acme.com! Follow-up reminder set for April 23.",
  "details": {
    "emailSent": true,
    "followUpDate": "2026-04-23",
    "loggedToSheets": true
  },
  "sessionId": "string"
}
```

**Response — Reject:**
```json
{
  "type": "confirmation",
  "message": "Draft discarded. Let me know if you'd like to try again.",
  "sessionId": "string"
}
```

**Response — General:**
```json
{
  "type": "message",
  "message": "string (AI response to general query)",
  "sessionId": "string"
}
```

**Response — Error:**
```json
{
  "type": "error",
  "message": "string (user-friendly error message)",
  "code": "RATE_LIMIT | AUTH_ERROR | SERVICE_ERROR | VALIDATION_ERROR",
  "sessionId": "string"
}
```

---

## 14. Deployment Topology

### Local Development (MVP)

```
┌─────────────────────────────────────────────────────┐
│                 YOUR WINDOWS MACHINE                 │
│                                                      │
│   ┌──────────────────┐    ┌──────────────────────┐  │
│   │  React Dev Server│    │ Docker Desktop        │  │
│   │  (Vite)          │    │  ┌──────────────────┐ │  │
│   │  localhost:5173   │◄──►│  │ n8n Container    │ │  │
│   │                  │    │  │ localhost:5678    │ │  │
│   └──────────────────┘    │  └──────────────────┘ │  │
│                           └──────────────────────┘  │
│                                      │               │
│                                      │ HTTPS          │
│                                      ▼               │
│                           ┌──────────────────────┐  │
│                           │ Google Cloud APIs     │  │
│                           │ (Gmail, Drive, Cal,   │  │
│                           │  Sheets, Gemini)      │  │
│                           └──────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Future Production (Post-MVP)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel /   │     │ Railway /    │     │ Google Cloud  │
│   Netlify    │────►│ Render       │────►│ APIs          │
│   (React)    │     │ (n8n Docker) │     │               │
│   HTTPS      │     │ HTTPS        │     │               │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 15. Testing Strategy

### Unit Testing (Frontend)

```bash
# Install testing dependencies
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom

# Test files: src/**/*.test.jsx
# Focus on:
# - Component rendering
# - State transitions (draft → approved → sent)
# - Error state rendering
# - n8nService mock responses
```

### Integration Testing (n8n + Frontend)

```
1. Start n8n Docker container
2. Start React dev server
3. Manual test each flow:
   a. Email: type → draft → approve → verify in Gmail & Sheets
   b. Calendar: type → event created → verify in Calendar & Sheets
   c. Reject: type → draft → reject → verify status in Sheets
   d. Error: stop n8n → verify error UI → restart → verify recovery
```

### n8n Workflow Testing

```
1. Use n8n's built-in "Execute Workflow" manually
2. Check execution logs in n8n admin (Settings → Executions)
3. Verify each node's output in the execution detail view
4. Test with edge cases:
   - Missing fields in webhook body
   - Gemini returning malformed JSON
   - Calendar with no events vs many events
   - Google Sheets API timeout
```

---

## Appendix A: Quick Reference — File/Service ID Checklist

Before starting implementation, collect and document these IDs:

```
□ GCP Project ID:            ___________________________________
□ OAuth2 Client ID:          ___________________________________
□ OAuth2 Client Secret:      ___________________________________
□ Gemini API Key:            ___________________________________
□ Google Sheets ID:          ___________________________________
□ Resume File ID (Drive):    ___________________________________
□ Calendar ID:               ___________________________________
□ n8n Encryption Key:        ___________________________________
```

---

## Appendix B: Estimated Development Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 0: Environment Setup | 1 day | n8n running, GCP configured, APIs enabled |
| Phase 1: n8n Workflows | 2 days | All 4 core workflows functional |
| Phase 2: React Frontend | 3 days | Full chat UI with approval flow |
| Phase 3: Integration & Polish | 2 days | End-to-end tested, error handling |
| Phase 4: Additional Features | 2 days | Contacts, draft history, follow-ups |
| **Total** | **~10 days** | **Production-ready MVP** |

---

## Appendix C: Common Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| n8n webhook returns 404 | Workflow not activated | Click "Active" toggle in n8n |
| CORS error in browser | n8n not configured for frontend origin | Add `allowedOrigins` to webhook node |
| Google OAuth "Access Denied" | App in Testing mode, user not added | Add your email as Test User in GCP |
| Gemini returns empty | Prompt too long or malformed | Check token count, validate JSON |
| Gmail "Insufficient permissions" | Missing `gmail.send` scope | Re-authorize in n8n with correct scopes |
| Sheets "Spreadsheet not found" | Wrong spreadsheet ID | Copy ID from URL again |
| Docker can't start n8n | Port 5678 in use | `docker ps` to check, kill conflicting |
| Resume not attaching | Drive file ID wrong | Verify file ID from Drive URL |

---

*This architecture document is the single source of truth for the AI Job Hunt Assistant project. All implementation decisions should reference this document.*
