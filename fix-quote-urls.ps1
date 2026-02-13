# PowerShell Script to Update Quote-Related Files Only
# Safe for production - only touches critical quote files

Write-Host "Updating Quote-Related Files to Use Environment Variables" -ForegroundColor Cyan
Write-Host ""

# Backup first
Write-Host "Creating backup..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFolder = ".\src_backup_$timestamp"
Copy-Item .\src -Destination $backupFolder -Recurse
Write-Host "Backup created at: $backupFolder" -ForegroundColor Green
Write-Host ""

# Files to update (quote-related only)
$filesToUpdate = @(
    "src\app\checklist-view\page.tsx",
    "src\app\(main)\dashboard\quotes\create\page.tsx",
    "src\app\(main)\dashboard\quotes\[id]\edit\page.tsx",
    "src\app\(main)\dashboard\quotes\[id]\page.tsx",
    "src\app\(main)\dashboard\quotes\[id]\pdf\page.tsx"
)

$totalFiles = $filesToUpdate.Count
$updatedFiles = 0

foreach ($file in $filesToUpdate) {
    $fullPath = Join-Path (Get-Location) $file
    
    if (Test-Path $fullPath) {
        Write-Host "Processing: $file" -ForegroundColor Cyan
        
        # Read file content
        $content = Get-Content $fullPath -Raw
        
        # Check if already has BACKEND_URL import
        $hasImport = $content -like "*import*BACKEND_URL*from*@/lib/api*"
        
        # Replace hardcoded URLs
        $newContent = $content -replace 'https://aztec-interior\.onrender\.com', '${BACKEND_URL}'
        
        # Add import if not present and content changed
        if (-not $hasImport -and ($newContent -ne $content)) {
            # Simple approach: add import after the first line (usually a comment or 'use client')
            $lines = $newContent -split "`r?`n"
            $importAdded = $false
            $newLines = @()
            
            for ($i = 0; $i -lt $lines.Length; $i++) {
                $newLines += $lines[$i]
                
                # Add import after first import or 'use client' directive
                if (-not $importAdded -and ($lines[$i] -like "*import*" -or $lines[$i] -like "*'use client'*")) {
                    # Look ahead to find end of import block
                    $j = $i + 1
                    while ($j -lt $lines.Length -and ($lines[$j] -like "*import*" -or $lines[$j].Trim() -eq "")) {
                        $newLines += $lines[$j]
                        $j++
                        $i++
                    }
                    # Add our import
                    $newLines += "import { BACKEND_URL } from '@/lib/api';"
                    $importAdded = $true
                    Write-Host "  [OK] Added BACKEND_URL import" -ForegroundColor Green
                }
            }
            
            if ($importAdded) {
                $newContent = $newLines -join "`r`n"
            }
        }
        
        # Save if changes were made
        if ($newContent -ne $content) {
            $newContent | Set-Content $fullPath -NoNewline
            $updatedFiles++
            Write-Host "  [OK] Updated URLs" -ForegroundColor Green
        } else {
            Write-Host "  [SKIP] No changes needed" -ForegroundColor Gray
        }
        
        Write-Host ""
    } else {
        Write-Host "[WARNING] File not found: $file" -ForegroundColor Yellow
        Write-Host ""
    }
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Update Complete!" -ForegroundColor Green
Write-Host "   Files processed: $totalFiles" -ForegroundColor White
Write-Host "   Files updated: $updatedFiles" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Review changes in updated files"
Write-Host "   2. Delete .next cache: Remove-Item -Recurse -Force .next"
Write-Host "   3. Test locally: npm run dev"
Write-Host "   4. Test quote generation"
Write-Host "   5. If working, commit and deploy"
Write-Host ""
Write-Host "To revert changes:" -ForegroundColor Red
Write-Host "   Remove-Item -Recurse -Force .\src"
Write-Host "   Copy-Item $backupFolder -Destination .\src -Recurse"
Write-Host "=======================================================" -ForegroundColor Cyan