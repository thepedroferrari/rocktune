<#
.SYNOPSIS
    Privacy-focused tweaks and optional debloat actions.
.DESCRIPTION
    Applies tiered privacy settings, reduces telemetry, removes select UWP apps,
    and configures Windows privacy-related policies.
.NOTES
    Requires Administrator. Tier 3 and Xbox removals can break Game Pass features.
#>
#Requires -RunAsAdministrator



Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global


# --- Helper Functions ---

function Set-ScheduledTaskState {
    <#
    .SYNOPSIS
        Enables or disables a Windows scheduled task.
    .DESCRIPTION
        Splits the full path into TaskPath and TaskName (Disable-ScheduledTask
        does not accept a full path in -TaskName), records the old state in the
        undo journal and honors dry-run.
    .PARAMETER TaskPath
        The full task path (e.g., "Microsoft\Windows\Autochk\Proxy").
    .PARAMETER State
        "Disabled" or "Enabled".
    #>
    param(
        [string]$TaskPath,
        [ValidateSet('Disabled', 'Enabled')]
        [string]$State
    )
    return (Set-ScheduledTaskTracked -FullPath $TaskPath -State $State)
}


function Test-PrivacyOptimizations {
    <#
    .SYNOPSIS
        Verifies privacy-related registry values.
    .DESCRIPTION
        Checks advertising ID and activity history policies.
    .OUTPUTS
        [bool] True when checks pass, else false.
    #>
    $allPassed = $true

    Write-Log "Verifying privacy optimizations..." "INFO"

    $advID = Get-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo" -Name "Enabled"
    if ($advID -eq 0) {
        Write-Log "[OK] Advertising ID disabled" "SUCCESS"
    } else {
        Write-Log "[FAIL] Advertising ID not disabled" "ERROR"
        $allPassed = $false
    }

    $activityHistory = Get-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "PublishUserActivities"
    if ($activityHistory -eq 0) {
        Write-Log "[OK] Activity History disabled" "SUCCESS"
    }

    return $allPassed
}




function Apply-PrivacyTier1Safe {
    <#
    .SYNOPSIS
        Applies Tier 1 privacy settings (safe defaults).
    .DESCRIPTION
        Disables advertising ID, activity history, WiFi Sense, feedback prompts,
        spotlight content, cloud clipboard, and reduces telemetry level.
    .OUTPUTS
        None.
    #>
    try {
        Write-Log "Applying Tier 1 safe privacy tweaks..." "INFO"

        $advPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo"
        Backup-RegistryKey -Path $advPath
        Set-RegistryValue -Path $advPath -Name "Enabled" -Value 0 -Type "DWORD"

        $advPath2 = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo"
        Backup-RegistryKey -Path $advPath2
        Set-RegistryValue -Path $advPath2 -Name "DisabledByGroupPolicy" -Value 1 -Type "DWORD"
        Write-Log "Disabled Advertising ID" "SUCCESS"

        $activityPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System"
        Backup-RegistryKey -Path $activityPath
        Set-RegistryValue -Path $activityPath -Name "PublishUserActivities" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $activityPath -Name "UploadUserActivities" -Value 0 -Type "DWORD"
        Write-Log "Disabled Activity History / Timeline" "SUCCESS"

        $wifiPath = "HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config"
        Backup-RegistryKey -Path $wifiPath
        Set-RegistryValue -Path $wifiPath -Name "AutoConnectAllowedOEM" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $wifiPath -Name "WiFISenseAllowed" -Value 0 -Type "DWORD"
        Write-Log "Disabled WiFi Sense" "SUCCESS"

        $feedbackPath = "HKCU:\Software\Microsoft\Siuf\Rules"
        Backup-RegistryKey -Path $feedbackPath
        Set-RegistryValue -Path $feedbackPath -Name "NumberOfSIUFInPeriod" -Value 0 -Type "DWORD"
        Write-Log "Disabled Windows Feedback" "SUCCESS"

        $spotlightPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager"
        Backup-RegistryKey -Path $spotlightPath
        Set-RegistryValue -Path $spotlightPath -Name "RotatingLockScreenEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $spotlightPath -Name "RotatingLockScreenOverlayEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $spotlightPath -Name "SubscribedContent-338389Enabled" -Value 0 -Type "DWORD"
        Write-Log "Disabled Windows Spotlight" "SUCCESS"

        $clipboardPath = "HKCU:\Software\Microsoft\Clipboard"
        Backup-RegistryKey -Path $clipboardPath
        Set-RegistryValue -Path $clipboardPath -Name "EnableClipboardHistory" -Value 0 -Type "DWORD"
        Write-Log "Disabled Cloud Clipboard Sync" "SUCCESS"

        $telemetryPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection"
        Backup-RegistryKey -Path $telemetryPath
        Set-RegistryValue -Path $telemetryPath -Name "AllowTelemetry" -Value 1 -Type "DWORD"  # 1 = Security only (not 0 = off, requires Enterprise)
        Set-RegistryValue -Path $telemetryPath -Name "DoNotShowFeedbackNotifications" -Value 1 -Type "DWORD"
        Write-Log "Reduced diagnostic data to minimum (Security level)" "SUCCESS"

        Write-Log "Tier 1 safe privacy tweaks complete" "SUCCESS"

    } catch {
        Write-Log "Error applying Tier 1 privacy tweaks: $_" "ERROR"
        throw
    }
}




