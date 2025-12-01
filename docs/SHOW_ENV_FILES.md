# How to Show .env Files in Your IDE

## The Issue
Your IDE (VS Code/Cursor) might have a global ignore setting that hides `.env*` files for security reasons. However, you need to see and edit `.env.local` for development.

## Solution 1: VS Code/Cursor Settings

### Option A: Workspace Settings (Recommended)
The `.vscode/settings.json` file in this project is already configured to show `.env.local` files. If it's still hidden:

1. Open Command Palette: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: "Preferences: Open Workspace Settings (JSON)"
3. Add this setting:
```json
{
  "files.exclude": {
    "**/.env": false,
    "**/.env.local": false
  }
}
```

### Option B: User Settings (Global)
1. Open Command Palette: `Cmd+Shift+P` / `Ctrl+Shift+P`
2. Type: "Preferences: Open User Settings (JSON)"
3. Look for `files.exclude` and remove or modify:
```json
{
  "files.exclude": {
    // Remove or comment out: "**/.env*": true
  }
}
```

## Solution 2: File Explorer

1. In the file explorer sidebar, look for a "Show Hidden Files" or "Show Ignored Files" button
2. Or right-click in the file explorer and look for "Show Hidden Files"
3. Some IDEs have a filter icon - click it and uncheck "Hide Ignored Files"

## Solution 3: Manual File Access

Even if hidden in the explorer, you can:
1. Use Command Palette: `Cmd+P` / `Ctrl+P`
2. Type: `.env.local`
3. The file should appear and you can open it

## Solution 4: Terminal

You can always edit `.env.local` from terminal:
```bash
# View the file
cat .env.local

# Edit with nano
nano .env.local

# Edit with vim
vim .env.local

# Edit with VS Code from terminal
code .env.local
```

## Verify It's Working

1. Check that `.env.local` exists:
   ```bash
   ls -la .env.local
   ```

2. The file should show: `✅ .env.local exists and should be visible`

3. Try opening it:
   ```bash
   code .env.local
   ```

## Current Status

✅ `.env.local` file exists in your project  
✅ `.gitignore` is configured (ignores `.env.local` from git but allows IDE visibility)  
✅ `.vscode/settings.json` is configured to show `.env.local`  

If you still can't see it, the issue is likely in your IDE's global settings. Follow Solution 1B above to fix it.

