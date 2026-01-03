
<#
.SYNOPSIS
    Interactive console menu utilities.
.DESCRIPTION
    Provides interactive, text-based selection menus for choosing categories,
    toggling options, and printing a configuration summary.

    AUTOMATION SUPPORT
    ==================
    These menu functions support unattended/automated execution through environment
    variables. This allows the scripts to be used in CI/CD pipelines, automated
    testing, or scripted deployments without human interaction.

    Environment Variables:
    ----------------------
    ROCKTUNE_MENU_MODE
        Controls menu behavior in Show-Menu:
        - "all"         : Auto-select ALL items and continue (like pressing 'A' then Enter)
        - "none"        : Auto-select NONE and continue (like pressing 'N' then Enter)
        - "recommended" : Auto-select RECOMMENDED items and continue (like pressing 'R' then Enter)
        - "default"     : Accept current selections and continue (like pressing Enter)
        If not set, menu is interactive as usual.

    ROCKTUNE_SETUP_MODE
        Pre-selects the setup mode in Show-SetupModeSelection:
        - "express"  : Express Setup (recommended defaults)
        - "custom"   : Custom Setup (advanced, select each option)
        - "profile"  : Load Profile (pre-made configurations)
        - "exit"     : Exit the wizard
        If not set, user is prompted interactively.

    Usage Examples:
    ---------------
    # Run with all optimizations selected (non-interactive)
    $env:ROCKTUNE_MENU_MODE = "all"
    $env:ROCKTUNE_SETUP_MODE = "express"
    .\gaming-pc-setup.ps1

    # Run with only recommended optimizations
    $env:ROCKTUNE_MENU_MODE = "recommended"
    .\gaming-pc-setup.ps1

    # CI/CD pipeline example (bash)
    ROCKTUNE_MENU_MODE=all ROCKTUNE_SETUP_MODE=express pwsh -File gaming-pc-setup.ps1

    Why Environment Variables?
    --------------------------
    Environment variables were chosen over command-line parameters because:
    1. The menu module is imported by multiple scripts - env vars work universally
    2. They can be set by parent processes, CI/CD systems, or wrapper scripts
    3. They don't pollute the parameter space of consuming scripts
    4. They're the standard approach for configuration in containerized environments

    See also:
    - gaming-pc-setup.ps1 -SkipConfirmation (skip final confirmation prompt)
    - benchmark-setup.ps1 -AutoAccept (skip install consent prompt)
    - extreme-privacy.ps1 -SkipConfirmations (skip all confirmation prompts)

.NOTES
    Designed for PowerShell console UX; uses Clear-Host and Read-Host.
    Supports automation via ROCKTUNE_MENU_MODE and ROCKTUNE_SETUP_MODE env vars.
#>

