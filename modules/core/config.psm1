# Configuration Management Module
# Handles loading, saving, and merging JSON configuration files

<#
.SYNOPSIS
    Configuration management for Gaming PC Setup

.DESCRIPTION
    Provides functions for loading defaults, user configs, profiles,
    saving user preferences, and merging configurations
#>

# ============================================================================
# CONFIGURATION FILE PATHS
# ============================================================================

$script:ConfigDir = Join-Path $PSScriptRoot "..\..\config"
$script:DataDir = Join-Path $PSScriptRoot "..\..\data"
$script:DefaultsPath = Join-Path $script:ConfigDir "defaults.json"
$script:UserConfigPath = Join-Path $script:ConfigDir "user-config.json"
$script:ProfilesDir = Join-Path $script:ConfigDir "profiles"

# ============================================================================
# CORE CONFIGURATION FUNCTIONS
# ============================================================================

function Get-DefaultConfig {
    <#
    .SYNOPSIS
        Loads the default recommended configuration

    .DESCRIPTION
        Returns default settings from config/defaults.json
        If file doesn't exist, returns hardcoded safe defaults

    .OUTPUTS
        Hashtable containing default configuration
    #>

    [CmdletBinding()]
    param()

    if (Test-Path $script:DefaultsPath) {
        try {
            $json = Get-Content $script:DefaultsPath -Raw | ConvertFrom-Json
            return Convert-PSObjectToHashtable $json
        } catch {
            Write-Warning "Failed to load defaults.json: $_. Using hardcoded defaults."
        }
    }

    # Hardcoded fallback defaults
    return @{
        version = "2.0"
        performance = @{
            hpet_disable = $true
            msi_mode = $true
            timer_resolution = $true
            core_parking_disable = $true
            c_states_disable = $false
            memory_compression_disable = $true
            gpu_scheduling = $false
            audio_optimization = $true
            game_bar_disable = $true
            fast_startup_disable = $true
        }
        power = @{
            high_performance_plan = $true
            pcie_link_state_disable = $true
            usb_selective_suspend_disable = $true
            processor_idle_disable = $true
        }
        privacy = @{
            telemetry_services_disable = $true
            location_tracking_disable = $true
            camera_access_disable = $true
            biometrics_disable = $true
            cloud_sync_disable = $false
            hosts_file_blocking = $true
        }
        software = @{
            steam = $true
            discord = $true
            vlc = $false
            brave = $false
            spotify = $false
            qbittorrent = $false
            python = $false
            zed = $false
            hue_sync = $false
            logitech_ghub = $false
        }
        network = @{
            tcp_optimization = $true
            dns_provider = "cloudflare"
            dns_custom_ipv4 = ""
            qos_enable = $true
        }
        games = @{
            steam_paths = @("C:\Program Files (x86)\Steam\steamapps\common")
            auto_detect = $true
            process_priority = $true
            autoexec_generation = $true
        }
    }
}

function Get-UserConfig {
    <#
    .SYNOPSIS
        Loads user's saved configuration

    .DESCRIPTION
        Returns user config from config/user-config.json
        If doesn't exist, returns defaults

    .OUTPUTS
        Hashtable containing user configuration
    #>

    [CmdletBinding()]
    param()

    if (Test-Path $script:UserConfigPath) {
        try {
            $json = Get-Content $script:UserConfigPath -Raw | ConvertFrom-Json
            return Convert-PSObjectToHashtable $json
        } catch {
            Write-Warning "Failed to load user-config.json: $_. Using defaults."
        }
    }

    # No user config exists, return defaults
    return Get-DefaultConfig
}

function Save-UserConfig {
    <#
    .SYNOPSIS
        Saves user configuration to disk

    .PARAMETER Config
        Configuration hashtable to save

    .DESCRIPTION
        Writes config to config/user-config.json
        Creates backup of existing config before overwriting
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$Config
    )

    try {
        # Ensure config directory exists
        if (-not (Test-Path $script:ConfigDir)) {
            New-Item -ItemType Directory -Path $script:ConfigDir -Force | Out-Null
        }

        # Backup existing config
        if (Test-Path $script:UserConfigPath) {
            $backupPath = "$script:UserConfigPath.backup"
            Copy-Item $script:UserConfigPath $backupPath -Force
        }

        # Convert to JSON and save
        $json = $Config | ConvertTo-Json -Depth 10
        Set-Content -Path $script:UserConfigPath -Value $json -Force

        Write-Verbose "Configuration saved to: $script:UserConfigPath"
        return $true

    } catch {
        Write-Error "Failed to save configuration: $_"
        return $false
    }
}

