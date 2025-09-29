# FittedIn — Health & Wellness Networking Platform

> **ECE 452 Software Engineering Project**  
> Group 1: Chih-hung Chen, Haoyang Guo, Alaric Li, Yixiao Xiao, Adam Ashby, Carlos Ortiz, Kelvin Ihezue  
> Semester: Fall 2025  

---

## 1. Introduction

Most health applications are **data-driven** — they count steps, calories, or workouts — but often fail to create a **sense of community**. As a result, users start with enthusiasm but quickly lose motivation.

**FittedIn** aims to change this by reimagining health and wellness tracking as a **social, networking-style experience**, inspired by LinkedIn. The platform encourages **connections, accountability, and shared progress**, turning isolated health efforts into **collaborative journeys**.

---

## 2. Objectives

- Provide a **central platform** where users can set health goals, track progress, and share updates.  
- Enable **professional-style networking** (connections, endorsements, digital business cards) around wellness.  
- Deliver **visual progress reports** that are easy to interpret and motivating.  
- Build the system with a **clear, maintainable architecture** that supports future scaling.  

---

## 3. Features (MVP)

### 3.1 User Profiles & Goals
- Create and edit personal profiles.  
- Define health-related goals (e.g., "Run 5 km," "Lose 10 lbs").  
- Track progress with milestone celebrations.  

### 3.2 Activity Logging
- Record daily activities (exercise, meals, metrics).  
- Store logs in a structured format linked to goals.  

### 3.3 Networking & Connections
- Find users with similar goals.  
- Request/accept connections.  
- Exchange **digital business cards** with skills or expertise.  

### 3.4 Identity & Sharing
- Post health updates and achievements.  
- Like and comment on others' posts.  

### 3.5 Visualization & Reports
- Auto-generate weekly/monthly charts.  
- Personalized summaries (e.g., "You improved 15% this month").  

---

## 4. Technology Stack

We keep the stack **minimal but effective**, focusing on proven, widely adopted tools.

### 4.1 Frontend
- **Next.js (React + TypeScript)** — page-based routing, hybrid SSR/SSG, and strong developer experience.  
- **Tailwind CSS** — utility-first styling, responsive design.  

### 4.2 Backend
- **Node.js (v20+) + Fastify** — fast, modern REST API with schema validation.  
- **Zod** — input/output schema validation, shared with frontend.  

### 4.3 Database
- **PostgreSQL** — relational database, reliable and widely supported.  
- **Prisma ORM** — type-safe query builder, schema migrations, seeding.  

### 4.4 Infrastructure
- **Docker + Docker Compose** — unified local dev environment.  
- **Vercel** — optimized hosting for Next.js frontend.  
- **Fly.io (or Railway)** — lightweight hosting for backend + database.  
- **GitHub Actions** — automated linting, tests, and deployments.  
- **Sentry** — error monitoring and alerting.  

---

## 5. System Architecture

### 5.1 High-Level Overview

```
[ User Browser ]
      |
      v
[ Frontend: Next.js + Tailwind ]
      |
   REST API calls
      |
      v
[ Backend: Fastify + Node.js ]
      |
      v
[ PostgreSQL via Prisma ORM ]
```

### 5.2 Key Design Principles
- **Separation of concerns** — UI, API, and database responsibilities are clearly split.  
- **Schema-driven development** — Zod schemas define contracts between client and server.  
- **Simplicity first** — minimize external dependencies, keep architecture easy to reason about.  
- **Extensibility** — modules (auth, users, goals, activity, reports) can grow independently.  

---

## 6. Project Structure

```
/fittedin
  /frontend
    /app               # Next.js routes
    /components        # UI components
    /styles            # Tailwind setup
    /lib               # client utilities
  
  /backend
    /src
      /modules         # features: auth, users, goals, activity
    /db                # Prisma schema + migrations
    package.json
  
  /infra
    docker-compose.yml # Local services (backend + PostgreSQL)
    .github/workflows  # CI/CD pipelines
  
  README.md
```

---

## 7. Data Model (MVP)

- **User**: `id, email, password_hash, display_name, avatar_url, created_at`  
- **Profile**: `user_id, pronouns, bio, location`  
- **Goal**: `id, user_id, title, target_value, unit, due_date`  
- **ActivityLog**: `id, user_id, goal_id, type, amount, unit, logged_at`  
- **Connection**: `id, requester_id, addressee_id, status`  
- **Post**: `id, user_id, content, created_at`  
- **Report**: `id, user_id, period_start, period_end, summary_json`  

---

## 8. Development Workflow

### 8.1 Local Development

```bash
# Start database
docker compose up -d

# Run migrations
cd backend
npx prisma migrate dev

# Start backend
npm run dev

# Start frontend
cd ../frontend
npm run dev
```

### 8.2 Git Workflow

Feature branches → Pull Requests → Review → Merge to main.

CI checks: lint, type-check, tests.

---

## 9. Milestones

- **Sep 30** — Proposal Presentation: scope, MVP, tech stack, timeline.
- **Oct 31** — Midterm Presentation: prototype with profiles, auth, connections.
- **Dec 5–9** — Final Presentations: feature-complete MVP.
- **Dec 9** — Final Report: testing, deployment, documentation.

---

## 10. Team Roles （Temporary）

- **Project Manager & Backend Lead** — Chih-hung Chen
- **Backend Developer** — Haoyang Guo
- **Frontend Developers** — Alaric Li, Yixiao Xiao
- **Data & Reporting** — Adam Ashby
- **QA & Testing** — Carlos Ortiz
- **Deployment & DevOps** — Kelvin Ihezue

---

## 11. Future Work

- Group challenges and leaderboards.
- Integration with wearable devices (Apple Health, Google Fit).
- Recommendation engine for partners, groups, or mentors.
- Mobile app (React Native).

---

## 12. License

MIT — educational project.