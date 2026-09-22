$content = Get-Content "fr.json" -Raw
$openBraces = ($content.ToCharArray() | Where-Object { $_ -eq '{' }).Count
$closeBraces = ($content.ToCharArray() | Where-Object { $_ -eq '}' }).Count
Write-Host "Open braces: $openBraces"
Write-Host "Close braces: $closeBraces"
if ($openBraces -eq $closeBraces) {
    Write-Host "Braces are balanced"
} else {
    Write-Host "Braces UNBALANCED!"
}
