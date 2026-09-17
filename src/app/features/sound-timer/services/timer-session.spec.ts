import { TestBed } from '@angular/core/testing';
import { PlayableSound, SoundPlayer } from '../../../core/audio/sound-player';
import { ScreenWakeLock } from '../../../core/wake-lock/screen-wake-lock';
import { TimerSettings } from '../model/timer-settings';
import { TimerSession } from './timer-session';

/** One round, callouts every 2s, so every cue time is predictable. */
const SETTINGS: TimerSettings = {
  prepSeconds: 0,
  rounds: 1,
  workSeconds: 10,
  breakSeconds: 0,
  minGapSeconds: 2,
  maxGapSeconds: 2,
  soundIds: ['numbers.1'],
};

const TICK_MS = 50;

class SoundPlayerStub {
  readonly played: string[] = [];
  unlockCount = 0;

  unlock(): void {
    this.unlockCount++;
  }

  async preload(): Promise<void> {}

  play(sound: PlayableSound): void {
    this.played.push(sound.url.replace('sounds/', '').replace('.mp3', ''));
  }
}

class WakeLockStub {
  active = false;
  async request(): Promise<void> {
    this.active = true;
  }
  async release(): Promise<void> {
    this.active = false;
  }
}

describe('TimerSession', () => {
  let session: TimerSession;
  let player: SoundPlayerStub;
  let wakeLock: WakeLockStub;
  /** The session reads `performance.now()`, so the test owns the clock directly. */
  let clock: number;

  /** Runs the wall clock forward the way a foreground tab would, tick by tick. */
  function advance(seconds: number): void {
    const target = clock + seconds * 1000;
    while (clock < target) {
      clock = Math.min(clock + TICK_MS, target);
      vi.advanceTimersByTime(TICK_MS);
    }
  }

  /** Jumps the wall clock but allows only one tick, as when a throttled tab wakes up. */
  function jump(seconds: number): void {
    clock += seconds * 1000;
    vi.advanceTimersByTime(TICK_MS);
  }

  const callouts = () => player.played.filter((id) => id === 'de/numbers/1');

  beforeEach(async () => {
    clock = 0;
    vi.useFakeTimers();
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    player = new SoundPlayerStub();
    wakeLock = new WakeLockStub();
    TestBed.configureTestingModule({
      providers: [
        { provide: SoundPlayer, useValue: player },
        { provide: ScreenWakeLock, useValue: wakeLock },
      ],
    });
    session = TestBed.inject(TimerSession);
    await session.start(SETTINGS);
  });

  afterEach(() => {
    session.stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts running and rings the round-start bell immediately', () => {
    expect(session.status()).toBe('running');
    expect(player.unlockCount).toBe(1);
    expect(player.played).toEqual(['bells/round-start']);
    expect(wakeLock.active).toBe(true);
  });

  it('plays callouts on schedule and ends with the round-end bell', () => {
    advance(2);
    expect(player.played).toEqual(['bells/round-start', 'de/numbers/1']);

    advance(7);
    // Callouts at 2, 4, 6 and 8s; none within a second of the end bell.
    expect(callouts()).toHaveLength(4);

    advance(1.1);
    expect(player.played.at(-1)).toBe('bells/round-end');
    expect(session.status()).toBe('finished');
    expect(wakeLock.active).toBe(false);
  });

  it('tracks the remaining time of the current phase', () => {
    expect(session.phaseRemaining()).toBeCloseTo(10, 1);
    advance(3);
    expect(session.phaseRemaining()).toBeCloseTo(7, 1);
    expect(session.phaseProgress()).toBeCloseTo(0.3, 1);
  });

  it('freezes the clock while paused and fires nothing for the paused stretch', () => {
    advance(3);
    session.pause();
    const remaining = session.phaseRemaining();
    const playedWhilePaused = player.played.length;

    advance(60);
    expect(session.status()).toBe('paused');
    expect(session.phaseRemaining()).toBe(remaining);

    session.resume();
    expect(player.played).toHaveLength(playedWhilePaused);
    advance(1);
    expect(session.phaseRemaining()).toBeCloseTo(remaining - 1, 1);
  });

  it('skips a phase without firing the callouts inside it', () => {
    session.skipPhase();

    expect(callouts()).toHaveLength(0);
    expect(player.played.at(-1)).toBe('bells/round-end');
    expect(session.status()).toBe('finished');
  });

  it('drops cues that came due while the page was throttled in the background', () => {
    // One tick arrives 9s late: only the most recent callout may still play, not a burst of four.
    jump(9);

    expect(callouts()).toHaveLength(1);
  });

  it('clears everything on stop', () => {
    advance(3);
    session.stop();

    expect(session.status()).toBe('idle');
    expect(session.plan()).toBeUndefined();
    expect(session.lastCallout()).toBeUndefined();
    expect(wakeLock.active).toBe(false);

    const playedBefore = player.played.length;
    advance(10);
    expect(player.played).toHaveLength(playedBefore);
  });

  it('shows the latest callout for the run screen and clears it at the round end', () => {
    advance(2.1);
    expect(session.lastCallout()?.soundId).toBe('numbers.1');

    advance(8);
    expect(session.lastCallout()).toBeUndefined();
  });
});
