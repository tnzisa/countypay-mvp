# CountyPay Frontend

React frontend application for CountyPay - County Fee Payment System

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Zustand** - State management
- **Axios** - HTTP client

## Project Structure

```
frontend/
├── src/
│   ├── lib/
│   │   └── api.js              # Axios instance with JWT interceptor
│   ├── store/
│   │   └── authStore.js        # Zustand auth state management
│   ├── pages/                  # Page components (Phase 2+)
│   ├── components/             # Reusable components (Phase 2+)
│   ├── App.jsx                 # Main app with routing
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles with Tailwind
├── public/                     # Static assets
├── .env                        # Environment variables
├── tailwind.config.js          # Tailwind configuration
├── postcss.config.js           # PostCSS configuration
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on http://localhost:5000

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=CountyPay
VITE_APP_VERSION=1.0.0
```

## Development Phases

### ✅ Phase 1: Project Foundation (COMPLETED)
- [x] Vite + React setup
- [x] TailwindCSS configuration
- [x] API client with JWT interceptor
- [x] Zustand auth store
- [x] React Router structure

### 🔄 Phase 2: Authentication Module (NEXT)
- [ ] Login page
- [ ] Register page
- [ ] Protected routes
- [ ] Dashboard

### 📋 Phase 3: Payment Flow
- [ ] County selection
- [ ] Fee selection
- [ ] Payment checkout
- [ ] Status polling

### 📋 Phase 4: Transaction History
- [ ] Transaction list
- [ ] Filtering
- [ ] Receipt download

### 📋 Phase 5: Admin Panel
- [ ] County management
- [ ] Analytics dashboard

### 📋 Phase 6: PWA Features
- [ ] Service worker
- [ ] Offline support
- [ ] Install prompt

## API Integration

The frontend connects to the backend API at `http://localhost:5000/api`

### Authentication Flow
1. User logs in → JWT token stored in localStorage
2. Token automatically added to all API requests via interceptor
3. 401 responses trigger automatic logout and redirect

### Key Endpoints Used
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/me` - Get current user
- `GET /counties` - List counties
- `GET /counties/:id/fees` - Get county fees
- `POST /payments` - Create payment
- `GET /payments/my-transactions` - User transactions

## Available Scripts

- `npm run dev` - Start development server (http://localhost:5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Testing Credentials

After backend seeding:

**Regular User:**
- Phone: `254712345678`
- Password: `user123`

**Admin User:**
- Phone: `254700000000`
- Password: `admin123`

## Next Steps

Run Phase 2 to implement authentication pages:
- Login page with phone/password form
- Register page with user registration
- Dashboard with user profile
- Protected route implementation

## Notes

- All routes except `/login` and `/register` require authentication
- Admin routes require `role: 'admin'`
- JWT token expires based on backend configuration
- Automatic logout on 401 responses