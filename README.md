# Qwintly WG Worker

An orchestrator service built on **NestJS** designed to run as a Google Cloud Run worker. It receives GCP Pub/Sub push subscription notifications, decodes payload messages verified via signed JWT keys, triggers dynamic Cloud Run Jobs (Builder & Deployer), and broadcasts live execution statuses/logs to Supabase DB and Upstash Redis.

---

## Key Features
*   **Production-Grade NestJS Architecture**: Structured around clean separation of concerns using Modules, Controllers, Services, Guards, and DTOs.
*   **Secure OIDC Token Authentication**: Verifies incoming Google Cloud Pub/Sub push HTTP requests utilizing token guards checking request paths against configured audiences.
*   **Type-safe Payload Validation**: Decodes base64 message bodies, deciphers signed JWT worker tokens, and parses variables programmatically using NestJS `ValidationPipe` and `class-validator` schemas.
*   **GCP Cloud Run Job Triggering**: Launches GCP Cloud Run jobs dynamically passing execution context and override parameters.
*   **Dual Logging Stream**: Connects with `@vedangiitb/qwintly-core` database layers to write telemetry logs synchronously back to Upstash Redis events channels and Supabase DB tables.

---

## Directory Structure

```
src/
├── main.ts                    # Bootstrappers and global validation pipelines configuration
├── app.module.ts              # Root entry point module importing configs, core services, and pub/sub routes
├── config/                    # Typesafe environment variable loader and validator schemas
│   ├── config.module.ts
│   ├── configuration.ts
│   └── env.validation.ts
├── common/                    # Shared validation DTOs, guards, utilities, and TypeScript types
│   ├── guards/
│   │   └── pubsub-auth.guard.ts  # Verifies OIDC Identity authorization tokens from GCP Pub/Sub
│   ├── utils/
│   │   ├── extract-bearer-token.utils.ts
│   │   ├── pubsub.utils.ts
│   │   └── timestamp.utils.ts
│   └── types/
│       ├── events.ts
│       ├── job-params.types.ts
│       └── request.types.ts
├── core/                      # Supabase database clients and dynamic Qwintly Core logger builders
│   ├── core.module.ts
│   ├── supabase.service.ts
│   ├── qwintly-core.service.ts
│   └── status.service.ts      # Terminates generation sessions in Supabase
├── jobs/                      # Google Cloud Run Job client services
│   ├── jobs.module.ts
│   ├── jobs.service.ts        # Base Cloud Run Jobs execution runner
│   ├── builder-job.service.ts
│   └── deployer-job.service.ts
└── pubsub/                    # HTTP Pub/Sub request handlers and controllers
    ├── pubsub.module.ts
    ├── pubsub.controller.ts   # Routes requests to correct jobs handlers
    ├── pubsub.service.ts      # Decodes JWT tokens, validates payload parameters, and invokes jobs
    └── dto/
        ├── pubsub-envelope.dto.ts
        ├── generate-payload.dto.ts
        └── deploy-payload.dto.ts
```

---

## Configuration Variables

Create a local `.env` file in the root directory mapping the following keys:

| Environment Variable Name | Type | Description |
| :--- | :--- | :--- |
| `PORT` | `number` | Port on which the HTTP server listens (default: `8080`) |
| `GCP_PROJECT_ID_QWINTLY` | `string` | Target Google Cloud Project ID |
| `REGION` | `string` | GCP Resource region (default: `asia-south1`) |
| `NEXT_PUBLIC_SUPABASE_URL`| `string` | HTTP endpoint URL for Supabase instances |
| `SUPABASE_SECRET_KEY` | `string` | Supabase API Service Secret Key |
| `UPSTASH_REDIS_REST_URL_GEN_EVENTS` | `string` | Upstash Redis connection URL |
| `UPSTASH_REDIS_REST_TOKEN_GEN_EVENTS`| `string` | Authorization token for Upstash REST client |
| `PUBSUB_PUSH_AUDIENCE` | `string` | Base audience string prefix matched in Pub/Sub identity token checks |
| `PUBLISH_SECRET` | `string` | Shared secret key validating JWT tokens inside Pub/Sub payload bodies |

---

## API Endpoints

### 1. Health Checks
*   **`GET /`**: Returns `200 OK` ("ok").
*   **`GET /healthz`**: Returns `200 OK` ("ok").

### 2. Job Handlers
Requires Google OIDC authorization tokens passed inside the HTTP Authorization Bearer Header (`Authorization: Bearer <id_token>`) matching `PUBSUB_PUSH_AUDIENCE/pubsub/<generate|deploy>`:
*   **`POST /pubsub/generate`**: Launches background application builders.
*   **`POST /pubsub/deploy`**: Launches background application deployers.

#### Pub/Sub Message Payload Format
```json
{
  "message": {
    "data": "eyBqb2JUb2tlbjogIi4uLiIgfQ=="
  }
}
```
*Note: The `data` parameter represents a base64 encoded JSON string carrying `jobToken` (a signed JWT).*

---

## Getting Started

### Prerequisites
*   Node.js (v20+ recommended)
*   npm (v10+ recommended)

### Setup & Installation
```bash
# Install dependency packages
npm install
```

### Running the App
```bash
# Start development mode
npm run dev

# Run compiled build in production mode
npm run start
```

### Building the Project
Compiles TypeScript compiler assets into the production folder (`dist/src/main.js`):
```bash
npm run build
```

### Run Tests
```bash
# Run unit and integration tests under Vitest
npm run test

# Run tests with coverage output
npm run test:coverage

# Perform typecheck compiler validations
npm run typecheck
```

### Docker Builds
Build and run the worker inside a Docker container:
```bash
# Build the Docker image
docker build -t qwintly-wg-worker .

# Run the image locally
docker run -p 8080:8080 --env-file .env qwintly-wg-worker
```