function Apply-PrivacyTier2Moderate {
    <#
    .SYNOPSIS
        Applies Tier 2 privacy settings (moderate).
    .DESCRIPTION
        Disables telemetry scheduled tasks, services, and applies comprehensive
        privacy registry settings.
    .OUTPUTS
        None.
    #>
    try {
        Write-Log "Applying Tier 2 moderate privacy tweaks..." "INFO"

        # --- Disable telemetry scheduled tasks ---
        Write-Log "Disabling telemetry scheduled tasks..." "INFO"
        $telemetryTasks = @(
            "Microsoft\Windows\Autochk\Proxy",
            "Microsoft\Windows\Customer Experience Improvement Program\Consolidator",
            "Microsoft\Windows\Customer Experience Improvement Program\UsbCeip",
            "Microsoft\Windows\DiskDiagnostic\Microsoft-Windows-DiskDiagnosticDataCollector",
            "Microsoft\Windows\Feedback\Siuf\DmClient",
            "Microsoft\Windows\Feedback\Siuf\DmClientOnScenarioDownload",
            "Microsoft\Windows\Windows Error Reporting\QueueReporting",
            "Microsoft\Windows\Application Experience\MareBackup",
            "Microsoft\Windows\Application Experience\StartupAppTask",
            "Microsoft\Windows\Application Experience\PcaPatchDbTask",
            "Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser",
            "Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser Exp",
            "Microsoft\Windows\Application Experience\ProgramDataUpdater"
        )
        foreach ($task in $telemetryTasks) {
            [void](Set-ScheduledTaskState -TaskPath $task -State "Disabled")
        }
        Write-Log "Telemetry scheduled tasks disabled" "SUCCESS"

        # --- AllowTelemetry at both policy paths ---
        $telemetryPath1 = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection"
        Backup-RegistryKey -Path $telemetryPath1
        Set-RegistryValue -Path $telemetryPath1 -Name "AllowTelemetry" -Value 0 -Type "DWORD"

        $telemetryPath2 = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection"
        Backup-RegistryKey -Path $telemetryPath2
        Set-RegistryValue -Path $telemetryPath2 -Name "AllowTelemetry" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $telemetryPath2 -Name "DoNotShowFeedbackNotifications" -Value 1 -Type "DWORD"
        Write-Log "Telemetry set to minimum" "SUCCESS"

        # --- ContentDeliveryManager (content suggestions, pre-installed apps) ---
        $cdmPath = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager"
        Backup-RegistryKey -Path $cdmPath
        Set-RegistryValue -Path $cdmPath -Name "ContentDeliveryAllowed" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $cdmPath -Name "OemPreInstalledAppsEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $cdmPath -Name "PreInstalledAppsEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $cdmPath -Name "PreInstalledAppsEverEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $cdmPath -Name "SilentInstalledAppsEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $cdmPath -Name "SubscribedContent-338387Enabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $cdmPath -Name "SubscribedContent-338388Enabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $cdmPath -Name "SubscribedContent-338389Enabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $cdmPath -Name "SubscribedContent-353698Enabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $cdmPath -Name "SystemPaneSuggestionsEnabled" -Value 0 -Type "DWORD"
        Write-Log "Content delivery/suggestions disabled" "SUCCESS"

        # --- Feedback and advertising ---
        $siufPath = "HKCU:\SOFTWARE\Microsoft\Siuf\Rules"
        Backup-RegistryKey -Path $siufPath
        Set-RegistryValue -Path $siufPath -Name "NumberOfSIUFInPeriod" -Value 0 -Type "DWORD"

        $cloudPath = "HKCU:\SOFTWARE\Policies\Microsoft\Windows\CloudContent"
        Backup-RegistryKey -Path $cloudPath
        Set-RegistryValue -Path $cloudPath -Name "DisableTailoredExperiencesWithDiagnosticData" -Value 1 -Type "DWORD"

        $adInfoPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo"
        Backup-RegistryKey -Path $adInfoPath
        Set-RegistryValue -Path $adInfoPath -Name "DisabledByGroupPolicy" -Value 1 -Type "DWORD"
        Write-Log "Feedback and advertising disabled" "SUCCESS"

        # --- Windows Error Reporting ---
        $werPath = "HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting"
        Backup-RegistryKey -Path $werPath
        Set-RegistryValue -Path $werPath -Name "Disabled" -Value 1 -Type "DWORD"
        Write-Log "Windows Error Reporting disabled" "SUCCESS"

        # --- Delivery Optimization P2P at both paths ---
        $doPath1 = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config"
        Backup-RegistryKey -Path $doPath1
        Set-RegistryValue -Path $doPath1 -Name "DODownloadMode" -Value 0 -Type "DWORD"

        $doPath2 = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization"
        Backup-RegistryKey -Path $doPath2
        Set-RegistryValue -Path $doPath2 -Name "DODownloadMode" -Value 0 -Type "DWORD"
        Write-Log "Delivery Optimization P2P disabled" "SUCCESS"

        # --- Disable telemetry services ---
        try {
            $service = Get-Service -Name "DiagTrack" -ErrorAction SilentlyContinue
            if ($service) {
                [void](Set-ServiceStartTracked -Name "DiagTrack" -StartupType Disabled -Stop)
                Write-Log "Disabled DiagTrack service" "SUCCESS"
            }
        } catch {
            Write-Log "Error disabling DiagTrack: $_" "WARNING"
        }

        try {
            $service = Get-Service -Name "dmwappushservice" -ErrorAction SilentlyContinue
            if ($service) {
                [void](Set-ServiceStartTracked -Name "dmwappushservice" -StartupType Disabled -Stop)
                Write-Log "Disabled dmwappushservice" "SUCCESS"
            }
        } catch {
            Write-Log "Error disabling dmwappushservice: $_" "WARNING"
        }

        Write-Log "Tier 2 privacy tweaks complete (tasks + registry + services)" "SUCCESS"

    } catch {
        Write-Log "Error applying Tier 2 privacy tweaks: $_" "ERROR"
        throw
    }
}




