#!/usr/bin/env powershell
# Use Ollama Qwen to generate and save documentation

$ollamaUrl = "http://localhost:11434"
$modelName = "qwen3:8b"

function Generate-WithOllama {
    param(
        [string]$Prompt,
        [int]$MaxTokens = 1000
    )
    
    $body = @{
        model = $modelName
        prompt = $Prompt
        stream = $false
        temperature = 0.3
        num_predict = $MaxTokens
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$ollamaUrl/api/generate" -Method Post -Body $body -UseBasicParsing -ContentType "application/json"
    $result = $response.Content | ConvertFrom-Json
    return $result.response
}

Write-Host "Generating supplementary documentation with Ollama Qwen 3 8B..." -ForegroundColor Cyan
Write-Host ""

# 1. Generate API Reference
Write-Host "[1/5] Generating API Reference..." -ForegroundColor Yellow

$apiPrompt = @"
Create a concise API reference for MindNotes Pro with practical examples:

1. Web Integration Example
2. Configuration Options  
3. Save/Export Methods
4. Event Handling
5. Error Handling

Keep each section 2-3 lines with code examples. Total ~300 words.
"@

$apiDocs = Generate-WithOllama -Prompt $apiPrompt

@"
# MindNotes Pro API Reference

## Quick Start

\`\`\`javascript
import MindNotes from '@mindnotes-pro/core'

const app = new MindNotes({
  container: '#app',
  theme: 'auto',
  autoSave: true
})
\`\`\`

## Documentation

$apiDocs

" | Out-File -FilePath "docs/API_REFERENCE.md" -Encoding UTF8

Write-Host "✓ API Reference generated" -ForegroundColor Green

# 2. Generate Performance Tuning Guide
Write-Host "[2/5] Generating Performance Tuning Guide..." -ForegroundColor Yellow

$perfPrompt = @"
Create a performance tuning guide for MindNotes Pro developers:

Current metrics: 23.48KB bundle, <1s load time, 60fps
Topics: lazy loading, caching strategy, memory management, rendering optimization

Provide 5 actionable optimization tips with implementation hints. ~300 words.
"@

$perfDocs = Generate-WithOllama -Prompt $perfPrompt

@"
# Performance Tuning Guide

## Current Metrics
- Bundle Size: 23.48 KB
- Initial Load: <1 second  
- Frame Rate: 60 fps
- Lighthouse: 90+

## Optimization Tips

$perfDocs

" | Out-File -FilePath "docs/PERFORMANCE_TUNING.md" -Encoding UTF8

Write-Host "✓ Performance guide generated" -ForegroundColor Green

# 3. Generate Troubleshooting FAQ
Write-Host "[3/5] Generating Troubleshooting FAQ..." -ForegroundColor Yellow

$faqPrompt = @"
Create a troubleshooting FAQ for MindNotes Pro with common issues:

Include: Display problems, save failures, offline issues, export trouble, sync errors
For each: Problem description + 2-3 step solutions

Focus on practical help for users. ~400 words total.
"@

$faqDocs = Generate-WithOllama -Prompt $faqPrompt -MaxTokens 1500

@"
# Troubleshooting FAQ

## Common Issues & Solutions

$faqDocs

" | Out-File -FilePath "docs/TROUBLESHOOTING.md" -Encoding UTF8

Write-Host "✓ Troubleshooting FAQ generated" -ForegroundColor Green

# 4. Generate Architecture Overview
Write-Host "[4/5] Generating Architecture Overview..." -ForegroundColor Yellow

$archPrompt = @"
Create a technical architecture overview for MindNotes Pro:

Tech stack: React 18, TypeScript, Vite, Zustand, Tailwind, tldraw, Service Worker
Sections: Frontend architecture, State management, PWA offline, Build optimization

Explain each layer in 2-3 sentences with tech choices. ~350 words.
"@

$archDocs = Generate-WithOllama -Prompt $archPrompt

@"
# Architecture Overview

## Technology Stack

$archDocs

## folder Structure
\`\`\`
src/
  ├── components/   # UI components
  ├── hooks/        # React hooks
  ├── store/        # Zustand stores
  ├── utils/        # Utilities (logger, storage)
  └── types/        # TypeScript types
\`\`\`

" | Out-File -FilePath "docs/ARCHITECTURE.md" -Encoding UTF8

Write-Host "✓ Architecture overview generated" -ForegroundColor Green

# 5. Generate v1.4.0 Planning Guide
Write-Host "[5/5] Generating v1.4.0 Planning Guide..." -ForegroundColor Yellow

$roadmapPrompt = @"
Create a v1.4.0 feature planning guide for MindNotes Pro:

Planned features: Cloud sync, GitHub integration, advanced export, plugin system
For each feature: What it does + Implementation approach + Effort estimate

Make it actionable for developers. ~400 words.
"@

$roadmapDocs = Generate-WithOllama -Prompt $roadmapPrompt -MaxTokens 1500

@"
# v1.4.0 Planning Guide

## Planned Features

$roadmapDocs

## Implementation Timeline
- Week 1-2: Cloud sync infrastructure
- Week 3: GitHub integration  
- Week 4: Advanced export formats
- Week 5: Plugin system foundation
- Week 6: Testing & optimization

" | Out-File -FilePath "docs/v1.4.0_PLANNING.md" -Encoding UTF8

Write-Host "✓ v1.4.0 planning guide generated" -ForegroundColor Green

Write-Host ""
Write-Host "✅ All documentation generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Generated files:" -ForegroundColor Cyan
Write-Host "  • docs/API_REFERENCE.md" -ForegroundColor Yellow
Write-Host "  • docs/PERFORMANCE_TUNING.md" -ForegroundColor Yellow
Write-Host "  • docs/TROUBLESHOOTING.md" -ForegroundColor Yellow
Write-Host "  • docs/ARCHITECTURE.md" -ForegroundColor Yellow
Write-Host "  • docs/v1.4.0_PLANNING.md" -ForegroundColor Yellow
Write-Host ""
