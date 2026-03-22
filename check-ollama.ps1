# Check Ollama models and test qwen generation
$ollamaUrl = "http://localhost:11434"

Write-Host "Testing Ollama connection..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "$ollamaUrl/api/tags" -UseBasicParsing -ErrorAction Stop
    $models = $response.Content | ConvertFrom-Json
    
    Write-Host "Available Ollama models:" -ForegroundColor Green
    foreach ($model in $models.models) {
        Write-Host "  - $($model.name)"
    }
    
    # Test with qwen model if available
    $qwenModel = $models.models | Where-Object { $_.name -like "*qwen*" }
    if ($qwenModel) {
        Write-Host "`nQwen model found: $($qwenModel.name)" -ForegroundColor Yellow
        Write-Host "Model is ready to use!" -ForegroundColor Green
    } else {
        Write-Host "`nNo Qwen model found. Available: $($models.models[0].name)" -ForegroundColor Yellow
        $qwenModel = $models.models[0]
    }
    
} catch {
    Write-Host "Error connecting to Ollama: $_" -ForegroundColor Red
    exit 1
}
