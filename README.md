# Bus Route Information System — Complete Hackathon Project (Tasks 1, 2 & 3)

> **A Complete, Hackathon-Ready Bus Route Information System**  
> Features passenger search, From → To route path finder, vertical stop timeline, real-time metrics, JWT-authenticated Admin Dashboard, and full route & stop lifecycle management.

---

## 1. Project Overview & Features

The **Bus Route Information System** is an enterprise-grade, lightweight web platform built for city transit authorities and daily commuters.

### Commuter / Passenger Features (Task 2)
- **Home Page (`index.html`)**:
  - Hero search bar with asynchronous, debounced autocomplete suggestions.
  - Interactive quick tags for high-frequency routes and major transit terminals.
  - Active routes directory with distance, duration, and operating timetables.
  - Live system health status badge in the footer.
- **Search Page (`search.html`)**:
  - Dual-mode transit search:
    1. Search by Route Number (e.g. `101`, `102`) or Stop Name (e.g. `University`, `Railway Station`).
    2. Direct Route Path Finder between any two stops with dropdown selectors.
  - URL parameter routing support (`search.html?q=101` or `search.html?from=S001&to=S004`).
  - Standardized empty state message when no direct route exists.
  - Responsive cards with route distance, duration, trip hours, and stop sequence preview.
- **Route Details Page (`route-details.html`)**:
  - Key metrics banner: Distance in km, estimated duration in minutes, first/last trip hours, total stops.
  - **Visual Vertical Stop Timeline**:
    - Directional stop sequence with connecting gradient lines and downward arrows (`↓`).
    - Color-coded terminal stops (Origin: green node, Destination: red/flag node).
    - Sequence numbers, stop codes, and GPS coordinates.
- **Path Finder Between Two Stops**:
  - Direct route search powered by MongoDB array `$all` matching.
  - Handles multi-route intersections (e.g. both Route 101 and Route 105 connect Central Bus Stand and University).
  - Client-side same-stop validation: *"Please select two different stops."*

### Admin Management Features (Task 3)
- **Admin Authentication (`admin/login.html`)**:
  - Secure login with bcrypt password comparison and signed JSON Web Tokens (JWT).
  - Role-based access control: regular users are blocked (*"Access denied. Administrator privileges are required."*).
- **Dashboard Overview (`admin/dashboard.html`)**:
  - Live summary statistic cards: Total Routes, Total Stops, Active Routes, User Feedback Count.
  - Quick insights: Route with most stops, top connected transit hubs.
  - Active routes overview table.
- **Route Management**:
  - Tabular view with instant search filter.
  - **Add Route**: Validates unique route number, start/end stops, distance, duration, timings, and minimum 2 stops.
  - **Assign Stops to Routes**: Interactive stop assigner maintaining exact stop sequence with move up (`▲`), move down (`▼`), and remove (`✕`) controls.
  - **Edit Route**: Preloads existing route data without data loss.
  - **Delete Route**: Confirmation modal; automatically removes route references from all connected stops.
- **Stop Management**:
  - Tabular view with Stop ID, Stop Name, Coordinates, and connected routes count.
  - **Add Stop**: Unique Stop ID and name validation.
  - **Edit Stop**: Updates name and GPS coordinates while preserving Stop ID.
  - **Delete Stop with Safety Check**: Deletion is blocked if the stop is in active use by any route, preventing broken references.
- **User Feedback Console**:
  - Ingests and displays passenger feedback messages.

---

## 2. Technology Stack

- **Backend Runtime**: Node.js (v18+)
- **Server Framework**: Express.js (v4.21+)
- **Database**: MongoDB & Mongoose (v8.9+) with automated in-memory MongoDB fallback
- **Authentication**: JWT (`jsonwebtoken`) & `bcryptjs`
- **Frontend**: HTML5, CSS3 (Modern Flexbox & CSS Grid), Vanilla JavaScript (ES6+)
- **Security & Middleware**: `cors`, `dotenv`, centralized error handling, JWT auth guard
- **Testing**: Native Node integration test suites (67 automated test assertions)

---

## 3. Project Directory Structure