function Show-Menu {
    <#
    .SYNOPSIS
        Renders an interactive checkbox-style menu.
    .DESCRIPTION
        Displays options with selection markers and optional descriptions. Users
        can toggle items by number, select all/none/recommended, and press Enter
        to accept the current selection.

        AUTOMATION MODE
        ===============
        When the environment variable ROCKTUNE_MENU_MODE is set, this function
        bypasses the interactive loop and applies the specified selection mode:

        - "all"         : Selects ALL non-disabled items (equivalent to pressing 'A')
        - "none"        : Deselects ALL items (equivalent to pressing 'N')
        - "recommended" : Selects items marked with [*] icon (equivalent to pressing 'R')
        - "default"     : Keeps the initial selection state (equivalent to pressing Enter)

        This is useful for:
        - CI/CD pipelines where no human is present to interact
        - Automated testing that needs deterministic behavior
        - Scripted deployments with pre-determined configurations
        - Remote execution where interactive prompts would hang

        Example:
            $env:ROCKTUNE_MENU_MODE = "all"
            $selected = Show-Menu -Title "Options" -Options $opts
            # Returns all non-disabled indices without prompting

    .PARAMETER Title
        Menu title displayed at the top.
    .PARAMETER Options
        Array of hashtables with keys: Label, Selected, Description, Icon, Disabled.
    .PARAMETER Legend
        Optional legend text shown under the list.
    .PARAMETER AllowMultiple
        Indicates whether multi-select is allowed (kept for future extensibility).
    .OUTPUTS
        [int[]] Indices of selected items.
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Title,

        [Parameter(Mandatory=$true)]
        [array]$Options,

        [string]$Legend = "",

        [bool]$AllowMultiple = $true
    )

    $selectedIndices = @()

    # -------------------------------------------------------------------------
    # AUTOMATION MODE CHECK
    # -------------------------------------------------------------------------
    # Check if the ROCKTUNE_MENU_MODE environment variable is set. If so, we
    # bypass the interactive do/while loop entirely and apply the selection
    # mode directly. This enables fully unattended script execution.
    #
    # Why check before the loop?
    # - Avoids any Clear-Host or Write-Host that would clutter CI logs
    # - Returns immediately for faster automated execution
    # - Deterministic behavior - no timing or race condition concerns
    #
    # The env var is read fresh each time Show-Menu is called, so you can
    # potentially change it between menus in a complex orchestration scenario
    # (though this is uncommon - typically set once at the start).
    # -------------------------------------------------------------------------
    $menuMode = $env:ROCKTUNE_MENU_MODE
    if ($menuMode) {
        # Normalize to lowercase for case-insensitive comparison
        $menuMode = $menuMode.ToLower()

        switch ($menuMode) {
            'all' {
                # Select ALL non-disabled items
                # This mirrors pressing 'A' in the interactive menu
                for ($i = 0; $i -lt $Options.Count; $i++) {
                    if (-not $Options[$i].Disabled) {
                        $Options[$i].Selected = $true
                    }
                }
                Write-Host "[AUTO] Menu '$Title': Selected ALL items (ROCKTUNE_MENU_MODE=all)" -ForegroundColor Cyan
            }
            'none' {
                # Deselect ALL items
                # This mirrors pressing 'N' in the interactive menu
                for ($i = 0; $i -lt $Options.Count; $i++) {
                    $Options[$i].Selected = $false
                }
                Write-Host "[AUTO] Menu '$Title': Selected NONE (ROCKTUNE_MENU_MODE=none)" -ForegroundColor Cyan
            }
            'recommended' {
                # Select only items marked as recommended (icon = "[*]")
                # This mirrors pressing 'R' in the interactive menu
                for ($i = 0; $i -lt $Options.Count; $i++) {
                    $Options[$i].Selected = ($Options[$i].Icon -eq "[*]")
                }
                Write-Host "[AUTO] Menu '$Title': Selected RECOMMENDED items (ROCKTUNE_MENU_MODE=recommended)" -ForegroundColor Cyan
            }
            'default' {
                # Keep initial selection state - just proceed
                # This mirrors pressing Enter immediately in the interactive menu
                Write-Host "[AUTO] Menu '$Title': Using DEFAULT selections (ROCKTUNE_MENU_MODE=default)" -ForegroundColor Cyan
            }
            default {
                # Unrecognized mode - warn and fall through to interactive
                Write-Host "[WARN] Unknown ROCKTUNE_MENU_MODE='$menuMode'. Valid: all, none, recommended, default" -ForegroundColor Yellow
                Write-Host "[WARN] Falling back to interactive mode." -ForegroundColor Yellow
                $menuMode = $null  # Clear so we enter the interactive loop
            }
        }

        # If we successfully processed an automation mode, return immediately
        if ($menuMode) {
            $selectedIndices = @()
            for ($i = 0; $i -lt $Options.Count; $i++) {
                if ($Options[$i].Selected) {
                    $selectedIndices += $i
                }
            }
            return $selectedIndices
        }
    }

    # -------------------------------------------------------------------------
    # INTERACTIVE MODE
    # -------------------------------------------------------------------------
    # If ROCKTUNE_MENU_MODE is not set (or was invalid), we fall through to
    # the standard interactive menu loop. This is the default behavior.
    # -------------------------------------------------------------------------

    do {
        Clear-Host

        Write-Host "?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????" -ForegroundColor Cyan
        Write-Host "    $Title" -ForegroundColor Cyan
        Write-Host "?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????" -ForegroundColor Cyan
        Write-Host ""

        for ($i = 0; $i -lt $Options.Count; $i++) {
            $option = $Options[$i]
            $index = $i + 1

            $checkbox = if ($option.Selected) { "X" } else { " " }

            $icon = if ($option.Icon) { " $($option.Icon)" } else { "" }

            $color = "White"
            if ($option.Disabled) {
                $color = "DarkGray"
            } elseif ($option.Icon -eq "[*]") {
                $color = "Green"
            } elseif ($option.Icon -eq "[!]") {
                $color = "Yellow"
            } elseif ($option.Icon -eq "[i]") {
                $color = "Cyan"
            }

            $line = " [$checkbox] $index. $($option.Label)$icon"
            Write-Host $line -ForegroundColor $color

            if ($option.Description) {
                Write-Host "      $($option.Description)" -ForegroundColor DarkGray
            }
        }

        if ($Legend) {
            Write-Host ""
            Write-Host "Legend: $Legend" -ForegroundColor DarkGray
        }

        Write-Host ""
        Write-Host "Toggle with numbers, 'A' for all, 'N' for none, 'R' for recommended, Enter to continue" -ForegroundColor Yellow

        $choice = Read-Host "Your choice"

        if ($choice -match '^\d+$') {
            $idx = [int]$choice - 1
            if ($idx -ge 0 -and $idx -lt $Options.Count -and -not $Options[$idx].Disabled) {
                $Options[$idx].Selected = -not $Options[$idx].Selected
            }
        }
        elseif ($choice -eq 'A' -or $choice -eq 'a') {
            for ($i = 0; $i -lt $Options.Count; $i++) {
                if (-not $Options[$i].Disabled) {
                    $Options[$i].Selected = $true
                }
            }
        }
        elseif ($choice -eq 'N' -or $choice -eq 'n') {
            for ($i = 0; $i -lt $Options.Count; $i++) {
                $Options[$i].Selected = $false
            }
        }
        elseif ($choice -eq 'R' -or $choice -eq 'r') {
            for ($i = 0; $i -lt $Options.Count; $i++) {
                $Options[$i].Selected = ($Options[$i].Icon -eq "[*]")
            }
        }
        elseif ($choice -eq '') {
            break
        }

    } while ($true)

    $selectedIndices = @()
    for ($i = 0; $i -lt $Options.Count; $i++) {
        if ($Options[$i].Selected) {
            $selectedIndices += $i
        }
    }

    return $selectedIndices
}