function Get-Profile {
    <#
    .SYNOPSIS
        Loads a pre-made configuration profile

    .PARAMETER ProfileName
        Name of profile to load (competitive, balanced, privacy-focused)

    .OUTPUTS
        Hashtable containing profile configuration
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet('competitive', 'balanced', 'privacy-focused')]
        [string]$ProfileName
    )

    $profilePath = Join-Path $script:ProfilesDir "$ProfileName.json"

    if (Test-Path $profilePath) {
        try {
            $json = Get-Content $profilePath -Raw | ConvertFrom-Json
            return Convert-PSObjectToHashtable $json
        } catch {
            Write-Warning "Failed to load profile '$ProfileName': $_. Using defaults."
        }
    } else {
        Write-Warning "Profile not found: $profilePath. Using defaults."
    }

    # Fallback to defaults
    return Get-DefaultConfig
}

function Get-AvailableProfiles {
    <#
    .SYNOPSIS
        Lists available configuration profiles

    .OUTPUTS
        Array of profile names
    #>

    if (Test-Path $script:ProfilesDir) {
        $profiles = Get-ChildItem -Path $script:ProfilesDir -Filter "*.json" |
                    Select-Object -ExpandProperty BaseName
        return $profiles
    }

    return @('competitive', 'balanced', 'privacy-focused')  # Default list
}

function Merge-Config {
    <#
    .SYNOPSIS
        Merges two configuration hashtables

    .PARAMETER Base
        Base configuration (defaults)

    .PARAMETER Override
        Configuration to merge on top (user selections)

    .DESCRIPTION
        Deep merges Override into Base, with Override taking precedence
        Useful for applying user selections on top of defaults

    .OUTPUTS
        Merged configuration hashtable
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$Base,

        [Parameter(Mandatory=$true)]
        [hashtable]$Override
    )

    $merged = $Base.Clone()

    foreach ($key in $Override.Keys) {
        if ($merged.ContainsKey($key)) {
            # If both are hashtables, merge recursively
            if ($merged[$key] -is [hashtable] -and $Override[$key] -is [hashtable]) {
                $merged[$key] = Merge-Config -Base $merged[$key] -Override $Override[$key]
            } else {
                # Override value
                $merged[$key] = $Override[$key]
            }
        } else {
            # Add new key
            $merged[$key] = $Override[$key]
        }
    }

    return $merged
}

function Test-ConfigValid {
    <#
    .SYNOPSIS
        Validates configuration structure

    .PARAMETER Config
        Configuration hashtable to validate

    .OUTPUTS
        Boolean: $true if valid, $false otherwise
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$Config
    )

    # Required top-level keys
    $requiredKeys = @('performance', 'power', 'privacy', 'software', 'network', 'games')

    foreach ($key in $requiredKeys) {
        if (-not $Config.ContainsKey($key)) {
            Write-Warning "Configuration missing required key: $key"
            return $false
        }
    }

    return $true
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Convert-PSObjectToHashtable {
    <#
    .SYNOPSIS
        Converts PSCustomObject to Hashtable recursively

    .PARAMETER InputObject
        PSCustomObject from ConvertFrom-Json
    #>

    param($InputObject)

    if ($null -eq $InputObject) { return $null }

    if ($InputObject -is [System.Collections.IEnumerable] -and $InputObject -isnot [string]) {
        $collection = @(
            foreach ($object in $InputObject) {
                Convert-PSObjectToHashtable $object
            }
        )
        return $collection
    }
    elseif ($InputObject -is [PSCustomObject]) {
        $hash = @{}
        foreach ($property in $InputObject.PSObject.Properties) {
            $hash[$property.Name] = Convert-PSObjectToHashtable $property.Value
        }
        return $hash
    }
    else {
        return $InputObject
    }
}

# ============================================================================
# EXPORT FUNCTIONS
# ============================================================================

Export-ModuleMember -Function @(
    'Get-DefaultConfig',
    'Get-UserConfig',
    'Save-UserConfig',
    'Get-Profile',
    'Get-AvailableProfiles',
    'Merge-Config',
    'Test-ConfigValid'
)