```text
bus-route-information-system/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB connection & fallback handler
│   │   │
│   │   ├── models/
│   │   │   ├── Route.js              # Route Mongoose schema
│   │   │   ├── Stop.js               # Stop Mongoose schema
│   │   │   ├── User.js               # User & authentication schema
│   │   │   └── Feedback.js           # Passenger feedback schema
│   │   │
│   │   ├── controllers/
│   │   │   ├── routeController.js    # Route CRUD, search, path & dashboard stats
│   │   │   ├── stopController.js     # Stop CRUD & safety check
│   │   │   ├── authController.js     # User registration, login & JWT
│   │   │   └── feedbackController.js # Feedback submission & retrieval
│   │   │
│   │   ├── routes/
│   │   │   ├── routeRoutes.js        # /api/routes routes & admin protection
│   │   │   ├── stopRoutes.js         # /api/stops routes & admin protection
│   │   │   ├── authRoutes.js         # /api/auth routes
│   │   │   └── feedbackRoutes.js     # /api/feedback routes
│   │   │
│   │   ├── middleware/
│   │   │   ├── errorMiddleware.js    # 404 & centralized error handler
│   │   │   └── authMiddleware.js     # JWT verification & admin role check
│   │   │
│   │   ├── utils/
│   │   │   └── seedData.js           # Preloaded demo dataset & seeder
│   │   │
│   │   └── app.js                    # Express app (API + frontend static server)
│   │
│   ├── test/
│   │   ├── api.test.js               # Task 1 & Hanamkonda: 31 backend API test cases
│   │   ├── frontend.test.js          # Task 2: 16 frontend integration test cases
│   │   └── admin.test.js             # Task 3: 20 admin dashboard & lifecycle tests
│   │
│   ├── server.js                     # HTTP server entrypoint
│   ├── .env.example                  # Environment template
│   ├── .env                          # Local environment configuration
│   ├── .gitignore                    # Backend gitignore
│   └── package.json                  # Dependencies & npm scripts
│
├── frontend/
│   ├── index.html                    # Commuter Home Page (Hero & Path Finder)
│   ├── search.html                   # Commuter Route Search & Results
│   ├── route-details.html            # Commuter Vertical Stop Timeline
│   │
│   ├── admin/
│   │   ├── login.html                # Admin Login page
│   │   ├── dashboard.html            # Admin Management Dashboard
│   │   ├── css/
│   │   │   └── admin.css             # Admin dashboard styling
│   │   └── js/
│   │       └── admin.js              # Admin controller & stop assigner
│   │
│   ├── css/
│   │   └── style.css                 # Public transport design system
│   │
│   ├── js/
│   │   ├── api.js                    # Centralized API client
│   │   ├── app.js                    # Home page controller
│   │   ├── search.js                 # Search page controller
│   │   └── route-details.js          # Route details & timeline renderer
│   │
│   └── assets/                       # Static media
│
├── README.md                         # Complete documentation
└── .gitignore                        # Root gitignore
```

---

## 4. Database Design & Schemas

### 4.1. Routes Collection (`Routes`)
```json
{
  "routeId": "R101",
  "routeNumber": "101",
  "startStop": "Hanamkonda Bus Station",
  "endStop": "SR University",
  "distance": 14.5,
  "duration": 35,
  "stops": ["S001", "S016", "S017", "S020", "S021", "S022", "S024", "S025"],
  "timings": {
    "firstTrip": "06:00 AM",
    "lastTrip": "09:30 PM"
  }
}
```

### 4.2. Stops Collection (`Stops`)
```json
{
  "stopId": "S025",
  "stopName": "SR University",
  "latitude": 18.0682,
  "longitude": 79.5447,
  "connectedRoutes": ["R101", "R105", "R107", "R109"]
}
```

### 4.3. Users Collection (`Users`)
```json
{
  "userId": "U001",
  "name": "System Admin",
  "email": "admin@busroute.com",
  "role": "admin"
}
```

### 4.4. Feedback Collection (`Feedback`)
```json
{
  "feedbackId": "FB001",
  "userId": "U002",
  "routeId": "R101",
  "message": "Route 101 is punctual and convenient for University students."
}
```

---

## 5. Demo Credentials

For hackathon evaluation and demonstration:

| Role | Email | Password | Access |
|---|---|---|---|
| **Administrator** | `admin@busroute.com` | `admin123` | Full Admin Dashboard (`/admin/dashboard`) |
| **Normal Passenger** | `passenger@busroute.com` | `user123` | Public Transit Website (`/`) |

---

## 6. How to Run the Application

### Step 1: Start the Backend Server
```bash
cd bus-route-information-system/backend
npm install
npm start
```

*Note: If no local MongoDB service is running, an in-memory database automatically initializes and preloads the complete demo dataset with zero manual configuration.*

