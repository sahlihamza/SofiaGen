$bytes = [System.IO.File]::ReadAllBytes("fr.json")[0..2]
Write-Host "First 3 bytes: $($bytes -join ', ')"
