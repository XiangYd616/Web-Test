# Warp Multi-Window Parallel Development Setup

## Overview

Your project is now configured for parallel development using Git Worktree with Warp AI terminal. Each Warp window can work on a different branch independently.

## Worktree Structure

```
D:\myproject\
├── Test-Web\              (Main - feature/type-system-unification)
├── Test-Web-backend\      (Backend - feature/backend-api-dev)
├── Test-Web-electron\     (Electron - feature/electron-integration)
└── Test-Web-testing\      (Testing - test/integration-testing)
```

## Quick Start

### 1. Open 4 Warp Windows

Open 4 separate Warp terminal windows (or tabs).

### 2. Navigate to Each Worktree

**Window 1 - Type System:**
```powershell
cd D:\myproject\Test-Web
.\show-context.ps1
```

**Window 2 - Backend API:**
```powershell
cd D:\myproject\Test-Web-backend
.\show-context.ps1
```

**Window 3 - Electron:**
```powershell
cd D:\myproject\Test-Web-electron
.\show-context.ps1
```

**Window 4 - Testing:**
```powershell
cd D:\myproject\Test-Web-testing
.\show-context.ps1
```

### 3. Tell Warp AI About Context

In each window, the AI assistant can read the `WORKTREE_CONTEXT.md` file. You can say:
- "Read WORKTREE_CONTEXT.md to understand my current work"
- "What is this worktree responsible for?"
- "Help me with [specific task] for this worktree"

## Files Created

### In Each Worktree:

1. **WORKTREE_CONTEXT.md**
   - Describes the worktree's responsibility
   - Lists related files and modules
   - Explains what NOT to do in this worktree
   - Provides workflow guidance

2. **show-context.ps1**
   - Displays current worktree information
   - Shows branch, latest commit, and context
   - Lists all worktrees

### In Main Worktree:

3. **PARALLEL_DEV_GUIDE.md**
   - Complete guide for parallel development
   - Best practices and common commands
   - Workflow examples

4. **.gitignore** (updated)
   - Ignores `.warp-context.md` files

## How It Works

### AI Context Awareness

Each Warp window's AI assistant will understand:
- Which worktree you're working in
- What responsibilities this worktree has
- What files you should/shouldn't modify
- The current branch and recent commits

### Independent Work

- Each window works in a separate directory
- No need to switch branches with `git checkout`
- Can run multiple dev servers simultaneously
- Changes don't interfere with each other

## Common Commands

### View Context
```powershell
.\show-context.ps1
```

### Check Status
```powershell
git status
git log --oneline -5
```

### Commit and Push
```powershell
git add .
git commit -m "your message"
git push
```

### Sync All Branches
```powershell
git fetch --all
git pull
```

### List All Worktrees
```powershell
git worktree list
```

## Worktree Responsibilities

### Test-Web (Main)
- **Branch:** feature/type-system-unification
- **Focus:** TypeScript type system unification
- **Files:** frontend/types/, frontend/contexts/, frontend/services/api/

### Test-Web-backend
- **Branch:** feature/backend-api-dev
- **Focus:** Backend API development
- **Files:** backend/, frontend/services/api/, shared/types/api.types.ts

### Test-Web-electron
- **Branch:** feature/electron-integration
- **Focus:** Electron desktop application
- **Files:** tools/electron/, electron/, package.json (main field)

### Test-Web-testing
- **Branch:** test/integration-testing
- **Focus:** Integration and E2E testing
- **Files:** e2e/, tests/system/, tools/e2e/, playwright.config.ts

## Best Practices

1. **Stay in Your Lane:** Only modify code related to your worktree's responsibility
2. **Commit Often:** Small, frequent commits are better
3. **Push Regularly:** Keep remote in sync
4. **Sync Daily:** Start each day with `git fetch --all`
5. **Use AI Context:** Let Warp AI help with worktree-specific tasks

## Advantages

✅ **No Branch Switching:** Work on multiple features simultaneously
✅ **Run Multiple Services:** Start different dev servers in each window
✅ **AI Understands Context:** Each window's AI knows its responsibility
✅ **Independent State:** Keep work state in each branch
✅ **Faster Development:** No context switching overhead

## Current Status

All worktrees are synchronized with remote:
- ✅ Test-Web: 2 commits ahead (type fixes + gitignore)
- ✅ Test-Web-backend: 1 commit ahead (line ending normalization)
- ✅ Test-Web-electron: 1 commit ahead (electron path + line endings)
- ✅ Test-Web-testing: 1 commit ahead (dependencies + line endings)

All changes have been pushed to remote successfully.

## Git Configuration

- **core.autocrlf:** Set to `input` (CRLF → LF on commit)
- **Line Endings:** Unified to LF across all files
- **.gitignore:** Updated to ignore `.warp-context.md`

## Need Help?

In any Warp window, you can:
1. Run `.\show-context.ps1` to see current context
2. Read `WORKTREE_CONTEXT.md` for detailed responsibility
3. Check `PARALLEL_DEV_GUIDE.md` for complete guide
4. Ask Warp AI about your current worktree's tasks

---

**Setup Complete!** 🎉

Start parallel development by opening multiple Warp windows and navigating to different worktrees.

