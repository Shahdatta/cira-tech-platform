$ftp = [Net.WebRequest]::Create('ftp://site68178.siteasp.net/')
$ftp.Method = [Net.WebRequestMethods+Ftp]::ListDirectoryDetails
$ftp.Credentials = New-Object Net.NetworkCredential('site68178', '2s!K=8Ea6c#T')
$ftp.UsePassive = $true
try {
    $response = $ftp.GetResponse()
    $reader = New-Object IO.StreamReader($response.GetResponseStream())
    Write-Host "Root directory:"
    Write-Host $reader.ReadToEnd()
    $reader.Close()
    $response.Close()
} catch { Write-Host "Error: $_" }
