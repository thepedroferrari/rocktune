


Import-Module (Join-Path $PSScriptRoot "logger.psm1") -Force


function Backup-RegistryKey {
    

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,

        [string]$BackupDir = "$env:TEMP\RegistryBackup"
    )

    if (-not (Test-Path $Path)) {
        Write-Log "Registry path does not exist, skipping backup: $Path" "WARNING"
        return $false
    }

    try {
        if (-not (Test-Path $BackupDir)) {
            New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        }

        $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        $safeName = $Path.Replace('\', '_').Replace(':', '')
        $backupPath = Join-Path $BackupDir "Backup-$timestamp-$safeName.reg"

        $exportPath = $Path.Replace('HKLM:\', 'HKEY_LOCAL_MACHINE\').Replace('HKCU:\', 'HKEY_CURRENT_USER\')

        $result = reg export $exportPath $backupPath /y 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Log "Backed up registry key: $Path -> $backupPath" "SUCCESS"
            return $backupPath
        } else {
            Write-Log "Failed to backup registry key: $Path (Exit code: $LASTEXITCODE)" "ERROR"
            return $false
        }

    } catch {
        Write-Log "Exception backing up registry key $Path : $_" "ERROR"
        return $false
    }
}

function Restore-RegistryKey {
    

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$BackupPath
    )

    if (-not (Test-Path $BackupPath)) {
        Write-Log "Backup file not found: $BackupPath" "ERROR"
        return $false
    }

    try {
        # Suppress errors from reg.exe output (it writes success to stderr)
        $null = reg import $BackupPath 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Log "Restored registry from backup: $BackupPath" "SUCCESS"
            return $true
        } else {
            Write-Log "Failed to restore registry from backup: $BackupPath (Exit code: $LASTEXITCODE)" "ERROR"
            return $false
        }

    } catch {
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Restored registry from backup: $BackupPath" "SUCCESS"
            return $true
        } else {
            Write-Log "Exception restoring registry from backup $BackupPath : $_" "ERROR"
            return $false
        }
    }
}


function Set-RegistryValue {
    

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,

        [Parameter(Mandatory=$true)]
        [string]$Name,

        [Parameter(Mandatory=$true)]
        [object]$Value,

        [string]$Type = "DWORD",

        [bool]$SkipBackup = $false
    )

    try {
        if (-not $SkipBackup -and (Test-Path $Path)) {
            Backup-RegistryKey -Path $Path | Out-Null
        }

        if (-not (Test-Path $Path)) {
            New-Item -Path $Path -Force | Out-Null
            Write-Log "Created registry path: $Path"
        }

        Set-ItemProperty -Path $Path -Name $Name -Value $Value -Type $Type -ErrorAction Stop
        Write-Log "Set registry value: $Path\$Name = $Value ($Type)" "SUCCESS"
        return $true

    } catch {
        Write-Log "Failed to set registry value $Path\$Name : $_" "ERROR"
        return $false
    }
}

function Get-RegistryValue {
    

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,

        [Parameter(Mandatory=$true)]
        [string]$Name,

        [object]$DefaultValue = $null
    )

    try {
        if (Test-Path $Path) {
            $value = Get-ItemProperty -Path $Path -Name $Name -ErrorAction SilentlyContinue
            if ($null -ne $value) {
                return $value.$Name
            }
        }
    } catch {
        Write-Verbose "Registry value not found: $Path\$Name"
    }

    return $DefaultValue
}

function Remove-RegistryValue {
    

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,

        [Parameter(Mandatory=$true)]
        [string]$Name,

        [bool]$SkipBackup = $false
    )

    try {
        if (-not $SkipBackup -and (Test-Path $Path)) {
            Backup-RegistryKey -Path $Path | Out-Null
        }

        Remove-ItemProperty -Path $Path -Name $Name -ErrorAction Stop
        Write-Log "Removed registry value: $Path\$Name" "SUCCESS"
        return $true

    } catch {
        Write-Log "Failed to remove registry value $Path\$Name : $_" "ERROR"
        return $false
    }
}

function Test-RegistryKeyExists {
    

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path
    )

    return Test-Path $Path
}

function Test-RegistryValueExists {
    

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,

        [Parameter(Mandatory=$true)]
        [string]$Name
    )

    try {
        if (Test-Path $Path) {
            $value = Get-ItemProperty -Path $Path -Name $Name -ErrorAction SilentlyContinue
            return ($null -ne $value)
        }
    } catch {
        return $false
    }

    return $false
}


Export-ModuleMember -Function @(
    'Backup-RegistryKey',
    'Restore-RegistryKey',
    'Set-RegistryValue',
    'Get-RegistryValue',
    'Remove-RegistryValue',
    'Test-RegistryKeyExists',
    'Test-RegistryValueExists'
)
