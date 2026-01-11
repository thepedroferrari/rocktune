/**
 * Final Fantasy Victory Fanfare
 * Classic victory music: "Ta-ta-ta-tan tan Ta-ta-TANNNN"
 */

import { playNoteSequence } from "./audio-engine";

// Note frequencies (Hz)
const NOTES = {
  C5: 523.25,
  "G#4": 415.3,
  "A#4": 466.16,
} as const;

/**
 * Play the FF victory fanfare
 */
export function playVictoryFanfare(): void {
  const notes = [
    { frequency: NOTES.C5, duration: 0.15 }, // Ta
    { frequency: NOTES.C5, duration: 0.15 }, // ta
    { frequency: NOTES.C5, duration: 0.15 }, // ta
    { frequency: NOTES.C5, duration: 0.4 }, // tan
    { frequency: NOTES["G#4"], duration: 0.4 }, // tan
    { frequency: NOTES["A#4"], duration: 0.15 }, // Ta
    { frequency: NOTES.C5, duration: 0.15 }, // ta
    { frequency: NOTES["A#4"], duration: 0.15 }, // ta
    { frequency: NOTES.C5, duration: 0.8 }, // TANNNN
  ];

  playNoteSequence(notes, "square", 0.3);
}
