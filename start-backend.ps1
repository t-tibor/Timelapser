#!/usr/bin/env pwsh
# Start Backend Server Script
# This script starts the FastAPI backend server with the correct environment setup

$ErrorActionPreference = "Stop"

# Get script directory (repository root)
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RepoRoot "backend"
$VenvPython = Join-Path $BackendDir "venv\Scripts\python.exe"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  Timelapser Backend Startup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend directory exists
if (-not (Test-Path $BackendDir)) {
    Write-Host "ERROR: Backend directory not found at: $BackendDir" -ForegroundColor Red
    exit 1
}

# Check if virtual environment exists
if (-not (Test-Path $VenvPython)) {
    Write-Host "ERROR: Virtual environment not found at: $VenvPython" -ForegroundColor Red
    Write-Host "Please create virtual environment first:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor Yellow
    Write-Host "  python -m venv venv" -ForegroundColor Yellow
    Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
    Write-Host "  pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Set environment variables
$env:HLS_OUTPUT_DIR = "C:\temp\hls_streams"
$env:LOG_LEVEL = "INFO"
$env:CORS_ORIGINS = '["http://localhost:3000"]'

# Create HLS output directory if it doesn't exist
if (-not (Test-Path $env:HLS_OUTPUT_DIR)) {
    Write-Host "Creating HLS output directory: $env:HLS_OUTPUT_DIR" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $env:HLS_OUTPUT_DIR -Force | Out-Null
}

Write-Host "Backend Directory: $BackendDir" -ForegroundColor Green
Write-Host "Python Executable: $VenvPython" -ForegroundColor Green
Write-Host "HLS Output Dir: $env:HLS_OUTPUT_DIR" -ForegroundColor Green
Write-Host ""

# Change to backend directory
Set-Location $BackendDir

Write-Host "Starting FastAPI server on http://localhost:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start uvicorn server
try {
    & $VenvPython -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to start backend server" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