function Apply-PrivacyTier3Aggressive {
    <#
    .SYNOPSIS
        Applies Tier 3 privacy settings (aggressive).
    .DESCRIPTION
        Disables Xbox/Game Pass services and other components that can break
        Microsoft gaming features.
    .OUTPUTS
        None.
    #>
    try {
        Write-Log "Applying Tier 3 aggressive privacy tweaks (opt-in, BREAKS features)..." "INFO"
        Write-Log "WARNING: This will BREAK Game Pass and Xbox app functionality!" "ERROR"

        $xboxServices = @(
            "XblAuthManager",
            "XblGameSave",
            "XboxGipSvc",
            "XboxNetApiSvc"
        )

        foreach ($serviceName in $xboxServices) {
            try {
                $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
                if ($service) {
                    [void](Set-ServiceStartTracked -Name $serviceName -StartupType Disabled -Stop)
                    Write-Log "Disabled Xbox service: $serviceName (BREAKS Game Pass)" "SUCCESS"
                }
            } catch {
                Write-Log "Error disabling Xbox service $serviceName : $_" "ERROR"
            }
        }

        Write-Log "Tier 3 aggressive privacy tweaks complete (Game Pass BROKEN)" "SUCCESS"

    } catch {
        Write-Log "Error applying Tier 3 privacy tweaks: $_" "ERROR"
        throw
    }
}




function Remove-AppxEverywhere {
    <#
    .SYNOPSIS
        Removes an appx package for all users and its provisioned copy. Honors dry-run.
    .OUTPUTS
        [bool] True if anything was removed (or would be, in dry-run).
    #>
    param([Parameter(Mandatory=$true)][string]$Name)

    $installed = @(Get-AppxPackage -AllUsers -Name $Name -ErrorAction SilentlyContinue)
    $provisioned = @(Get-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like $Name })
    if ($installed.Count -eq 0 -and $provisioned.Count -eq 0) {
        return $false
    }
    if (Test-RockTuneDryRun) {
        Write-Log "[DRY RUN] Would remove app: $Name" "INFO"
        return $true
    }
    foreach ($pkg in $installed) {
        try {
            Remove-AppxPackage -Package $pkg.PackageFullName -AllUsers -ErrorAction Stop
        } catch {
            Remove-AppxPackage -Package $pkg.PackageFullName -ErrorAction SilentlyContinue
        }
    }
    foreach ($prov in $provisioned) {
        Remove-AppxProvisionedPackage -Online -PackageName $prov.PackageName -ErrorAction SilentlyContinue | Out-Null
    }
    try {
        $listPath = Join-Path (Split-Path (Get-UndoJournalPath) -Parent) "removed-apps.txt"
        Add-Content -Path $listPath -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm')  $Name  (reinstall: winget search `"$Name`" or Microsoft Store)" -ErrorAction SilentlyContinue
    } catch {
        Write-Verbose "Could not append to removed-apps list"
    }
    return $true
}

