$apiKey = "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"
$url = "https://openrouter.ai/api/v1/chat/completions"

$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
    "HTTP-Referer" = "https://opencode.ai"
    "X-Title" = "OpenCode"
}

$body = @{
    "model" = "nvidia/nemotron-3-super-120b-a12b:free"
    "messages" = @(
        @{
            "role" = "user"
            "content" = "Hi, respond with just 'Hello!'"
        }
    )
    "max_tokens" = 20
} | ConvertTo-Json

Start-Sleep -Seconds 5

try {
    $response = Invoke-WebRequest -Uri $url -Method Post -Headers $headers -Body $body
    Write-Host "Status: $($response.StatusCode)"
    $content = $response.Content | ConvertFrom-Json
    Write-Host "Full response:"
    $content | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}