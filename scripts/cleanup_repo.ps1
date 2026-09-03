<#
Run this script in PowerShell to remove sensitive files and build artifacts from the git index.
It will not rewrite history; to remove from history use BFG or git filter-branch (instructions below).

Usage: From repository root in PowerShell:
  .\scripts\cleanup_repo.ps1
#>

Write-Host "Removing .env from git index and untracking target/ directories..." -ForegroundColor Yellow

git rm --cached .env -f 2>$null || Write-Host ".env not tracked or not present in index"
git rm -r --cached auth/target analyzer/target submission/target common/target 2>$null || Write-Host "No tracked target/ directories or already removed"

git add .gitignore
git commit -m "chore: remove local .env and committed build artifacts from git index" || Write-Host "Nothing to commit"

Write-Host "
IMPORTANT:
 - This only removes files from current index. To purge secrets from git history use BFG Repo-Cleaner:
   1) Download BFG: https://rtyley.github.io/bfg-repo-cleaner/
   2) Run: bfg --delete-files .env
   3) Then run: git reflog expire --expire=now --all && git gc --prune=now --aggressive
 - After history rewrite push with: git push --force
" -ForegroundColor Cyan