### Step 2: Access the Application
- **Passenger Website**: `http://localhost:5000/`
- **Route Search**: `http://localhost:5000/search.html`
- **Route Details**: `http://localhost:5000/route-details.html?id=R101`
- **Admin Login**: `http://localhost:5000/admin` (or `http://localhost:5000/admin/login.html`)
- **Admin Dashboard**: `http://localhost:5000/admin/dashboard`

---

## 7. Complete Verification & Testing Guide

Run all 67 automated tests across all development tasks:

```bash
cd bus-route-information-system/backend
npm test
```

### Test Breakdown:
- **`npm run test:api`** (31 tests): Health check, Stop/Route CRUD, search queries, `$all` path finder, unique routeNumber validation, minimum 2 stops validation, JWT auth, feedback, dashboard stats, and Hanamkonda demo scenarios.
- **`npm run test:frontend`** (16 tests): Static page serving, CSS/JS asset delivery, stop dropdown data contract, route cards rendering contract, and vertical stop timeline sequence.
- **`npm run test:admin`** (20 tests): Admin login verification, role-based protection, dashboard statistics, route creation with assigned stops, stop deletion safety check, and complete end-to-end integration lifecycle.

---

## 8. API Endpoints Reference

### Public APIs
- `GET /api/health` — API health status
- `GET /api/routes` — Get all routes with enriched ordered stops
- `GET /api/routes/:id` — Get single route by `routeId` or `_id`
- `GET /api/routes/search?q={query}` — Search routes by route number or stop name
- `GET /api/routes/path?fromStopId={id}&toStopId={id}` — Find direct routes connecting two stops
- `GET /api/routes/stats/dashboard` — Live transit statistics
- `GET /api/stops` — Get all stops (supports `?name={query}`)
- `GET /api/stops/:id` — Get single stop by `stopId` or `_id`
- `POST /api/auth/register` — Register passenger / user
- `POST /api/auth/login` — Login and receive JWT token
- `POST /api/feedback` — Submit feedback
- `GET /api/feedback` — List feedback entries

### Protected Admin APIs (Require `Authorization: Bearer <token>`)
- `POST /api/routes` — Create new route with assigned stops
- `PUT /api/routes/:id` — Update route details and stop sequence
- `DELETE /api/routes/:id` — Delete route and update connected stops
- `POST /api/stops` — Create new stop
- `PUT /api/stops/:id` — Update stop name or GPS coordinates
- `DELETE /api/stops/:id` — Delete stop (safely blocked if used by active routes)

---

## 9. Hanamkonda & Warangal Transit Network & SR University Dataset

The database is pre-seeded with realistic transit data covering the tri-cities of **Hanamkonda, Warangal, and Kazipet**, with special connectivity to **SR University** in Ananthasagar/Hasanparthy.

### Key Metrics
- **Total Bus Stops**: 54 authentic locations (`S001` - `S054`)
- **Total Transit Routes**: 10 interconnected routes (`R101` - `R110`)
- **SR University Primary Stop**: `S025` (*SR University*, Area: *Ananthasagar, Hasanparthy, Hanamkonda*)
- **SR University Gate Stop**: `S024` (*SR University Main Gate*)
- **Routes Serving SR University**:
  - **Route 101**: Hanamkonda Bus Station ⇄ SR University (via Naimnagar, KU X Road, Bheemaram, Hasanparthy)
  - **Route 105**: Kakatiya Musical Garden ⇄ Dharmasagar (via HBS, KU, Hasanparthy, SR University)
  - **Route 107**: Kazipet Railway Station ⇄ SR University (via Subedari, Naimnagar, KU, Hasanparthy)
  - **Route 109**: Warangal Fort ⇄ Ananthasagar (via Warangal RS, HBS, KU, SR University)

### Re-seeding the Database
To reset and seed the database with the full dataset at any time:
```bash
cd bus-route-information-system/backend
npm run seed
```

### Verified Demo Search Scenarios
1. **Hanamkonda Bus Station (`S001`) → SR University (`S025`)**:  
   Returns 3 matching direct routes: **Route 101, Route 105, Route 109**.
2. **SR University (`S025`) → Hanamkonda Bus Station (`S001`)**:  
   Returns 3 matching direct routes: **Route 101, Route 105, Route 109**.
3. **Kazipet Railway Station (`S013`) → SR University (`S025`)**:  
   Returns direct route: **Route 107**.
4. **Warangal Railway Station (`S012`) → Hanamkonda Bus Station (`S001`)**:  
   Returns 3 matching direct routes: **Route 103, Route 104, Route 108**.
5. **Search by "SR University"**:  
   Retrieves the stop details and all 4 connected routes (`101`, `105`, `107`, `109`).
