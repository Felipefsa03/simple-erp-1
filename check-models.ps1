$apiKey = "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"
$url = "https://openrouter.ai/api/v1/models"

$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

$response = Invoke-WebRequest -Uri $url -Method Get -Headers $headers
$models = ($response.Content | ConvertFrom-Json).data

Write-Host "=== MODELOS MINIMAX NO OPENROUTER ===" -ForegroundColor Cyan
$minimaxModels = $models | Where-Object { $_.id -like "*minimax*" }
$minimaxModels | ForEach-Object { 
    $pricing = "Free: $($_.pricing.prompt -eq '0')"
    Write-Host "$($_.id) - $pricing"
}