function Remove-Bloatware {
    <#
    .SYNOPSIS
        Removes selected built-in and preinstalled third-party apps.
    .DESCRIPTION
        Removes each app for all users and removes the provisioned copy so it does
        not come back for new accounts. Never touches Xbox, Game Bar, Store,
        Photos, Terminal or Notepad. Removed IDs are listed in
        %ProgramData%\RockTune\removed-apps.txt for reinstalling.
    .OUTPUTS
        None.
    #>
    try {
        Write-Log "Removing UWP bloatware..." "INFO"

        $appsToRemove = @(
            "Microsoft.GetHelp",
            "Microsoft.Getstarted",
            "Microsoft.Microsoft3DViewer",
            "Microsoft.MicrosoftOfficeHub",
            "Microsoft.MicrosoftSolitaireCollection",
            "Microsoft.MixedReality.Portal",
            "Microsoft.People",
            "Microsoft.SkypeApp",
            "Microsoft.YourPhone",
            "Microsoft.ZuneMusic",
            "Microsoft.ZuneVideo",
            "Microsoft.BingNews",
            "Microsoft.BingWeather",
            "Microsoft.BingFinance",
            "Microsoft.BingSports",
            "Microsoft.BingTravel",
            "Microsoft.BingFoodAndDrink",
            "Microsoft.BingHealthAndFitness",
            "Microsoft.BingTranslator",
            "Microsoft.Windows.DevHome",
            "Microsoft.PCManager",
            "Microsoft.Windows.AIHub",
            "Microsoft.MicrosoftJournal",
            "Microsoft.Todos",
            "Microsoft.PowerAutomateDesktop",
            "Microsoft.WindowsFeedbackHub",
            "Microsoft.549981C3F5F10",
            "Clipchamp.Clipchamp",
            "MicrosoftTeams",
            "MSTeams",
            "MicrosoftCorporationII.MicrosoftFamily",
            "king.com.CandyCrushSaga",
            "king.com.CandyCrushSodaSaga",
            "BytedancePte.Ltd.TikTok",
            "Facebook.Instagram",
            "AmazonVideo.PrimeVideo",
            "4DF9E0F8.Netflix",
            "Disney.37853FC22B2CE",
            "SpotifyAB.SpotifyMusic",
            "7EE7776C.LinkedInforWindows"
        )

        $removed = 0
        $total = $appsToRemove.Count
        $i = 0
        foreach ($app in $appsToRemove) {
            $i++
            Write-Progress -Activity "Removing bloatware" -Status $app -PercentComplete ([int](($i / $total) * 100))
            try {
                if (Remove-AppxEverywhere -Name $app) {
                    Write-Log "Removed app: $app" "SUCCESS"
                    $removed++
                }
            } catch {
                Write-Log "Error removing app $app : $_" "ERROR"
            }
        }
        Write-Progress -Activity "Removing bloatware" -Completed

        Write-Log "Bloatware removal complete: $removed of $total apps found and removed" "SUCCESS"

    } catch {
        Write-Log "Error removing bloatware: $_" "ERROR"
        throw
    }
}


function Remove-XboxApps {
    <#
    .SYNOPSIS
        Removes Xbox-related UWP apps.
    .DESCRIPTION
        Uninstalls Xbox UWP apps. This breaks Game Pass and Xbox app features.
    .OUTPUTS
        None.
    #>
    try {
        Write-Log "Removing Xbox UWP apps (BREAKS Game Pass)..." "INFO"

        $xboxApps = @(
            "Microsoft.XboxApp",
            "Microsoft.XboxGameCallableUI",
            "Microsoft.XboxGamingOverlay",
            "Microsoft.XboxIdentityProvider",
            "Microsoft.XboxSpeechToTextOverlay",
            "Microsoft.Xbox.TCUI"
        )

        $removed = 0
        foreach ($app in $xboxApps) {
            try {
                if (Remove-AppxEverywhere -Name $app) {
                    Write-Log "Removed Xbox app: $app (Game Pass BROKEN)" "SUCCESS"
                    $removed++
                }
            } catch {
                Write-Log "Error removing Xbox app $app : $_" "ERROR"
            }
        }

        Write-Log "Xbox app removal complete: $removed apps removed (Game Pass BROKEN)" "SUCCESS"

    } catch {
        Write-Log "Error removing Xbox apps: $_" "ERROR"
        throw
    }
}




function Set-BackgroundAppsOff {
    <#
    .SYNOPSIS
        Disables background UWP app activity.
    .DESCRIPTION
        Turns off background app access and related search toggles.
    .OUTPUTS
        None.
    #>
    try {
        $path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications"
        Backup-RegistryKey -Path $path
        Set-RegistryValue -Path $path -Name "GlobalUserDisabled" -Value 1 -Type "DWORD"

        $searchPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search"
        Backup-RegistryKey -Path $searchPath
        Set-RegistryValue -Path $searchPath -Name "BackgroundAppGlobalToggle" -Value 0 -Type "DWORD"

        Write-Log "Background Store apps disabled" "SUCCESS"
    } catch {
        Write-Log "Error disabling background apps: $_" "ERROR"
        throw
    }
}


