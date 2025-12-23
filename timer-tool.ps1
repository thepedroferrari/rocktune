#Requires -RunAsAdministrator



param(
    [string]$GameProcess = "",
    [double]$Resolution = 0.5
)

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class TimerResolution {
    [DllImport("ntdll.dll", SetLastError = true)]
    public static extern uint NtSetTimerResolution(uint DesiredResolution, bool SetResolution, out uint CurrentResolution);
    
    [DllImport("ntdll.dll", SetLastError = true)]
    public static extern uint NtQueryTimerResolution(out uint MinimumResolution, out uint MaximumResolution, out uint CurrentResolution);
    
    [DllImport("winmm.dll", SetLastError = true)]
    public static extern uint timeBeginPeriod(uint uPeriod);
    
    [DllImport("winmm.dll", SetLastError = true)]
    public static extern uint timeEndPeriod(uint uPeriod);
}
"@

function Set-TimerResolution {
    param([double]$Milliseconds)

    # Convert milliseconds to 100-nanosecond units (required by NtSetTimerResolution)
    $period = [uint32]($Milliseconds * 10000)

    try {
        $currentRes = [uint32]0
        $result = [TimerResolution]::NtSetTimerResolution($period, $true, [ref]$currentRes)

        # NtSetTimerResolution returns 0 (STATUS_SUCCESS) on success
        if ($result -eq 0) {
            return $true
        } else {
            Write-Host "NtSetTimerResolution failed with status: 0x$($result.ToString('X8'))" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "Error setting timer resolution: $_" -ForegroundColor Red
        return $false
    }
}

function Get-CurrentTimerResolution {
    try {
        $minRes = [uint32]0
        $maxRes = [uint32]0
        $curRes = [uint32]0
        
        $result = [TimerResolution]::NtQueryTimerResolution([ref]$minRes, [ref]$maxRes, [ref]$curRes)
        
        if ($result -eq 0) {
            $currentMs = $curRes / 10000.0
            return $currentMs
        }
        return $null
    } catch {
        return $null
    }
}

Write-Host "=== Timer Resolution Tool ===" -ForegroundColor Cyan
Write-Host "Maintaining $Resolution ms timer resolution to eliminate micro-stutters" -ForegroundColor Yellow
Write-Host ""

$currentRes = Get-CurrentTimerResolution
if ($currentRes) {
    Write-Host "Current system timer resolution: $([math]::Round($currentRes, 2)) ms" -ForegroundColor Yellow
    Write-Host "Target timer resolution: $Resolution ms" -ForegroundColor Green
} else {
    Write-Host "Could not query current timer resolution" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setting timer resolution to $Resolution ms..." -ForegroundColor Cyan

if (Set-TimerResolution -Milliseconds $Resolution) {
    $newRes = Get-CurrentTimerResolution
    if ($newRes) {
        Write-Host "Timer resolution set to: $([math]::Round($newRes, 2)) ms" -ForegroundColor Green
    } else {
        Write-Host "Timer resolution set (unable to verify)" -ForegroundColor Green
    }
} else {
    Write-Host "Failed to set timer resolution. Ensure you're running as Administrator." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Timer resolution will be maintained while this script is running." -ForegroundColor Yellow
Write-Host "Keep this window open while gaming." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop and restore default timer resolution." -ForegroundColor Yellow
Write-Host ""

if ($GameProcess) {
    Write-Host "Monitoring for process: $GameProcess" -ForegroundColor Cyan
    Write-Host "Script will exit when game closes." -ForegroundColor Yellow
    Write-Host ""
    
    $processRunning = $true
    while ($processRunning) {
        $process = Get-Process -Name $GameProcess -ErrorAction SilentlyContinue
        if (-not $process) {
            Write-Host "Game process '$GameProcess' not found. Exiting..." -ForegroundColor Yellow
            $processRunning = $false
        } else {
            Start-Sleep -Seconds 5
        }
    }
} else {
    Write-Host "Running indefinitely. Press Ctrl+C to stop." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        while ($true) {
            Start-Sleep -Seconds 1
            
            $current = Get-CurrentTimerResolution
            if ($current -and $current -gt ($Resolution * 2)) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Timer resolution reset detected ($([math]::Round($current, 2)) ms). Re-applying..." -ForegroundColor Yellow
                Set-TimerResolution -Milliseconds $Resolution | Out-Null
            }
        }
    } catch {
    }
}

Write-Host ""
Write-Host "Timer resolution will be restored to default on exit." -ForegroundColor Yellow
Write-Host "Exiting..." -ForegroundColor Cyan
