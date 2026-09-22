try {
    Get-Content "fr.json" -Raw | ConvertFrom-Json | Out-Null
    Write-Host "Valid JSON"
} catch {
    Write-Host "Invalid: $($_.Exception.Message)"
}
