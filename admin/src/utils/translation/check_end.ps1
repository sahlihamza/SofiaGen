$content = Get-Content "fr.json" -Raw -Encoding UTF8
$length = $content.Length
Write-Host "File length: $length"
$last50 = $content.Substring([Math]::Max(0, $length - 50))
Write-Host "Last 50 chars:"
Write-Host $last50
