# Registry Management Module
# Handles registry backup, restore, and safe modification

<#
.SYNOPSIS
    Registry management for Gaming PC Setup

.DESCRIPTION
    Provides safe registry operations with automatic backups
    Includes backup, restore, and set functions with error handling
#>

# Import logger module for logging
Import-Module (Join-Path $PSScriptRoot "logger.psm1") -Force

# ============================================================================
# REGISTRY BACKUP FUNCTIONS
# ============================================================================

function Backup-RegistryKey {
    <#
    .SYNOPSIS
        Backs up a registry key to .reg file

    .PARAMETER Path
        Registry path to backup (e.g., "HKLM:\SOFTWARE\...")

    .PARAMETER BackupDir
        Directory to store backups (default: $env:TEMP\RegistryBackup)

    .OUTPUTS
        Boolean: $true if successful, $false otherwise

    .EXAMPLE
        Backup-RegistryKey -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
    #>

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
        # Ensure backup directory exists
        if (-not (Test-Path $BackupDir)) {
            New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        }

        # Generate backup filename
        $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        $safeName = $Path.Replace('\', '_').Replace(':', '')
        $backupPath = Join-Path $BackupDir "Backup-$timestamp-$safeName.reg"

        # Convert PowerShell path to reg.exe format
        $exportPath = $Path.Replace('HKLM:\', 'HKEY_LOCAL_MACHINE\').Replace('HKCU:\', 'HKEY_CURRENT_USER\')

        # Export registry key
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
    <#
    .SYNOPSIS
        Restores a registry key from .reg backup file

    .PARAMETER BackupPath
        Path to .reg backup file

    .OUTPUTS
        Boolean: $true if successful, $false otherwise

    .EXAMPLE
        Restore-RegistryKey -BackupPath "C:\Temp\backup.reg"
    #>

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
        # Only catch actual PowerShell exceptions, not reg.exe output
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Restored registry from backup: $BackupPath" "SUCCESS"
            return $true
        } else {
            Write-Log "Exception restoring registry from backup $BackupPath : $_" "ERROR"
            return $false
        }
    }
}

# ============================================================================
# REGISTRY MODIFICATION FUNCTIONS
# ============================================================================

function Set-RegistryValue {
    <#
    .SYNOPSIS
        Safely sets a registry value with automatic backup

    .PARAMETER Path
        Registry path (e.g., "HKLM:\SOFTWARE\...")

    .PARAMETER Name
        Value name

    .PARAMETER Value
        Value to set

    .PARAMETER Type
        Registry value type (DWORD, String, Binary, etc.)

    .PARAMETER SkipBackup
        If true, skips backup before modification

    .OUTPUTS
        Boolean: $true if successful, $false otherwise

    .EXAMPLE
        Set-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control" -Name "Test" -Value 1 -Type "DWORD"
    #>

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
        # Backup if path exists and backup not skipped
        if (-not $SkipBackup -and (Test-Path $Path)) {
            Backup-RegistryKey -Path $Path | Out-Null
        }

        # Create path if it doesn't exist
        if (-not (Test-Path $Path)) {
            New-Item -Path $Path -Force | Out-Null
            Write-Log "Created registry path: $Path"
        }

        # Set value
        Set-ItemProperty -Path $Path -Name $Name -Value $Value -Type $Type -ErrorAction Stop
        Write-Log "Set registry value: $Path\$Name = $Value ($Type)" "SUCCESS"
        return $true

    } catch {
        Write-Log "Failed to set registry value $Path\$Name : $_" "ERROR"
        return $false
    }
}

function Get-RegistryValue {
    <#
    .SYNOPSIS
        Safely gets a registry value

    .PARAMETER Path
        Registry path

    .PARAMETER Name
        Value name

    .PARAMETER DefaultValue
        Default value if registry value doesn't exist

    .OUTPUTS
        Registry value or default value
    #>

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
    <#
    .SYNOPSIS
        Safely removes a registry value with automatic backup

    .PARAMETER Path
        Registry path

    .PARAMETER Name
        Value name to remove

    .PARAMETER SkipBackup
        If true, skips backup before removal

    .OUTPUTS
        Boolean: $true if successful, $false otherwise
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,

        [Parameter(Mandatory=$true)]
        [string]$Name,

        [bool]$SkipBackup = $false
    )

    try {
        # Backup before removal
        if (-not $SkipBackup -and (Test-Path $Path)) {
            Backup-RegistryKey -Path $Path | Out-Null
        }

        # Remove value
        Remove-ItemProperty -Path $Path -Name $Name -ErrorAction Stop
        Write-Log "Removed registry value: $Path\$Name" "SUCCESS"
        return $true

    } catch {
        Write-Log "Failed to remove registry value $Path\$Name : $_" "ERROR"
        return $false
    }
}

function Test-RegistryKeyExists {
    <#
    .SYNOPSIS
        Tests if a registry key exists

    .PARAMETER Path
        Registry path to test

    .OUTPUTS
        Boolean: $true if exists, $false otherwise
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path
    )

    return Test-Path $Path
}

function Test-RegistryValueExists {
    <#
    .SYNOPSIS
        Tests if a registry value exists

    .PARAMETER Path
        Registry path

    .PARAMETER Name
        Value name to test

    .OUTPUTS
        Boolean: $true if exists, $false otherwise
    #>

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

# ============================================================================
# EXPORT FUNCTIONS
# ============================================================================

Export-ModuleMember -Function @(
    'Backup-RegistryKey',
    'Restore-RegistryKey',
    'Set-RegistryValue',
    'Get-RegistryValue',
    'Remove-RegistryValue',
    'Test-RegistryKeyExists',
    'Test-RegistryValueExists'
)
