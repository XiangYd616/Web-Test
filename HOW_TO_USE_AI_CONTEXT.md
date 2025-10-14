# How to Use AI Assistant Context Documents

## Overview

Each worktree now has a comprehensive `AI_ASSISTANT_CONTEXT.md` (or `WORKTREE_CONTEXT.md`) file that the Warp AI assistant can read to understand its responsibilities.

## Files Created

| Worktree | Context File | Purpose |
|----------|--------------|---------|
| `Test-Web` | `WORKTREE_CONTEXT.md` | TypeScript type system unification |
| `Test-Web-frontend` | `AI_ASSISTANT_CONTEXT.md` | Frontend feature development |
| `Test-Web-backend` | `AI_ASSISTANT_CONTEXT.md` | Backend API development |
| `Test-Web-electron` | `AI_ASSISTANT_CONTEXT.md` | Electron desktop application |
| `Test-Web-testing` | `AI_ASSISTANT_CONTEXT.md` | Integration and E2E testing |

## How to Let AI Understand Its Job

### Method 1: Direct Instruction (Recommended)

When you open a new Warp window and navigate to a worktree, simply tell the AI:

```
Read the AI_ASSISTANT_CONTEXT.md file to understand your responsibilities in this worktree.
```

or

```
Read WORKTREE_CONTEXT.md and tell me what you should focus on.
```

The AI will read the file and understand:
- What worktree it's working in
- What its primary responsibilities are
- Which files it should modify
- What it should NOT modify
- Recent work completed
- Current objectives
- How to help you

### Method 2: Ask Specific Questions

You can ask the AI directly:

```
What is this worktree responsible for?
What files should I work with here?
What should I not modify in this worktree?
What are the current objectives?
How can you help me with [specific task]?
```

### Method 3: Contextual Help

Just start working and ask for help with specific tasks:

```
Help me fix TypeScript errors
Create a new API endpoint for user management
Add E2E test for login flow
Implement Electron system tray feature
```

The AI, having read the context file, will know whether the task is appropriate for the current worktree and provide relevant assistance.

## Example Workflow

### Window 1 - Type System (Test-Web)
```powershell
cd D:\myproject\Test-Web
```

**You say:**
> "Read WORKTREE_CONTEXT.md and help me fix TypeScript errors"

**AI understands:**
- Focus on type system unification
- Fix TS2322 errors
- Work with files in `frontend/types/` and `frontend/services/api/`
- Don't modify backend, Electron, or test code

### Window 2 - Backend API (Test-Web-backend)
```powershell
cd D:\myproject\Test-Web-backend
```

**You say:**
> "Read AI_ASSISTANT_CONTEXT.md and help me create a new API endpoint"

**AI understands:**
- Focus on backend API development
- Work with files in `frontend/services/api/` and `backend/`
- Create both backend endpoint and frontend client
- Don't modify type definitions or Electron code

### Window 3 - Electron (Test-Web-electron)
```powershell
cd D:\myproject\Test-Web-electron
```

**You say:**
> "Read AI_ASSISTANT_CONTEXT.md and help me add a system tray icon"

**AI understands:**
- Focus on Electron desktop features
- Work with files in `tools/electron/`
- Implement native OS integration
- Don't modify backend API or core type system

### Window 4 - Testing (Test-Web-testing)
```powershell
cd D:\myproject\Test-Web-testing
```

**You say:**
> "Read AI_ASSISTANT_CONTEXT.md and help me write E2E tests"

**AI understands:**
- Focus on testing infrastructure
- Work with files in `e2e/` and `tests/`
- Write Playwright E2E tests
- Can suggest code changes for testability

## What's in Each Context File

Each context file contains:

### 1. Critical Information Header
- Current worktree name and branch
- Primary responsibility
- Working directory
- Git status

### 2. Your Primary Responsibility
- Detailed description of what to focus on
- Specific tasks and domains
- Key areas of work

### 3. Files You Should Work With
- Primary focus areas
- Specific file paths
- Module descriptions

### 4. What You Should NOT Do
- Explicit list of what NOT to modify
- Boundaries between worktrees
- Cross-cutting concerns

### 5. Recent Work Completed
- Commit history
- Progress summary
- Context on recent changes

### 6. Current Objectives
- Immediate goals
- Helpful commands
- Next steps

### 7. Development Workflow
- Step-by-step process
- Best practices
- Commit guidelines

### 8. Related Worktrees
- Other parallel branches
- How they interconnect
- When to coordinate

### 9. Project Context
- Tech stack
- Architecture
- Key modules

### 10. How to Ask for Help
- Example questions
- Task templates
- Interaction patterns

## Benefits

### For You:
✅ **Clear Boundaries**: Each window's AI knows its scope
✅ **Focused Assistance**: Get relevant help for each worktree
✅ **Avoid Mistakes**: AI won't suggest changes to wrong files
✅ **Faster Development**: No need to explain context repeatedly

### For AI:
✅ **Context Awareness**: Understands current worktree's purpose
✅ **Appropriate Suggestions**: Only suggests relevant changes
✅ **Better Recommendations**: Tailored to specific domain
✅ **Clearer Communication**: Knows what questions to ask

## Tips for Best Results

1. **Start Fresh**: When opening a new Warp window, ask AI to read the context file first

2. **Be Specific**: Mention which files or features you're working on

3. **Trust the Boundaries**: If AI says something belongs in another worktree, switch to that window

4. **Update Context**: If project structure changes significantly, update the context files

5. **Reference the Docs**: You can always ask "What does the context file say about [topic]?"

## Quick Reference Commands

```powershell
# In each worktree, you can quickly check context:

# View context file
cat AI_ASSISTANT_CONTEXT.md
# or
cat WORKTREE_CONTEXT.md

# Check current branch
git branch --show-current

# View worktree list
git worktree list

# Check status
git status
```

## Troubleshooting

**Q: AI doesn't seem to remember the context?**
A: Remind it to read the context file again, or include key points from the file in your question.

**Q: AI suggests changes to files it shouldn't touch?**
A: Point out the "What You Should NOT Do" section in the context file.

**Q: Context file has outdated information?**
A: Update the context file with current state and remind AI to re-read it.

**Q: Working across multiple worktrees?**
A: That's fine! Just make sure each Warp window's AI reads its own context file.

## Summary

You now have 4 worktrees, each with a comprehensive context document that tells the AI assistant exactly what its job is. Simply tell the AI to read its context file, and it will understand:

- What to focus on ✅
- What to avoid ❌
- How to help you 🎯
- Current project state 📊

Happy parallel development! 🚀

