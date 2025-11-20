# Install Supabase CLI on Windows

## Option 1: Direct Download (Recommended)

1. **Download Supabase CLI:**
   - Go to: https://github.com/supabase/cli/releases/latest
   - Download: `supabase_windows_amd64.zip` (or `supabase_windows_arm64.zip` for ARM)

2. **Extract and Install:**
   - Extract the ZIP file
   - Copy `supabase.exe` to a folder in your PATH (e.g., `C:\Windows\System32` or create `C:\Tools\supabase\`)
   - Or add the folder containing `supabase.exe` to your PATH environment variable

3. **Verify Installation:**
   ```powershell
   supabase --version
   ```

## Option 2: Using Chocolatey (if you have it)

```powershell
choco install supabase
```

## Option 3: Manual PATH Setup

1. Create folder: `C:\Tools\supabase\`
2. Download `supabase.exe` from GitHub releases
3. Place `supabase.exe` in `C:\Tools\supabase\`
4. Add to PATH:
   ```powershell
   # Run PowerShell as Administrator
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Tools\supabase", [EnvironmentVariableTarget]::Machine)
   ```
5. Restart PowerShell and verify:
   ```powershell
   supabase --version
   ```

## Quick Download Link

Latest release: https://github.com/supabase/cli/releases/latest

Look for: `supabase_windows_amd64.zip`

