###############################################################
# deploy-ftp.ps1
# Uploads the publish-output to SiteASP via FTP
# Usage: .\deploy-ftp.ps1
# Run from: d:\Cira Tech\Real Project\backend\Prism.API\
###############################################################

param(
    [string]$FtpHost     = "ftp://site68178.siteasp.net",
    [string]$FtpUser     = "site68178",
    [string]$FtpPassword = "",
    [string]$RemotePath  = "/site/wwwroot",
    [string]$LocalPath   = "$PSScriptRoot\publish-output"
)

# Prompt for password if not provided
if (-not $FtpPassword) {
    $secure      = Read-Host "Enter FTP password for $FtpUser" -AsSecureString
    $bstr        = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $FtpPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
}

Write-Host ""
Write-Host "Starting FTP upload to $FtpHost$RemotePath ..." -ForegroundColor Cyan
Write-Host "Source: $LocalPath" -ForegroundColor Gray
Write-Host ""

$script:uploaded = 0
$script:failed   = 0

function Upload-Directory {
    param([string]$LocalDir, [string]$RemoteDir)

    Get-ChildItem -Path $LocalDir | ForEach-Object {
        $remoteItem = "$RemoteDir/$($_.Name)"

        if ($_.PSIsContainer) {
            # Create remote directory (ignore error if already exists)
            try {
                $mkdirReq             = [Net.WebRequest]::Create("$FtpHost$remoteItem")
                $mkdirReq.Method      = [Net.WebRequestMethods+Ftp]::MakeDirectory
                $mkdirReq.Credentials = New-Object Net.NetworkCredential($FtpUser, $FtpPassword)
                $mkdirReq.UsePassive  = $true
                $mkdirReq.EnableSsl   = $false
                $null = $mkdirReq.GetResponse()
            } catch { }

            Upload-Directory -LocalDir $_.FullName -RemoteDir $remoteItem
        } else {
            # Upload file
            try {
                $uri                  = "$FtpHost$remoteItem"
                $ftpReq               = [Net.WebRequest]::Create($uri)
                $ftpReq.Method        = [Net.WebRequestMethods+Ftp]::UploadFile
                $ftpReq.Credentials   = New-Object Net.NetworkCredential($FtpUser, $FtpPassword)
                $ftpReq.UsePassive    = $true
                $ftpReq.UseBinary     = $true
                $ftpReq.EnableSsl     = $false

                $fileBytes  = [IO.File]::ReadAllBytes($_.FullName)
                $ftpStream  = $ftpReq.GetRequestStream()
                $ftpStream.Write($fileBytes, 0, $fileBytes.Length)
                $ftpStream.Close()
                $null = $ftpReq.GetResponse()

                Write-Host "  [OK] $($_.Name)" -ForegroundColor Green
                $script:uploaded++
            } catch {
                Write-Host "  [FAIL] $($_.Name) -- $_" -ForegroundColor Red
                $script:failed++
            }
        }
    }
}

Upload-Directory -LocalDir $LocalPath -RemoteDir $RemotePath

Write-Host ""
Write-Host "-----------------------------------------" -ForegroundColor DarkGray
Write-Host "Upload complete!" -ForegroundColor Cyan
Write-Host "Uploaded : $($script:uploaded) file(s)" -ForegroundColor Green
if ($script:failed -gt 0) {
    Write-Host "Failed   : $($script:failed) file(s)" -ForegroundColor Red
} else {
    Write-Host "Failed   : 0" -ForegroundColor Gray
}
Write-Host "-----------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Your site: http://cira-pm.runasp.net/" -ForegroundColor Cyan
Write-Host ""
