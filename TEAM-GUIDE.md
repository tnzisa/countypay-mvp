# CountyPay Team Collaboration Guide

## Quick Start for Team Members

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/countypay-mvp.git
cd countypay-mvp
```

### 2. Setup Your Branch
```bash
# Frontend Developer
git checkout -b frontend-dev

# USSD Developer
git checkout -b ussd-dev

# DevOps Engineer
git checkout -b devops-dev
```

### 3. Install Dependencies
```bash
# Backend (already done by backend dev)
cd backend
npm install

# Frontend
cd frontend
npm install

# USSD Service
cd ussd-service
npm install
```

---

## Daily Workflow

### Morning Routine
```bash
# 1. Pull latest changes from main
git checkout main
git pull origin main

# 2. Merge into your branch
git checkout your-branch-name
git merge main

# 3. Start working
```

### During Development
```bash
# Save your work frequently
git add .
git commit -m "feat: add login page"
git push origin your-branch-name
```

### End of Day
```bash
# Push all changes
git add .
git commit -m "chore: end of day commit"
git push origin your-branch-name

# Create Pull Request on GitHub if feature is complete
```

---

## Branch Strategy

```
main (production-ready)
  ├── dev (integration branch)
  │   ├── backend-dev (Backend Developer)
  │   ├── frontend-dev (Frontend Developer)
  │   ├── ussd-dev (USSD Developer)
  │   └── devops-dev (DevOps Engineer)
```

### Rules
- **Never push directly to `main`**
- Always work on your feature branch
- Merge to `dev` for integration testing
- Merge to `main` only after team approval

---

## Integration Points

### Backend → Frontend
**Backend provides:**
- API Base URL: `http://localhost:5000/api`
- API Documentation: `backend/API-DOCS.md`
- Test credentials in README

**Frontend needs:**
- Store JWT token after login
- Add `Authorization: Bearer TOKEN` to all authenticated requests
- Handle 401 errors (redirect to login)

### Backend → USSD
**Backend provides:**
- Same API endpoints
- Transaction reference format: `CP{timestamp}{random}`

**USSD needs:**
- Use POST `/api/payments` to create payment
- Use GET `/api/payments/ref/:ref` to check status
- Poll every 2 seconds for status updates

### All → DevOps
**DevOps needs:**
- Environment variables from each service
- Build commands
- Port configurations
- Database connection strings

---

## Communication Protocol

### GitHub Issues
Use for:
- Bug reports
- Feature requests
- Technical discussions

**Format:**
```
Title: [Component] Brief description
Body: Detailed description with steps to reproduce
Labels: bug, enhancement, question
```

### Pull Requests
**Format:**
```
Title: feat: Add user authentication
Description:
- Implemented login page
- Added JWT token storage
- Created protected routes

Testing:
- Tested login flow
- Verified token persistence
- Checked error handling
```

### Daily Standups
**Share:**
1. What you completed yesterday
2. What you're working on today
3. Any blockers

---

## Sync Points

### Hour 8 - Progress Check
- Share what's done
- Identify blockers
- Adjust priorities

### Hour 16 - Integration Test
- Merge all branches to `dev`
- Test full system
- Fix integration issues

### Hour 24 - Feature Freeze
- No new features
- Only bug fixes
- Focus on polish

### Hour 32 - Final Integration
- Merge to `main`
- Deploy to production
- Prepare demo

---

## Testing Integration

### Backend Testing
```bash
cd backend
.\test-endpoints.ps1
```

### Frontend Testing
```bash
cd frontend
npm run test
npm run build  # Check if build works
```

### Full System Test
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Test complete user flow
4. Verify blockchain recording

---

## Conflict Resolution

### If you have merge conflicts:
```bash
# 1. Pull latest changes
git pull origin main

# 2. Resolve conflicts in your editor
# Look for <<<<<<< HEAD markers

# 3. After resolving
git add .
git commit -m "fix: resolve merge conflicts"
git push origin your-branch-name
```

### If you're stuck:
1. Create a GitHub Issue
2. Tag the relevant team member
3. Share error messages/screenshots
4. Ask in team chat

---

## Environment Setup

### Backend Developer
```env
DATABASE_URL="postgresql://countypay:dev123@localhost:5435/countypay"
JWT_SECRET="your-secret-key"
STELLAR_SECRET="your-stellar-secret"
PORT=5000
```

### Frontend Developer
```env
VITE_API_URL="http://localhost:5000/api"
```

### USSD Developer
```env
AFRICAS_TALKING_API_KEY="your-api-key"
AFRICAS_TALKING_USERNAME="your-username"
BACKEND_API_URL="http://localhost:5000/api"
```

---

## Quick Commands Reference

### Git Commands
```bash
git status                    # Check current status
git add .                     # Stage all changes
git commit -m "message"       # Commit changes
git push origin branch-name   # Push to GitHub
git pull origin main          # Pull latest from main
git checkout branch-name      # Switch branch
git merge main                # Merge main into current branch
```

### Backend Commands
```bash
npm run dev                   # Start server
npm run prisma:studio         # Open database GUI
.\test-endpoints.ps1          # Test all endpoints
```

### Frontend Commands
```bash
npm run dev                   # Start dev server
npm run build                 # Build for production
npm run preview               # Preview production build
```

---

## Emergency Contacts

- **Backend Issues:** [Backend Dev Name]
- **Frontend Issues:** [Frontend Dev Name]
- **USSD Issues:** [USSD Dev Name]
- **Deployment Issues:** [DevOps Name]

---

## Success Checklist

### Before Creating PR
- [ ] Code works locally
- [ ] No console errors
- [ ] Tested with other components
- [ ] Committed with clear message
- [ ] Pushed to your branch

### Before Merging to Dev
- [ ] PR reviewed by at least one team member
- [ ] All tests passing
- [ ] No merge conflicts
- [ ] Documentation updated

### Before Demo
- [ ] All features working
- [ ] No critical bugs
- [ ] Demo script prepared
- [ ] Backup plan ready

---

**Remember: We're a team! Help each other succeed! 🚀**