function Apply-EdgeDebloat {
    <#
    .SYNOPSIS
        Applies Microsoft Edge policy debloat settings.
    .DESCRIPTION
        Disables select Edge UI features and prompts via policy keys.
    .OUTPUTS
        None.
    #>
    try {
        $edge = "HKLM:\SOFTWARE\Policies\Microsoft\Edge"
        Backup-RegistryKey -Path $edge
        Set-RegistryValue -Path $edge -Name "HideFirstRunExperience" -Value 1 -Type "DWORD"
        Set-RegistryValue -Path $edge -Name "EdgeShoppingAssistantEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $edge -Name "WebWidgetAllowed" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $edge -Name "NewTabPageCompanyLogoVisible" -Value 0 -Type "DWORD"
        # Sidebar, Copilot and generative AI features, local AI model download, recommendations
        foreach ($name in @("HubsSidebarEnabled", "CopilotPageContext", "CopilotCDPPageContext", "Microsoft365CopilotChatIconEnabled", "EdgeEntraCopilotPageContext", "EdgeHistoryAISearchEnabled", "ComposeInlineEnabled", "NewTabPageBingChatEnabled", "PersonalizationReportingEnabled", "DiagnosticData", "ShowRecommendationsEnabled")) {
            [void](Set-RegistryValue -Path $edge -Name $name -Value 0 -Type "DWORD" -SkipBackup $true)
        }
        [void](Set-RegistryValue -Path $edge -Name "GenAILocalFoundationalModelSettings" -Value 1 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\EdgeUpdate" -Name "CreateDesktopShortcutDefault" -Value 0 -Type "DWORD" -SkipBackup $true)
        Write-Log "Applied Edge debloat policies" "SUCCESS"
    } catch {
        Write-Log "Error applying Edge debloat: $_" "ERROR"
        throw
    }
}


function Disable-Copilot {
    <#
    .SYNOPSIS
        Disables Windows Copilot completely.
    .DESCRIPTION
        Applies 8 registry keys and removes Copilot AppX packages.
    .OUTPUTS
        None.
    #>
    try {
        Write-Log "Disabling Copilot..." "INFO"

        # Policy keys (HKLM and HKCU) - most authoritative
        $policyCopilotLM = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot"
        Backup-RegistryKey -Path $policyCopilotLM
        Set-RegistryValue -Path $policyCopilotLM -Name "TurnOffWindowsCopilot" -Value 1 -Type "DWORD"

        $policyCopilotCU = "HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot"
        Backup-RegistryKey -Path $policyCopilotCU
        Set-RegistryValue -Path $policyCopilotCU -Name "TurnOffWindowsCopilot" -Value 1 -Type "DWORD"

        # UI visibility - hide button from taskbar
        $explorerAdvanced = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
        Backup-RegistryKey -Path $explorerAdvanced
        Set-RegistryValue -Path $explorerAdvanced -Name "ShowCopilotButton" -Value 0 -Type "DWORD"

        # Availability flags
        $shellCopilot = "HKLM:\SOFTWARE\Microsoft\Windows\Shell\Copilot"
        Backup-RegistryKey -Path $shellCopilot
        Set-RegistryValue -Path $shellCopilot -Name "IsCopilotAvailable" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $shellCopilot -Name "CopilotDisabledReason" -Value "IsEnabledForGeographicRegionFailed" -Type "String"

        $windowsCopilot = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsCopilot"
        Backup-RegistryKey -Path $windowsCopilot
        Set-RegistryValue -Path $windowsCopilot -Name "AllowCopilotRuntime" -Value 0 -Type "DWORD"

        # Block shell extension
        $blockedExtensions = "HKLM:\SOFTWARE\Microsoft\Windows\Shell Extensions\Blocked"
        Backup-RegistryKey -Path $blockedExtensions
        Set-RegistryValue -Path $blockedExtensions -Name "{CB3B0003-8088-4EDE-8769-8B354AB2FF8C}" -Value "" -Type "String"

        # BingChat eligibility
        $bingChat = "HKLM:\SOFTWARE\Microsoft\Windows\Shell\Copilot\BingChat"
        Backup-RegistryKey -Path $bingChat
        Set-RegistryValue -Path $bingChat -Name "IsUserEligible" -Value 0 -Type "DWORD"

        # Remove Copilot AppX packages
        Write-Log "Removing Copilot packages..." "INFO"
        foreach ($copilotApp in @("Microsoft.Copilot", "Microsoft.Windows.Ai.Copilot.Provider", "Microsoft.MicrosoftOfficeHub")) {
            [void](Remove-AppxEverywhere -Name $copilotApp)
        }

        Write-Log "Copilot disabled and packages removed" "SUCCESS"
    } catch {
        Write-Log "Error disabling Copilot: $_" "ERROR"
        throw
    }
}


function Disable-Notifications {
    <#
    .SYNOPSIS
        Disables Windows notification center and toast notifications.
    .DESCRIPTION
        Prevents popup distractions during gaming sessions.
        Disables both the notification center and individual toast popups.
    .PARAMETER Enable
        When true, disables notifications.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Disable notifications: skipped" "INFO"
        return
    }

    try {
        # Disable Notification Center
        $notifPath = "HKCU:\Software\Policies\Microsoft\Windows\Explorer"
        Backup-RegistryKey -Path $notifPath
        Set-RegistryValue -Path $notifPath -Name "DisableNotificationCenter" -Value 1 -Type "DWORD"

        # Disable toast notifications
        $toastPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications"
        Backup-RegistryKey -Path $toastPath
        Set-RegistryValue -Path $toastPath -Name "ToastEnabled" -Value 0 -Type "DWORD"

        # Disable lock screen notifications
        $lockPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings"
        Backup-RegistryKey -Path $lockPath
        Set-RegistryValue -Path $lockPath -Name "NOC_GLOBAL_SETTING_ALLOW_TOASTS_ABOVE_LOCK" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $lockPath -Name "NOC_GLOBAL_SETTING_ALLOW_CRITICAL_TOASTS_ABOVE_LOCK" -Value 0 -Type "DWORD"

        Write-Log "Disabled notifications (no popups during gaming)" "SUCCESS"
    } catch {
        Write-Log "Error disabling notifications: $_" "ERROR"
    }
}


