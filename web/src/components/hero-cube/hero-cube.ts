const heroTexts = [
  `<p>If you can <span>hold</span> your aim when the lobby is <span>howling</span> and the meter is <span>red</span>; If you can <span>breathe</span> through the dip when the city loads in and your frames <span>fall</span> like rain; If you can <span>refuse</span> the excuse and instead <span>listen</span> to the machine; If you can <span>tune</span> the fans, <span>trim</span> the bloat, <span>unlock</span> the scheduler, and <span>cool</span> what pride would overheat; If you can <span>trust</span> the process when benchmarks <span>mock</span> you, yet still <span>measure</span> true; If you can <span>walk</span> the steady path of <span>latency</span> and <span>discipline</span>, not chasing miracles, only <span>margins</span>; If you can <span>tinker</span> as you please—your rig, your rules—without becoming a <span>servant</span> to settings; If you can meet <span>victory</span> and <span>defeat</span> and greet them both as passing <span>frames</span>; If you can <span>enter</span> the final round with the same calm you had at boot, and when the moment comes your screen stays <span>smooth</span>, your input stays <span>true</span>, and your crosshair arrives a heartbeat <span>first</span>; Yours is the <span>hardware</span>, the <span>silence</span>, and the <span>win</span> earned by clarity— and you'll be the <span>player</span>, my friend.</p>`,
  `<p>I remember when your rig would <span>stutter</span> at the edge of a fight—audio <span>tearing</span>, camera <span>dragging</span>, the world a half-second late; And I remember you did not <span>rage</span>—you <span>opened</span> the case like a craftsman, and spoke to the machine in <span>numbers</span>; You <span>cleared</span> what did not belong, you <span>balanced</span> what ran too loud, you <span>cooled</span> what ran too proud; You <span>measured</span> the dips, <span>watched</span> the spikes, and <span>shaved</span> the weight from every needless task; Not for vanity— for <span>control</span>; Then the match came: late circle, last push, the old hitch waiting to <span>betray</span> you—yet the screen stayed <span>steady</span>; Your shot landed because the frame arrived; your dodge worked because the input did; And in that quiet margin between <span>lag</span> and <span>flow</span>, you found the <span>win</span>; The computer is only <span>hardware</span>, but your hands make it a <span>weapon</span>—tune it how you please, and let the frames tell the truth.</p>`,
  `<p>When frames <span>drop</span>, most players blame the fight; You chose the harder path: <span>understand</span> the machine; You <span>trim</span> the noise, <span>cool</span> the heat, <span>prioritize</span> what matters, and <span>measure</span> without ego; You do not chase magic—only <span>consistency</span>; And when the round turns cruel, you are not <span>surprised</span>; Your screen stays <span>smooth</span>, your input stays <span>true</span>, your timing stays <span>calm</span>; The win is not luck—it's the sum of small <span>optimizations</span> made with patience; This is your <span>rig</span>, your <span>will</span>, your <span>frames</span>; Tinker as you please.</p>`,
  `<p>If you can <span>optimize</span> your rig when all about you are <span>lagging</span> and <span>stuttering</span> behind; If you can <span>trust</span> your frames when benchmarks <span>doubt</span> you, but make <span>allowance</span> for their testing too; If you can <span>wait</span> and not be tired by waiting, or being <span>throttled</span>, don't give way to <span>heat</span>; If you can <span>dream</span> of builds and not make dreams your <span>master</span>; If you can <span>think</span> and not make thoughts your <span>aim</span>; If you can meet with <span>victory</span> and <span>defeat</span> and treat those two <span>impostors</span> just the same; If you can bear to hear the <span>truth</span> you've benchmarked <span>twisted</span> by fools to make a <span>trap</span> for noobs; If you can <span>forge</span> your loadout and <span>risk</span> it on one turn of ranked and <span>clutch</span>, and start again at your <span>beginnings</span> and never breathe a word about your <span>loss</span>; Yours is the <span>system</span> and everything that's in it, and which is more you'll be a <span>gamer</span>, my friend!</p>`,
]

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

let shuffledTexts: string[] = []
let currentTextIndex = 0

function insertHeroText(): void {
  const textDivs = document.querySelectorAll<HTMLDivElement>('.hero-cube-wrapper .text')
  textDivs.forEach((div) => {
    div.innerHTML = shuffledTexts[currentTextIndex]
  })
}