function Show-CategoryMenu {
    <#
    .SYNOPSIS
        Presents a category selection menu.
    .DESCRIPTION
        Converts category metadata into menu options and returns the selected
        category keys in the original hash order.
    .PARAMETER Categories
        Hashtable of category definitions with Icon/ItemCount/Recommended metadata.
    .OUTPUTS
        [string[]] Selected category keys.
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$Categories
    )

    $options = @()
    $index = 0
    foreach ($key in $Categories.Keys) {
        $cat = $Categories[$key]
        $options += @{
            Label = "$($cat.Icon) $key"
            Selected = $true
            Description = "$($cat.ItemCount) items ($($cat.Recommended) recommended)"
            Icon = ""
        }
        $index++
    }

    $selectedIndices = Show-Menu -Title "SELECT CATEGORIES" -Options $options -AllowMultiple $true

    $categoryKeys = @($Categories.Keys)
    $selectedCategories = @()
    foreach ($idx in $selectedIndices) {
        $selectedCategories += $categoryKeys[$idx]
    }

    return $selectedCategories
}

function Get-UserChoice {
    <#
    .SYNOPSIS
        Prompts for a single validated choice.
    .DESCRIPTION
        Loops until the user enters one of the allowed choices, optionally
        accepting a default when Enter is pressed.
    .PARAMETER Prompt
        Prompt text shown to the user.
    .PARAMETER ValidChoices
        Array of allowed choices (strings).
    .PARAMETER DefaultChoice
        Optional default choice when user presses Enter.
    .OUTPUTS
        [string] Selected choice.
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Prompt,

        [Parameter(Mandatory=$true)]
        [array]$ValidChoices,

        [string]$DefaultChoice = ""
    )

    do {
        $validString = $ValidChoices -join '/'
        if ($DefaultChoice) {
            $fullPrompt = "$Prompt [$validString, default=$DefaultChoice]"
        } else {
            $fullPrompt = "$Prompt [$validString]"
        }

        $choice = Read-Host $fullPrompt

        if ($choice -eq '' -and $DefaultChoice) {
            $choice = $DefaultChoice
        }

        if ($ValidChoices -contains $choice) {
            return $choice
        }

        Write-Host "Invalid choice. Please select from: $validString" -ForegroundColor Red

    } while ($true)
}

