# GitHub Setup Script for CountyPay MVP
# This script will initialize Git and push to GitHub

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "CountyPay GitHub Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Check if Git is installed
Write-Host "1. Checking Git installation..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "   [OK] $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] Git is not installed. Please install Git first." -ForegroundColor Red
    Write-Host "   Download from: https://git-scm.com/download/win" -ForegroundColor Cyan
    exit 1
}

# Step 2: Initialize Git repository
Write-Host "`n2. Initializing Git repository..." -ForegroundColor Yellow
if (Test-Path ".git") {
    Write-Host "   [INFO] Git repository already initialized" -ForegroundColor Gray
} else {
    git init
    Write-Host "   [OK] Git repository initialized" -ForegroundColor Green
}

# Step 3: Configure Git user (if not configured)
Write-Host "`n3. Checking Git configuration..." -ForegroundColor Yellow
$gitUser = git config user.name
$gitEmail = git config user.email

if (-not $gitUser) {
    Write-Host "   [INFO] Git user not configured" -ForegroundColor Gray
    $userName = Read-Host "   Enter your name"
    git config user.name "$userName"
    Write-Host "   [OK] Git user name set to: $userName" -ForegroundColor Green
}

if (-not $gitEmail) {
    Write-Host "   [INFO] Git email not configured" -ForegroundColor Gray
    $userEmail = Read-Host "   Enter your email"
    git config user.email "$userEmail"
    Write-Host "   [OK] Git email set to: $userEmail" -ForegroundColor Green
}

# Step 4: Check .gitignore
Write-Host "`n4. Checking .gitignore..." -ForegroundColor Yellow
if (Test-Path ".gitignore") {
    Write-Host "   [OK] .gitignore file exists" -ForegroundColor Green
} else {
    Write-Host "   [WARN] .gitignore file not found" -ForegroundColor Yellow
}

# Step 5: Add files to Git
Write-Host "`n5. Adding files to Git..." -ForegroundColor Yellow
git add .
Write-Host "   [OK] Files added to staging" -ForegroundColor Green

# Step 6: Create initial commit
Write-Host "`n6. Creating initial commit..." -ForegroundColor Yellow
$commitMessage = "Initial commit: Backend API with blockchain integration"
try {
    git commit -m "$commitMessage"
    Write-Host "   [OK] Initial commit created" -ForegroundColor Green
} catch {
    Write-Host "   [INFO] No changes to commit or already committed" -ForegroundColor Gray
}

# Step 7: Get GitHub repository URL
Write-Host "`n7. GitHub Repository Setup" -ForegroundColor Yellow
Write-Host "   Please create a repository on GitHub first:" -ForegroundColor Cyan
Write-Host "   1. Go to https://github.com/new" -ForegroundColor White
Write-Host "   2. Repository name: countypay-mvp" -ForegroundColor White
Write-Host "   3. Keep it Private" -ForegroundColor White
Write-Host "   4. Do NOT initialize with README" -ForegroundColor White
Write-Host "   5. Click 'Create repository'" -ForegroundColor White

Write-Host "`n   After creating the repository:" -ForegroundColor Cyan
$repoUrl = Read-Host "   Enter your GitHub repository URL (e.g., https://github.com/username/countypay-mvp.git)"

if ($repoUrl) {
    # Step 8: Add remote
    Write-Host "`n8. Adding GitHub remote..." -ForegroundColor Yellow
    try {
        git remote add origin $repoUrl
        Write-Host "   [OK] Remote 'origin' added" -ForegroundColor Green
    } catch {
        Write-Host "   [INFO] Remote 'origin' already exists, updating..." -ForegroundColor Gray
        git remote set-url origin $repoUrl
        Write-Host "   [OK] Remote 'origin' updated" -ForegroundColor Green
    }

    # Step 9: Rename branch to main
    Write-Host "`n9. Setting up main branch..." -ForegroundColor Yellow
    git branch -M main
    Write-Host "   [OK] Branch renamed to 'main'" -ForegroundColor Green

    # Step 10: Push to GitHub
    Write-Host "`n10. Pushing to GitHub..." -ForegroundColor Yellow
    Write-Host "    You may be prompted for GitHub credentials" -ForegroundColor Gray
    try {
        git push -u origin main
        Write-Host "   [OK] Code pushed to GitHub successfully!" -ForegroundColor Green
    } catch {
        Write-Host "   [FAIL] Push failed. Please check your credentials and try:" -ForegroundColor Red
        Write-Host "   git push -u origin main" -ForegroundColor Cyan
    }

    # Step 11: Create development branch
    Write-Host "`n11. Creating development branches..." -ForegroundColor Yellow
    git checkout -b dev
    git push -u origin dev
    git checkout -b backend-dev
    git push -u origin backend-dev
    git checkout main
    Write-Host "   [OK] Branches created: dev, backend-dev" -ForegroundColor Green

    # Summary
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "GitHub Setup Complete!" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "`nRepository URL: $repoUrl" -ForegroundColor White
    Write-Host "`nNext Steps:" -ForegroundColor Cyan
    Write-Host "1. Add team members as collaborators on GitHub" -ForegroundColor White
    Write-Host "2. Share repository URL with team" -ForegroundColor White
    Write-Host "3. Team members should clone: git clone $repoUrl" -ForegroundColor White
    Write-Host "`nYour Workflow:" -ForegroundColor Cyan
    Write-Host "git checkout backend-dev" -ForegroundColor White
    Write-Host "# Make changes" -ForegroundColor Gray
    Write-Host "git add ." -ForegroundColor White
    Write-Host "git commit -m 'your message'" -ForegroundColor White
    Write-Host "git push origin backend-dev" -ForegroundColor White
    Write-Host "`nView your repository: $repoUrl" -ForegroundColor Cyan

} else {
    Write-Host "`n[INFO] Skipping GitHub push. You can push later with:" -ForegroundColor Yellow
    Write-Host "git remote add origin YOUR_REPO_URL" -ForegroundColor White
    Write-Host "git branch -M main" -ForegroundColor White
    Write-Host "git push -u origin main" -ForegroundColor White
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

# Made with Bob
