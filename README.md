# Join – Kanban Project Management App

A collaborative task management application built with **Angular** and **Firebase**.  
Organize your work in a Kanban board, manage contacts, and track progress – all in real time.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
4. [Project Structure](#project-structure)
5. [Prerequisites](#prerequisites)
6. [Installation](#installation)
7. [Firebase Setup](#firebase-setup)
8. [Environment Configuration](#environment-configuration)
9. [Running the App](#running-the-app)
10. [Building for Production](#building-for-production)
11. [Authentication & Guest Access](#authentication--guest-access)
12. [Feature Flags](#feature-flags)
13. [Branch Overview](#branch-overview)
14. [Contributing](#contributing)

---

## Overview

Join is a Kanban-style project management tool that lets teams create tasks, assign them to contacts, and track their progress across four stages: **To Do**, **In Progress**, **Await Feedback**, and **Done**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 20 (standalone components) |
| Language | TypeScript (strict mode) |
| Backend / DB | Firebase Firestore (NoSQL) |
| Authentication | Firebase Auth (email/password) |
| Styling | SCSS |
| State | Angular Signals |
| Routing | Angular Router with Auth Guard |

---

## Features

- **Authentication** – Register, log in, log out; guest login with demo data
- **Summary** – Dashboard with key metrics (open tasks, urgent items, upcoming deadlines)
- **Kanban Board** – Drag-free column view with add, edit, and delete for tasks
- **Contacts** – Full CRUD for contacts, responsive desktop and mobile views
- **Add Task** – Create tasks with title, description, due date, priority, assignees, and subtasks
- **Legal pages** – Privacy Policy and Legal Notice
- **Responsive design** – Works on mobile and desktop

---

## Project Structure

```
src/
├── app/
│   ├── addtask/          # Add Task page & form logic
│   ├── board/            # Kanban board + card components
│   ├── contacts/         # Contact list + add/edit/delete
│   ├── guards/           # Auth guard for protected routes
│   ├── interfaces/       # TypeScript interfaces (IContact, ITask)
│   ├── legal/            # Privacy Policy & Legal Notice
│   ├── login/            # Login, Sign-Up, Intro
│   ├── services/         # Firebase Auth, Firestore, Task services
│   ├── shared/           # Layout (header, sidenav, bottom nav)
│   └── summary/          # Dashboard / Summary page
├── environments/
│   ├── environment.ts          # Your local config (not committed)
│   └── environment.ts-help     # Template – copy and fill in your values
└── styles.scss           # Global styles
```

---

## Prerequisites

Make sure the following are installed on your machine:

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) v9 or higher
- [Angular CLI](https://angular.dev/tools/cli) v20

```bash
npm install -g @angular/cli
```

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/adam-on-developerakademie/Join.git
cd Join

# 2. Install dependencies
npm install
```

---

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Authentication** → Sign-in method → **Email/Password**.
3. Create a **Firestore Database** in production or test mode.
4. In Project Settings → Your apps → Web app, copy your Firebase config.

---

## Environment Configuration

The file `src/environments/environment.ts` is **not committed** to the repository (contains secrets).  
Use the provided template to create it:

```bash
# Copy the template
cp src/environments/environment.ts-help src/environments/environment.ts
```

Then open `src/environments/environment.ts` and fill in your Firebase values:

```typescript
export const environment = {
  production: false,
  featureFlags: {
    enableOwnerFilter: false,
  },
  firebaseConfig: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_AUTH_DOMAIN',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_STORAGE_BUCKET',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },
  testUser: {
    email: 'YOUR_TEST_USER_EMAIL',
    password: 'YOUR_TEST_USER_PASSWORD',
  },
};
```

> **Never commit your real `environment.ts` to version control.**

---

## Running the App

```bash
# Start the development server
npm start
# or
ng serve
```

Open your browser at **http://localhost:4200**.  
The app reloads automatically on file changes.

---

## Building for Production

```bash
ng build
```

Output is placed in `dist/`. Deploy the contents of that folder to any static hosting provider (e.g. Firebase Hosting, Netlify, Vercel).

---

## Authentication & Guest Access

| Mode | Description |
|---|---|
| **Register** | Creates a Firebase account and a matching self-contact |
| **Login** | Email + password via Firebase Auth |
| **Guest / Test User** | Logs in with credentials from `environment.testUser`; demo contacts and tasks are auto-generated daily |

On first login, 10 sample contacts and 5 sample tasks are created automatically so the app is never empty.

---

## Feature Flags

Flags are configured in `environment.ts` under `featureFlags`:

| Flag | Default | Description |
|---|---|---|
| `enableOwnerFilter` | `false` | When `true`, each user only sees their own contacts |

---

## Branch Overview

| Branch | Owner | Purpose |
|---|---|---|
| `main` | — | Stable integration branch |
| `Adam` | Adam | Adam's feature work |
| `Yunus` | Yunus | Yunus's feature work |
| `Fabian` | Fabian | Fabian's feature work |

---

## Contributing

1. Work on your own branch (`Adam`, `Yunus`, or `Fabian`).
2. Keep commits small and descriptive.
3. Merge changes via `main` — never force-push to shared branches.
4. Never commit real API keys or credentials.

## Gruppenarbeit
