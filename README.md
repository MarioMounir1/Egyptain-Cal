# 🇪🇬 Egyptian Cal — حساب السعرات

> **AI-powered food nutrition tracker built for the Egyptian market.**
> Analyze Egyptian & Arabic meals by text or photo and get instant macro estimates — calories, protein, carbs, and fat.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Tech Stack](#tech-stack)
5. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Backend Setup](#backend-setup)
   - [Frontend Setup](#frontend-setup)
   - [Mobile Setup](#mobile-setup)
6. [Environment Variables](#environment-variables)
7. [API Quick Reference](#api-quick-reference)
8. [Key Features](#key-features)
9. [AI Engine](#ai-engine)
10. [Available Scripts](#available-scripts)

---

## Overview

**Egyptian Cal** is a full-stack nutrition tracking platform designed specifically for the Egyptian and Arabic food market. Users can:

- Describe a meal in **Arabic or English** text and receive AI-estimated macro ranges.
- **Upload a photo** of a meal or a nutrition label screenshot for visual AI analysis.
- Manage a **personal profile** with automatic BMR/TDEE/macro targets calculated via the Mifflin-St Jeor equation.
- Browse and search a **food database** of Egyptian & Arabic food items.

The platform is composed of three independent sub-projects:

| Sub-project | Technology | Purpose |
|-------------|-----------|---------|
| `backend/`  | Node.js + Fastify + TypeScript | REST API & AI orchestration |
| `frontend/` | React 18 + Vite + TypeScript + Tailwind CSS | Web dashboard & demo UI |
| `mobile/`   | Flutter + Dart | Cross-platform iOS & Android app |

---

## Architecture

```
+----------------------------------------------------------+
|                      Client Layer                        |
|   +------------------+      +------------------------+  |
|   |  React Frontend  |      |  Flutter Mobile App    |  |
|   |  (Vite + TSX)    |      |  (iOS & Android)       |  |
|   +--------+---------+      +-----------+------------+  |
+------------+--------------------------  +--------------  +
             |  HTTP / REST              |
             v                          v
+----------------------------------------------------------+
|          Backend API  (Fastify v4 + TypeScript)          |
|                                                          |
|   +------------+  +-----------+  +------------------+   |
|   | Users      |  |  Foods    |  |  Meals (AI Core) |   |
|   | Module     |  |  Module   |  |                  |   |
|   +------------+  +-----------+  +--------+---------+   |
|                                            |              |
|   +---------------------------------------+              |
|   |         PostgreSQL Database           |              |
|   +---------------------------------------+              |
|                                           v              |
|                          +------------------------+      |
|                          |   Ollama AI Engine     |      |
|                          |  * Llama 3  (text)     |      |
|                          |  * LLaVA   (vision)    |      |
|                          +------------------------+      |
+----------------------------------------------------------+
```

---

## Project Structure

```
Egyptain-cal/
├── backend/                   # Fastify REST API
│   └── src/
│       ├── app.ts             # Fastify app factory
│       ├── server.ts          # Entry point & graceful shutdown
│       ├── config/            # Environment variable schema (Zod)
│       ├── modules/
│       │   ├── users/         # User profile & macro calculation
│       │   ├── foods/         # Food database CRUD & search
│       │   └── meals/         # AI meal analysis (text + vision)
│       └── shared/
│           ├── ai/            # Ollama AI client (Llama 3 + LLaVA)
│           ├── database/      # PostgreSQL pool & migrations
│           └── errors/        # Global error handler
│
├── frontend/                  # React web dashboard
│   └── src/
│       ├── App.tsx            # Root component & demo UI
│       ├── api/               # API client functions
│       ├── components/
│       │   └── MealNutritionBadge/  # Main meal analysis widget
│       ├── hooks/             # Custom React hooks
│       └── index.css          # Tailwind CSS design tokens
│
├── mobile/                    # Flutter cross-platform app
│   └── lib/
│       ├── main.dart          # App entry point (Riverpod + GoRouter)
│       ├── core/
│       │   ├── api/           # Dio HTTP client
│       │   ├── models/        # Data models
│       │   ├── providers/     # Global Riverpod providers
│       │   ├── router/        # GoRouter navigation
│       │   ├── theme/         # Dark theme & typography (Cairo + Poppins)
│       │   └── utils/         # Utilities & helpers
│       └── features/
│           ├── dashboard/     # Home screen & calorie summary
│           ├── foods/         # Food search & browse
│           ├── meals/         # Meal logging & AI analysis
│           ├── onboarding/    # User setup flow
│           ├── profile/       # User profile & settings
│           └── shell/         # Bottom nav & app shell
│
└── api_documentation.md       # Full REST API reference
```

---

## Tech Stack

### Backend

| Technology | Version | Role |
|------------|---------|------|
| **Node.js** | 20+ | Runtime |
| **Fastify** | v4 | Web framework |
| **TypeScript** | 5.5 | Type safety |
| **PostgreSQL** | 14+ | Primary database |
| **Zod** | 3.x | Request validation & env schema |
| **Ollama** | — | Local AI inference engine |
| **pino** | — | Structured JSON logging |
| `@fastify/cors` | — | CORS handling |
| `@fastify/helmet` | — | Security headers |
| `@fastify/rate-limit` | — | Rate limiting (100 req / 60 s) |

### Frontend

| Technology | Version | Role |
|------------|---------|------|
| **React** | 18.3 | UI framework |
| **Vite** | 5.x | Build tool & dev server |
| **TypeScript** | 5.5 | Type safety |
| **Tailwind CSS** | 3.x | Utility-first styling |

### Mobile

| Technology | Version | Role |
|------------|---------|------|
| **Flutter** | 3.x (Dart SDK ^3.12) | Cross-platform framework |
| **Riverpod** | 2.6 | State management |
| **GoRouter** | 14.6 | Navigation |
| **Dio** | 5.7 | HTTP client |
| **fl_chart** | 0.70 | Macro ring charts |
| **Google Fonts** | 6.2 | Cairo (Arabic) + Poppins (Latin) |
| **flutter_animate** | 4.5 | UI animations |
| **Lottie** | 3.1 | Lottie animation playback |

---

## Getting Started

### Prerequisites

- **Node.js** v20 or higher
- **npm** v9 or higher
- **PostgreSQL** v14 or higher (running locally or via Docker)
- **Ollama** (optional — required for AI features): [ollama.com](https://ollama.com)
  - Pull models: `ollama pull llama3` and `ollama pull llava`
- **Flutter SDK** ^3.12 (for mobile only)

---

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Copy and configure the environment file
cp .env.example .env
# Edit .env with your PostgreSQL credentials and Ollama URL

# 4. Run database migrations
npm run db:migrate

# 5. Start the development server
npm run dev
```

The API will be available at `http://localhost:3001`.

> **Health check:** `GET http://localhost:3001/health`

---

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the Vite dev server
npm run dev
```

The web app will be available at `http://localhost:5173`.

---

### Mobile Setup

```bash
# 1. Navigate to the mobile directory
cd mobile

# 2. Get Flutter dependencies
flutter pub get

# 3. Generate Riverpod code (required after changes to providers)
dart run build_runner build --delete-conflicting-outputs

# 4. Run on a connected device or emulator
flutter run
```

> The mobile app points to `http://localhost:3001` by default in development. Update the base URL in `lib/core/api/` for production.

---

## Environment Variables

Configure the backend by creating a `.env` file inside the `backend/` directory:

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `NODE_ENV` | `development` | ❌ | `development` / `production` / `test` |
| `PORT` | `3001` | ❌ | Server port |
| `HOST` | `0.0.0.0` | ❌ | Bind host |
| `POSTGRES_HOST` | — | ✅ | PostgreSQL hostname |
| `POSTGRES_PORT` | `5432` | ❌ | PostgreSQL port |
| `POSTGRES_DB` | — | ✅ | Database name |
| `POSTGRES_USER` | — | ✅ | Database user |
| `POSTGRES_PASSWORD` | — | ✅ | Database password |
| `POSTGRES_POOL_MIN` | `2` | ❌ | Min connection pool size |
| `POSTGRES_POOL_MAX` | `10` | ❌ | Max connection pool size |
| `AI_ENGINE_URL` | — | ❌ | Ollama base URL (e.g. `http://localhost:11434`) |
| `AI_MODEL` | `llama3` | ❌ | Text analysis model |
| `AI_VISION_MODEL` | `llava` | ❌ | Vision analysis model |
| `AI_TIMEOUT_MS` | `30000` | ❌ | AI request timeout (ms) |
| `AI_ENABLED` | `true` | ❌ | Toggle AI on/off |
| `RATE_LIMIT_MAX` | `100` | ❌ | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | ❌ | Rate limit window (ms) |

---

## API Quick Reference

> Full documentation: [`api_documentation.md`](./api_documentation.md)
> **Base URL:** `http://localhost:3001` (development) · `https://api.egyptain-cal.io` (production)

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | API health check |
| `GET`  | `/api/v1/users/:id` | Get user profile & macro targets |
| `PUT`  | `/api/v1/users/:id` | Update profile — auto-recalculates targets |
| `POST` | `/api/v1/users/calculate` | Preview calorie/macro targets (no save) |
| `POST` | `/api/v1/foods` | Add a food item manually |
| `GET`  | `/api/v1/foods/search?q=` | Fuzzy-search foods by Arabic or English name |
| `GET`  | `/api/v1/foods/:id` | Get a food item by ID |
| `POST` | `/api/v1/meals/analyze` | Analyze a meal from text description |
| `POST` | `/api/v1/meals/analyze-photo` | Analyze a meal from a base64-encoded image |
| `GET`  | `/api/v1/meals/health` | Meals module health check |

### Example — Analyze a meal by text

```bash
curl -X POST http://localhost:3001/api/v1/meals/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "rawText": "طبق كشري كبير مع صوص",
    "userId":  "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "calorieRange": "456 - 504",
    "proteinRange": "19g - 21g",
    "carbsRange":   "85.5g - 94.5g",
    "fatRange":     "7.6g - 8.4g",
    "alerts": [
      "✅ Retrieved from verified local food database.",
      "Serving size: 1 medium plate (400g)"
    ]
  }
}
```

---

## Key Features

### 🤖 AI Meal Analysis (Text)

- Accepts Arabic or English meal descriptions (3–500 characters).
- **Smart lookup first:** checks the local food database before calling AI, saving latency and resources.
- Falls back to **Llama 3** for unrecognized foods, auto-cataloguing the result for future lookups.
- All analyzed meals are persisted to `daily_calorie_logs`.

### 📸 AI Meal Analysis (Photo)

- Accepts a **base64-encoded** JPEG, PNG, or WebP image.
- Always calls the **LLaVA vision model** for visual analysis.
- Supports two modes: `photo` (food photo) and `screenshot` (nutrition label / diet app screenshot).

### 📊 Macro Calculation (Mifflin-St Jeor)

- Automatically computes **BMR → TDEE → daily macro targets** from user metrics.
- Goal-aware adjustments: −500 kcal for weight loss, +500 kcal for weight gain.
- Enforces a minimum of **1,200 kcal/day**.
- Macro split: **30% Protein / 40% Carbs / 30% Fat**.

### 🍽️ Egyptian Food Database

- Bilingual food entries: Arabic name (primary) + English alias.
- Stores **min/max macro ranges** (midpoint ± 5%) for more realistic estimates.
- Supports barcode (UPC/EAN), category tags, and serving descriptions.
- Fuzzy search works across both Arabic and English names.

### 🔐 Security & Reliability

- Helmet for HTTP security headers.
- CORS restricted to production domains.
- Global rate limiting: **100 requests / 60 seconds**.
- Graceful shutdown on SIGTERM/SIGINT.
- Zod-validated environment variables — fails fast on misconfiguration.

---

## AI Engine

Egyptian Cal uses **[Ollama](https://ollama.com)** for fully local, offline-capable AI inference — no data is sent to external cloud AI services.

| Model | Task | Pull Command |
|-------|------|-------------|
| **Llama 3** (`llama3`) | Text-based meal analysis | `ollama pull llama3` |
| **LLaVA** (`llava`) | Image/vision meal analysis | `ollama pull llava` |

> Set `AI_ENABLED=false` in `.env` to disable AI features entirely (the API will only serve database lookups).

---

## Available Scripts

### Backend (`cd backend`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run db:migrate` | Run database migrations |
| `npm run lint` | Lint source files with ESLint |

### Frontend (`cd frontend`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |

### Mobile (`cd mobile`)

| Command | Description |
|---------|-------------|
| `flutter run` | Run on connected device/emulator |
| `flutter build apk` | Build Android APK |
| `flutter build ios` | Build iOS app |
| `dart run build_runner build` | Re-generate Riverpod providers |

---

*Built with ❤️ for Egypt 🇪🇬*