function Show-Summary {
    <#
    .SYNOPSIS
        Displays a configuration summary.
    .DESCRIPTION
        Prints a categorized view of the selected configuration with simple
        YES/NO mapping for boolean values.
    .PARAMETER Title
        Summary header text.
    .PARAMETER Config
        Hashtable of configuration values to display.
    .OUTPUTS
        None.
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Title,

        [Parameter(Mandatory=$true)]
        [hashtable]$Config
    )

    Clear-Host
    Write-Host "?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????" -ForegroundColor Cyan
    Write-Host "    $Title" -ForegroundColor Cyan
    Write-Host "?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????" -ForegroundColor Cyan
    Write-Host ""

    foreach ($category in $Config.Keys | Sort-Object) {
        Write-Host "${category}:" -ForegroundColor Yellow
        $items = $Config[$category]

        if ($items -is [hashtable]) {
            foreach ($key in $items.Keys | Sort-Object) {
                $value = $items[$key]
                $status = if ($value -eq $true) { "YES" } elseif ($value -eq $false) { "NO" } else { $value }
                Write-Host "  $key : $status" -ForegroundColor White
            }
        } elseif ($items -is [array]) {
            foreach ($item in $items) {
                Write-Host "  - $item" -ForegroundColor White
            }
        } else {
            Write-Host "  $items" -ForegroundColor White
        }

        Write-Host ""
    }

    Write-Host "?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????" -ForegroundColor Cyan
}

function Show-Welcome {
    <#
    .SYNOPSIS
        Shows the interactive setup welcome screen.
    .DESCRIPTION
        Prints a banner and optional system information for user context.
    .PARAMETER SystemInfo
        Hashtable of system key/value pairs to display.
    .OUTPUTS
        None.
    #>

    [CmdletBinding()]
    param(
        [hashtable]$SystemInfo = @{}
    )

    Clear-Host
    Write-Host ""
    Write-Host "??\u0022?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????" -ForegroundColor Cyan
    Write-Host "???                                                                              ???" -ForegroundColor Cyan
    Write-Host "???              GAMING PC SETUP - INTERACTIVE CONFIGURATION                     ???" -ForegroundColor Cyan
    Write-Host "???                                                                              ???" -ForegroundColor Cyan
    Write-Host "????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Welcome! This wizard will optimize your Windows system for gaming." -ForegroundColor White
    Write-Host ""

    if ($SystemInfo.Count -gt 0) {
        Write-Host "System Information:" -ForegroundColor Yellow
        foreach ($key in $SystemInfo.Keys) {
            Write-Host "  $key : $($SystemInfo[$key])" -ForegroundColor White
        }
        Write-Host ""
    }
}

