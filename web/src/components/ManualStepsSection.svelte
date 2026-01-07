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
  let expandedItems = $state<Set<string>>(new Set());

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

  function handleCheckbox(sectionId: string, itemId: string, event: Event) {
    event.stopPropagation();
    toggleItem(sectionId, itemId);
  }

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
    return item.id;
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

  function toggleItemExpanded(itemKey: string) {
    const next = new Set(expandedItems);
    if (next.has(itemKey)) {
      next.delete(itemKey);
    } else {
      next.add(itemKey);
    }
    expandedItems = next;
  }

  function handlePrint() {
    window.print();
  }

  const impactOrder: Record<ImpactLevel, number> = { high: 0, medium: 1, low: 2 };
  const difficultyOrder: Record<DifficultyLevel, number> = { quick: 0, moderate: 1, advanced: 2 };

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

  function getSortedItems(sectionId: string, items: readonly AnyItem[]): AnyItem[] {
    const filtered = items.filter((item) => matchesFilter(sectionId, item));

    if (sortBy === "category") {
      return [...filtered];
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === "impact") {
        return impactOrder[getImpact(a)] - impactOrder[getImpact(b)];
      }
      if (sortBy === "difficulty") {
        return difficultyOrder[getDifficulty(a)] - difficultyOrder[getDifficulty(b)];
      }
      return 0;
    });
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
        {#each filteredGroups as group (group.id)}
          {@const groupProgress = getGroupProgress(group.sections)}
          <button
            type="button"
            class="guide__toc-item"
            class:active={activeGroupId === group.id}
            onclick={() => scrollToGroup(group.id)}
          >
            <svg
              class="guide__toc-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d={getGroupIcon(group.id)} />
            </svg>
            <span class="guide__toc-label">{group.title}</span>
            <span class="guide__toc-progress" class:complete={groupProgress.percent === 100}>
              {groupProgress.completed}/{groupProgress.total}
            </span>
          </button>
        {/each}
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
            placeholder="Search settings..."
            bind:value={searchQuery}
            class="guide__search-input"
          />
        </div>
        <div class="guide__filters">
          <select bind:value={sortBy} class="guide__select">
            <option value="category">Sort: Category</option>
            <option value="impact">Sort: Impact</option>
            <option value="difficulty">Sort: Difficulty</option>
          </select>
          <select bind:value={filterBy} class="guide__select">
            <option value="all">Show: All</option>
            <option value="incomplete">Show: Incomplete</option>
            <option value="quick-wins">Show: Quick Wins</option>
            <option value="high-impact">Show: High Impact</option>
          </select>
        </div>
      </div>

      <!-- Content groups -->
      <div class="guide__groups">
        {#each filteredGroups as group (group.id)}
          {@const groupProgress = getGroupProgress(group.sections)}
          <div
            id="guide-{group.id}"
            class="guide__group"
          >
            <div class="guide__group-header">
              <svg
                class="guide__group-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
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
              {@const items = getSortedItems(section.id, section.items as readonly AnyItem[])}
              {#if items.length > 0}
                <div class="guide__section">
                  {#if group.sections.length > 1}
                    <h4 class="guide__section-title">{section.title}</h4>
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
                      {@const itemKey = `${section.id}:${itemId}`}
                      {@const isExpanded = expandedItems.has(itemKey)}
                      {@const impact = getImpact(item)}
                      {@const difficulty = getDifficulty(item)}
                      {@const safety = getSafety(item)}
                      {@const title = getItemTitle(item)}
                      {@const value = getItemValue(item)}
                      {@const why = getItemWhy(item)}
                      {@const isComplex = isTroubleshootingItem(item) || isGameLaunchItem(item)}

                      <div
                        class="guide__card"
                        class:completed={itemDone}
                        class:expanded={isExpanded}
                        class:complex={isComplex}
                      >
                        <div class="guide__card-header">
                          <label class="guide__card-check">
                            <input
                              type="checkbox"
                              checked={itemDone}
                              onchange={(e) => handleCheckbox(section.id, itemId, e)}
                            />
                            <span class="guide__checkbox"></span>
                          </label>
                          <button
                            type="button"
                            class="guide__card-content"
                            onclick={() => toggleItemExpanded(itemKey)}
                          >
                            <span class="guide__card-title">{title}</span>
                            {#if value && !isComplex}
                              <span class="guide__card-value">{value}</span>
                            {/if}
                          </button>
                          <div class="guide__card-badges">
                            <span class="guide__badge guide__badge--{impact}" title="Impact: {impact}">
                              {impact === "high" ? "↑↑" : impact === "medium" ? "↑" : "−"}
                            </span>
                            <span class="guide__badge guide__badge--{difficulty}" title="Difficulty: {difficulty}">
                              {difficulty === "quick" ? "⚡" : difficulty === "moderate" ? "⏱" : "🔧"}
                            </span>
                            {#if safety !== "safe"}
                              <span class="guide__badge guide__badge--{safety}" title="Safety: {safety}">
                                {safety === "moderate" ? "⚠" : "⚡"}
                              </span>
                            {/if}
                          </div>
                        </div>

                        {#if isExpanded || isComplex}
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
                            {:else if isPreflightCheck(item)}
                              <div class="guide__preflight">
                                <p class="guide__how"><strong>How:</strong> {item.how}</p>
                                <p class="guide__fail"><strong>If not:</strong> {item.fail}</p>
                              </div>
                            {:else}
                              <p class="guide__why">{why}</p>
                            {/if}
                          </div>
                        {/if}
                      </div>
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
      </div>
    </div>
  </div>
</section>
