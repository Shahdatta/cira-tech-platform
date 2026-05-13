$body = '{"email":"admin@ciratech.com","password":"password123"}'
try {
    $r = Invoke-RestMethod -Uri 'https://cira-tech-platform.vercel.app/api/auth/login' -Method POST -ContentType 'application/json' -Body $body -TimeoutSec 20
    Write-Host "SUCCESS! Login works on Vercel!" -ForegroundColor Green
    Write-Host "Role: $($r.role)" -ForegroundColor Cyan
    Write-Host "Name: $($r.full_name)" -ForegroundColor Cyan
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code) {
        Write-Host "HTTP $code - $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    } else {
        Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
    }
}
