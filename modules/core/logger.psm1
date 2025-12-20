# Logging Module
# Handles all logging functionality for Gaming PC Setup

<#
.SYNOPSIS
    Logging system for Gaming PC Setup

.DESCRIPTION
    Provides centralized logging with file output and console display
    Supports different log levels (INFO, SUCCESS, ERROR, WARNING)
#>

# ============================================================================
# MODULE VARIABLES
# ============================================================================

$script:LogPath = ".\gaming-pc-setup.log"
$script:StartTime = Get-Date

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

function Initialize-Logger {
    <#
    .SYNOPSIS
        Initializes the logging system

    .PARAMETER LogPath
        Path to log file (default: .\gaming-pc-setup.log)

    .PARAMETER ClearExisting
        If true, clears existing log file
    #>

    [CmdletBinding()]
    param(
        [string]$LogPath = ".\gaming-pc-setup.log",
        [bool]$ClearExisting = $false
    )

    $script:LogPath = $LogPath
    $script:StartTime = Get-Date

    # Create log directory if needed
    $logDir = Split-Path $LogPath -Parent
    if ($logDir -and -not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    # Clear log if requested
    if ($ClearExisting -and (Test-Path $LogPath)) {
        Remove-Item $LogPath -Force
    }

    # Write header
    Write-Log "=== Gaming PC Setup - Log Started ===" "INFO"
    Write-Log "Start Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "INFO"
    Write-Log "PowerShell Version: $($PSVersionTable.PSVersion)" "INFO"
    Write-Log "Operating System: $([System.Environment]::OSVersion.VersionString)" "INFO"
    Write-Log "Log Path: $LogPath" "INFO"
}

function Write-Log {
    <#
    .SYNOPSIS
        Writes a log message to file and console

    .PARAMETER Message
        Message to log

    .PARAMETER Level
        Log level: INFO, SUCCESS, ERROR, WARNING

    .EXAMPLE
        Write-Log "HPET disabled successfully" "SUCCESS"
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,

        [Parameter(Mandatory=$false)]
        [ValidateSet('INFO', 'SUCCESS', 'ERROR', 'WARNING')]
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"

    # Try to write to log file (handle file locks gracefully)
    try {
        Add-Content -Path $script:LogPath -Value $logMessage -ErrorAction Stop
    } catch {
        # If log file is locked, just skip writing to file (still show on console)
        Write-Verbose "Unable to write to log file: $_"
    }

    # Console output with color coding
    $color = switch ($Level) {
        'SUCCESS' { 'Green' }
        'ERROR' { 'Red' }
        'WARNING' { 'Yellow' }
        default { 'White' }
    }

    Write-Host $logMessage -ForegroundColor $color
}

function Write-LogSection {
    <#
    .SYNOPSIS
        Writes a section header to the log

    .PARAMETER SectionName
        Name of the section

    .EXAMPLE
        Write-LogSection "Performance Optimizations"
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$SectionName
    )

    Write-Log "============================================================" "INFO"
    Write-Log "=== $SectionName ===" "INFO"
    Write-Log "============================================================" "INFO"
}

function Get-LogSummary {
    <#
    .SYNOPSIS
        Generates a summary of the log session

    .OUTPUTS
        Hashtable with summary statistics
    #>

    [CmdletBinding()]
    param()

    $duration = (Get-Date) - $script:StartTime

    if (-not (Test-Path $script:LogPath)) {
        return @{
            Duration = $duration
            ErrorCount = 0
            SuccessCount = 0
            WarningCount = 0
            TotalLines = 0
        }
    }

    $logContent = Get-Content $script:LogPath

    return @{
        Duration = $duration
        ErrorCount = ($logContent | Select-String '\[ERROR\]').Count
        SuccessCount = ($logContent | Select-String '\[SUCCESS\]').Count
        WarningCount = ($logContent | Select-String '\[WARNING\]').Count
        TotalLines = $logContent.Count
        LogPath = $script:LogPath
    }
}

# ============================================================================
# EXPORT FUNCTIONS
# ============================================================================

Export-ModuleMember -Function @(
    'Initialize-Logger',
    'Write-Log',
    'Write-LogSection',
    'Get-LogSummary'
)
