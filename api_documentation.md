# Egyptian Cal — REST API Reference

> **Base URL:** `http://localhost:3001` (development) · `https://api.egyptain-cal.io` (production)  
> **API Version:** v1  
> **Framework:** Fastify v4 + TypeScript  
> **Content-Type:** `application/json`

---

## Table of Contents

1. [Overview](#overview)
2. [Global Conventions](#global-conventions)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Data Models](#data-models)
6. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Users](#users-module)
   - [Foods](#foods-module)
   - [Meals](#meals-module)

---

## Overview

Egyptian Cal is an AI-powered food nutrition platform built for the Egyptian market. The API supports:

- **User profile management** with automatic BMR/TDEE/macro calculation (Mifflin-St Jeor equation)
- **Food database** — search, create, and retrieve Egyptian & Arabic food items with macro ranges
- **AI meal analysis** — text-based and image-based (photo/screenshot) nutritional analysis powered by Llama 3 and LLaVA vision models

---

## Global Conventions

### Response Envelope

Every response follows a consistent shape:

```json
{
  "status": "success" | "error",
  "data":   { ... },       // present on success
  "code":   "ERROR_CODE",  // present on error
  "message": "...",        // present on error
  "details": { ... }       // optional, present on validation errors
}
```

### UUID Parameters

All `:id` path parameters expect a **valid UUID v4**, e.g. `550e8400-e29b-41d4-a716-446655440000`.

### CORS

| Environment | Allowed Origins |
|-------------|----------------|
| Development | All origins (`*`) |
| Production  | `https://app.egyptain-cal.io`, `https://egyptain-cal.io` |

Credentials (`cookies`, `Authorization` headers) are supported.

---

## Rate Limiting

The API enforces global rate limiting via `@fastify/rate-limit`.

| Default | Value |
|---------|-------|
| Max requests | 100 per window |
| Window | 60 seconds |

**Rate limit exceeded response — `429 Too Many Requests`:**
```json
{
  "status": "error",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please retry after 45 seconds."
}
```

> [!TIP]
> Both limits are configurable via the `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` environment variables.

---

## Error Handling

### Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body/params/query failed validation |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `AI_ENGINE_ERROR` | 502 | The AI engine (Ollama) failed to process the request |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

### Error Response Shape

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Invalid request payload",
  "details": {
    "weight_kg": ["Weight must be positive"],
    "gender": ["Invalid enum value. Expected 'male' | 'female' | 'other'"]
  }
}
```

> [!NOTE]
> The `details` field and stack traces are only included in `development` mode, never in production.

---

## Data Models

### `UserProfileRecord`

```typescript
{
  id:                 string;           // UUID
  email:              string;
  display_name:       string;
  daily_calorie_goal: number | null;    // kcal
  weight_kg:          number | null;
  height_cm:          number | null;
  age:                number | null;
  gender:             "male" | "female" | "other" | null;
  activity_level:     "sedentary"
                    | "lightly_active"
                    | "moderately_active"
                    | "very_active"
                    | "extra_active"
                    | null;
  goal:               "lose_weight" | "maintain_weight" | "gain_weight" | null;
  target_protein_g:   number | null;   // grams
  target_carbs_g:     number | null;   // grams
  target_fat_g:       number | null;   // grams
  created_at:         string;          // ISO 8601
  updated_at:         string;          // ISO 8601
}
```

---

### `FoodRecord`

```typescript
{
  id:             string;                              // UUID
  name:           string;                              // Arabic preferred
  name_en:        string | null;                       // English alias
  barcode:        string | null;                       // UPC/EAN
  category:       string | null;
  serving_desc:   string | null;                       // e.g. "1 plate"
  source:         "manual" | "photo" | "screenshot" | "ai";
  verified:       boolean;
  calories_min:   number;                              // kcal
  calories_max:   number;                              // kcal
  protein_min_g:  number;
  protein_max_g:  number;
  carbs_min_g:    number;
  carbs_max_g:    number;
  fat_min_g:      number;
  fat_max_g:      number;
  created_at:     string;                              // ISO 8601
  updated_at:     string;                              // ISO 8601
}
```

> [!NOTE]
> Min/max macro ranges represent a ±5% margin automatically computed from the submitted midpoint values.

---

### `MealMacroData`

```typescript
{
  calorieRange: string;   // e.g. "450 - 500"
  proteinRange: string;   // e.g. "19g - 21g"
  carbsRange:   string;   // e.g. "57g - 63g"
  fatRange:     string;   // e.g. "14g - 16g"
  alerts:       string[]; // contextual notices / warnings
}
```

---

### `CalculatedTargets`

```typescript
{
  daily_calorie_goal: number;  // kcal
  target_protein_g:   number;  // 30% of calories / 4
  target_carbs_g:     number;  // 40% of calories / 4
  target_fat_g:       number;  // 30% of calories / 9
}
```

> [!NOTE]
> Targets are derived from the **Mifflin-St Jeor** equation with these adjustments:
> - **Lose weight:** TDEE − 500 kcal
> - **Maintain weight:** TDEE (no adjustment)
> - **Gain weight:** TDEE + 500 kcal
> - Minimum enforced: **1200 kcal/day**
> - Macro split: **30% Protein / 40% Carbs / 30% Fat**

---

## Endpoints

---

## Health Check

### `GET /health`

Returns the API health status. Useful for load balancer checks and monitoring.

**Response — `200 OK`**
```json
{
  "status": "ok",
  "service": "egyptain-cal-api",
  "environment": "development",
  "timestamp": "2026-06-20T08:45:00.000Z"
}
```

---

## Users Module

> **Prefix:** `/api/v1/users`

### `GET /api/v1/users/:id`

Fetch a user's full profile including their current calorie and macro targets.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` (UUID) | ✅ | The user's database UUID |

#### Response — `200 OK`

```json
{
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "display_name": "Ahmed",
    "daily_calorie_goal": 2100,
    "weight_kg": 80,
    "height_cm": 178,
    "age": 28,
    "gender": "male",
    "activity_level": "moderately_active",
    "goal": "lose_weight",
    "target_protein_g": 157.5,
    "target_carbs_g": 210.0,
    "target_fat_g": 70.0,
    "created_at": "2026-01-10T12:00:00.000Z",
    "updated_at": "2026-06-20T08:00:00.000Z"
  }
}
```

#### Errors

| Status | Code | Condition |
|--------|------|-----------|
| `404` | `NOT_FOUND` | No user with this UUID |

---

### `PUT /api/v1/users/:id`

Update a user's profile metrics. Automatically recalculates calorie and macro targets via Mifflin-St Jeor **unless** manual overrides are provided in the body.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` (UUID) | ✅ | The user's database UUID |

#### Request Body

All fields are optional. Provide only what you want to change.

```json
{
  "display_name":       "Ahmed",
  "weight_kg":          80,
  "height_cm":          178,
  "age":                28,
  "gender":             "male",
  "activity_level":     "moderately_active",
  "goal":               "lose_weight",
  "daily_calorie_goal": 2000,
  "target_protein_g":   150,
  "target_carbs_g":     200,
  "target_fat_g":       65
}
```

| Field | Type | Description |
|-------|------|-------------|
| `display_name` | `string` | Display name (min 1 char) |
| `weight_kg` | `number` | Weight in kilograms (must be positive) |
| `height_cm` | `number` | Height in centimetres (must be positive) |
| `age` | `integer` | Age in years (must be positive) |
| `gender` | `"male" \| "female" \| "other"` | Biological sex for BMR calculation |
| `activity_level` | `enum` (see below) | Daily activity level |
| `goal` | `"lose_weight" \| "maintain_weight" \| "gain_weight"` | Weight goal |
| `daily_calorie_goal` | `integer` | **Manual override** — bypasses auto-calculation |
| `target_protein_g` | `number` | **Manual override** — protein target in grams |
| `target_carbs_g` | `number` | **Manual override** — carbs target in grams |
| `target_fat_g` | `number` | **Manual override** — fat target in grams |

**Activity Level Values:**

| Value | Description |
|-------|-------------|
| `sedentary` | Little or no exercise (×1.2) |
| `lightly_active` | Light exercise 1–3 days/week (×1.375) |
| `moderately_active` | Moderate exercise 3–5 days/week (×1.55) |
| `very_active` | Hard exercise 6–7 days/week (×1.725) |
| `extra_active` | Very hard exercise or physical job (×1.9) |

> [!IMPORTANT]
> **Auto-calculation logic:** If `weight_kg`, `height_cm`, `age`, `gender`, `activity_level`, and `goal` are **all present** (either from the request body or existing profile) AND **no manual macro overrides** are provided, targets will be automatically recalculated using Mifflin-St Jeor.

#### Response — `200 OK`

Returns the full updated `UserProfileRecord`.

```json
{
  "status": "success",
  "data": { ... }
}
```

#### Errors

| Status | Code | Condition |
|--------|------|-----------|
| `400` | `VALIDATION_ERROR` | Invalid field values |
| `404` | `NOT_FOUND` | No user with this UUID |

---

### `POST /api/v1/users/calculate`

Calculate recommended calorie and macro targets **on the fly** without saving anything to the database. Useful for a "calculator preview" UI before the user saves their profile.

#### Request Body

```json
{
  "weight_kg":      80,
  "height_cm":      178,
  "age":            28,
  "gender":         "male",
  "activity_level": "moderately_active",
  "goal":           "lose_weight"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `weight_kg` | `number` | ✅ | Weight in kilograms |
| `height_cm` | `number` | ✅ | Height in centimetres |
| `age` | `integer` | ✅ | Age in years |
| `gender` | `"male" \| "female" \| "other"` | ✅ | Biological sex |
| `activity_level` | `enum` | ✅ | Daily activity level |
| `goal` | `"lose_weight" \| "maintain_weight" \| "gain_weight"` | ✅ | Weight goal |

#### Response — `200 OK`

```json
{
  "status": "success",
  "data": {
    "daily_calorie_goal": 2100,
    "target_protein_g":   157.5,
    "target_carbs_g":     210.0,
    "target_fat_g":       70.0
  }
}
```

#### Errors

| Status | Code | Condition |
|--------|------|-----------|
| `400` | `VALIDATION_ERROR` | Any required field is missing or invalid |

---

## Foods Module

> **Prefix:** `/api/v1/foods`

### `POST /api/v1/foods`

Manually add a new food item to the database. Macro min/max ranges are automatically computed as **midpoint ± 5%**.

#### Request Body

```json
{
  "name":         "كشري",
  "name_en":      "Koshari",
  "barcode":      null,
  "category":     "Egyptian street food",
  "serving_desc": "1 medium plate (400g)",
  "calories":     480,
  "protein":      20,
  "carbs":        90,
  "fat":          8,
  "source":       "manual"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Primary food name, min 2 chars (Arabic preferred) |
| `name_en` | `string \| null` | ❌ | English alias |
| `barcode` | `string \| null` | ❌ | UPC/EAN barcode |
| `category` | `string \| null` | ❌ | Category tag |
| `serving_desc` | `string \| null` | ❌ | Human-readable serving description |
| `calories` | `integer` | ✅ | Calories midpoint (kcal, ≥ 0) |
| `protein` | `number` | ✅ | Protein midpoint (g, ≥ 0) |
| `carbs` | `number` | ✅ | Carbohydrates midpoint (g, ≥ 0) |
| `fat` | `number` | ✅ | Fat midpoint (g, ≥ 0) |
| `source` | `"manual" \| "photo" \| "screenshot" \| "ai"` | ❌ | Creation source (default: `"manual"`) |

#### Response — `201 Created`

```json
{
  "status": "success",
  "data": {
    "id":             "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name":           "كشري",
    "name_en":        "Koshari",
    "barcode":        null,
    "category":       "Egyptian street food",
    "serving_desc":   "1 medium plate (400g)",
    "source":         "manual",
    "verified":       false,
    "calories_min":   456,
    "calories_max":   504,
    "protein_min_g":  19.0,
    "protein_max_g":  21.0,
    "carbs_min_g":    85.5,
    "carbs_max_g":    94.5,
    "fat_min_g":      7.6,
    "fat_max_g":      8.4,
    "created_at":     "2026-06-20T08:45:00.000Z",
    "updated_at":     "2026-06-20T08:45:00.000Z"
  }
}
```

#### Errors

| Status | Code | Condition |
|--------|------|-----------|
| `400` | `VALIDATION_ERROR` | Missing required fields or invalid values |

---

### `GET /api/v1/foods/search`

Fuzzy-search food items by Arabic or English name.

> [!IMPORTANT]
> This endpoint must come before `GET /api/v1/foods/:id` in route registration to avoid route conflicts. The application handles this correctly.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | `string` | ✅ | Search term (min 1 char) |

**Example:** `GET /api/v1/foods/search?q=كشري`

#### Response — `200 OK`

```json
{
  "status": "success",
  "data": [
    {
      "id":           "a1b2c3d4-...",
      "name":         "كشري",
      "name_en":      "Koshari",
      "category":     "Egyptian street food",
      "serving_desc": "1 medium plate (400g)",
      "calories_min": 456,
      "calories_max": 504,
      "protein_min_g": 19.0,
      "protein_max_g": 21.0,
      "carbs_min_g":   85.5,
      "carbs_max_g":   94.5,
      "fat_min_g":     7.6,
      "fat_max_g":     8.4,
      "verified":      true,
      "created_at":    "2026-06-20T08:45:00.000Z",
      "updated_at":    "2026-06-20T08:45:00.000Z"
    }
  ]
}
```

Returns an **array** of matching `FoodRecord` objects. Returns an empty array `[]` if no match found.

#### Errors

| Status | Code | Condition |
|--------|------|-----------|
| `400` | `VALIDATION_ERROR` | Missing or empty `q` parameter |

---

### `GET /api/v1/foods/:id`

Retrieve a single food record by its database UUID.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` (UUID) | ✅ | The food item's database UUID |

#### Response — `200 OK`

```json
{
  "status": "success",
  "data": {
    "id":             "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name":           "كشري",
    "name_en":        "Koshari",
    "barcode":        null,
    "category":       "Egyptian street food",
    "serving_desc":   "1 medium plate (400g)",
    "source":         "manual",
    "verified":       true,
    "calories_min":   456,
    "calories_max":   504,
    "protein_min_g":  19.0,
    "protein_max_g":  21.0,
    "carbs_min_g":    85.5,
    "carbs_max_g":    94.5,
    "fat_min_g":      7.6,
    "fat_max_g":      8.4,
    "created_at":     "2026-06-20T08:45:00.000Z",
    "updated_at":     "2026-06-20T08:45:00.000Z"
  }
}
```

#### Errors

| Status | Code | Condition |
|--------|------|-----------|
| `404` | `NOT_FOUND` | No food item with this UUID |

---

## Meals Module

> **Prefix:** `/api/v1/meals`

The Meals module is the core AI-powered feature. It accepts either raw text or an image and returns estimated macro ranges using on-device Ollama AI models.

**Analysis flow:**
1. **Text analysis** — checks local food database first; falls back to Llama 3 if not found
2. **Image analysis** — always calls LLaVA vision model
3. All analyzed meals are automatically saved to `daily_calorie_logs`
4. Newly identified foods are auto-catalogued in the `foods` table for future DB-hit lookups

---

### `POST /api/v1/meals/analyze`

Analyze a meal from a raw text description (Arabic or English) and return AI-computed macro ranges.

#### Request Body

```json
{
  "rawText": "طبق كشري كبير مع صوص",
  "userId":  "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `rawText` | `string` | ✅ | 3–500 chars | Meal description in Arabic or English |
| `userId` | `string` (UUID) | ✅ | valid UUID | Authenticated user's ID |

#### Response — `200 OK`

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
  },
  "meta": {
    "userId":     "550e8400-e29b-41d4-a716-446655440000",
    "analyzedAt": "2026-06-20T08:45:00.000Z",
    "logId":      "log-uuid-here"
  }
}
```

| Field | Description |
|-------|-------------|
| `calorieRange` | Min–max calorie estimate in kcal |
| `proteinRange` | Min–max protein estimate in grams |
| `carbsRange` | Min–max carbohydrates estimate in grams |
| `fatRange` | Min–max fat estimate in grams |
| `alerts` | Contextual notices (e.g. DB hit, serving size, AI warnings) |
| `meta.logId` | UUID of the persisted `daily_calorie_logs` record |
| `meta.analyzedAt` | ISO 8601 timestamp of analysis |

#### Errors

| Status | Code | Condition |
|--------|------|-----------|
| `400` | `VALIDATION_ERROR` | `rawText` too short/long or invalid `userId` |
| `400` | `VALIDATION_ERROR` | Food not in DB and `AI_ENABLED=false` |
| `502` | `AI_ENGINE_ERROR` | Ollama AI engine unavailable or timed out |

---

### `POST /api/v1/meals/analyze-photo`

Analyze a meal from an uploaded image (food photo or nutrition label screenshot) using the LLaVA vision model.

> [!IMPORTANT]
> This endpoint **always** calls the AI vision model, regardless of whether the food exists in the database. Requires `AI_ENABLED=true` in the environment.

#### Request Body

```json
{
  "image":  "<base64-encoded-image-string>",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "mode":   "photo"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | `string` | ✅ | Base64-encoded image (JPEG, PNG, WebP) |
| `userId` | `string` (UUID) | ✅ | Authenticated user's ID |
| `mode` | `"photo" \| "screenshot"` | ❌ | Analysis mode — `photo` for a food photo, `screenshot` for a nutrition app screenshot (default: `"photo"`) |

> [!TIP]
> The `mode` field affects how the AI model interprets the image. Use `"screenshot"` when sending nutrition label images or screenshots from other diet apps.

#### Response — `200 OK`

Same shape as `/api/v1/meals/analyze`:

```json
{
  "status": "success",
  "data": {
    "calorieRange": "380 - 420",
    "proteinRange": "18g - 20g",
    "carbsRange":   "47g - 52g",
    "fatRange":     "12g - 14g",
    "alerts": [
      "⚠️ Image quality may affect accuracy.",
      "Identified: فول مدمس"
    ]
  },
  "meta": {
    "userId":     "550e8400-e29b-41d4-a716-446655440000",
    "analyzedAt": "2026-06-20T08:46:00.000Z",
    "logId":      "log-uuid-here"
  }
}
```

#### Errors

| Status | Code | Condition |
|--------|------|-----------|
| `400` | `VALIDATION_ERROR` | Missing image, invalid userId |
| `400` | `VALIDATION_ERROR` | `AI_ENABLED=false` |
| `502` | `AI_ENGINE_ERROR` | LLaVA vision model unavailable or failed |

---

### `GET /api/v1/meals/health`

Module-level health check for the Meals service.

**Response — `200 OK`**
```json
{
  "status": "ok",
  "module": "meals"
}
```

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `PORT` | `3001` | Server port |
| `HOST` | `0.0.0.0` | Bind host |
| `POSTGRES_HOST` | — | PostgreSQL host (required) |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_DB` | — | Database name (required) |
| `POSTGRES_USER` | — | DB user (required) |
| `POSTGRES_PASSWORD` | — | DB password (required) |
| `POSTGRES_POOL_MIN` | `2` | Connection pool minimum |
| `POSTGRES_POOL_MAX` | `10` | Connection pool maximum |
| `AI_ENGINE_URL` | — | Ollama API URL (optional) |
| `AI_MODEL` | `llama3` | Text analysis model |
| `AI_VISION_MODEL` | `llava` | Vision analysis model |
| `AI_TIMEOUT_MS` | `30000` | AI request timeout in ms |
| `AI_ENABLED` | `true` | Toggle AI analysis on/off |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in ms |

---

## Quick Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | API health check |
| `GET` | `/api/v1/users/:id` | Get user profile |
| `PUT` | `/api/v1/users/:id` | Update user profile + auto-calculate targets |
| `POST` | `/api/v1/users/calculate` | Preview calorie/macro targets (no save) |
| `POST` | `/api/v1/foods` | Add food item manually |
| `GET` | `/api/v1/foods/search?q=` | Fuzzy search foods by name |
| `GET` | `/api/v1/foods/:id` | Get food item by ID |
| `POST` | `/api/v1/meals/analyze` | Analyze meal from text |
| `POST` | `/api/v1/meals/analyze-photo` | Analyze meal from image (base64) |
| `GET` | `/api/v1/meals/health` | Meals module health check |
