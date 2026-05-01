# CountyPay Database Setup Script

Write-Host "🚀 Setting up CountyPay Database..." -ForegroundColor Green

# Generate Prisma Client
Write-Host "`n📦 Generating Prisma Client..." -ForegroundColor Cyan
npm run prisma:generate

# Run migrations
Write-Host "`n🔄 Running database migrations..." -ForegroundColor Cyan
$env:PRISMA_MIGRATE_SKIP_GENERATE = "true"
npx prisma migrate dev --name init --skip-generate

# Seed database
Write-Host "`n🌱 Seeding database with initial data..." -ForegroundColor Cyan
npm run prisma:seed

Write-Host "`n✅ Database setup complete!" -ForegroundColor Green
Write-Host "`n📝 Test Credentials:" -ForegroundColor Yellow
Write-Host "   Admin - Phone: 254700000000, Password: admin123" -ForegroundColor White
Write-Host "   User  - Phone: 254712345678, Password: user123" -ForegroundColor White
Write-Host "`n🚀 Start the server with: npm run dev" -ForegroundColor Cyan

# Made with Bob