function Disable-PS7Telemetry {
    <#
    .SYNOPSIS
        Disables PowerShell 7 telemetry collection.
    .DESCRIPTION
        Sets the POWERSHELL_TELEMETRY_OPTOUT environment variable.
        Only relevant if PowerShell 7 is installed.
    .PARAMETER Enable
        When true, sets the opt-out environment variable.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Disable PS7 telemetry: skipped" "INFO"
        return
    }

    try {
        # Check if PowerShell 7 is installed
        $ps7Path = "$env:ProgramFiles\PowerShell\7\pwsh.exe"
        if (-not (Test-Path $ps7Path)) {
            Write-Log "PowerShell 7 not installed - skipping telemetry opt-out" "INFO"
            return
        }

        if (Test-RockTuneDryRun) {
            Write-Log "[DRY RUN] Would set POWERSHELL_TELEMETRY_OPTOUT=1 (Machine)" "INFO"
            return
        }

        # Set environment variable to opt out of PS7 telemetry
        [Environment]::SetEnvironmentVariable("POWERSHELL_TELEMETRY_OPTOUT", "1", "Machine")
        Write-Log "Disabled PowerShell 7 telemetry (env var set)" "SUCCESS"
    } catch {
        Write-Log "Error disabling PS7 telemetry: $_" "ERROR"
    }
}


function Disable-WPBT {
    <#
    .SYNOPSIS
        Disables Windows Platform Binary Table (WPBT).
    .DESCRIPTION
        WPBT allows OEMs to inject software at boot time.
        Disabling prevents manufacturer bloatware from auto-installing.
    .PARAMETER Enable
        When true, disables WPBT execution.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Disable WPBT: skipped" "INFO"
        return
    }

    try {
        $wpbtPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager"
        Backup-RegistryKey -Path $wpbtPath
        Set-RegistryValue -Path $wpbtPath -Name "DisableWpbtExecution" -Value 1 -Type "DWORD"

        Write-Log "Disabled WPBT (blocks OEM bloatware injection at boot)" "SUCCESS"
    } catch {
        Write-Log "Error disabling WPBT: $_" "ERROR"
    }
}




