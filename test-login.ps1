$body = '{"email":"admin@ciratech.com","password":"password123"}'
try {
    $r = Invoke-RestMethod -Uri 'http://localhost:5062/api/auth/login' -Method POST -ContentType 'application/json' -Body $body
    Write-Host "SUCCESS:"
    $r | ConvertTo-Json
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    Write-Host "Details: $($_.ErrorDetails.Message)"
}
