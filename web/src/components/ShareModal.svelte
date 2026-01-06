<script lang="ts">
  /**
   * ShareModal - Modal for sharing build configurations
   *
   * Provides:
   * - Build preview card
   * - Social share buttons (Twitter, Reddit, LinkedIn, Web Share)
   * - Shareable URL with one-click copy
   * - Platform-specific text (Twitter, Reddit, Discord)
   * - PowerShell one-liner for direct execution
   */

  import { app } from "$lib/state.svelte";
  import {
    getFullShareURLWithMeta,
    getOneLinerWithMeta,
    getBuildSummary,
    getShareHighlights,
    getSocialShareURLs,
    generateTwitterText,
    generateRedditText,
    generateDiscordText,
    type BuildToEncode,
    type EncodeResult,
    type OneLinerResult,
  } from "$lib/share";
  import { PRESET_META } from "$lib/presets";
  import { copyToClipboard } from "$lib/checksum";
  import { showToast } from "$lib/toast.svelte";
  import Modal from "./ui/Modal.svelte";

  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open, onclose }: Props = $props();

  let urlCopied = $state(false);
  let oneLinerCopied = $state(false);
  let benchmarkCopied = $state(false);
  let platformCopied = $state(false);
  let activeTab = $state<"url" | "oneliner" | "social">("url");
  let activePlatform = $state<"twitter" | "reddit" | "discord">("discord");

  const BENCHMARK_COMMAND =
    "irm https://rocktune.pedroferrari.com/benchmark.ps1 | iex";

  let currentBuild = $derived<BuildToEncode>({
    cpu: app.hardware.cpu,
    gpu: app.hardware.gpu,
    dnsProvider: app.dnsProvider,
    peripherals: Array.from(app.peripherals),
    monitorSoftware: Array.from(app.monitorSoftware),
    optimizations: Array.from(app.optimizations),
    packages: Array.from(app.selected),
    preset: app.activePreset ?? undefined,
  });

  let shareResult = $derived<EncodeResult>(
    getFullShareURLWithMeta(currentBuild),
  );
  let shareURL = $derived(shareResult.url);
  let buildSummary = $derived(getBuildSummary(currentBuild));
  let socialURLs = $derived(getSocialShareURLs(currentBuild));

  let oneLinerResult = $derived<OneLinerResult>(
    getOneLinerWithMeta(currentBuild),
  );
  let oneLinerCommand = $derived(oneLinerResult.command);

  // Platform-specific text
  let twitterText = $derived(generateTwitterText(currentBuild));
  let redditText = $derived(generateRedditText(currentBuild));
  let discordText = $derived(generateDiscordText(currentBuild));

  let currentPlatformText = $derived(
    activePlatform === "twitter"
      ? twitterText
      : activePlatform === "reddit"
        ? redditText
        : discordText,
  );

  let presetMeta = $derived(app.activePreset ? PRESET_META[app.activePreset] : null);
  let shareHighlights = $derived(getShareHighlights(currentBuild));
  let shareCardSvgUrl = $state<string | null>(null);
  let shareCardPngUrl = $state<string | null>(null);
  let shareCardLoading = $state(false);
  let shareCardError = $state<string | null>(null);
  let shareCardAutoTriggered = $state(false);

  // Check if Web Share API is available
  let canWebShare = $state(false);
  $effect(() => {
    canWebShare = typeof navigator !== "undefined" && !!navigator.share;
  });

  $effect(() => {
    if (!urlCopied) return;
    const timer = setTimeout(() => (urlCopied = false), 2000);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    if (!oneLinerCopied) return;
    const timer = setTimeout(() => (oneLinerCopied = false), 2000);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    if (!benchmarkCopied) return;
    const timer = setTimeout(() => (benchmarkCopied = false), 2000);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    if (!platformCopied) return;
    const timer = setTimeout(() => (platformCopied = false), 2000);
    return () => clearTimeout(timer);
  });

  async function handleCopyBenchmark() {
    const success = await copyToClipboard(BENCHMARK_COMMAND);
    if (success) {
      benchmarkCopied = true;
      showToast("Benchmark command copied!", "success");
    }
  }

  async function handleCopyURL() {
    const success = await copyToClipboard(shareURL);
    if (success) {
      urlCopied = true;
      showToast("Link copied to clipboard!", "success");
    }
  }

  async function handleCopyOneLiner() {
    const success = await copyToClipboard(oneLinerCommand);
    if (success) {
      oneLinerCopied = true;
      showToast("One-liner command copied!", "success");
    }
  }

  async function handleCopyPlatformText() {
    const success = await copyToClipboard(currentPlatformText);
    if (success) {
      platformCopied = true;
      const platformName =
        activePlatform.charAt(0).toUpperCase() + activePlatform.slice(1);
      showToast(`${platformName} text copied!`, "success");
    }
  }

  async function handleWebShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: "My RockTune Build",
        text: `Check out my Windows gaming loadout!`,
        url: shareURL,
      });
      showToast("Shared successfully!", "success");
    } catch (err) {
      // User cancelled or share failed - ignore
    }
  }

  type ShareCardTheme = {
    accent: string;
    accentSoft: string;
    badgeBg: string;
    badgeText: string;
    bgTop: string;
    bgBottom: string;
    border: string;
  };

  const SHARE_CARD_THEMES: Record<string, ShareCardTheme> = {
    legendary: {
      accent: "#ffb24a",
      accentSoft: "rgba(255, 178, 74, 0.25)",
      badgeBg: "#ffb24a",
      badgeText: "#1b1206",
      bgTop: "#120704",
      bgBottom: "#0b0c14",
      border: "rgba(255, 178, 74, 0.5)",
    },
    epic: {
      accent: "#b678ff",
      accentSoft: "rgba(182, 120, 255, 0.24)",
      badgeBg: "#b678ff",
      badgeText: "#140824",
      bgTop: "#090612",
      bgBottom: "#090c16",
      border: "rgba(182, 120, 255, 0.5)",
    },
    rare: {
      accent: "#5dd1ff",
      accentSoft: "rgba(93, 209, 255, 0.22)",
      badgeBg: "#5dd1ff",
      badgeText: "#061826",
      bgTop: "#06101c",
      bgBottom: "#091019",
      border: "rgba(93, 209, 255, 0.45)",
    },
    uncommon: {
      accent: "#5cf2b0",
      accentSoft: "rgba(92, 242, 176, 0.2)",
      badgeBg: "#5cf2b0",
      badgeText: "#062115",
      bgTop: "#04120c",
      bgBottom: "#081318",
      border: "rgba(92, 242, 176, 0.42)",
    },
    common: {
      accent: "#a8a8a8",
      accentSoft: "rgba(168, 168, 168, 0.2)",
      badgeBg: "#2b2b2b",
      badgeText: "#e6e6e6",
      bgTop: "#0b0b0f",
      bgBottom: "#0c0c14",
      border: "rgba(255, 255, 255, 0.16)",
    },
  };

  function getShareCardTheme(): ShareCardTheme {
    if (presetMeta?.rarity && SHARE_CARD_THEMES[presetMeta.rarity]) {
      return SHARE_CARD_THEMES[presetMeta.rarity];
    }
    return SHARE_CARD_THEMES.common;
  }

  function trimText(value: string, max: number): string {
    if (value.length <= max) return value;
    return `${value.slice(0, Math.max(0, max - 3))}...`;
  }

  function escapeSvgText(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function shortenUrl(value: string): string {
    const normalized = value.replace(/^https?:\/\//, "");
    return trimText(normalized, 42);
  }

  function buildShareCardSvg(): string {
    const width = 1200;
    const height = 630;
    const theme = getShareCardTheme();
    const personaLabel = escapeSvgText(buildSummary.preset ?? "Custom Build");
    const badgeLabel = escapeSvgText(presetMeta?.label ?? "Custom Build");
    const subtitle = escapeSvgText(presetMeta?.subtitle ?? "Personalized loadout");
    const highlights = shareHighlights.slice(0, 3);
    const displayUrl = escapeSvgText(shortenUrl(shareURL));
    const statsLine = escapeSvgText(
      `${buildSummary.optimizationCount} optimizations · ${buildSummary.packageCount} apps`,
    );
    const hardwareLine = escapeSvgText(`${buildSummary.cpu} + ${buildSummary.gpu}`);
    const badgeX = width - 330;
    const badgeY = 90;
    const badgeW = 236;
    const badgeH = 52;
    const badgeNotch = 18;

    const highlightLines = highlights.map((highlight, index) => {
      const y = 392 + index * 32;
      return `
  <circle cx="98" cy="${y - 6}" r="4" fill="${theme.accent}" />
  <text x="112" y="${y}" fill="#d7dbe6" font-size="22">${escapeSvgText(highlight)}</text>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="share-bg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${theme.bgTop}" />
      <stop offset="100%" stop-color="${theme.bgBottom}" />
    </linearGradient>
    <linearGradient id="share-panel" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.18" />
      <stop offset="55%" stop-color="${theme.accent}" stop-opacity="0.04" />
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0.28" />
    </linearGradient>
    <linearGradient id="share-accent" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.15" />
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0.45" />
    </linearGradient>
    <radialGradient id="share-glow" cx="0.12" cy="0.1" r="0.6">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.6" />
      <stop offset="60%" stop-color="${theme.accent}" stop-opacity="0.12" />
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0" />
    </radialGradient>
    <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.06)" stroke-width="1" />
    </pattern>
    <pattern id="scanlines" width="5" height="5" patternUnits="userSpaceOnUse">
      <rect width="5" height="1" fill="rgba(255, 255, 255, 0.08)" />
    </pattern>
    <pattern id="diagonals" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
      <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(255, 255, 255, 0.08)" stroke-width="2" />
    </pattern>
    <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="14" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" rx="32" fill="url(#share-bg)" />
  <rect width="${width}" height="${height}" rx="32" fill="url(#share-glow)" />
  <rect width="${width}" height="${height}" rx="32" fill="url(#grid)" opacity="0.35" />
  <rect width="${width}" height="${height}" rx="32" fill="url(#scanlines)" opacity="0.16" />

  <rect x="26" y="26" width="${width - 52}" height="${height - 52}" rx="28" fill="none" stroke="${theme.border}" stroke-width="2" />
  <rect x="58" y="58" width="${width - 116}" height="150" rx="22" fill="url(#share-panel)" />
  <polygon points="70,70 1008,70 1140,160 1140,208 70,208" fill="rgba(8, 8, 16, 0.5)" />
  <rect x="${width - 232}" y="58" width="174" height="150" fill="url(#diagonals)" opacity="0.5" />

  <text x="84" y="116" fill="#f3f4f8" font-family="JetBrains Mono, monospace" font-size="30" letter-spacing="3">ROCKTUNE</text>
  <text x="84" y="154" fill="${theme.accent}" font-family="JetBrains Mono, monospace" font-size="22">${subtitle}</text>
  <text x="84" y="190" fill="#c8cedc" font-family="JetBrains Mono, monospace" font-size="16" letter-spacing="2">CS2-READY LOADOUT</text>
  <path d="M 84 210 H 360" stroke="${theme.accent}" stroke-width="3" stroke-linecap="round" fill="none" />

  <path d="M ${badgeX + badgeNotch} ${badgeY} H ${badgeX + badgeW} L ${badgeX + badgeW + badgeNotch} ${badgeY + badgeH / 2} L ${badgeX + badgeW} ${badgeY + badgeH} H ${badgeX + badgeNotch} L ${badgeX} ${badgeY + badgeH / 2} Z" fill="${theme.badgeBg}" filter="url(#soft-glow)" />
  <text x="${badgeX + badgeW / 2 + badgeNotch / 2}" y="${badgeY + 34}" fill="${theme.badgeText}" font-family="JetBrains Mono, monospace" font-size="16" text-anchor="middle" letter-spacing="1">${badgeLabel}</text>

  <text x="84" y="272" fill="#f3f4f8" font-family="JetBrains Mono, monospace" font-size="40">${personaLabel}</text>
  <text x="84" y="314" fill="#b9bfcd" font-family="JetBrains Mono, monospace" font-size="24">${hardwareLine}</text>
  <text x="84" y="350" fill="#b9bfcd" font-family="JetBrains Mono, monospace" font-size="20">${statsLine}</text>

  <text x="84" y="382" fill="#f3f4f8" font-family="JetBrains Mono, monospace" font-size="19" letter-spacing="2">PERFORMANCE HIGHLIGHTS</text>
  ${highlightLines.join("\n")}

  <rect x="58" y="${height - 120}" width="${width - 116}" height="78" rx="18" fill="rgba(10, 12, 20, 0.72)" stroke="rgba(255, 255, 255, 0.08)" />
  <path d="M 96 ${height - 82} H 220" stroke="${theme.accent}" stroke-width="2" stroke-linecap="round" fill="none" />
  <text x="84" y="${height - 70}" fill="#cbd1dd" font-family="JetBrains Mono, monospace" font-size="18" letter-spacing="1">SHARE LINK</text>
  <text x="240" y="${height - 70}" fill="${theme.accent}" font-family="JetBrains Mono, monospace" font-size="20">${displayUrl}</text>
  <path d="M ${width - 160} ${height - 96} L ${width - 110} ${height - 96} L ${width - 80} ${height - 66}" stroke="${theme.accent}" stroke-width="2" fill="none" />
</svg>`;
  }

  async function svgToPng(svg: string, width: number, height: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      let settled = false;
      const timeout = globalThis.setTimeout(() => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(svgUrl);
        reject(new Error("Image render timeout"));
      }, 6000);

      const img = new Image();
      img.onload = () => {
        if (settled) return;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          settled = true;
          globalThis.clearTimeout(timeout);
          URL.revokeObjectURL(svgUrl);
          reject(new Error("Canvas unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (settled) return;
            settled = true;
            globalThis.clearTimeout(timeout);
            URL.revokeObjectURL(svgUrl);
            if (!blob) {
              try {
                resolve(canvas.toDataURL("image/png"));
              } catch (err) {
                reject(new Error("PNG export failed"));
              }
              return;
            }
            const pngUrl = URL.createObjectURL(blob);
            resolve(pngUrl);
          },
          "image/png",
          0.95,
        );
      };
      img.onerror = () => {
        if (settled) return;
        settled = true;
        globalThis.clearTimeout(timeout);
        URL.revokeObjectURL(svgUrl);
        reject(new Error("Failed to render image"));
      };
      img.src = svgUrl;
    });
  }

  async function handleGenerateShareCard() {
    if (shareCardLoading) return;
    shareCardLoading = true;
    shareCardError = null;
    const svg = buildShareCardSvg();
    shareCardSvgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    if (shareCardPngUrl) {
      URL.revokeObjectURL(shareCardPngUrl);
      shareCardPngUrl = null;
    }
    try {
      const pngPromise = svgToPng(svg, 1200, 630);
      const timeoutPromise = new Promise<string>((_, reject) => {
        const timeoutId = globalThis.setTimeout(() => {
          reject(new Error("PNG generation timeout"));
        }, 7000);
        pngPromise.finally(() => globalThis.clearTimeout(timeoutId));
      });
      shareCardPngUrl = await Promise.race([pngPromise, timeoutPromise]);
    } catch (err) {
      shareCardError = "Unable to generate share image. Please try again.";
    } finally {
      shareCardLoading = false;
    }
  }

  $effect(() => {
    void currentBuild;
    shareCardSvgUrl = null;
    if (shareCardPngUrl) {
      URL.revokeObjectURL(shareCardPngUrl);
      shareCardPngUrl = null;
    }
    shareCardAutoTriggered = false;
  });

  $effect(() => {
    if (activeTab !== "social") return;
    if (!shareCardSvgUrl) {
      const svg = buildShareCardSvg();
      shareCardSvgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
    if (!shareCardAutoTriggered && !shareCardPngUrl && !shareCardLoading) {
      shareCardAutoTriggered = true;
      void handleGenerateShareCard();
    }
  });
</script>

<Modal {open} {onclose} size="lg" class="share-modal">
  {#snippet header()}
    <h2 class="modal-title share-modal__title">
      <svg
        class="share-modal__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      Share Your Build
    </h2>
  {/snippet}

  <!-- Build Preview Card -->
  <div class="build-preview">
    <div class="build-preview__hardware">
      <div class="build-preview__chip">
        <svg
          class="build-preview__chip-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <path d="M15 2v2M15 20v2M2 15h2M20 15h2M9 2v2M9 20v2M2 9h2M20 9h2" />
        </svg>
        {buildSummary.cpu}
      </div>
      <div class="build-preview__chip">
        <svg
          class="build-preview__chip-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 10h4M6 14h8" />
        </svg>
        {buildSummary.gpu}
      </div>
      {#if buildSummary.preset}
        <div class="build-preview__chip build-preview__chip--preset">
          {buildSummary.preset}
        </div>
      {/if}
    </div>
    <div class="build-preview__stats">
      <span class="build-preview__stat">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
          />
        </svg>
        {buildSummary.optimizationCount} tweaks
      </span>
      <span class="build-preview__stat">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
          />
        </svg>
        {buildSummary.packageCount} apps
      </span>
    </div>
  </div>

  <div class="share-modal__panel">
    <div class="share-modal__tabs" role="tablist" aria-label="Share options">
      <button
        type="button"
        role="tab"
        id="share-tab-url"
        class="share-tab"
        class:active={activeTab === "url"}
        aria-selected={activeTab === "url"}
        aria-controls="share-panel-url"
        onclick={() => (activeTab = "url")}
      >
        <svg
          class="share-tab__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
          />
          <path
            d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
          />
        </svg>
        Share Link
      </button>
      <button
        type="button"
        role="tab"
        id="share-tab-oneliner"
        class="share-tab"
        class:active={activeTab === "oneliner"}
        aria-selected={activeTab === "oneliner"}
        aria-controls="share-panel-oneliner"
        onclick={() => (activeTab = "oneliner")}
      >
        <svg
          class="share-tab__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
        One-Liner
      </button>
      <button
        type="button"
        role="tab"
        id="share-tab-social"
        class="share-tab"
        class:active={activeTab === "social"}
        aria-selected={activeTab === "social"}
        aria-controls="share-panel-social"
        onclick={() => (activeTab = "social")}
      >
        <svg
          class="share-tab__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
          />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        Social
      </button>
    </div>

    <div class="share-modal__content">
      {#if activeTab === "url"}
        <div
          class="share-panel"
          role="tabpanel"
          id="share-panel-url"
          aria-labelledby="share-tab-url"
        >
          <div class="share-panel__section">
            <div class="share-panel__section-header">
              <h3 class="share-panel__section-title">Shareable link</h3>
              <p class="share-panel__desc">
                Copy this link to share your exact build configuration with
                anyone.
              </p>
            </div>
            <div class="share-url-box">
              <input
                type="text"
                name="share-url"
                class="share-url-input"
                value={shareURL}
                readonly
                autocomplete="off"
                aria-label="Shareable build URL"
                onclick={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                class="share-url-copy"
                class:copied={urlCopied}
                onclick={handleCopyURL}
              >
                {#if urlCopied}
                  <svg
                    class="icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Copied!
                {:else}
                  <svg
                    class="icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path
                      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                    />
                  </svg>
                  Copy Link
                {/if}
              </button>
            </div>

            {#if shareResult.blockedCount > 0}
              <div class="share-panel__security-notice">
                <svg
                  class="security-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span>
                  {shareResult.blockedCount} dangerous optimization{shareResult.blockedCount >
                  1
                    ? "s"
                    : ""} excluded for security. Recipients must enable LUDICROUS
                  mode themselves.
                </span>
              </div>
            {/if}
            {#if shareResult.urlTooLong}
              <p class="share-panel__warning">
                <svg
                  class="warning-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                  />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                URL is {shareResult.urlLength} chars — some services may truncate
                long URLs.
              </p>
            {/if}
          </div>

          <div class="share-panel__section share-panel__section--tight">
            <div class="share-panel__section-header">
              <h3 class="share-panel__section-title">Quick share</h3>
              <p class="share-panel__desc">
                Post directly to your favorite platform in one click.
              </p>
            </div>
            <div class="social-buttons">
              <a
                href={socialURLs.twitter}
                target="_blank"
                rel="noopener noreferrer"
                class="social-btn social-btn--twitter"
                aria-label="Share on Twitter"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                  />
                </svg>
                <span>Twitter</span>
              </a>
              <a
                href={socialURLs.reddit}
                target="_blank"
                rel="noopener noreferrer"
                class="social-btn social-btn--reddit"
                aria-label="Share on Reddit"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"
                  />
                </svg>
                <span>Reddit</span>
              </a>
              <a
                href={socialURLs.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                class="social-btn social-btn--linkedin"
                aria-label="Share on LinkedIn"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                  />
                </svg>
                <span>LinkedIn</span>
              </a>
              {#if canWebShare}
                <button
                  type="button"
                  class="social-btn social-btn--share"
                  onclick={handleWebShare}
                  aria-label="Share via system share"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  <span>More</span>
                </button>
              {/if}
            </div>
          </div>
        </div>
      {:else if activeTab === "oneliner"}
        <div
          class="share-panel"
          role="tabpanel"
          id="share-panel-oneliner"
          aria-labelledby="share-tab-oneliner"
        >
          <div class="share-panel__section">
            <div class="share-panel__section-header">
              <h3 class="share-panel__section-title">Quick benchmark</h3>
              <p class="share-panel__desc">
                Test your system's baseline performance — no configuration
                needed.
              </p>
            </div>
            <div class="benchmark-box">
              <code class="benchmark-code">{BENCHMARK_COMMAND}</code>
              <button
                type="button"
                class="benchmark-copy"
                class:copied={benchmarkCopied}
                onclick={handleCopyBenchmark}
              >
                {#if benchmarkCopied}
                  <svg
                    class="icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Copied!
                {:else}
                  <svg
                    class="icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path
                      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                    />
                  </svg>
                  Copy
                {/if}
              </button>
            </div>
          </div>

          <div class="section-divider">
            <span>or apply your build</span>
          </div>

          <div class="share-panel__section">
            <div class="share-panel__section-header">
              <h3 class="share-panel__section-title">Apply your build</h3>
              <p class="share-panel__desc">
                Run directly in PowerShell (Admin) on a fresh Windows install —
                no browser needed.
              </p>
            </div>
            <div class="share-oneliner-instructions">
              <div class="instruction-step">
                <span class="step-number">1</span>
                <span
                  >Press <kbd>Win</kbd> + <kbd>X</kbd> →
                  <strong>Terminal (Admin)</strong></span
                >
              </div>
              <div class="instruction-step">
                <span class="step-number">2</span>
                <span>Paste the entire command and press <kbd>Enter</kbd></span>
              </div>
              <div class="instruction-step">
                <span class="step-number">3</span>
                <span
                  >Review each item: <kbd>Y</kbd>=Yes <kbd>N</kbd>=No
                  <kbd>A</kbd>=All <kbd>Q</kbd>=Quit</span
                >
              </div>
              <div class="instruction-note instruction-note--safe">
                Interactive mode — you approve each change before it runs.
              </div>
            </div>
            <div class="share-oneliner-box">
              <pre class="share-oneliner-code">{oneLinerCommand}</pre>
              <button
                type="button"
                class="share-oneliner-copy"
                class:copied={oneLinerCopied}
                onclick={handleCopyOneLiner}
              >
                {#if oneLinerCopied}
                  <svg
                    class="icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Copied!
                {:else}
                  <svg
                    class="icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path
                      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                    />
                  </svg>
                  Copy Command
                {/if}
              </button>
            </div>
            {#if oneLinerResult.blockedCount > 0}
              <div class="share-panel__security-notice">
                <svg
                  class="security-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span>
                  {oneLinerResult.blockedCount} dangerous optimization{oneLinerResult.blockedCount >
                  1
                    ? "s"
                    : ""} excluded for security.
                </span>
              </div>
            {/if}
            {#if oneLinerResult.urlTooLong}
              <p class="share-panel__warning">
                <svg
                  class="warning-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                  />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                URL is {oneLinerResult.urlLength} chars — reduce selections if command
                fails.
              </p>
            {:else}
              <p class="share-panel__hint">
                Paste in Admin PowerShell to apply your loadout instantly.
              </p>
            {/if}
          </div>
        </div>
      {:else}
        <div
          class="share-panel"
          role="tabpanel"
          id="share-panel-social"
          aria-labelledby="share-tab-social"
        >
          <div class="share-panel__section">
            <div class="share-panel__section-header">
              <h3 class="share-panel__section-title">Platform format</h3>
              <p class="share-panel__desc">
                Copy platform-optimized text for sharing your build.
              </p>
            </div>

            <div class="platform-selector">
              <button
                type="button"
                class="platform-btn"
                class:active={activePlatform === "discord"}
                onclick={() => (activePlatform = "discord")}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
                  />
                </svg>
                Discord
              </button>
              <button
                type="button"
                class="platform-btn"
                class:active={activePlatform === "reddit"}
                onclick={() => (activePlatform = "reddit")}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"
                  />
                </svg>
                Reddit
              </button>
              <button
                type="button"
                class="platform-btn"
                class:active={activePlatform === "twitter"}
                onclick={() => (activePlatform = "twitter")}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                  />
                </svg>
                Twitter
              </button>
            </div>
          </div>

          <div class="share-panel__section share-panel__section--tight">
            <div class="share-panel__section-header">
              <h3 class="share-panel__section-title">Post copy</h3>
            </div>

            <div class="platform-text-box">
              <pre class="platform-text-preview">{currentPlatformText}</pre>
              <button
                type="button"
                class="platform-text-copy"
                class:copied={platformCopied}
                onclick={handleCopyPlatformText}
              >
                {#if platformCopied}
                  <svg
                    class="icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Copied!
                {:else}
                  <svg
                    class="icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path
                      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                    />
                  </svg>
                  Copy Text
                {/if}
              </button>
            </div>

            <p class="share-panel__hint">
              {#if activePlatform === "twitter"}
                Optimized for Twitter's 280 character limit with hashtags.
              {:else if activePlatform === "reddit"}
                Markdown formatted table — perfect for r/pcgaming or
                r/WindowsOptimization.
              {:else}
                Embed-friendly format with quote blocks for Discord servers.
              {/if}
            </p>
          </div>
          <div class="share-panel__section">
            <div class="share-panel__section-header">
              <h3 class="share-panel__section-title">Share image</h3>
              <p class="share-panel__desc">
                Generate a share card with your persona badge and color profile.
              </p>
            </div>
            <div class="share-card-preview">
              {#if shareCardSvgUrl}
                <img
                  src={shareCardSvgUrl}
                  alt="RockTune share card"
                  class="share-card-preview__image"
                />
              {:else}
                <div class="share-card-preview__placeholder">
                  No image generated yet.
                </div>
              {/if}
            </div>
            <div class="share-card-actions">
              <button
                type="button"
                class="share-card-btn share-card-btn--primary"
                onclick={handleGenerateShareCard}
                disabled={shareCardLoading}
              >
                {shareCardLoading ? "Generating..." : "Generate image"}
              </button>
              <a
                class="share-card-btn share-card-btn--secondary"
                href={shareCardPngUrl ?? "#"}
                download="rocktune-loadout.png"
                aria-disabled={!shareCardPngUrl}
                onclick={(event) => {
                  if (!shareCardPngUrl) event.preventDefault();
                }}
              >
                Download PNG
              </a>
            </div>
            {#if shareCardError}
              <p class="share-card-error">{shareCardError}</p>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>

  {#snippet footer()}
    <p class="share-modal__stats">
      {app.optimizations.size} optimizations · {app.selected.size} packages
    </p>
  {/snippet}
</Modal>

<style>
  :global(.share-modal) {
    --share-surface: oklch(0.12 0.02 250);
    --share-surface-raised: oklch(0.15 0.02 250);
    --share-surface-subtle: oklch(0.08 0.02 250);
    --share-border: oklch(0.22 0.02 250);
    --share-border-soft: oklch(0.25 0.03 250);
    --share-border-strong: oklch(0.3 0.05 250);
    --share-accent: oklch(0.7 0.15 250);
    --share-accent-soft: oklch(0.7 0.15 250 / 0.12);
    --share-accent-border: oklch(0.7 0.15 250 / 0.35);
    --share-ink: oklch(0.1 0.02 250);

    --_width: 520px;
    --_bg: var(--share-surface);
    --_border: var(--share-border-strong);
    --_clip: none;
    border-radius: var(--radius-lg);
    box-shadow: 0 20px 40px oklch(0 0 0 / 0.5);
    color: var(--text-primary);
  }

  .share-modal__title {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    text-transform: none;
    letter-spacing: normal;
    font-weight: 600;
  }

  .share-modal__icon {
    width: 24px;
    height: 24px;
    color: var(--share-accent);
  }

  .share-modal__panel {
    margin-top: var(--space-md);
    border: 1px solid var(--share-border);
    border-radius: var(--radius-md);
    background: var(--share-surface);
    overflow: hidden;
  }

  .share-modal__tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    background: var(--share-surface-raised);
    border-bottom: 1px solid var(--share-border);
  }

  .share-tab {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    background: transparent;
    border: 0;
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      color 0.15s,
      background-color 0.15s;
  }

  .share-tab + .share-tab {
    border-left: 1px solid var(--share-border);
  }

  .share-tab::after {
    content: "";
    position: absolute;
    inset-inline: 18%;
    bottom: 0;
    height: 2px;
    background: transparent;
    opacity: 0;
    transition:
      background-color 0.15s,
      opacity 0.15s;
  }

  .share-tab:hover {
    color: var(--text-primary);
    background: color-mix(in oklch, var(--share-accent) 10%, transparent);
  }

  .share-tab.active {
    color: var(--share-accent);
    background: var(--share-accent-soft);
  }

  .share-tab.active::after {
    background: var(--share-accent);
    opacity: 1;
  }

  .share-tab__icon {
    width: 16px;
    height: 16px;
    opacity: 0.75;
    transition: opacity 0.15s;
  }

  .share-tab:hover .share-tab__icon,
  .share-tab.active .share-tab__icon {
    opacity: 1;
  }

  .share-modal__content {
    padding: var(--space-lg);
    background: var(--share-surface);
  }

  .share-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .share-panel__section {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .share-panel__section--tight {
    gap: var(--space-xs);
  }

  .share-panel__section-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  .share-panel__section-title {
    margin: 0;
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .share-panel__desc {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .share-url-box,
  .benchmark-box {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .share-url-input,
  .benchmark-code,
  .share-oneliner-code,
  .platform-text-preview {
    background: var(--share-surface-subtle);
    border: 1px solid var(--share-border-soft);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
  }

  .share-url-input {
    flex: 1;
    padding: var(--space-sm) var(--space-md);
    font-size: var(--text-sm);
    color: var(--text-primary);
    cursor: text;
  }

  .share-url-input:focus {
    outline: none;
    border-color: var(--share-accent);
  }

  .share-url-copy,
  .benchmark-copy,
  .share-oneliner-copy,
  .platform-text-copy,
  .share-card-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 0.15s,
      border-color 0.15s,
      color 0.15s;
    white-space: nowrap;
  }

  .share-url-copy {
    background: var(--share-accent);
    border: none;
    color: var(--share-ink);
  }

  .share-url-copy:hover {
    background: color-mix(in oklch, var(--share-accent) 85%, white 15%);
  }

  .share-url-copy.copied {
    background: var(--safe);
    color: var(--share-ink);
  }

  .share-url-copy .icon {
    width: 16px;
    height: 16px;
  }

  .share-panel__hint {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-muted);
  }

  .share-panel__warning {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin: 0;
    padding: var(--space-xs) var(--space-sm);
    background: var(--caution-bg);
    border: 1px solid color-mix(in oklch, var(--caution) 40%, transparent);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: var(--caution);
  }

  .share-panel__warning .warning-icon {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
  }

  .share-panel__security-notice {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    margin: 0;
    padding: var(--space-sm) var(--space-md);
    background: var(--safe-bg);
    border: 1px solid var(--safe-30);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: var(--safe);
    line-height: 1.4;
  }

  .share-panel__security-notice .security-icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    margin-top: 1px;
  }

  .benchmark-code {
    flex: 1;
    padding: var(--space-sm) var(--space-md);
    font-size: var(--text-xs);
    color: var(--text-secondary);
    white-space: nowrap;
    overflow-x: auto;
  }

  .benchmark-copy {
    background: var(--share-surface-raised);
    border: 1px solid var(--share-border-soft);
    color: var(--text-secondary);
  }

  .benchmark-copy:hover {
    background: color-mix(
      in oklch,
      var(--share-surface-raised) 75%,
      var(--share-accent) 25%
    );
    color: var(--text-primary);
    border-color: var(--share-accent-border);
  }

  .benchmark-copy.copied {
    background: var(--safe);
    border-color: var(--safe);
    color: var(--share-ink);
  }

  .benchmark-copy .icon {
    width: 16px;
    height: 16px;
  }

  .section-divider {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin: 0;
    color: var(--text-muted);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .section-divider::before,
  .section-divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--share-border);
  }

  .share-oneliner-instructions {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    background: var(--share-surface-raised);
    border-radius: var(--radius-sm);
  }

  .instruction-step {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: var(--safe-10);
    border-radius: 50%;
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--safe);
  }

  .instruction-step kbd {
    display: inline-block;
    padding: 2px 6px;
    background: var(--share-surface-raised);
    border: 1px solid var(--share-border);
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--text-primary);
  }

  .instruction-note {
    margin-top: var(--space-xs);
    padding-left: calc(20px + var(--space-sm));
    font-size: var(--text-xs);
    color: var(--text-muted);
    font-style: italic;
  }

  .instruction-note--safe {
    color: var(--safe);
    font-style: normal;
    font-weight: 500;
  }

  .share-oneliner-box {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .share-oneliner-code {
    padding: var(--space-md);
    margin: 0;
    font-size: var(--text-xs);
    color: var(--safe);
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 120px;
    overflow-y: auto;
  }

  .share-oneliner-copy {
    border: none;
    background: var(--safe);
    color: var(--share-ink);
  }

  .share-oneliner-copy:hover {
    background: color-mix(in oklch, var(--safe) 85%, white 15%);
  }

  .share-oneliner-copy.copied {
    background: var(--safe);
  }

  .share-oneliner-copy .icon {
    width: 16px;
    height: 16px;
  }

  :global(.share-modal .modal-footer) {
    justify-content: center;
  }

  .share-modal__stats {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-muted);
  }

  /* Build Preview Card */
  .build-preview {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-md) var(--space-lg);
    background: var(--share-surface-subtle);
    border-bottom: 1px solid var(--share-border);
  }

  .build-preview__hardware {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  .build-preview__chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    padding: var(--space-2xs) var(--space-sm);
    background: var(--share-surface-raised);
    border: 1px solid var(--share-border-soft);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--text-secondary);
  }

  .build-preview__chip--preset {
    background: var(--share-accent-soft);
    border-color: var(--share-accent-border);
    color: var(--share-accent);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .build-preview__chip-icon {
    width: 14px;
    height: 14px;
    opacity: 0.7;
  }

  .build-preview__stats {
    display: flex;
    gap: var(--space-md);
  }

  .build-preview__stat {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    font-size: var(--text-xs);
    color: var(--text-muted);
  }

  .build-preview__stat svg {
    width: 14px;
    height: 14px;
    opacity: 0.6;
  }

  /* Social Share Buttons */
  .social-buttons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-xs);
  }

  .social-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    background: var(--share-surface-raised);
    border: 1px solid var(--share-border-soft);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    cursor: pointer;
    transition:
      background-color 0.15s,
      border-color 0.15s,
      color 0.15s;
  }

  .social-btn:hover {
    background: color-mix(
      in oklch,
      var(--share-surface-raised) 75%,
      var(--share-accent) 25%
    );
    border-color: var(--share-border-strong);
    color: var(--text-primary);
  }

  .social-btn svg {
    width: 18px;
    height: 18px;
  }

  .social-btn--twitter:hover {
    background: oklch(0.2 0.02 0);
    border-color: oklch(0.35 0.02 0);
    color: oklch(0.95 0 0);
  }

  .social-btn--reddit:hover {
    background: oklch(0.35 0.15 30 / 0.2);
    border-color: oklch(0.6 0.2 30);
    color: oklch(0.7 0.18 30);
  }

  .social-btn--linkedin:hover {
    background: oklch(0.45 0.12 240 / 0.2);
    border-color: oklch(0.55 0.15 240);
    color: oklch(0.65 0.12 240);
  }

  .social-btn--share:hover {
    background: var(--safe-10);
    border-color: var(--safe);
    color: var(--safe);
  }

  /* Platform Selector */
  .platform-selector {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1px;
    padding: 1px;
    background: var(--share-border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .platform-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    background: var(--share-surface-raised);
    border: 0;
    font-size: var(--text-sm);
    color: var(--text-muted);
    cursor: pointer;
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .platform-btn:hover {
    background: color-mix(in oklch, var(--share-accent) 8%, transparent);
    color: var(--text-secondary);
  }

  .platform-btn.active {
    background: var(--share-accent-soft);
    color: var(--share-accent);
  }

  .platform-btn svg {
    width: 16px;
    height: 16px;
  }

  /* Platform Text Box */
  .platform-text-box {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    position: relative;
  }

  .platform-text-preview {
    padding: var(--space-md);
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-secondary);
    white-space: pre-wrap;
    max-height: 200px;
    overflow-y: auto;
  }

  .platform-text-copy {
    width: 100%;
    border: none;
    background: var(--share-accent);
    color: var(--share-ink);
  }

  .platform-text-copy:hover {
    background: color-mix(in oklch, var(--share-accent) 85%, white 15%);
  }

  .platform-text-copy.copied {
    background: var(--safe);
    color: var(--share-ink);
  }

  .platform-text-copy .icon {
    width: 16px;
    height: 16px;
  }

  .share-card-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 220px;
    padding: var(--space-sm);
    background:
      linear-gradient(135deg, rgba(8, 10, 18, 0.92), rgba(10, 12, 20, 0.6)),
      radial-gradient(circle at 20% 20%, rgba(124, 72, 200, 0.2), transparent 55%);
    border: 1px solid color-mix(in oklch, var(--share-accent) 40%, var(--share-border));
    border-radius: var(--radius-md);
    aspect-ratio: 1200 / 630;
    position: relative;
    overflow: hidden;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.04),
      0 12px 32px rgba(0, 0, 0, 0.35);
  }

  .share-card-preview::before {
    content: "";
    position: absolute;
    inset: 10px;
    border-radius: var(--radius-sm);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    pointer-events: none;
  }

  .share-card-preview::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
      linear-gradient(180deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
    background-size: 42px 42px;
    opacity: 0.15;
    pointer-events: none;
  }

  .share-card-preview__image {
    width: 100%;
    height: auto;
    border-radius: var(--radius-sm);
    display: block;
    position: relative;
    z-index: 1;
  }

  .share-card-preview__placeholder {
    font-size: var(--text-sm);
    color: var(--text-muted);
  }

  .share-card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .share-card-btn--primary {
    background: var(--share-accent);
    border: none;
    color: var(--share-ink);
  }

  .share-card-btn--primary:hover {
    background: color-mix(in oklch, var(--share-accent) 85%, white 15%);
  }

  .share-card-btn--secondary {
    background: var(--share-surface-raised);
    border: 1px solid var(--share-border-soft);
    color: var(--text-secondary);
    text-decoration: none;
  }

  .share-card-btn--secondary:hover {
    background: color-mix(in oklch, var(--share-surface-raised) 75%, var(--share-accent) 25%);
    border-color: var(--share-accent-border);
    color: var(--text-primary);
  }

  .share-card-btn[disabled],
  .share-card-btn[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .share-card-error {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--caution);
  }

  @media (max-width: 640px) {
    :global(.share-modal) {
      --_width: 100%;
      inset-block-start: auto;
      inset-block-end: 0;
      transform: translateX(-50%);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    }

    .share-url-box {
      flex-direction: column;
    }

    .social-buttons {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .platform-selector {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
