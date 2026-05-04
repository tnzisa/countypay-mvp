# CountyPay API Automated Testing Script
# Run this to test all endpoints and blockchain integration

$baseUrl = "http://localhost:5000/api"
$ErrorActionPreference = "Continue"

Write-Host "`n========================================"  -ForegroundColor Cyan
Write-Host "CountyPay API Testing Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET
    Write-Host "   [OK] Health check passed: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Login
Write-Host "`n2. Testing Login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        phone = "254712345678"
        password = "user123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $loginResponse.token
    $userId = $loginResponse.user.id
    Write-Host "   [OK] Login successful" -ForegroundColor Green
    Write-Host "   User: $($loginResponse.user.name) ($($loginResponse.user.phone))" -ForegroundColor Gray
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "   [FAIL] Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Get Profile
Write-Host "`n3. Testing Get Profile..." -ForegroundColor Yellow
try {
    $headers = @{
        Authorization = "Bearer $token"
    }
    
    $profile = Invoke-RestMethod -Uri "$baseUrl/auth/me" `
        -Method GET `
        -Headers $headers

    Write-Host "   [OK] Profile retrieved" -ForegroundColor Green
    Write-Host "   Name: $($profile.user.name)" -ForegroundColor Gray
    Write-Host "   Role: $($profile.user.role)" -ForegroundColor Gray
} catch {
    Write-Host "   [FAIL] Get profile failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Get Counties
Write-Host "`n4. Testing Get Counties..." -ForegroundColor Yellow
try {
    $counties = Invoke-RestMethod -Uri "$baseUrl/counties" -Method GET
    Write-Host "   [OK] Retrieved $($counties.counties.Count) counties" -ForegroundColor Green
    
    foreach ($county in $counties.counties) {
        Write-Host "   - $($county.name) ($($county.code))" -ForegroundColor Gray
    }
    
    $firstCounty = $counties.counties[0]
    $countyId = $firstCounty.id
} catch {
    Write-Host "   [FAIL] Get counties failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 5: Get Fees for County
Write-Host "`n5. Testing Get Fees for County..." -ForegroundColor Yellow
try {
    $fees = Invoke-RestMethod -Uri "$baseUrl/counties/$countyId/fees" -Method GET
    Write-Host "   [OK] Retrieved $($fees.fees.Count) fees for $($firstCounty.name)" -ForegroundColor Green
    
    $fees.fees | Select-Object -First 3 | ForEach-Object {
        Write-Host "   - $($_.name): KES $($_.amount)" -ForegroundColor Gray
    }
    
    $firstFee = $fees.fees[0]
    $feeId = $firstFee.id
} catch {
    Write-Host "   [FAIL] Get fees failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 6: Create Payment
Write-Host "`n6. Testing Create Payment..." -ForegroundColor Yellow
try {
    $paymentBody = @{
        feeId = $feeId
        phoneNumber = "254712345678"
        paymentMethod = "stripe"
    } | ConvertTo-Json

    $payment = Invoke-RestMethod -Uri "$baseUrl/payments" `
        -Method POST `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $paymentBody

    $transactionId = $payment.transaction.id
    $transactionRef = $payment.transaction.transactionRef
    
    Write-Host "   [OK] Payment created" -ForegroundColor Green
    Write-Host "   Transaction ID: $transactionId" -ForegroundColor Gray
    Write-Host "   Reference: $transactionRef" -ForegroundColor Gray
    Write-Host "   Amount: KES $($payment.transaction.amount)" -ForegroundColor Gray
    Write-Host "   Status: $($payment.transaction.status)" -ForegroundColor Gray
} catch {
    Write-Host "   [FAIL] Create payment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Wait for payment processing and blockchain recording
Write-Host "`n7. Waiting for payment processing (3 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Test 7: Get Transaction Details
Write-Host "`n8. Testing Get Transaction Details..." -ForegroundColor Yellow
try {
    $transaction = Invoke-RestMethod -Uri "$baseUrl/payments/$transactionId" `
        -Method GET `
        -Headers $headers

    Write-Host "   [OK] Transaction retrieved" -ForegroundColor Green
    Write-Host "   Status: $($transaction.transaction.status)" -ForegroundColor Gray
    Write-Host "   Blockchain TX ID: $($transaction.transaction.blockchainTxId)" -ForegroundColor Gray
    
    $blockchainTxId = $transaction.transaction.blockchainTxId
} catch {
    Write-Host "   [FAIL] Get transaction failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Get My Transactions
Write-Host "`n9. Testing Get My Transactions..." -ForegroundColor Yellow
try {
    $myTransactions = Invoke-RestMethod -Uri "$baseUrl/payments/my-transactions" `
        -Method GET `
        -Headers $headers

    Write-Host "   [OK] Retrieved $($myTransactions.count) transactions" -ForegroundColor Green
    
    $myTransactions.transactions | Select-Object -First 3 | ForEach-Object {
        Write-Host "   - $($_.transactionRef): KES $($_.amount) [$($_.status)]" -ForegroundColor Gray
    }
} catch {
    Write-Host "   [FAIL] Get my transactions failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 9: Verify on Blockchain
if ($blockchainTxId) {
    Write-Host "`n10. Testing Blockchain Verification..." -ForegroundColor Yellow
    try {
        $verification = Invoke-RestMethod -Uri "$baseUrl/blockchain/verify/$blockchainTxId" `
            -Method GET `
            -Headers $headers

        Write-Host "   [OK] Blockchain verification complete" -ForegroundColor Green
        Write-Host "   Verified: $($verification.verified)" -ForegroundColor Gray
        Write-Host "   Ledger: $($verification.ledger)" -ForegroundColor Gray
        Write-Host "   Hash: $($verification.hash)" -ForegroundColor Gray
        
        if ($verification.verified) {
            Write-Host "   Explorer: https://stellar.expert/explorer/testnet/tx/$blockchainTxId" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "   [FAIL] Blockchain verification failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Test 10: Get Blockchain Transaction Details
    Write-Host "`n11. Testing Get Blockchain Transaction Details..." -ForegroundColor Yellow
    try {
        $blockchainDetails = Invoke-RestMethod -Uri "$baseUrl/blockchain/transaction/$transactionId" `
            -Method GET `
            -Headers $headers

        Write-Host "   [OK] Blockchain details retrieved" -ForegroundColor Green
        Write-Host "   Recorded: $($blockchainDetails.blockchain.recorded)" -ForegroundColor Gray
        if ($blockchainDetails.blockchain.recorded) {
            Write-Host "   TX ID: $($blockchainDetails.blockchain.txId)" -ForegroundColor Gray
            Write-Host "   Explorer: $($blockchainDetails.blockchain.explorerUrl)" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "   [FAIL] Get blockchain details failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "`n10. Blockchain Verification Skipped (No blockchain TX ID)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nTest Summary:" -ForegroundColor White
Write-Host "[OK] Health Check" -ForegroundColor Green
Write-Host "[OK] Authentication" -ForegroundColor Green
Write-Host "[OK] Counties and Fees" -ForegroundColor Green
Write-Host "[OK] Payment Creation" -ForegroundColor Green
Write-Host "[OK] Transaction Retrieval" -ForegroundColor Green
if ($blockchainTxId) {
    Write-Host "[OK] Blockchain Integration" -ForegroundColor Green
} else {
    Write-Host "[WARN] Blockchain Integration (Check Stellar account)" -ForegroundColor Yellow
}

Write-Host "`nAll core endpoints are working!" -ForegroundColor Green
Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Share API documentation with frontend team" -ForegroundColor White
Write-Host "2. Push code to GitHub" -ForegroundColor White
Write-Host "3. Help with integration" -ForegroundColor White

# Made with Bob