function Show-SetupModeSelection {
    <#
    .SYNOPSIS
        Presents the setup mode selection menu.
    .DESCRIPTION
        Lets the user choose between express, custom, or profile-based setup,
        or exit the wizard.

        AUTOMATION MODE
        ===============
        When the environment variable ROCKTUNE_SETUP_MODE is set, this function
        bypasses the interactive menu and returns the specified mode directly:

        - "express"  : Express Setup - uses proven defaults, best for most users
        - "custom"   : Custom Setup - select each optimization individually
        - "profile"  : Load Profile - use pre-made competitive/balanced/privacy configurations
        - "exit"     : Exit the wizard without making changes

        This is useful for:
        - CI/CD pipelines that need deterministic, non-interactive execution
        - Automated testing of specific setup modes
        - Scripted deployments with pre-determined configurations
        - Remote execution where interactive prompts would block

        Example:
            $env:ROCKTUNE_SETUP_MODE = "express"
            $mode = Show-SetupModeSelection
            # Returns "express" without prompting

        Note: For full automation, combine with ROCKTUNE_MENU_MODE and the
        -SkipConfirmation parameter on the main script:

            $env:ROCKTUNE_SETUP_MODE = "express"
            $env:ROCKTUNE_MENU_MODE = "recommended"
            .\gaming-pc-setup.ps1 -SkipConfirmation

    .OUTPUTS
        [string] One of: express, custom, profile, exit.
    #>

    # -------------------------------------------------------------------------
    # AUTOMATION MODE CHECK
    # -------------------------------------------------------------------------
    # Check if ROCKTUNE_SETUP_MODE environment variable is set. If so, we
    # return the specified mode directly without displaying the menu or
    # prompting for input.
    #
    # Why check first?
    # - Avoids Clear-Host which would disrupt CI/CD log output
    # - Returns immediately for faster automated execution
    # - Provides clear feedback about what mode was auto-selected
    #
    # Valid modes match the return values of the interactive menu:
    # - express  : Maps to menu choice "1" (Express Setup)
    # - custom   : Maps to menu choice "2" (Custom Setup)
    # - profile  : Maps to menu choice "3" (Load Profile)
    # - exit     : Maps to menu choice "4" (Exit)
    #
    # Invalid values trigger a warning and fall through to interactive mode.
    # This is intentional - we don't want automation to silently fail.
    # -------------------------------------------------------------------------
    $setupMode = $env:ROCKTUNE_SETUP_MODE
    if ($setupMode) {
        # Normalize to lowercase for case-insensitive comparison
        $setupMode = $setupMode.ToLower()

        $validModes = @('express', 'custom', 'profile', 'exit')
        if ($validModes -contains $setupMode) {
            # Log the auto-selection for transparency in CI logs
            Write-Host "[AUTO] Setup mode: $setupMode (ROCKTUNE_SETUP_MODE env var)" -ForegroundColor Cyan
            return $setupMode
        } else {
            # Invalid mode specified - warn and fall through to interactive
            Write-Host "[WARN] Unknown ROCKTUNE_SETUP_MODE='$setupMode'. Valid: express, custom, profile, exit" -ForegroundColor Yellow
            Write-Host "[WARN] Falling back to interactive mode." -ForegroundColor Yellow
        }
    }

    # -------------------------------------------------------------------------
    # INTERACTIVE MODE
    # -------------------------------------------------------------------------
    # If ROCKTUNE_SETUP_MODE is not set (or was invalid), display the menu
    # and prompt for user input as normal.
    # -------------------------------------------------------------------------

    Clear-Host
    Write-Host "?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????" -ForegroundColor Cyan
    Write-Host "    SETUP MODE SELECTION" -ForegroundColor Cyan
    Write-Host "?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Choose your setup mode:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1) Express Setup (Recommended)" -ForegroundColor Green
    Write-Host "     - Uses proven defaults" -ForegroundColor DarkGray
    Write-Host "     - ~5 minutes setup time" -ForegroundColor DarkGray
    Write-Host "     - Best for most users" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  2) Custom Setup (Advanced)" -ForegroundColor Yellow
    Write-Host "     - Select each optimization individually" -ForegroundColor DarkGray
    Write-Host "     - ~15 minutes setup time" -ForegroundColor DarkGray
    Write-Host "     - Full control over every setting" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  3) Load Profile" -ForegroundColor Cyan
    Write-Host "     - Pre-made configurations" -ForegroundColor DarkGray
    Write-Host "     - Competitive / Balanced / Privacy-Focused" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  4) Exit" -ForegroundColor Red
    Write-Host ""

    $choice = Get-UserChoice -Prompt "Your choice" -ValidChoices @('1', '2', '3', '4') -DefaultChoice '1'

    switch ($choice) {
        '1' { return "express" }
        '2' { return "custom" }
        '3' { return "profile" }
        '4' { return "exit" }
    }
}


Export-ModuleMember -Function @(
    'Show-Menu',
    'Show-CategoryMenu',
    'Get-UserChoice',
    'Show-Summary',
    'Show-Welcome',
    'Show-SetupModeSelection'
)

