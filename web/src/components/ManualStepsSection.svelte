<script lang="ts">
  /**
   * ManualStepsSection - Redesigned with sidebar TOC, compact cards, and metadata badges
   *
   * Displays settings that cannot be scripted but are essential
   * for optimal gaming performance. Filtered by:
   * - Selected persona (Gamer, Pro Gamer, Streamer, Benchmarker)
   * - Hardware (NVIDIA vs AMD GPU)
   */

  import { app } from "$lib/state.svelte";
  import {
    getFilteredSectionGroups,
    countTotalItems,
    type SectionGroup,
    type ManualStepSection,
    type ManualStepItem,
    type SettingItem,
    type SoftwareSettingItem,
    type BrowserSettingItem,
    type RgbSettingItem,
    type PreflightCheck,
    type TroubleshootingItem,
    type GameLaunchItem,
    type StreamingTroubleshootItem,
    type DiagnosticTool,
    type VideoResource,
    type ImpactLevel,
    type DifficultyLevel,
    type SafetyLevel,
  } from "$lib/manual-steps";
  import {
    isCompleted,
    toggleItem,
    resetSection,
    resetAll,
    createItemId,
    getProgressData,
  } from "$lib/progress.svelte";
  import { tooltip, type StructuredTooltip } from "../utils/tooltips";
  import {
    generateToolConfig,
    getSectionConfigTool,
    isToolAvailable,
  } from "$lib/config-generator";
  import type { ConfigTool } from "$lib/types";
  import { downloadConfigs } from "$lib/download-utils";
  import { buildSectionId } from "$lib/section-ids";

  function getYouTubeThumbnail(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }

  function getYouTubeUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  type SortOption = "category" | "impact" | "difficulty";
  type FilterOption = "all" | "incomplete" | "quick-wins" | "high-impact";

  let activeGroupId = $state<string | null>(null);
  let sortBy = $state<SortOption>("category");
  let filterBy = $state<FilterOption>("all");
  let searchQuery = $state("");
  let downloadingSection = $state<string | null>(null);
  let sortOpen = $state(false);
  let filterOpen = $state(false);
  let showInstructions = $state(false);
  let instructionsText = $state("");

  // Impact badge tooltips
  const IMPACT_TOOLTIPS: Record<ImpactLevel, StructuredTooltip> = {
    high: {
      title: "High Impact",
      desc: "This setting significantly affects FPS, latency, or system stability.",
      pros: ["Noticeable improvement", "Worth the effort"],
      cons: ["May require more setup time"],
    },
    medium: {
      title: "Medium Impact",
      desc: "Moderate improvement to performance or quality.",
      pros: ["Good balance of effort vs reward"],
      cons: ["Effects vary by system"],
    },
    low: {
      title: "Low Impact",
      desc: "Minor optimization, nice to have but not critical.",
      pros: ["Quick to apply", "Low risk"],
      cons: ["Subtle improvements"],
    },
  };

  const DIFFICULTY_TOOLTIPS: Record<DifficultyLevel, StructuredTooltip> = {
    quick: {
      title: "Quick Win",
      desc: "Fast to complete, simple settings change.",
      pros: ["Under 1 minute", "No expertise needed"],
      cons: [],
    },
    moderate: {
      title: "Moderate Effort",
      desc: "Takes a few minutes, may require navigating menus.",
      pros: ["Straightforward process"],
      cons: ["Takes 2-5 minutes"],
    },
    advanced: {
      title: "Advanced",
      desc: "Requires technical knowledge or multiple steps.",
      pros: ["Maximum control"],
      cons: ["May need research", "10+ minutes"],
    },
  };

  const SAFETY_TOOLTIPS: Record<SafetyLevel, StructuredTooltip> = {
    safe: {
      title: "Safe",
      desc: "Fully reversible, no risk of system issues.",
      pros: ["Can undo anytime", "No side effects"],
      cons: [],
    },
    moderate: {
      title: "Use Caution",
      desc: "Generally safe but may affect other settings or features.",
      pros: ["Reversible with effort"],
      cons: ["May require reboot", "Could affect other apps"],
    },
    expert: {
      title: "Expert Only",
      desc: "Could cause instability if misconfigured. Create a restore point first.",
      pros: ["Maximum performance gains"],
      cons: ["Risk of issues", "Hard to troubleshoot"],
    },
  };

  let filteredGroups = $derived.by(() => {
    const persona = app.activePreset ?? "gamer";
    const gpu = app.hardware.gpu;
    return getFilteredSectionGroups(persona, gpu);
  });

  let totalItems = $derived.by(() => {
    const persona = app.activePreset ?? "gamer";
    const gpu = app.hardware.gpu;
    return countTotalItems(persona, gpu);
  });

  $effect(() => {
    if (filteredGroups.length > 0 && !activeGroupId) {
      activeGroupId = filteredGroups[0].id;
    }
  });

  let progressData = $derived(getProgressData());

  function isDone(sectionId: string, itemId: string): boolean {
    const _ = progressData.lastUpdated;
    return isCompleted(sectionId, itemId);
  }

  function handleResetSection(sectionId: string) {
    resetSection(sectionId);
  }

  function handleResetAll() {
    if (confirm("Reset all progress? This cannot be undone.")) {
      resetAll();
    }
  }

  async function handleDownloadConfig(sectionId: string) {
    const tool = getSectionConfigTool(buildSectionId(sectionId));
    if (!tool) return;

    const persona = app.activePreset ?? "gamer";
    const hardware = app.hardware;

    // Check if tool is available for current persona/hardware
    if (!isToolAvailable(tool, persona, hardware.gpu)) {
      return;
    }

    downloadingSection = sectionId;

    try {
      const context = {
        persona,
        hardware,
        dnsProvider: app.dnsProvider,
        timestamp: new Date().toISOString(),
      };

      const configs = generateToolConfig(tool, context);
      if (!configs || configs.length === 0) {
        throw new Error("No configs generated");
      }

      // Download the config file(s)
      await downloadConfigs(configs);

      // Show instructions in a simple alert for now (modal coming next)
      instructionsText = configs[0].instructions;
      showInstructions = true;
    } catch (error) {
      console.error("Config download failed:", error);
      alert("Failed to download config. Please try again.");
    } finally {
      downloadingSection = null;
    }
  }

  type AnyItem =
    | ManualStepItem
    | SettingItem
    | SoftwareSettingItem
    | BrowserSettingItem
    | RgbSettingItem
    | PreflightCheck
    | TroubleshootingItem
    | GameLaunchItem
    | StreamingTroubleshootItem
    | DiagnosticTool;

  function getItemId(item: AnyItem): string {
    return item.id ?? createItemId(item as unknown as Record<string, unknown>);
  }

  function getProgressForItems(sectionId: string, items: readonly AnyItem[]) {
    const total = items.length;
    const completed = items.reduce((count, item) => {
      return count + (isCompleted(sectionId, getItemId(item)) ? 1 : 0);
    }, 0);

    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  function getProgress(sectionId: string, items: readonly AnyItem[]) {
    const _ = progressData.lastUpdated;
    return getProgressForItems(sectionId, items);
  }

  function getGroupProgress(sections: readonly ManualStepSection[]) {
    const _ = progressData.lastUpdated;
    let completed = 0;
    let total = 0;

    for (const section of sections) {
      const sectionProgress = getProgressForItems(
        section.id,
        section.items as readonly AnyItem[],
      );
      completed += sectionProgress.completed;
      total += sectionProgress.total;
    }

    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  function isManualStepItem(item: AnyItem): item is ManualStepItem {
    return "step" in item && "check" in item && "why" in item;
  }

  function isSettingItem(item: AnyItem): item is SettingItem {
    return (
      "setting" in item &&
      "value" in item &&
      !("path" in item) &&
      !("browser" in item) &&
      !("software" in item)
    );
  }

  function isSoftwareSettingItem(item: AnyItem): item is SoftwareSettingItem {
    return "path" in item && "value" in item && !("browser" in item);
  }

  function isBrowserSettingItem(item: AnyItem): item is BrowserSettingItem {
    return "browser" in item && "setting" in item;
  }

  function isRgbSettingItem(item: AnyItem): item is RgbSettingItem {
    return "software" in item && "action" in item;
  }

  function isPreflightCheck(item: AnyItem): item is PreflightCheck {
    return "check" in item && "how" in item && "fail" in item;
  }

  function isTroubleshootingItem(item: AnyItem): item is TroubleshootingItem {
    return "problem" in item && "causes" in item && "quickFix" in item;
  }

  function isGameLaunchItem(item: AnyItem): item is GameLaunchItem {
    return "game" in item && "platform" in item && "notes" in item;
  }

  function isStreamingTroubleshootItem(
    item: AnyItem,
  ): item is StreamingTroubleshootItem {
    return (
      "problem" in item &&
      "solution" in item &&
      "why" in item &&
      !("causes" in item)
    );
  }

  function isDiagnosticTool(item: AnyItem): item is DiagnosticTool {
    return "tool" in item && "use" in item;
  }

  function getItemTitle(item: AnyItem): string {
    if (isManualStepItem(item)) return item.check;
    if (isSettingItem(item)) return item.setting;
    if (isSoftwareSettingItem(item)) return item.path.split(">").pop()?.trim() ?? item.path;
    if (isBrowserSettingItem(item)) return item.setting;
    if (isRgbSettingItem(item)) return item.software;
    if (isPreflightCheck(item)) return item.check;
    if (isTroubleshootingItem(item)) return item.problem;
    if (isGameLaunchItem(item)) return item.game;
    if (isStreamingTroubleshootItem(item)) return item.problem;
    if (isDiagnosticTool(item)) return item.tool;
    return (item as { id: string }).id;
  }

  function getItemValue(item: AnyItem): string | undefined {
    if (isManualStepItem(item)) return undefined;
    if (isSettingItem(item)) return item.value;
    if (isSoftwareSettingItem(item)) return item.value;
    if (isBrowserSettingItem(item)) return item.value;
    if (isRgbSettingItem(item)) return item.action;
    if (isPreflightCheck(item)) return undefined;
    if (isTroubleshootingItem(item)) return undefined;
    if (isGameLaunchItem(item)) return item.launchOptions;
    if (isStreamingTroubleshootItem(item)) return item.solution;
    if (isDiagnosticTool(item)) return undefined;
    return undefined;
  }

  function getItemWhy(item: AnyItem): string {
    if ("why" in item) return item.why;
    if (isPreflightCheck(item)) return `${item.how}\n\nIf not: ${item.fail}`;
    if (isTroubleshootingItem(item)) return item.quickFix;
    if (isGameLaunchItem(item)) return item.notes.join("\n");
    if (isDiagnosticTool(item)) return item.use;
    return "";
  }

  function getImpact(item: AnyItem): ImpactLevel {
    return (item as { impact?: ImpactLevel }).impact ?? "medium";
  }

  function getDifficulty(item: AnyItem): DifficultyLevel {
    return (item as { difficulty?: DifficultyLevel }).difficulty ?? "moderate";
  }

  function getSafety(item: AnyItem): SafetyLevel {
    return (item as { safety?: SafetyLevel }).safety ?? "safe";
  }

  let copiedId = $state<string | null>(null);

  async function copyLaunchOptions(launchOptions: string, gameId: string) {
    try {
      await navigator.clipboard.writeText(launchOptions);
      copiedId = gameId;
      setTimeout(() => {
        copiedId = null;
      }, 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = launchOptions;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      copiedId = gameId;
      setTimeout(() => {
        copiedId = null;
      }, 2000);
    }
  }

  function scrollToGroup(groupId: string) {
    activeGroupId = groupId;
    const element = document.getElementById(`guide-${groupId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handlePrint() {
    window.print();
  }

  function buildItemTooltip(item: AnyItem): StructuredTooltip {
    const title = getItemTitle(item);
    const why = getItemWhy(item);
    const impact = getImpact(item);
    const safety = getSafety(item);

    const pros: string[] = [];
    const cons: string[] = [];

    let desc = why || "Optimize your system with this setting.";

    // For items without "why" text, build meaningful description
    if (!why) {
      if (isTroubleshootingItem(item)) {
        desc = `Common issue: ${item.problem}. Quick fix: ${item.quickFix}`;
      } else if (isGameLaunchItem(item)) {
        desc = item.notes.length > 0 ? item.notes.join(" · ") : `Launch options for ${item.game}`;
      } else if (isDiagnosticTool(item)) {
        desc = item.use || `Diagnostic tool: ${item.tool}`;
      } else if (isStreamingTroubleshootItem(item)) {
        desc = `Streaming issue: ${item.problem}. Solution: ${item.solution}`;
      }
    }

    // Impact-based pros
    if (impact === "high") pros.push("High performance impact");
    else if (impact === "medium") pros.push("Moderate improvement");

    // Troubleshooting items
    if (isTroubleshootingItem(item)) {
      pros.push(`Quick fix: ${item.quickFix}`);
      item.causes.forEach(c => cons.push(c));
    }

    // Preflight checks
    if (isPreflightCheck(item)) {
      pros.push(item.how);
      cons.push(`If not: ${item.fail}`);
    }

    // Safety-based cons
    if (safety === "moderate") cons.push("Use caution when applying");
    else if (safety === "expert") cons.push("Expert setting - create restore point first");

    return {
      title,
      desc,
      pros: pros.length > 0 ? pros : ["Improves gaming experience"],
      cons: cons.length > 0 ? cons : [],
    };
  }

  const IMPACT_LABELS: Record<ImpactLevel, string> = {
    high: "High Impact",
    medium: "Medium Impact",
    low: "Low Impact",
  };

  const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
    quick: "Quick Wins",
    moderate: "Moderate Effort",
    advanced: "Advanced",
  };

  const IMPACT_ICONS: Record<ImpactLevel, string> = {
    high: "M13 10V3L4 14h7v7l9-11h-7z", // Lightning bolt
    medium: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    low: "M5 12h14M12 5v14", // Plus
  };

  const DIFFICULTY_ICONS: Record<DifficultyLevel, string> = {
    quick: "M13 10V3L4 14h7v7l9-11h-7z", // Lightning
    moderate: "M12 2v20M2 12h20", // Clock-like
    advanced: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z", // Wrench
  };

  /** Item with its original section ID for tracking */
  interface FlatItem {
    item: AnyItem;
    sectionId: string;
  }

  function matchesFilter(sectionId: string, item: AnyItem): boolean {
    const itemId = getItemId(item);
    const itemDone = isDone(sectionId, itemId);
    const impact = getImpact(item);
    const difficulty = getDifficulty(item);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const title = getItemTitle(item).toLowerCase();
      const value = getItemValue(item)?.toLowerCase() ?? "";
      const why = getItemWhy(item).toLowerCase();
      if (!title.includes(query) && !value.includes(query) && !why.includes(query)) {
        return false;
      }
    }

    switch (filterBy) {
      case "incomplete":
        return !itemDone;
      case "quick-wins":
        return difficulty === "quick" && !itemDone;
      case "high-impact":
        return impact === "high" && !itemDone;
      default:
        return true;
    }
  }

  /** Flatten all items from all groups with their section IDs */
  function flattenAllItems(): FlatItem[] {
    const result: FlatItem[] = [];
    for (const group of filteredGroups) {
      for (const section of group.sections) {
        for (const item of section.items) {
          if (matchesFilter(section.id, item as AnyItem)) {
            result.push({ item: item as AnyItem, sectionId: section.id });
          }
        }
      }
    }
    return result;
  }

  /** Group items by impact level */
  function groupByImpact(items: FlatItem[]): Array<{ id: ImpactLevel; title: string; icon: string; items: FlatItem[] }> {
    const groups: Record<ImpactLevel, FlatItem[]> = { high: [], medium: [], low: [] };
    for (const flatItem of items) {
      const impact = getImpact(flatItem.item);
      groups[impact].push(flatItem);
    }
    return (["high", "medium", "low"] as ImpactLevel[])
      .filter(level => groups[level].length > 0)
      .map(level => ({
        id: level,
        title: IMPACT_LABELS[level],
        icon: IMPACT_ICONS[level],
        items: groups[level],
      }));
  }

  /** Group items by difficulty level */
  function groupByDifficulty(items: FlatItem[]): Array<{ id: DifficultyLevel; title: string; icon: string; items: FlatItem[] }> {
    const groups: Record<DifficultyLevel, FlatItem[]> = { quick: [], moderate: [], advanced: [] };
    for (const flatItem of items) {
      const difficulty = getDifficulty(flatItem.item);
      groups[difficulty].push(flatItem);
    }
    return (["quick", "moderate", "advanced"] as DifficultyLevel[])
      .filter(level => groups[level].length > 0)
      .map(level => ({
        id: level,
        title: DIFFICULTY_LABELS[level],
        icon: DIFFICULTY_ICONS[level],
        items: groups[level],
      }));
  }

  /** Derived: groups organized by the current sort option */
  let displayGroups = $derived.by(() => {
    // Explicitly track filterBy and searchQuery to make this reactive
    const _filter = filterBy;
    const _search = searchQuery;

    if (sortBy === "category") {
      return null; // Use original filteredGroups
    }
    const allItems = flattenAllItems();
    if (sortBy === "impact") {
      return groupByImpact(allItems);
    }
    if (sortBy === "difficulty") {
      return groupByDifficulty(allItems);
    }
    return null;
  });

  // Create a reactive key that changes whenever filter/search changes
  // This will force re-evaluation of {@const} blocks in the template
  let filterKey = $derived(`${filterBy}-${searchQuery}`);

  function getFilteredItems(sectionId: string, items: readonly AnyItem[]): AnyItem[] {
    return items.filter((item) => matchesFilter(sectionId, item));
  }

  function getGroupIcon(groupId: string): string {
    switch (groupId) {
      case "windows":
        return "M3 5a2 2 0 0 1 2-2h6v8H3V5zm8-2h6a2 2 0 0 1 2 2v6h-8V3zm8 10v6a2 2 0 0 1-2 2h-6v-8h8zm-10 8H5a2 2 0 0 1-2-2v-6h8v8z";
      case "gpu":
        return "M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm2 3v6h3v-6H6zm5 0v6h3v-6h-3zm5 0v6h3v-6h-3z";
      case "bios":
        return "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0-6h18M3 9v6";
      case "software":
        return "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5";
      case "peripherals":
        return "M12 2a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4zm0 14a6 6 0 0 1-6-6V6a6 6 0 1 1 12 0v4a6 6 0 0 1-6 6zm0 2v4m-4 0h8";
      case "network":
        return "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01";
      case "preflight":
        return "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11";
      case "troubleshooting":
        return "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z";
      case "games":
        return "M6 11h4v2H6v4H4v-4H0v-2h4V7h2v4zm10-2h4v8h-2v-6h-2v6h-2V9h2zm-6 3h2v6H8v-6zm6 0h2v6h-2v-6z";
      case "streaming":
        return "M4.75 8.75a7.25 7.25 0 0 1 14.5 0M2 11.5a10.5 10.5 0 0 1 20 0M8.25 15a3.75 3.75 0 0 1 7.5 0M12 15a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0v-3a1 1 0 0 1 1-1z";
      case "diagnostics":
        return "M4.8 2.3A.3.3 0 1 0 5 2.9 2.3 2.3 0 1 1 7.3 5.2a.3.3 0 0 0-.3.3 4 4 0 0 1-4 4 .3.3 0 0 0 0 .6A4.6 4.6 0 0 0 7.6 5.5a.3.3 0 0 0-.3-.3 1.7 1.7 0 1 1-1.7-1.7.3.3 0 0 0 .3-.3 4 4 0 0 1 .6-.9zM12 8a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0v-7a4 4 0 0 0-4-4zm-2 4a2 2 0 1 1 4 0v7a2 2 0 0 1-4 0z";
      default:
        return "M12 2L2 7l10 5 10-5-10-5z";
    }
  }
</script>

<section id="guide" class="step step--guide guide">
  <header class="step-banner">
    <div class="step-banner__marker">6</div>
    <div class="step-banner__content">
      <h2 class="step-banner__title">Manual Steps Guide</h2>
      <p class="step-banner__subtitle">
        Settings that can't be scripted but make a real difference
      </p>
    </div>
    <div class="step-banner__actions">
      <span class="items-count">{totalItems} items</span>
    </div>
  </header>

  <div class="guide__layout">
    <!-- Sidebar TOC -->
    <aside class="guide__sidebar">
      <nav class="guide__toc">
        {#if displayGroups}
          <!-- Sorted by Impact/Difficulty -->
          {#each displayGroups as group (group.id)}
            <button
              type="button"
              class="guide__toc-item guide__toc-item--{group.id}"
              class:active={activeGroupId === group.id}
              onclick={() => scrollToGroup(group.id)}
            >
              <svg class="guide__toc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d={group.icon} />
              </svg>
              <span class="guide__toc-label">{group.title}</span>
              <span class="guide__toc-progress">{group.items.length}</span>
    </button>
          {/each}
        {:else}
          <!-- Category view -->
          {#each filteredGroups as group (group.id)}
            {@const groupProgress = getGroupProgress(group.sections)}
    <button
      type="button"
              class="guide__toc-item"
              class:active={activeGroupId === group.id}
              onclick={() => scrollToGroup(group.id)}
            >
              <svg class="guide__toc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d={getGroupIcon(group.id)} />
              </svg>
              <span class="guide__toc-label">{group.title}</span>
              <span class="guide__toc-progress" class:complete={groupProgress.percent === 100}>
                {groupProgress.completed}/{groupProgress.total}
              </span>
            </button>
          {/each}
        {/if}
      </nav>
      <div class="guide__sidebar-actions">
        <button type="button" class="guide__sidebar-btn" onclick={handlePrint}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9V2h12v7" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      Print
    </button>
  </div>
    </aside>

    <!-- Main content -->
    <div class="guide__main">
      <!-- Toolbar -->
      <div class="guide__toolbar">
        <div class="guide__search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            id="guide-search"
            name="guide-search"
            placeholder="Search settings..."
            bind:value={searchQuery}
            class="guide__search-input"
          />
        </div>
        <div class="guide__filters">
          <div
            class="guide__select-wrapper"
            onfocusout={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                sortOpen = false;
              }
            }}
          >
            <button
              class="guide__select"
              type="button"
              aria-label="Sort options"
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              onclick={() => sortOpen = !sortOpen}
            >
              <span class="guide__select-label">
                Sort: {sortBy === 'category' ? 'Category' : sortBy === 'impact' ? 'Impact' : 'Difficulty'}
              </span>
              <svg class="guide__select-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 4l4 4 4-4"/>
              </svg>
            </button>
            {#if sortOpen}
              <div class="guide__select-dropdown" role="listbox">
                <button
                  class="guide__select-option"
                  class:selected={sortBy === 'category'}
                  type="button"
                  role="option"
                  aria-selected={sortBy === 'category'}
                  onclick={() => { sortBy = 'category'; sortOpen = false; }}
                >
                  Sort: Category
                  {#if sortBy === 'category'}
                    <svg class="guide__select-check" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M2 6l3 3 5-6"/>
                    </svg>
                  {/if}
                </button>
                <button
                  class="guide__select-option"
                  class:selected={sortBy === 'impact'}
                  type="button"
                  role="option"
                  aria-selected={sortBy === 'impact'}
                  onclick={() => { sortBy = 'impact'; sortOpen = false; }}
                >
                  Sort: Impact
                  {#if sortBy === 'impact'}
                    <svg class="guide__select-check" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M2 6l3 3 5-6"/>
                    </svg>
                  {/if}
                </button>
                <button
                  class="guide__select-option"
                  class:selected={sortBy === 'difficulty'}
                  type="button"
                  role="option"
                  aria-selected={sortBy === 'difficulty'}
                  onclick={() => { sortBy = 'difficulty'; sortOpen = false; }}
                >
                  Sort: Difficulty
                  {#if sortBy === 'difficulty'}
                    <svg class="guide__select-check" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M2 6l3 3 5-6"/>
                    </svg>
                  {/if}
                </button>
              </div>
            {/if}
          </div>

          <!-- Custom Filter Dropdown -->
          <div
            class="guide__select-wrapper"
            onfocusout={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                filterOpen = false;
              }
            }}
          >
            <button
              class="guide__select"
              type="button"
              aria-label="Filter options"
              aria-haspopup="listbox"
              aria-expanded={filterOpen}
              onclick={() => filterOpen = !filterOpen}
            >
              <span class="guide__select-label">
                Show: {filterBy === 'all' ? 'All' : filterBy === 'incomplete' ? 'Incomplete' : filterBy === 'quick-wins' ? 'Quick Wins' : 'High Impact'}
              </span>
              <svg class="guide__select-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 4l4 4 4-4"/>
              </svg>
            </button>
            {#if filterOpen}
              <div class="guide__select-dropdown" role="listbox">
                <button
                  class="guide__select-option"
                  class:selected={filterBy === 'all'}
                  type="button"
                  role="option"
                  aria-selected={filterBy === 'all'}
                  onclick={() => { filterBy = 'all'; filterOpen = false; }}
                >
                  Show: All
                  {#if filterBy === 'all'}
                    <svg class="guide__select-check" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M2 6l3 3 5-6"/>
                    </svg>
                  {/if}
                </button>
                <button
                  class="guide__select-option"
                  class:selected={filterBy === 'incomplete'}
                  type="button"
                  role="option"
                  aria-selected={filterBy === 'incomplete'}
                  onclick={() => { filterBy = 'incomplete'; filterOpen = false; }}
                >
                  Show: Incomplete
                  {#if filterBy === 'incomplete'}
                    <svg class="guide__select-check" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M2 6l3 3 5-6"/>
                    </svg>
                  {/if}
                </button>
                <button
                  class="guide__select-option"
                  class:selected={filterBy === 'quick-wins'}
                  type="button"
                  role="option"
                  aria-selected={filterBy === 'quick-wins'}
                  onclick={() => { filterBy = 'quick-wins'; filterOpen = false; }}
                >
                  Show: Quick Wins
                  {#if filterBy === 'quick-wins'}
                    <svg class="guide__select-check" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M2 6l3 3 5-6"/>
                    </svg>
                  {/if}
                </button>
                <button
                  class="guide__select-option"
                  class:selected={filterBy === 'high-impact'}
                  type="button"
                  role="option"
                  aria-selected={filterBy === 'high-impact'}
                  onclick={() => { filterBy = 'high-impact'; filterOpen = false; }}
                >
                  Show: High Impact
                  {#if filterBy === 'high-impact'}
                    <svg class="guide__select-check" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M2 6l3 3 5-6"/>
                    </svg>
                  {/if}
                </button>
              </div>
            {/if}
          </div>
        </div>
          </div>

      <!-- Content groups -->
      <div class="guide__groups">
        {#if displayGroups}
          <!-- Sorted by Impact/Difficulty view -->
          {#each displayGroups as group (group.id)}
            <div id="guide-{group.id}" class="guide__group guide__group--{group.id}">
              <div class="guide__group-header">
                <svg class="guide__group-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d={group.icon} />
          </svg>
                <h3 class="guide__group-title">{group.title}</h3>
                <span class="guide__group-count">{group.items.length} items</span>
              </div>

              <div class="guide__cards">
                {#each group.items as flatItem (getItemId(flatItem.item))}
                  {@const item = flatItem.item}
                  {@const sectionId = flatItem.sectionId}
                  {@const itemId = getItemId(item)}
                  {@const itemDone = isDone(sectionId, itemId)}
                  {@const impact = getImpact(item)}
                  {@const safety = getSafety(item)}
                  {@const title = getItemTitle(item)}
                  {@const value = getItemValue(item)}
                  {@const isComplex = isTroubleshootingItem(item) || isGameLaunchItem(item)}
                  {@const itemTooltip = buildItemTooltip(item)}

                  {#if isComplex}
                    <div class="guide__card guide__card--complex" class:completed={itemDone}>
                      <label class="guide__card-header" use:tooltip={itemTooltip}>
                        <input
                          type="checkbox"
                          id="guide-item-{sectionId}-{itemId}"
                          name="guide-item-{sectionId}"
                          checked={itemDone}
                          onchange={() => toggleItem(sectionId, itemId)}
                          class="guide__checkbox-input"
                        />
                        <span class="guide__checkbox"></span>
                        <span class="guide__card-content">
                          <span class="guide__card-title">{title}</span>
                        </span>
                        <span class="guide__card-badges">
                          <span class="guide__badge guide__badge--{impact}" use:tooltip={IMPACT_TOOLTIPS[impact]}>
                            {impact === "high" ? "↑↑" : impact === "medium" ? "↑" : "−"}
                          </span>
                          <span class="guide__badge guide__badge--{safety}" use:tooltip={SAFETY_TOOLTIPS[safety]}>
                            {safety === "safe" ? "✓" : safety === "moderate" ? "◎" : "△"}
                          </span>
                    </span>
                      </label>
                      <div class="guide__card-details">
                        {#if isTroubleshootingItem(item)}
                          <div class="guide__troubleshoot">
                            <div class="guide__causes">
                              <strong>Possible causes:</strong>
                              <ul>
                                {#each item.causes as cause}
                                  <li>{cause}</li>
                                {/each}
                              </ul>
                            </div>
                            <div class="guide__quickfix">
                              <strong>Quick fix:</strong> {item.quickFix}
                            </div>
                          </div>
                        {:else if isGameLaunchItem(item)}
                          <div class="guide__game">
                            <span class="guide__game-platform">{item.platform}</span>
                            {#if item.launchOptions}
                              <div class="guide__launch-options">
                                <code>{item.launchOptions}</code>
                      <button
                        type="button"
                                  class="guide__copy-btn"
                                  class:copied={copiedId === item.game}
                                  onclick={() => copyLaunchOptions(item.launchOptions!, item.game)}
                                >
                                  {copiedId === item.game ? "✓" : "Copy"}
                      </button>
                              </div>
                            {/if}
                            <ul class="guide__game-notes">
                              {#each item.notes as note}
                                <li>{note}</li>
                              {/each}
                            </ul>
                          </div>
                    {/if}
                  </div>
                </div>
                  {:else}
                    <label class="guide__card" class:completed={itemDone} use:tooltip={itemTooltip}>
                      <input
                        type="checkbox"
                        id="guide-item-{sectionId}-{itemId}"
                        name="guide-item-{sectionId}"
                        checked={itemDone}
                        onchange={() => toggleItem(sectionId, itemId)}
                        class="guide__checkbox-input"
                      />
                      <span class="guide__checkbox"></span>
                      <span class="guide__card-content">
                        <span class="guide__card-title">{title}</span>
                        {#if value}
                          <span class="guide__card-value">{value}</span>
                        {/if}
                      </span>
                      <span class="guide__card-badges">
                        <span class="guide__badge guide__badge--{impact}" use:tooltip={IMPACT_TOOLTIPS[impact]}>
                          {impact === "high" ? "↑↑" : impact === "medium" ? "↑" : "−"}
                        </span>
                        <span class="guide__badge guide__badge--{safety}" use:tooltip={SAFETY_TOOLTIPS[safety]}>
                          {safety === "safe" ? "✓" : safety === "moderate" ? "◎" : "△"}
                        </span>
                      </span>
                    </label>
                  {/if}
                {/each}
              </div>
            </div>
          {/each}
        {:else}
          <!-- Category view (default) -->
          {#each filteredGroups as group (group.id)}
            {@const groupProgress = getGroupProgress(group.sections)}
            <div id="guide-{group.id}" class="guide__group">
              <div class="guide__group-header">
                <svg class="guide__group-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d={getGroupIcon(group.id)} />
                </svg>
                <h3 class="guide__group-title">{group.title}</h3>
                <div class="guide__group-meta">
                  <span class="guide__group-count">{groupProgress.completed}/{groupProgress.total}</span>
                  {#if groupProgress.completed > 0}
                  <button
                    type="button"
                      class="guide__reset-btn"
                      title="Reset all in this category"
                      onclick={() => {
                        group.sections.forEach((s) => handleResetSection(s.id));
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  </button>
                  {/if}
                </div>
              </div>

              {#each group.sections as section (section.id)}
                {@const _ = filterKey}
                {@const items = getFilteredItems(section.id, section.items as readonly AnyItem[])}
                {@const configTool = getSectionConfigTool(buildSectionId(section.id))}
                {@const persona = app.activePreset ?? "gamer"}
                {@const canDownload = configTool && isToolAvailable(configTool, persona, app.hardware.gpu)}
                {@const isDownloading = downloadingSection === section.id}
                {#if items.length > 0}
                  <div class="guide__section">
                    {#if group.sections.length > 1 || canDownload}
                      <div class="guide__section-header">
                        <h4 class="guide__section-title">{section.title}</h4>
                        {#if canDownload}
                          <button
                            type="button"
                            class="guide__download-btn"
                            class:loading={isDownloading}
                            onclick={() => handleDownloadConfig(section.id)}
                            disabled={isDownloading}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="7 10 12 15 17 10"/>
                              <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            {isDownloading ? "Downloading..." : "Download Config"}
                          </button>
                        {/if}
                      </div>
                      {#if section.description}
                        <p class="guide__section-desc">{section.description}</p>
              {/if}
              {/if}

              {#if section.location}
                      <div class="guide__section-location">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {section.location}
                      </div>
              {/if}

                    <div class="guide__cards">
                      {#each items as item (getItemId(item))}
                        {@const itemId = getItemId(item)}
                  {@const itemDone = isDone(section.id, itemId)}
                        {@const impact = getImpact(item)}
                        {@const safety = getSafety(item)}
                        {@const title = getItemTitle(item)}
                        {@const value = getItemValue(item)}
                        {@const isComplex = isTroubleshootingItem(item) || isGameLaunchItem(item)}
                        {@const itemTooltip = buildItemTooltip(item)}

                        {#if isComplex}
                          <div class="guide__card guide__card--complex" class:completed={itemDone}>
                            <label class="guide__card-header" use:tooltip={itemTooltip}>
                      <input
                        type="checkbox"
                                id="guide-item-{section.id}-{itemId}"
                                name="guide-item-{section.id}"
                        checked={itemDone}
                                onchange={() => toggleItem(section.id, itemId)}
                                class="guide__checkbox-input"
                              />
                              <span class="guide__checkbox"></span>
                              <span class="guide__card-content">
                                <span class="guide__card-title">{title}</span>
                              </span>
                              <span class="guide__card-badges">
                                <span class="guide__badge guide__badge--{impact}" use:tooltip={IMPACT_TOOLTIPS[impact]}>
                                  {impact === "high" ? "↑↑" : impact === "medium" ? "↑" : "−"}
                                </span>
                                <span class="guide__badge guide__badge--{safety}" use:tooltip={SAFETY_TOOLTIPS[safety]}>
                                  {safety === "safe" ? "✓" : safety === "moderate" ? "◎" : "△"}
                                </span>
                              </span>
                            </label>
                            <div class="guide__card-details">
                              {#if isTroubleshootingItem(item)}
                                <div class="guide__troubleshoot">
                                  <div class="guide__causes">
                            <strong>Possible causes:</strong>
                            <ul>
                              {#each item.causes as cause}
                                <li>{cause}</li>
                              {/each}
                            </ul>
                          </div>
                                  <div class="guide__quickfix">
                                    <strong>Quick fix:</strong> {item.quickFix}
                                  </div>
                                </div>
                        {:else if isGameLaunchItem(item)}
                                <div class="guide__game">
                                  <span class="guide__game-platform">{item.platform}</span>
                          {#if item.launchOptions}
                                    <div class="guide__launch-options">
                                      <code>{item.launchOptions}</code>
                              <button
                                type="button"
                                        class="guide__copy-btn"
                                class:copied={copiedId === item.game}
                                        onclick={() => copyLaunchOptions(item.launchOptions!, item.game)}
                                      >
                                        {copiedId === item.game ? "✓" : "Copy"}
                              </button>
                            </div>
                          {/if}
                                  <ul class="guide__game-notes">
                            {#each item.notes as note}
                              <li>{note}</li>
                            {/each}
                          </ul>
                          </div>
                            {/if}
                            </div>
                          </div>
                        {:else}
                          <label class="guide__card" class:completed={itemDone} use:tooltip={itemTooltip}>
                            <input
                              type="checkbox"
                              id="guide-item-{section.id}-{itemId}"
                              name="guide-item-{section.id}"
                              checked={itemDone}
                              onchange={() => toggleItem(section.id, itemId)}
                              class="guide__checkbox-input"
                            />
                            <span class="guide__checkbox"></span>
                            <span class="guide__card-content">
                              <span class="guide__card-title">{title}</span>
                              {#if value}
                                <span class="guide__card-value">{value}</span>
                              {/if}
                            </span>
                            <span class="guide__card-badges">
                              <span class="guide__badge guide__badge--{impact}" use:tooltip={IMPACT_TOOLTIPS[impact]}>
                                {impact === "high" ? "↑↑" : impact === "medium" ? "↑" : "−"}
                              </span>
                              <span class="guide__badge guide__badge--{safety}" use:tooltip={SAFETY_TOOLTIPS[safety]}>
                                {safety === "safe" ? "✓" : safety === "moderate" ? "◎" : "△"}
                              </span>
                            </span>
                          </label>
                        {/if}
                      {/each}
                      </div>

              {#if section.note}
                      <div class="guide__note">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  {section.note}
                      </div>
              {/if}
            </div>
                {/if}
          {/each}

          {#if group.videos && group.videos.length > 0}
                <div class="guide__videos">
                  <h4 class="guide__videos-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
                Learn More
                  </h4>
                  <div class="guide__videos-list">
                {#each group.videos as video (video.id)}
                  <a
                    href={getYouTubeUrl(video.videoId)}
                    target="_blank"
                    rel="noopener noreferrer"
                        class="guide__video-card"
                  >
                      <img
                        src={getYouTubeThumbnail(video.videoId)}
                        alt={video.title}
                        loading="lazy"
                          class="guide__video-thumb"
                        />
                        <div class="guide__video-info">
                          <span class="guide__video-title">{video.title}</span>
                          <span class="guide__video-creator">{video.creator}</span>
                    </div>
                  </a>
                {/each}
              </div>
            </div>
          {/if}
        </div>
    {/each}
        {/if}
      </div>
    </div>
  </div>
</section>

{#if showInstructions}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="instructions-modal" onclick={() => (showInstructions = false)} role="button" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="instructions-modal__content" onclick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="modal-title" tabindex="-1">
      <header class="instructions-modal__header">
        <h3 id="modal-title">Import Instructions</h3>
        <button type="button" class="instructions-modal__close" onclick={() => (showInstructions = false)} aria-label="Close modal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </header>
      <div class="instructions-modal__body">
        <pre>{instructionsText}</pre>
      </div>
      <footer class="instructions-modal__footer">
        <button type="button" class="instructions-modal__btn" onclick={() => (showInstructions = false)}>
          Got it!
        </button>
      </footer>
    </div>
  </div>
{/if}
