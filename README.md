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
- React 18.3.1 with TypeScript
- Vite (build tool)
- React Router DOM v7
- SCSS (no Tailwind)
- Axios (API client)
- Firebase Client SDK (authentication)

### Backend (admin-server)
- Node.js + Express + TypeScript
- Firebase Admin SDK (Firestore + Auth verification)
- CORS enabled for CardManager frontend

## Features

- Google Firebase Authentication with email whitelist
- Card version management (create, update, delete, activate/deactivate)
- Component management (credits, perks, multipliers)
- Real-time card status tracking (active/inactive/no active version)
- Protected routes requiring authentication

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

# Admin Email Whitelist (comma-separated)
VITE_ADMIN_EMAILS=admin@example.com,another.admin@example.com
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

# Admin Email Whitelist (comma-separated)
ADMIN_EMAILS=admin@example.com,another.admin@example.com
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

## Authentication

### Adding Admin Users

To grant admin access to a user:

1. Add their Google email to `VITE_ADMIN_EMAILS` in card-manager-app `.env`
2. Add the same email to `ADMIN_EMAILS` in admin-server `.env`
3. Restart both servers

Example:
```bash
# Both .env files must match
ADMIN_EMAILS=alice@gmail.com,bob@company.com
VITE_ADMIN_EMAILS=alice@gmail.com,bob@company.com
```

### Security Flow

1. User visits http://localhost:5174
2. Redirected to /login if not authenticated
3. User clicks "Sign in with Google"
4. Frontend checks if email is in whitelist
   - If not: auto sign-out with error message
   - If yes: proceed to dashboard
5. On every API request:
   - Frontend adds Firebase ID token to Authorization header
   - Backend verifies token and checks email whitelist
   - Returns 401 if token invalid, 403 if email not authorized

## API Endpoints

All endpoints require `Authorization: Bearer <firebase-id-token>` header.

### Card Management

```
GET    /admin/cards                                    - List all cards with status
GET    /admin/cards/:cardId                           - Get single card
POST   /admin/cards                                   - Create new card
PUT    /admin/cards/:cardId                          - Update card
DELETE /admin/cards/:cardId                          - Delete card
```

### Version Management

```
GET    /admin/cards/:referenceCardId/versions         - List versions for a card
POST   /admin/cards/:referenceCardId/versions         - Create new version
POST   /admin/cards/:referenceCardId/versions/:versionId/activate - Activate version
POST   /admin/cards/:referenceCardId/deactivate       - Deactivate active version
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

## Development

### Project Structure

```
CardManager/
├── card-manager-app/           # Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Route-level pages
│   │   ├── services/          # API service layer
│   │   ├── contexts/          # React contexts (Auth)
│   │   ├── lib/               # Firebase config, API client
│   │   ├── types/             # TypeScript types
│   │   └── styles/            # SCSS files
│   ├── .env
│   └── package.json
│
└── admin-server/              # Backend
    ├── routes/
    │   ├── cards.ts           # Card & version endpoints
    │   └── components.ts      # Credits/perks/multipliers
    ├── middleware/
    │   └── auth.ts            # Firebase token verification
    ├── firebase-admin.ts      # Firebase initialization
    ├── types.ts               # Shared types
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
- Add your email to both `VITE_ADMIN_EMAILS` and `ADMIN_EMAILS`
- Restart both servers after updating .env files
- Make sure emails are lowercase in the whitelist

### "Failed to fetch" or CORS errors
- Verify admin-server is running on port 9000
- Check `CORS_ORIGIN` in admin-server `.env` matches frontend URL
- Verify `VITE_API_BASE_URL` in card-manager-app `.env` matches backend URL

### Firebase service account errors
- Verify `FIREBASE_SERVICE_ACCOUNT_PATH` points to correct JSON file
- Check file permissions on service account JSON
- Verify the service account has Firestore and Auth permissions

### Card status not updating
- Check that `EffectiveFrom` and `EffectiveTo` dates are in YYYY-MM-DD format
- Use `9999-12-31` as the sentinel value for ongoing cards
- Verify your system date is correct
