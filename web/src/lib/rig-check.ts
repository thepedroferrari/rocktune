/**
 * Rig Check: a read-only PowerShell script (root `rig-check.ps1`, served as
 * `/check.ps1`) that scores a gaming PC's setup out of 100 and lists the top
 * 3 fixes. The checks below mirror the script, in the order it runs them.
 */

export interface RigCheckItem {
  readonly id: string
  readonly label: string
  readonly why: string
}

export interface RigCheckData {
  readonly command: string
  readonly checks: readonly RigCheckItem[]
}

export const RIG_CHECK = {
  command: 'irm https://rocktune.pedroferrari.com/check.ps1 | iex',
  checks: [
    {
      id: 'ram-speed',
      label: 'RAM speed (XMP / EXPO)',
      why: 'With the memory profile off, RAM runs at the slow default speed instead of the speed on the box.',
    },
    {
      id: 'ram-channels',
      label: 'RAM channels',
      why: 'One stick, or two sticks in the same channel, halves memory bandwidth and lowers 1% lows.',
    },
    {
      id: 'ram-amount',
      label: 'RAM amount',
      why: 'Many new games stutter with less than 16 GB.',
    },
    {
      id: 'refresh-rate',
      label: 'Monitor refresh rate',
      why: 'Windows often leaves a 144 Hz or 240 Hz monitor at 60 Hz.',
    },
    {
      id: 'display-cable',
      label: 'Display cable on GPU',
      why: 'A cable in the motherboard port runs the game through the CPU graphics, not the graphics card.',
    },
    {
      id: 'gpu-driver',
      label: 'GPU driver age',
      why: 'Drivers older than 6 months miss fixes and speed-ups for new games.',
    },
    {
      id: 'rebar',
      label: 'Resizable BAR',
      why: 'Lets the CPU reach all of the video memory at once; it is off unless the BIOS turns it on.',
    },
    {
      id: 'pcie-link',
      label: 'GPU PCIe link',
      why: 'A card in the wrong slot can run at x4 or x8 instead of x16.',
    },
    {
      id: 'hags',
      label: 'GPU scheduling (HAGS)',
      why: 'Needed for DLSS Frame Generation.',
    },
    {
      id: 'windowed-optimizations',
      label: 'Windowed game optimizations',
      why: 'Lowers latency in borderless games and allows variable refresh rate.',
    },
    {
      id: 'windows-drive',
      label: 'Windows drive',
      why: 'Windows on a hard disk slows every load and update.',
    },
    {
      id: 'games-on-ssd',
      label: 'Games on SSD',
      why: 'Finds Steam, Epic and Xbox libraries on hard disks, which cause long loads and texture pop-in.',
    },
    {
      id: 'free-space',
      label: 'Free space on game drives',
      why: 'Updates and shader caches fail or slow down on a full drive.',
    },
    {
      id: 'trim',
      label: 'SSD TRIM',
      why: 'Without TRIM, SSD writes slow down over time.',
    },
    {
      id: 'windows-version',
      label: 'Windows version',
      why: 'Old Windows versions get no updates or scheduler fixes.',
    },
    {
      id: 'pending-reboot',
      label: 'Pending reboot',
      why: 'A half-installed update can run in the background while you play.',
    },
    {
      id: 'game-mode',
      label: 'Game Mode',
      why: 'Keeps Windows Update and background apps from taking CPU time from the game.',
    },
    {
      id: 'vbs',
      label: 'Memory integrity (VBS)',
      why: 'Costs a few percent of CPU performance in games.',
    },
    {
      id: 'laptop-charger',
      label: 'Laptop charger',
      why: 'On battery, laptops cut GPU and CPU power.',
    },
    {
      id: 'power-plan',
      label: 'Power plan',
      why: 'Power saver and Best power efficiency hold the CPU at low clocks.',
    },
    {
      id: 'cpu-max-speed',
      label: 'CPU max speed',
      why: 'Finds a power plan cap below 100% and CPUs held back by heat or power limits.',
    },
    {
      id: 'x3d',
      label: 'AMD X3D V-Cache driver',
      why: 'On 7900X3D, 7950X3D, 9900X3D and 9950X3D, games need the AMD chipset driver and Game Bar to run on the cores with the extra cache.',
    },
    {
      id: 'xbox-services',
      label: 'Xbox services',
      why: 'Disabled Xbox services break sign-in, cloud saves and controllers.',
    },
    {
      id: 'gaming-services',
      label: 'Gaming Services',
      why: 'Game Pass games do not install or start without Gaming Services.',
    },
  ],
} as const satisfies RigCheckData
