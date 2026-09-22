$lines = Get-Content "fr.json" -Encoding UTF8
$seen = @{}
$newLines = @()
$pattern = '^\s*"([^"]+)":'

foreach ($line in $lines) {
    if ($line -match $pattern) {
        $key = $matches[1]
        $lower = $key.ToLower()
        if ($seen.ContainsKey($lower)) {
            continue  # Skip duplicate
        } else {
            $seen[$lower] = $true
            $newLines += $line
        }
    } else {
        $newLines += $line
    }
}

# Make sure file ends with }
$content = $newLines -join "`n"
if (-not $content.TrimEnd().EndsWith("}")) {
    $content = $content.TrimEnd() + "}"
}

# Remove BOM if present
if ($content.StartsWith([char]0xFEFF)) {
    $content = $content.Substring(1)
}

[System.IO.File]::WriteAllText("fr.json", $content, [System.Text.Encoding]::UTF8)
Write-Host "Cleaned! Removed duplicates."
Write-Host "BOM removed if present"
