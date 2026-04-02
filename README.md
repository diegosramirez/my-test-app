# SAM1 Chat

Full-stack chat application with an Angular frontend and TypeScript Express backend.

## Prerequisites

- Node.js >= 18
- npm >= 9

## Install

Install all dependencies (frontend + backend) from the project root:

```bash
npm run install:all
```

## Run Frontend

```bash
npm start
```

Frontend runs on **http://localhost:4200**. The Angular dev server proxies `/api` requests to the backend via `proxy.conf.json`.

## Run Backend

```bash
cd server
npm run dev
```

Backend runs on **http://localhost:3000** by default. Override with the `PORT` environment variable:

```bash
PORT=8080 npm run dev
```

## Run Both

Start both frontend and backend concurrently from the project root:

```bash
npm run dev
```

## Run Tests

Frontend tests (from project root):

```bash
npx ng test --watch=false
```

Backend tests:

```bash
cd server
npm test
```

## Project Structure

```
.
├── proxy.conf.json              # Dev proxy: /api -> localhost:3000
├── angular.json                 # Angular CLI configuration
├── package.json                 # Root package.json (frontend + orchestration)
├── tsconfig.json                # Frontend TypeScript config
├── src/
│   ├── index.html               # App shell (title: SAM1 Chat)
│   ├── main.ts                  # Angular bootstrap
│   ├── styles.css               # Global styles (minimal reset)
│   └── app/
│       ├── app.ts               # Root component (standalone, inline template)
│       ├── app.spec.ts          # Root component tests
│       ├── app.config.ts        # Application providers
│       ├── app.routes.ts        # Route definitions
│       ├── components/
│       │   └── index.ts         # Barrel file
│       ├── models/
│       │   ├── health.interface.ts  # HealthResponse interface
│       │   └── index.ts         # Barrel file
│       ├── pages/
│       │   └── index.ts         # Barrel file
│       └── services/
│           └── index.ts         # Barrel file
└── server/
    ├── package.json             # Backend dependencies
    ├── tsconfig.json            # Backend TypeScript config
    └── src/
        ├── index.ts             # Express entry point
        └── routes/
            ├── health.ts        # GET /api/health endpoint
            └── health.test.ts   # Health endpoint integration test
```

## Notes

- The favicon was removed during scaffold cleanup. Add a custom favicon to `public/` when branding is finalized.
- The Angular dev proxy (`proxy.conf.json`) forwards `/api` requests to the Express backend, avoiding CORS issues during development. The backend also configures CORS for `http://localhost:4200` for direct API testing (curl, Postman).
- `provideHttpClient()` is configured without interceptors. When auth is added, switch to `provideHttpClient(withInterceptors([...]))`.
