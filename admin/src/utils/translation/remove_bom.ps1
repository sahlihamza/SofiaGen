$content = [System.IO.File]::ReadAllText("fr.json", [System.Text.Encoding]::UTF8)
# Remove BOM if present (EF BB BF)
$content = $content.TrimStart([char]0xFEFF)
[System.IO.File]::WriteAllText("fr.json", $content, [System.Text.Encoding]::UTF8)
Write-Host "BOM removed"
