$content = [System.IO.File]::ReadAllText("fr.json")
if (-not $content.EndsWith("}")) {
    $content = $content.TrimEnd() + "}"
    [System.IO.File]::WriteAllText("fr.json", $content)
    Write-Host "Fixed: added closing brace"
} else {
    Write-Host "Already has closing brace"
}
Get-Content "fr.json" -Encoding UTF8 | Select-Object -Last 3
