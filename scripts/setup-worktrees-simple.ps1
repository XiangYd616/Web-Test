# Git Worktree Setup Script
# Simple version without encoding issues

param(
    [switch]$SkipInstall = $false
)

$baseDir = "D:\myproject"
$mainRepo = "$baseDir\Test-Web"

Write-Host "========================================"
Write-Host "Git Worktree Setup"
Write-Host "========================================"
Write-Host ""

# Check main repo
if (-not (Test-Path $mainRepo)) {
    Write-Host "ERROR: Main repo not found: $mainRepo"
    exit 1
}

cd $mainRepo

# Check if git repo
if (-not (Test-Path ".git")) {
    Write-Host "ERROR: Not a git repository"
    exit 1
}

Write-Host "Main repo: $mainRepo"
Write-Host "Current branch: $(git branch --show-current)"
Write-Host ""

# Define worktrees
$wtFrontend = "Test-Web-frontend"
$wtBackend = "Test-Web-backend"
$wtElectron = "Test-Web-electron"
$wtTesting = "Test-Web-testing"

$brFrontend = "feature/frontend-ui-dev"
$brBackend = "feature/backend-api-dev"
$brElectron = "feature/electron-integration"
$brTesting = "test/integration-testing"

Write-Host "Will create 4 worktrees:"
Write-Host "  1. $wtFrontend -> $brFrontend"
Write-Host "  2. $wtBackend -> $brBackend"
Write-Host "  3. $wtElectron -> $brElectron"
Write-Host "  4. $wtTesting -> $brTesting"
Write-Host ""

$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "Cancelled"
    exit 0
}

Write-Host ""
Write-Host "Creating worktrees..."
Write-Host ""

# Function to create worktree
function Create-Worktree {
    param($name, $branch)
    
    $path = "$baseDir\$name"
    
    Write-Host "------------------------------------"
    Write-Host "Processing: $name"
    
    if (Test-Path $path) {
        Write-Host "  WARNING: Already exists, skipping"
        return $false
    }
    
    try {
        # Create branch if not exists
        $branchExists = git branch --list $branch
        if (-not $branchExists) {
            Write-Host "  Creating branch: $branch"
            git branch $branch 2>&1 | Out-Null
        }
        
        # Create worktree
        Write-Host "  Creating worktree..."
        git worktree add "..\$name" $branch 2>&1 | Out-Null
        
        if (-not (Test-Path $path)) {
            throw "Worktree creation failed"
        }
        
        Write-Host "  SUCCESS: Worktree created at $path"
        
        # Install dependencies
        if (-not $SkipInstall) {
            Write-Host "  Installing npm dependencies (this may take a few minutes)..."
            cd $path
            npm install 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  SUCCESS: Dependencies installed"
            } else {
                Write-Host "  WARNING: npm install failed"
            }
            
            cd $mainRepo
        }
        
        return $true
        
    } catch {
        Write-Host "  ERROR: $_"
        if (Test-Path $path) {
            Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        }
        return $false
    }
}

# Create each worktree
$success = 0
$success += [int](Create-Worktree $wtFrontend $brFrontend)
$success += [int](Create-Worktree $wtBackend $brBackend)
$success += [int](Create-Worktree $wtElectron $brElectron)
$success += [int](Create-Worktree $wtTesting $brTesting)

Write-Host ""
Write-Host "========================================"
Write-Host "Setup Complete!"
Write-Host "========================================"
Write-Host ""
Write-Host "Summary: $success worktrees created"
Write-Host ""
Write-Host "All worktrees:"
Write-Host ""
git worktree list
Write-Host ""
Write-Host "========================================"
Write-Host "Usage Guide"
Write-Host "========================================"
Write-Host ""
Write-Host "Window 1 - Frontend:"
Write-Host "  cd $baseDir\$wtFrontend"
Write-Host "  npm run frontend"
Write-Host ""
Write-Host "Window 2 - Backend:"
Write-Host "  cd $baseDir\$wtBackend"
Write-Host "  npm run backend:dev"
Write-Host ""
Write-Host "Window 3 - Electron:"
Write-Host "  cd $baseDir\$wtElectron"
Write-Host "  npm run electron:dev"
Write-Host ""
Write-Host "Window 4 - Testing:"
Write-Host "  cd $baseDir\$wtTesting"
Write-Host "  npm run test:watch"
Write-Host ""
Write-Host "TIP: Each worktree is independent!"
Write-Host ""