let heroStyleSheet: CSSStyleSheet | null = null

function updateHeroKeyframes(): void {
  const wrapper = document.querySelector<HTMLDivElement>('.hero-cube-wrapper')
  if (!wrapper) return

  // Get computed cube width from CSS custom property
  const styles = getComputedStyle(wrapper)
  const cubeWidth = parseFloat(styles.getPropertyValue('--cube-width')) || 900
  const cubeHalf = cubeWidth / 2

  // Perspective ratio: P / cubeWidth = 1/1.8 = 0.556
  const perspective = cubeWidth / 1.8

  // Back face scale at z = cubeHalf
  const backScale = perspective / (perspective + cubeHalf)
  // backScale = (W/1.8) / (W/1.8 + W/2) = (1/1.8) / (1/1.8 + 0.5)
  //           = 0.556 / (0.556 + 0.5) = 0.556 / 1.056 = 0.526

  // The original 900px cube had 850px offset = 0.944 * cubeWidth
  // That worked because the visible text width across faces totaled ~850px
  //
  // With perspective, text on the back face appears at 0.526 scale
  // So 1px of margin-left scrolls 1px of text, but it APPEARS as 0.526px on screen
  //
  // For seamless flow, the offset should equal the visible screen width
  // converted back to text coordinates: screenWidth / scale
  //
  // Back visible screen width ≈ 0.7 * viewportWidth (empirical)
  // In text coords: 0.7 * viewport / 0.526 ≈ 1.33 * viewport
  //
  // Since cube fills ~80% of viewport at max, and we want consistent behavior:
  // offset ≈ cubeWidth * 1.5 to 1.7 seems appropriate

  const faceOffset = cubeWidth * 1.72

  // Calculate starting positions
  const leftStart = cubeHalf
  const backStart = leftStart - faceOffset
  const rightStart = backStart - faceOffset

  // Calculate end positions (scroll a very long distance)
  const scrollDistance = 60000
  const leftEnd = leftStart - scrollDistance
  const backEnd = backStart - scrollDistance
  const rightEnd = rightStart - scrollDistance

  // Create or update dynamic stylesheet
  if (!heroStyleSheet) {
    const style = document.createElement('style')
    style.id = 'hero-dynamic-keyframes'
    document.head.appendChild(style)
    heroStyleSheet = style.sheet
  }

  // Clear existing rules
  if (heroStyleSheet) {
    while (heroStyleSheet.cssRules.length > 0) {
      heroStyleSheet.deleteRule(0)
    }

    // Insert new keyframes
    heroStyleSheet.insertRule(`
      @keyframes hero-left {
        0% { margin-left: ${leftStart}px; }
        100% { margin-left: ${leftEnd}px; }
      }
    `)
    heroStyleSheet.insertRule(`
      @keyframes hero-back {
        0% { margin-left: ${backStart}px; }
        100% { margin-left: ${backEnd}px; }
      }
    `)
    heroStyleSheet.insertRule(`
      @keyframes hero-right {
        0% { margin-left: ${rightStart}px; }
        100% { margin-left: ${rightEnd}px; }
      }
    `)
  }
}

function adjustHeroCubeSize(): void {
  const container = document.querySelector<HTMLDivElement>('.hero-cube-container')
  const reflect = document.querySelector<HTMLDivElement>('.hero-cube-reflect')
  if (!container) return

  const viewportWidth = window.innerWidth
  const baseWidth = 1100
  if (viewportWidth >= baseWidth) {
    container.style.transform = ''
    if (reflect) reflect.style.transform = 'translateX(-50%)'
  }

  // Update keyframes when viewport changes
  updateHeroKeyframes()
}

function rotateHeroText(): void {
  currentTextIndex = (currentTextIndex + 1) % shuffledTexts.length
  const textDivs = document.querySelectorAll<HTMLDivElement>('.hero-cube-wrapper .text')
  textDivs.forEach((div) => {
    div.classList.add('text-hidden')
    setTimeout(() => {
      div.innerHTML = shuffledTexts[currentTextIndex]
      div.classList.remove('text-hidden')
    }, 400)
  })
}

export function setupHeroCube(): void {
  shuffledTexts = shuffle(heroTexts)
  insertHeroText()
  updateHeroKeyframes()
  adjustHeroCubeSize()
  window.addEventListener('resize', adjustHeroCubeSize)
  setInterval(rotateHeroText, 20000)
}