function Disable-WindowsAI {
    <#
    .SYNOPSIS
        Turns off Recall, Click to Do, the AI Fabric service, and Notepad/Paint AI.
    .DESCRIPTION
        Uses the WindowsAI policy CSP values documented on MS Learn. The
        TurnOffWindowsCopilot policy in Disable-Copilot is deprecated for the new
        Copilot app, so this covers the 24H2/25H2 AI features. Undo: the journal
        deletes each value, and Enable-WindowsOptionalFeature -FeatureName Recall.
    #>
    try {
        $aiLM = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI"
        $aiCU = "HKCU:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI"
        [void](Set-RegistryValue -Path $aiLM -Name "AllowRecallEnablement" -Value 0 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path $aiLM -Name "DisableAIDataAnalysis" -Value 1 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path $aiCU -Name "DisableAIDataAnalysis" -Value 1 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path $aiLM -Name "TurnOffSavingSnapshots" -Value 1 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path $aiLM -Name "DisableClickToDo" -Value 1 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path $aiCU -Name "DisableClickToDo" -Value 1 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path $aiLM -Name "DisableSettingsAgent" -Value 1 -Type "DWORD" -SkipBackup $true)

        # AI Fabric service: manual start instead of auto (Win11Debloat approach)
        [void](Set-ServiceStartTracked -Name "WSAIFabricSvc" -StartupType Manual)

        # Notepad and Paint AI
        [void](Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\WindowsNotepad" -Name "DisableAIFeatures" -Value 1 -Type "DWORD" -SkipBackup $true)
        $paint = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Paint"
        foreach ($name in @("DisableCocreator", "DisableGenerativeFill", "DisableImageCreator", "DisableGenerativeErase", "DisableRemoveBackground")) {
            [void](Set-RegistryValue -Path $paint -Name $name -Value 1 -Type "DWORD" -SkipBackup $true)
        }

        # Recall optional feature (24H2+). Not journaled: undo with Enable-WindowsOptionalFeature.
        if (-not (Test-RockTuneDryRun)) {
            $recall = Get-WindowsOptionalFeature -Online -FeatureName "Recall" -ErrorAction SilentlyContinue
            if ($recall -and $recall.State -eq 'Enabled') {
                Disable-WindowsOptionalFeature -Online -FeatureName "Recall" -NoRestart -ErrorAction SilentlyContinue | Out-Null
                Write-Log "Recall optional feature disabled (undo: Enable-WindowsOptionalFeature -Online -FeatureName Recall)" "SUCCESS"
            }
        }

        Write-Log "Windows AI features off (Recall, Click to Do, AI Fabric, Notepad/Paint AI)" "SUCCESS"
    } catch {
        Write-Log "Error disabling Windows AI features: $_" "ERROR"
    }
}


function Disable-WindowsAds {
    <#
    .SYNOPSIS
        Removes ads and suggestion nags without the CAUTION telemetry tier.
    .DESCRIPTION
        Consumer features (promoted app installs), Microsoft 365 ads in Settings,
        Start/Settings suggestions, the "finish setting up" nag, suggestion toasts,
        Start Recommended section, Phone Link in Start, Widgets, and Bing results in
        Start search. All values are recorded in the undo journal.
    #>
    try {
        $cloud = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent"
        [void](Set-RegistryValue -Path $cloud -Name "DisableWindowsConsumerFeatures" -Value 1 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path $cloud -Name "DisableConsumerAccountStateContent" -Value 1 -Type "DWORD" -SkipBackup $true)

        $cdm = "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager"
        foreach ($name in @("SubscribedContent-310093Enabled", "SubscribedContent-338393Enabled", "SubscribedContent-353694Enabled", "SubscribedContent-353696Enabled", "SoftLandingEnabled")) {
            [void](Set-RegistryValue -Path $cdm -Name $name -Value 0 -Type "DWORD" -SkipBackup $true)
        }
        [void](Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\UserProfileEngagement" -Name "ScoobeSystemSettingEnabled" -Value 0 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SystemSettings\AccountNotifications" -Name "EnableAccountNotifications" -Value 0 -Type "DWORD" -SkipBackup $true)
        $toasts = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings"
        [void](Set-RegistryValue -Path "$toasts\Windows.SystemToast.Suggested" -Name "Enabled" -Value 0 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path "$toasts\Windows.SystemToast.BackupReminder" -Name "Enabled" -Value 0 -Type "DWORD" -SkipBackup $true)

        # Start menu Recommended section, account nags, Phone Link panel
        [void](Set-RegistryValue -Path "HKCU:\SOFTWARE\Policies\Microsoft\Windows\Explorer" -Name "HideRecommendedSection" -Value 1 -Type "DWORD" -SkipBackup $true)
        $adv = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
        [void](Set-RegistryValue -Path $adv -Name "Start_IrisRecommendations" -Value 0 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path $adv -Name "Start_AccountNotifications" -Value 0 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path $adv -Name "ShowSyncProviderNotifications" -Value 0 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Start\Companions\Microsoft.YourPhone_8wekyb3d8bbwe" -Name "IsEnabled" -Value 0 -Type "DWORD" -SkipBackup $true)

        # Widgets (whole experience, including the taskbar entry)
        [void](Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Dsh" -Name "AllowNewsAndInterests" -Value 0 -Type "DWORD" -SkipBackup $true)

        # Bing and web results out of Start search
        [void](Set-RegistryValue -Path "HKCU:\Software\Policies\Microsoft\Windows\Explorer" -Name "DisableSearchBoxSuggestions" -Value 1 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search" -Name "BingSearchEnabled" -Value 0 -Type "DWORD" -SkipBackup $true)

        Write-Log "Ads, suggestions, Widgets, Start Recommended and Bing search turned off" "SUCCESS"
    } catch {
        Write-Log "Error removing Windows ads: $_" "ERROR"
    }
}


function Disable-SurpriseReboots {
    <#
    .SYNOPSIS
        Stops Windows Update from rebooting while you are signed in.
    .DESCRIPTION
        Updates still download and install. Only the forced reboot with a signed-in
        user and the "get the latest updates as soon as they're available" opt-in change.
    #>
    try {
        [void](Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "NoAutoRebootWithLoggedOnUsers" -Value 1 -Type "DWORD" -SkipBackup $true)
        [void](Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings" -Name "IsContinuousInnovationOptedIn" -Value 0 -Type "DWORD" -SkipBackup $true)
        Write-Log "No surprise reboots while signed in (updates stay on)" "SUCCESS"
    } catch {
        Write-Log "Error setting reboot policy: $_" "ERROR"
    }
}


function Disable-AppraiserTasks {
    <#
    .SYNOPSIS
        Disables the Compatibility Appraiser telemetry tasks (known CPU and disk spikes).
    #>
    foreach ($task in @(
        "Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser",
        "Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser Exp",
        "Microsoft\Windows\Application Experience\ProgramDataUpdater"
    )) {
        [void](Set-ScheduledTaskState -TaskPath $task -State "Disabled")
    }
}


function Invoke-PrivacyOptimizations {
    <#
    .SYNOPSIS
        Applies selected privacy optimization tiers and extras.
    .DESCRIPTION
        Runs tiered privacy settings
    .PARAMETER Tier1Safe
        Applies safe privacy defaults when true.
    .PARAMETER Tier2Moderate
        Applies moderate privacy settings when true.
    .PARAMETER Tier3Aggressive
        Applies aggressive settings (breaks Xbox/Game Pass) when true.
    .PARAMETER RemoveBloatware
        Removes select built-in apps when true.
    .PARAMETER RemoveXboxApps
        Removes Xbox apps (breaks Game Pass) when true.
    .PARAMETER BackgroundAppsOff
        Disables background UWP apps when true.
    .PARAMETER EdgeDebloat
        Applies Edge policy debloat settings when true.
    .PARAMETER DisableCopilot
        Disables Windows Copilot when true.
    .PARAMETER DisableNotifications
        Disables notifications when true.
    .PARAMETER DisablePS7Telemetry
        Disables PowerShell 7 telemetry when true.
    .PARAMETER DisableWPBT
        Disables WPBT execution when true.
    .PARAMETER DisableWindowsAI
        Turns off Recall, Click to Do, AI Fabric service, Notepad/Paint AI when true.
    .PARAMETER NoAds
        Turns off ads, suggestions, Widgets, Start Recommended and Bing search when true.
    .PARAMETER NoSurpriseReboots
        Blocks Windows Update reboots while signed in when true.
    .PARAMETER DisableAppraiser
        Disables the Compatibility Appraiser tasks when true.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Tier1Safe = $true,
        [bool]$Tier2Moderate = $false,
        [bool]$Tier3Aggressive = $false,
        [bool]$RemoveBloatware = $true,
        [bool]$RemoveXboxApps = $false,
        [bool]$BackgroundAppsOff = $true,
        [bool]$EdgeDebloat = $true,
        [bool]$DisableCopilot = $true,
        [bool]$DisableNotifications = $true,
        [bool]$DisablePS7Telemetry = $true,
        [bool]$DisableWPBT = $true,
        [bool]$DisableWindowsAI = $true,
        [bool]$NoAds = $true,
        [bool]$NoSurpriseReboots = $true,
        [bool]$DisableAppraiser = $true
    )

    Write-Log "Applying privacy optimizations..." "INFO"

    try {
        if ($Tier1Safe) {
            Apply-PrivacyTier1Safe
        }

        if ($Tier2Moderate) {
            Apply-PrivacyTier2Moderate
        }

        if ($Tier3Aggressive) {
            Apply-PrivacyTier3Aggressive
        }

        if ($RemoveBloatware) {
            Remove-Bloatware
        }

        if ($RemoveXboxApps) {
            Remove-XboxApps
        }

        if ($BackgroundAppsOff) {
            Set-BackgroundAppsOff
        }

        if ($EdgeDebloat) {
            Apply-EdgeDebloat
        }

        if ($DisableCopilot) {
            Disable-Copilot
        }

        Disable-Notifications -Enable $DisableNotifications

        Disable-PS7Telemetry -Enable $DisablePS7Telemetry

        Disable-WPBT -Enable $DisableWPBT

        if ($DisableWindowsAI) {
            Disable-WindowsAI
        }

        if ($NoAds) {
            Disable-WindowsAds
        }

        if ($NoSurpriseReboots) {
            Disable-SurpriseReboots
        }

        if ($DisableAppraiser -and -not $Tier2Moderate) {
            Disable-AppraiserTasks
        }

        Write-Log "Privacy optimizations complete" "SUCCESS"
        Write-Log "SmartScreen and Windows Update remain ENABLED (security)" "INFO"

    } catch {
        Write-Log "Error applying privacy optimizations: $_" "ERROR"
        throw
    }
}


function Undo-PrivacyOptimizations {
    <#
    .SYNOPSIS
        Reverts privacy-related changes.
    .DESCRIPTION
        Re-enables services and restores backed up registry values.
    .OUTPUTS
        None.
    #>
    Write-Log "Rolling back privacy optimizations..." "INFO"

    try {
        # Exact restore of every recorded change: gaming-pc-setup.ps1 -Undo.
        # This fallback sets disabled services back to their Windows defaults.
        $serviceDefaults = @{ "DiagTrack" = "Automatic"; "dmwappushservice" = "Manual"; "SysMain" = "Automatic"; "XblAuthManager" = "Manual"; "XblGameSave" = "Manual"; "XboxGipSvc" = "Manual"; "XboxNetApiSvc" = "Manual" }
        $services = @($serviceDefaults.Keys)
        foreach ($serviceName in $services) {
            try {
                $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
                if ($service) {
                    if ($service.StartType -ne 'Disabled') { continue }
                    Set-Service -Name $serviceName -StartupType $serviceDefaults[$serviceName] -ErrorAction Stop
                    Start-Service -Name $serviceName -ErrorAction SilentlyContinue
                    Write-Log "Re-enabled service: $serviceName" "SUCCESS"
                }
            } catch {
                Write-Log "Error re-enabling service $serviceName : $_" "ERROR"
            }
        }

        $paths = @(
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo",
            "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo",
            "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System",
            "HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config",
            "HKCU:\Software\Microsoft\Siuf\Rules",
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager",
            "HKCU:\Software\Microsoft\Clipboard",
            "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection",
            "HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting",
            "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config",
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications",
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search",
            "HKLM:\SOFTWARE\Policies\Microsoft\Edge",
            "HKCU:\SOFTWARE\Microsoft\Windows\Shell\CopilotAI",
            "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot"
        )

        foreach ($path in $paths) {
            if (Restore-RegistryKey -Path $path) {
                Write-Log "Restored registry: $path" "SUCCESS"
            }
        }

        Write-Log "Privacy optimization rollback complete" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}


Export-ModuleMember -Function @(
    'Apply-PrivacyTier1Safe',
    'Apply-PrivacyTier2Moderate',
    'Apply-PrivacyTier3Aggressive',
    'Remove-Bloatware',
    'Remove-XboxApps',
    'Set-BackgroundAppsOff',
    'Apply-EdgeDebloat',
    'Disable-Copilot',
    'Disable-Notifications',
    'Disable-PS7Telemetry',
    'Disable-WPBT',
    'Disable-WindowsAI',
    'Disable-WindowsAds',
    'Disable-SurpriseReboots',
    'Disable-AppraiserTasks',
    'Remove-AppxEverywhere',
    'Test-PrivacyOptimizations',
    'Invoke-PrivacyOptimizations',
    'Undo-PrivacyOptimizations'
)
