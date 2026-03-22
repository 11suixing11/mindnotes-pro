#!/usr/bin/env powershell
# Ollama Qwen 3 8B Integration for MindNotes Pro
# Generate enhanced documentation and analysis

param(
    [string]$Task = "generate-api-docs",
    [string]$Context = ""
)

$ollamaUrl = "http://localhost:11434"
$modelName = "qwen3:8b"

function Invoke-OllamaGenerate {
    param(
        [string]$Prompt,
        [string]$Context = ""
    )
    
    $fullPrompt = if ($Context) {
        "Context: $Context`n`nTask: $Prompt"
    } else {
        $Prompt
    }
    
    $body = @{
        model = $modelName
        prompt = $fullPrompt
        stream = $false
        temperature = 0.3
    } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "$ollamaUrl/api/generate" -Method Post -Body $body -UseBasicParsing -ContentType "application/json"
        $result = $response.Content | ConvertFrom-Json
        return $result.response
    } catch {
        Write-Host "Error calling Ollama: $_" -ForegroundColor Red
        return $null
    }
}

# Task 1: Generate API Documentation
if ($Task -eq "generate-api-docs") {
    Write-Host "📖 Generating API Documentation..." -ForegroundColor Cyan
    
    $prompt = @"
Generate a concise API documentation for MindNotes Pro with:
1. Quick start example for web integration
2. Key API endpoints (initialization, save, export)
3. Configuration options
4. Error handling patterns

Keep it under 500 words, practical and code-focused.
"@
    
    $output = Invoke-OllamaGenerate -Prompt $prompt
    Write-Host $output
    Write-Host ""
}

# Task 2: Generate Performance Analysis
elseif ($Task -eq "performance-analysis") {
    Write-Host "⚡ Generating Performance Analysis..." -ForegroundColor Cyan
    
    $context = "MindNotes Pro v1.3.1: JS bundle 23.48KB, First-screen <1s, 60fps animations, 31 unit tests"
    
    $prompt = @"
Based on this performance profile, provide:
1. Performance bottleneck analysis
2. Optimization recommendations for next release
3. Scalability considerations
4. Budget for new features in v1.4.0

Keep it brief but actionable (300-400 words).
"@
    
    $output = Invoke-OllamaGenerate -Prompt $prompt -Context $context
    Write-Host $output
    Write-Host ""
}

# Task 3: Generate Quality Report
elseif ($Task -eq "quality-report") {
    Write-Host "✅ Generating Quality Assurance Report..." -ForegroundColor Cyan
    
    $context = "v1.3.1: 31/31 tests passing, 0 TypeScript errors, 10 documentation files, 950+ code changes"
    
    $prompt = @"
Create a quality assurance summary covering:
1. Test coverage assessment
2. Code quality improvements
3. Documentation completeness
4. Risk assessment for production
5. Recommendations for v1.4.0

Format: Professional summary, 300-400 words.
"@
    
    $output = Invoke-OllamaGenerate -Prompt $prompt -Context $context
    Write-Host $output
    Write-Host ""
}

# Task 4: Generate Feature Roadmap
elseif ($Task -eq "roadmap") {
    Write-Host "🗺️ Generating v1.4.0 Feature Roadmap..." -ForegroundColor Cyan
    
    $context = "MindNotes Pro current features: Handwriting, templates, export, PWA offline, dark mode, command palette"
    
    $prompt = @"
Create a detailed v1.4.0 roadmap with:
1. Cloud sync implementation approach
2. GitHub integration architecture
3. Enhanced export capabilities
4. Plugin system foundation
5. Timeline and effort estimates

Keep it concise but comprehensive (400-500 words).
"@
    
    $output = Invoke-OllamaGenerate -Prompt $prompt -Context $context
    Write-Host $output
    Write-Host ""
}

# Task 5: Generate User Guide
elseif ($Task -eq "user-guide") {
    Write-Host "📚 Generating User Guide Section..." -ForegroundColor Cyan
    
    $prompt = @"
Write a user guide section for MindNotes Pro covering:
1. Getting started (5 steps)
2. Basic drawing and writing
3. Using templates
4. Exporting notes
5. Keyboard shortcuts reference

Target: New users, practical examples, 500-600 words.
"@
    
    $output = Invoke-OllamaGenerate -Prompt $prompt
    Write-Host $output
    Write-Host ""
}

else {
    Write-Host "Unknown task: $Task" -ForegroundColor Red
    Write-Host "Available tasks: generate-api-docs, performance-analysis, quality-report, roadmap, user-guide" -ForegroundColor Yellow
}
