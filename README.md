# Semester Navigator

Build a web application called "Smart Semester Workload Balancer" — an 

academic workload management tool for engineering students. This is 

Phase 1 of the build, focused on the core authentication and task 

management system with an automated workload scoring engine.

## TECH STACK

- Frontend: React + Tailwind CSS

- Backend: Use Supabase for authentication and database (Postgres)

- No external paid APIs in this phase

## CORE CONCEPT

Students log academic tasks (exams, assignments, labs, projects) with 

deadlines. The system automatically calculates a weekly "Panic Score" 

using this exact formula:

Panic Score (per week) = Σ (Task Weight × 1 / Days Remaining)

Task weights are fixed by type:

- Exam = 3

- Assignment = 2  

- Project = 2

- Lab = 1

Score classification:

- Score < 5 → Status: "Safe" → Green

- Score 5 to 10 → Status: "Busy" → Yellow

- Score > 10 → Status: "Overloaded" → Red

## PAGES TO BUILD

### 1. Login / Register Page

- Clean, centered auth form with email + password

- Toggle between login and register modes

- Register form additionally collects: full name, semester (dropdown 

  1-8), branch (dropdown: Computer Engineering, Computer Science, 

  Information Technology)

- Use Supabase Auth for email/password authentication

- On successful login, redirect to /dashboard

- Show clear inline error messages for invalid credentials or 

  duplicate email

### 2. Dashboard Page (protected route, requires login)

- Top metric cards row (4 cards): Total Active Tasks, Tasks Due This 

  Week, Current Week Panic Score (with colored badge: Safe/Busy/

  Overloaded), Tasks Completed This Semester

- If current week status is "Overloaded", show a prominent red alert 

  banner at the top: "🔴 This week is overloaded! You have X tasks 

  competing for your time."

- A weekly workload bar chart (use recharts) showing hours per week 

  for the next 6 weeks, bars colored green/yellow/red based on that 

  week's Panic Score status

- An upcoming deadlines list showing the next 5 tasks sorted by 

  deadline, each row showing: task title, subject/type badge, days 

  remaining, colored urgency indicator

- "+ Add Task" button in the top right that opens a modal

### 3. Add/Edit Task Modal

- Form fields: Task Title (text), Type (dropdown: Exam/Assignment/

  Lab/Project), Deadline Date (date picker), Estimated Hours (number 

  input, 1-40)

- On submit, automatically assign weight based on type (don't show 

  weight to user, calculate it server-side/in the insert logic)

- After saving, close modal and refresh the dashboard so the Panic 

  Score recalculates immediately

- Include an Edit mode that pre-fills the form when editing an 

  existing task

### 4. Task List Page (/tasks)

- Full table view of all tasks: Title | Type (colored badge) | 

  Deadline | Days Remaining | Individual Score Contribution | Status 

  (checkbox to mark complete) | Actions (edit/delete icons)

- Filter dropdown: All / Exam / Assignment / Lab / Project

- Sort by deadline (soonest first) by default

- Marking a task complete should visually strike it through and 

  exclude it from Panic Score calculations going forward

### 5. Timeline Page (/timeline)

- Vertical timeline showing all upcoming tasks in chronological order

- Each entry shows: date, colored dot indicating urgency, task title, 

  subject type, days remaining

- Group visually by week with a subtle divider between weeks

## DATABASE SCHEMA (Supabase/Postgres)

Create these tables with Row Level Security enabled so users can only 

see their own data:

```sql

-- users handled by Supabase Auth, extend with a profiles table

profiles (

  id uuid references auth.users primary key,

  full_name text,

  semester int,

  branch text,

  created_at timestamp default now()

)

tasks (

  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users not null,

  title text not null,

  type text not null check (type in ('exam','assignment','lab','project')),

  weight int not null,

  deadline_date date not null,

  est_hours int default 2,

  is_completed boolean default false,

  created_at timestamp default now()

)

panic_scores (

  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users not null,

  week_start_date date not null,

  score numeric(5,2) default 0,

  status text check (status in ('safe','busy','overloaded')),

  calculated_at timestamp default now()

)

```

## CORE LOGIC TO IMPLEMENT

Write a function (can run client-side for this phase, called whenever 

tasks change) that:

1. Fetches all incomplete tasks for the logged-in user where 

   deadline_date >= today

2. For each task, calculates days_remaining = deadline_date - today 

   (minimum 1 to avoid division by zero)

3. Calculates individual_score = weight / days_remaining

4. Groups tasks by the calendar week their deadline falls in (Monday 

   as week start)

5. Sums individual_score per week to get that week's Panic Score

6. Classifies each week: score < 5 = "safe", 5-10 = "busy", >10 = 

   "overloaded"

7. Updates the panic_scores table and refreshes the dashboard display

## DESIGN STYLE

- Dark navy sidebar (#0D1B2A) with teal accent color (#0D9488)

- Clean white/off-white main content area

- Card-based layout with subtle shadows, rounded corners (8-12px)

- Status colors: Safe = green (#10B981), Busy = yellow/amber (#F59E0B), 

  Overloaded = red (#EF4444)

- Responsive — must work well on both desktop and mobile screens

- Use a clean sans-serif font throughout

## WHAT NOT TO BUILD YET (future phases)

Do not build: WhatsApp integration, AI features, marks upload, Faculty 

or Admin roles, dark mode toggle, PDF/CSV export, group projects. This 

phase is Student-only, core task management and scoring only.

Start by setting up Supabase auth and the database schema, then build 

the Login/Register page, then the Dashboard, then Add Task modal, then 

Task List and Timeline pages.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/665a9e30-dfcb-4c76-ab50-623506fbe3e0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
