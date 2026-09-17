import { DOCUMENT, Service, inject } from '@angular/core';
import { ToneName, playTone } from './tone-synth';

/** What to play when a sound's file is missing or can't be decoded. */
export type SoundFallback =
  | { readonly kind: 'speech'; readonly text: string; readonly locale: string }
  | { readonly kind: 'tone'; readonly tone: ToneName };

export interface PlayableSound {
  readonly url: string;
  readonly fallback: SoundFallback;
}

/**
 * Plays short sounds with low latency through the Web Audio API.
 *
 * Mobile browsers only allow audio after a user gesture, so {@link unlock} must be called from a
 * tap handler before anything is played.
 */
@Service()
export class SoundPlayer {
  private readonly window = inject(DOCUMENT).defaultView;

  private context: AudioContext | undefined;
  /** Decoded files by URL; `null` marks a URL without a usable file, so its fallback is used. */
  private readonly buffers = new Map<string, AudioBuffer | null>();
  private readonly loading = new Map<string, Promise<void>>();

  unlock(): void {
    if (!this.window) {
      return;
    }
    if (!this.context && 'AudioContext' in this.window) {
      this.context = new this.window.AudioContext();
    }
    if (this.context?.state === 'suspended') {
      void this.context.resume();
    }
    if ('speechSynthesis' in this.window) {
      // iOS only starts speech from a gesture; an empty utterance unlocks it for later callouts.
      this.window.speechSynthesis.speak(new this.window.SpeechSynthesisUtterance(''));
    }
  }

  /** Loads the given sounds' files so they play without delay. Never rejects. */
  async preload(sounds: readonly PlayableSound[]): Promise<void> {
    const context = this.context;
    if (context) {
      await Promise.all(sounds.map((sound) => this.load(context, sound.url)));
    }
  }

  play(sound: PlayableSound): void {
    const buffer = this.buffers.get(sound.url);
    if (buffer && this.context) {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.context.destination);
      source.start();
    } else {
      this.playFallback(sound.fallback);
    }
  }

  private load(context: AudioContext, url: string): Promise<void> {
    if (this.buffers.has(url)) {
      return Promise.resolve();
    }
    let pending = this.loading.get(url);
    if (!pending) {
      pending = fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Sound file not found: ${url}`);
          }
          return response.arrayBuffer();
        })
        // Also rejects when a dev server answers a missing file with the HTML app shell.
        .then((data) => context.decodeAudioData(data))
        .then(
          (buffer) => void this.buffers.set(url, buffer),
          () => void this.buffers.set(url, null),
        )
        .finally(() => this.loading.delete(url));
      this.loading.set(url, pending);
    }
    return pending;
  }

  private playFallback(fallback: SoundFallback): void {
    if (fallback.kind === 'tone') {
      if (this.context) {
        playTone(this.context, fallback.tone);
      }
      return;
    }
    if (!this.window || !('speechSynthesis' in this.window)) {
      return;
    }
    const speech = this.window.speechSynthesis;
    const utterance = new this.window.SpeechSynthesisUtterance(fallback.text);
    utterance.lang = fallback.locale;
    utterance.rate = 1.1;
    // Some Android browsers ignore `lang` unless a matching voice is set explicitly.
    const language = fallback.locale.split('-')[0];
    const voice = speech.getVoices().find((v) => v.lang.toLowerCase().startsWith(language));
    if (voice) {
      utterance.voice = voice;
    }
    speech.speak(utterance);
  }
}
