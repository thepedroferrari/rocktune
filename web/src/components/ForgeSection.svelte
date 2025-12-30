<script lang="ts">
  /**
   * ForgeSection - Script generation section (Step 5)
   *
   * Final section with:
   * - Status indicator
   * - Preflight checks
   * - Profile save/load
   * - Preview and Download actions
   * - SHA256 checksum for verification
   */

  import { app, openPreviewModal, generateCurrentScript } from '$lib/state.svelte'
  import { SCRIPT_FILENAME } from '$lib/types'
  import { generateSHA256, copyToClipboard } from '$lib/checksum'
  import { downloadText } from '../utils/download'
  import Summary from './Summary.svelte'
  import PreflightChecks from './PreflightChecks.svelte'
  import ProfileActions from './ProfileActions.svelte'

  let checksum = $state('')
  let copied = $state(false)
  let showVerifyTip = $state(false)

  // Reactively compute checksum when script changes
  $effect(() => {
    const script = app.script.edited ?? generateCurrentScript()
    if (script.trim()) {
      generateSHA256(script).then((hash) => {
        checksum = hash
      })
    } else {
      checksum = ''
    }
  })

  function handlePreview() {
    openPreviewModal()
  }

  function handleDownload() {
    // Use edited script if available, otherwise use reactively generated script
    const script = app.script.edited ?? generateCurrentScript()
    if (!script.trim()) return
    downloadText(script, SCRIPT_FILENAME)
  }

  async function handleCopyHash() {
    if (!checksum) return
    const success = await copyToClipboard(checksum)
    if (success) {
      copied = true
      setTimeout(() => (copied = false), 2000)
    }
  }

  function toggleVerifyTip() {
    showVerifyTip = !showVerifyTip
  }
</script>

<section id="generate" class="step step--forge">
  <div class="header-row">
    <div class="header-left">
      <h2><span class="step-num">5</span> Forge Script</h2>
      <p class="step-desc">Your personalized loadout is ready</p>
    </div>
    <div class="status">
      <span class="indicator"></span>
      <span class="text">SYSTEM READY</span>
    </div>
  </div>

  <Summary />

  <PreflightChecks />
  <ProfileActions />

  <!-- Trust Zone -->
  <div class="trust-zone">
    <div class="trust-badges">
      <span class="trust-badge">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        100% Open Source
      </span>
      <span class="trust-badge">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Preview Before Download
      </span>
      <span class="trust-badge">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        No Hidden Downloads
      </span>
    </div>

    <div class="actions">
      <button
        type="button"
        class="btn-preview"
        title="Preview the generated PowerShell script"
        onclick={handlePreview}
      >
        <svg
          class="icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Preview Script
      </button>

      <button
        type="button"
        class="btn-forge"
        title="Download the generated PowerShell script"
        onclick={handleDownload}
      >
        <span class="text">
          <svg
            class="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </span>
        <span class="glitch"></span>
        <span class="scanlines"></span>
      </button>
    </div>

    {#if checksum}
      <div class="verification-section">
        <div class="checksum-row">
          <div class="checksum-label">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>SHA256</span>
          </div>
          <code class="checksum-hash" title={checksum}>{checksum.slice(0, 16)}...{checksum.slice(-8)}</code>
          <button
            type="button"
            class="checksum-copy"
            title={copied ? 'Copied!' : 'Copy full hash'}
            onclick={handleCopyHash}
          >
            {#if copied}
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span class="copy-label">Copied</span>
            {:else}
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span class="copy-label">Copy</span>
            {/if}
          </button>
          <button
            type="button"
            class="checksum-help"
            title="How to verify"
            onclick={toggleVerifyTip}
          >
            How to verify?
          </button>
        </div>

        <div class="build-info">
          <span>Build:</span>
          <a
            href="https://github.com/thepedroferrari/windows-gaming-settings/tree/{__BUILD_COMMIT__}"
            target="_blank"
            rel="noopener"
            class="commit-link"
          >
            {__BUILD_COMMIT__}
          </a>
          <span class="build-date">({__BUILD_DATE__})</span>
        </div>

        {#if showVerifyTip}
          <div class="verify-tip">
            <p><strong>Verify your download:</strong></p>
            <code>Get-FileHash .\rocktune-setup.ps1 | Select-Object Hash</code>
            <p class="verify-note">Compare the output with the hash above. If they match, the file is authentic.</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</section>

<!-- Styles are in forge.styles.css (layer: components) -->
