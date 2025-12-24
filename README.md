# ReCard Card Manager

Admin dashboard for managing credit card data in the ReCard platform.

## Architecture

The Card Manager is a separate admin-only application within the ReCard monorepo:

- **card-manager-app/** - React + Vite frontend (port 5174)
- **admin-server/** - Express backend with Firebase Admin SDK (port 9000)

This is separate from the production ReCard app:
- **Client/recardclient/** - User-facing React app (port 5173)
- **Server/** - Production API (port 8000)

## Tech Stack

### Frontend (card-manager-app)
- React (TypeScript) + Vite
- React Router DOM v7
- Tailwind CSS + SCSS (utility-first with local SCSS)
- shadcn/ui primitives (Radix + tailwindcss-animate)
- Axios (API client with auth interceptor)
- Firebase Client SDK (Auth with Google provider)

### Backend (admin-server)
- Node.js + Express + TypeScript
- Firebase Admin SDK (Firestore + Auth verification)
- CORS enabled for CardManager frontend
- Zod for schema validation

## Features

- Google Firebase Authentication with admin permissions stored in Firestore
- Card version management (create, update, delete, activate/deactivate)
- Component management (credits, perks, multipliers)
- Real-time card status tracking (active/inactive/no active version)
- Protected routes requiring authentication
- Permission pre-check endpoint for UX-friendly login gating
- AI-powered features (requires Gemini API key):
  - **AI Data Entry Assistant**: Parse credit card details from pasted text
  - **Card Comparison**: Compare database card data against website text to identify matches, mismatches, missing, and outdated fields

## Setup

### Prerequisites

1. Firebase project with:
   - Firestore database
   - Authentication enabled (Google provider)
   - Service account key JSON file

### 1. Frontend Setup (card-manager-app)

Navigate to `CardManager/card-manager-app` and create `.env`:

```bash
VITE_API_BASE_URL=http://localhost:9000

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
```

Install dependencies and run:

```bash
npm install
npm run dev
```

The frontend will run on http://localhost:5174

### 2. Backend Setup (admin-server)

Navigate to `CardManager/admin-server` and create `.env`:

```bash
PORT=9000
CORS_ORIGIN=http://localhost:5174
FIREBASE_SERVICE_ACCOUNT_PATH=../../Server/config/firebase-service-account.json

# Gemini API Key (required for AI features)
GEMINI_API_KEY=your_gemini_api_key

# (Optional) Alternative to file path: provide the full JSON string
# FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n..."}'
```

Install dependencies and run:

```bash
npm install
npm run dev
```

The admin server will run on http://localhost:9000

### 3. Firebase Service Account

Place your Firebase service account JSON file at:
```
ReCard/Server/config/firebase-service-account.json
```

Or update `FIREBASE_SERVICE_ACCOUNT_PATH` in admin-server `.env` to point to your file location.

## Authentication & Permissions

### Admin permissions (Firestore)

Admin access is controlled via Firestore, not environment variables.

- Collection: `permissions`
- Document: `card-manager`
- Field: `allowed` (array of lowercase emails)

Example document:
```json
{
  "allowed": [
    "alice@gmail.com",
    "bob@company.com"
  ]
}
```

Update this document to grant/revoke admin access. Emails are compared case-insensitively (stored lowercase).

### Public permission check endpoint

The frontend pre-checks access via a public endpoint (no auth required):

```
GET /admin/check-permission/:email
Response: { "allowed": boolean }
```

## Authentication

### Adding Admin Users

To grant admin access to a user, add their email to Firestore:

1. Open Firestore → `permissions/card-manager`
2. Add the email to the `allowed` array (lowercase)
3. No server restarts needed; cache refreshes automatically

You can force-refresh the server-side cache by waiting up to 5 minutes or restarting the admin-server during development.

### Security Flow

1. User visits http://localhost:5174
2. Redirected to /login if not authenticated
3. User clicks "Sign in with Google"
4. Frontend calls `/admin/check-permission/:email` to validate Firestore permissions
   - If not: auto sign-out with error message
   - If yes: proceed to dashboard
5. On every API request:
   - Frontend adds Firebase ID token to Authorization header
   - Backend verifies token and checks Firestore permission list
   - Returns 401 if token invalid, 403 if email not authorized

## API Endpoints

All endpoints require `Authorization: Bearer <firebase-id-token>` header.
(Except the permission check endpoint which is public.)

### Permissions
```
GET    /admin/check-permission/:email               - Check if email is allowed (public)
```

### Card Names (top-level identity)
```
GET    /admin/card-names                            - List all card names
GET    /admin/card-names/:referenceCardId          - Get single card name
POST   /admin/card-names/:referenceCardId          - Create card name entry
PUT    /admin/card-names/:referenceCardId          - Update card name entry
DELETE /admin/card-names/:referenceCardId          - Delete card name + related data
```

### Card Management (versions in credit_cards_history)
```
GET    /admin/cards                                  - List all cards with status
GET    /admin/cards/:cardId                           - Get single card
POST   /admin/cards                                   - Create new card (auto-id)
POST   /admin/cards/:cardId                           - Create new card with specific id
PUT    /admin/cards/:cardId                          - Update card
DELETE /admin/cards/:cardId                          - Delete card
DELETE /admin/cards/reference/:referenceCardId/all   - Delete all versions + components by reference id
```

### Version Management
```
GET    /admin/cards/:referenceCardId/versions                             - List versions for a card
POST   /admin/cards/:referenceCardId/versions                             - Create new version (auto-id)
POST   /admin/cards/:referenceCardId/versions/:versionId                  - Create new version with specific id
POST   /admin/cards/:referenceCardId/versions/:versionId/activate         - Activate version
POST   /admin/cards/:referenceCardId/versions/:versionId/deactivate       - Deactivate version

POST   /admin/cards/sync-all                                              - Sync active versions to production collection
```

### Component Management
```
GET    /admin/cards/:cardId/credits                   - List credits
POST   /admin/credits                                 - Create credit
PUT    /admin/credits/:creditId                       - Update credit
DELETE /admin/credits/:creditId                       - Delete credit

GET    /admin/cards/:cardId/perks                     - List perks
POST   /admin/perks                                   - Create perk
PUT    /admin/perks/:perkId                          - Update perk
DELETE /admin/perks/:perkId                          - Delete perk

GET    /admin/cards/:cardId/multipliers               - List multipliers
POST   /admin/multipliers                             - Create multiplier
PUT    /admin/multipliers/:multiplierId              - Update multiplier
DELETE /admin/multipliers/:multiplierId              - Delete multiplier
```

## Running in Production

### Frontend Build
```bash
cd card-manager-app
npm run build
npm run preview
```

### Backend Build
```bash
cd admin-server
npm run build
npm start
```

Update environment variables for production:
- `VITE_API_BASE_URL` - Your production admin-server URL
- `CORS_ORIGIN` - Your production CardManager frontend URL
- `PORT` - Production port (default 9000)
- `FIREBASE_SERVICE_ACCOUNT` - Optionally provide the full JSON string (instead of a file)

## Development

### Project Structure

```
CardManager/
├── card-manager-app/           # Frontend
│   ├── src/
│   │   ├── components/         # UI components
│   │   │   ├── shadcn/         # Shadcn UI primitives (tailwind-based)
│   │   │   └── ui/             # Local UI wrappers
│   │   ├── pages/             # Route-level pages
│   │   ├── services/          # API service layer
│   │   ├── contexts/          # React contexts (Auth)
│   │   ├── lib/               # Firebase config, API client, utils
│   │   ├── types/             # TypeScript types
│   │   ├── styling/           # SCSS variables, mixins, globals
│   │   └── index.css          # Tailwind layers and CSS variables
│   ├── .env
│   └── package.json
│
└── admin-server/              # Backend
    ├── routes/
    │   ├── cards.ts           # Card-names, cards, versions, sync
    │   └── components.ts      # Credits/perks/multipliers
    ├── middleware/
    │   └── auth.ts            # Firebase token verification
    ├── firebase-admin.ts      # Firebase initialization
    ├── types/                 # Shared types (local copies)
    ├── index.ts               # Express app entry
    ├── .env
    └── package.json
```

### Running Both Servers

Terminal 1 - Admin Server:
```bash
cd CardManager/admin-server
npm run dev
```

Terminal 2 - Frontend:
```bash
cd CardManager/card-manager-app
npm run dev
```

## Troubleshooting

### "No token provided" error
- Make sure you're logged in via the /login page
- Check browser console for Firebase authentication errors
- Verify Firebase config in card-manager-app `.env`

### "Your email is not authorized" error
- Add your email (lowercase) to Firestore: `permissions/card-manager.allowed`
- Wait up to 5 minutes for cache refresh or restart admin-server in development
- Ensure you're logging in with the same Google account

### "Failed to fetch" or CORS errors
- Verify admin-server is running on port 9000
- Check `CORS_ORIGIN` in admin-server `.env` matches frontend URL
- Verify `VITE_API_BASE_URL` in card-manager-app `.env` matches backend URL

### Firebase service account errors
- Verify `FIREBASE_SERVICE_ACCOUNT_PATH` points to correct JSON file
- Check file permissions on service account JSON
- Verify the service account has Firestore and Auth permissions
- Alternatively set `FIREBASE_SERVICE_ACCOUNT` to the JSON string in production

### Card status not updating
- Check that `EffectiveFrom` and `EffectiveTo` dates are in YYYY-MM-DD format
- Use `9999-12-31` as the sentinel value for ongoing cards
- Verify your system date is correct
