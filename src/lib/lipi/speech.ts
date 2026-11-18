// Read-aloud with the device's own voices only (Web Speech API): free, no AI credits.
// When the device has no voice for a language (iPhones have no Kannada voice) we say so clearly.
//
// iOS notes: speech and audio only unlock inside a user tap, so the first speak() and the audio
// unlock run synchronously from the button handler, before any await. Voices load
// asynchronously (voiceschanged, which iOS does not always fire, so we also poll briefly).
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { BCP47, isAppleMobile, pickVoice, type SpeechLang } from "./voices";

export type { SpeechLang } from "./voices";

function synth(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

function isIOS() {
  return typeof navigator !== "undefined" && isAppleMobile(navigator.userAgent, navigator.maxTouchPoints ?? 0);
}

export function findVoice(lang: SpeechLang): SpeechSynthesisVoice | null {
  const s = synth();
  return s ? pickVoice(s.getVoices(), lang) : null;
}

/** Resolves with the voice list, waiting up to `timeout` ms when it has not loaded yet. */
function waitForVoices(timeout = 1500): Promise<SpeechSynthesisVoice[]> {
  const s = synth();
  if (!s) return Promise.resolve([]);
  const now = s.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const finish = () => {
      clearInterval(poll);
      clearTimeout(timer);
      s.removeEventListener("voiceschanged", check);
      resolve(s.getVoices());
    };
    const check = () => {
      if (s.getVoices().length) finish();
    };
    const poll = setInterval(check, 200);
    const timer = setTimeout(finish, timeout);
    s.addEventListener("voiceschanged", check);
  });
}

/** Re-renders when the device's voice list loads (it arrives asynchronously in most browsers). */
export function useVoicesReady() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const s = synth();
    if (!s) return;
    const onChange = () => setTick((t) => t + 1);
    s.addEventListener("voiceschanged", onChange);
    onChange();
    return () => s.removeEventListener("voiceschanged", onChange);
  }, []);
}

class DeviceSpeechError extends Error {}
class NoVoiceError extends Error {}

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/** iOS 17+: "playback" lets speech play even when the ring/silent switch is on silent. */
function setAudioSession(type: "playback" | "auto") {
  try {
    const nav = navigator as AudioSessionNavigator;
    if (nav.audioSession) nav.audioSession.type = type;
  } catch {
    // not supported
  }
}

let lastCancelAt = 0;

/** Cancels device speech only when something is queued, remembering when (see speakWithDevice). */
function cancelSpeech() {
  const s = synth();
  if (s && (s.speaking || s.pending)) {
    s.cancel();
    lastCancelAt = Date.now();
  }
}

/** iOS only lets speech start from a tap: speak a silent utterance now if voices are still loading. */
function unlockDeviceSpeech() {
  const s = synth();
  if (!s || s.getVoices().length) return;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  s.speak(u);
}

// Holding the utterance stops iOS/Chrome from garbage-collecting it mid-speech (onend never fires).
let currentUtterance: SpeechSynthesisUtterance | null = null;

function speakWithDevice(
  text: string,
  voice: SpeechSynthesisVoice,
  lang: SpeechLang,
  rate: number,
  signal: AbortSignal,
  onStart: () => void,
) {
  return new Promise<void>((resolve, reject) => {
    const s = synth();
    if (!s) return reject(new DeviceSpeechError("no-synth"));
    if (s.speaking || s.pending) {
      s.cancel();
      lastCancelAt = Date.now();
    }
    const justCancelled = Date.now() - lastCancelAt < 150;
    if (s.paused) s.resume();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang || BCP47[lang];
    u.rate = rate;
    u.pitch = 1;
    u.volume = 1;
    currentUtterance = u;
    let started = false;
    let settled = false;
    const done = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      signal.removeEventListener("abort", onAbort);
      if (currentUtterance === u) currentUtterance = null;
      if (error) reject(error);
      else resolve();
    };
    const onAbort = () => {
      cancelSpeech();
      done();
    };
    signal.addEventListener("abort", onAbort, { once: true });
    // If the voice never starts (a known silent failure on some phones), report it instead of hanging.
    const watchdog = setTimeout(() => {
      if (started) return;
      cancelSpeech();
      done(new DeviceSpeechError("no-start"));
    }, 6000);
    u.onstart = () => {
      started = true;
      onStart();
    };
    u.onend = () => done();
    u.onerror = (e) => {
      if (signal.aborted || e.error === "interrupted" || e.error === "canceled") done();
      else done(new DeviceSpeechError(e.error || "error"));
    };
    // iOS drops a speak() issued in the same tick as cancel(); speech is already unlocked by then.
    if (justCancelled) setTimeout(() => !settled && s.speak(u), 150);
    else s.speak(u);
  });
}

function noVoiceMessage(lang: SpeechLang) {
  if (lang === "kn") {
    if (isIOS()) {
      return "Your iPhone has no Kannada voice, so Kannada can't be read aloud here. Tap the speaker beside the English-letters line to hear how to say it.";
    }
    return "No Kannada voice is installed on this device. On Android, add Kannada under Settings → Text-to-speech (Speech Services by Google). Meanwhile, the speaker beside the English-letters line reads the pronunciation.";
  }
  return "No English voice is available on this device, so this line can't be read aloud.";
}

export type SpeechItem = { key: string; text: string; lang: SpeechLang };

export function useSpeech(rate: number) {
  /** The line whose audio is actually playing. */
  const [activeKey, setActiveKey] = useState<string | null>(null);
  /** The line being prepared (voice loading / online voice fetching) — no audio yet. */
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [sequence, setSequence] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    cancelSpeech();
    setActiveKey(null);
    setLoadingKey(null);
    setSequence(false);
  }, []);

  useEffect(() => stop, [stop]);

  const speakOne = useCallback(
    async (item: SpeechItem, signal: AbortSignal) => {
      setActiveKey(null);
      setLoadingKey(item.key);
      const started = () => {
        if (signal.aborted) return;
        setLoadingKey(null);
        setActiveKey(item.key);
      };
      const s = synth();
      if (!s) throw new Error("This browser cannot read text aloud. Try Chrome or Safari.");
      let voice = pickVoice(s.getVoices(), item.lang);
      if (!voice && s.getVoices().length === 0) {
        voice = pickVoice(await waitForVoices(), item.lang);
        if (signal.aborted) return;
      }
      if (!voice) throw new NoVoiceError(noVoiceMessage(item.lang));
      try {
        await speakWithDevice(item.text, voice, item.lang, rate, signal, started);
      } catch (error) {
        if (signal.aborted) return;
        if (error instanceof DeviceSpeechError) {
          throw new Error(
            (error.message === "not-allowed"
              ? "Your browser blocked the sound. Tap the speaker button again."
              : "Your device's voice could not read this aloud.") +
              " If you hear nothing, check the volume and that silent mode is off.",
          );
        }
        throw error;
      }
    },
    [rate],
  );

  /** Synchronous up to the first speak(), so iOS sees it as part of the tap. */
  const run = useCallback(
    (items: SpeechItem[], isSequence: boolean) => {
      stop();
      const list = items
        .map((item) => ({ ...item, text: item.text.normalize("NFC").trim() }))
        .filter((item) => item.text);
      if (!list.length) {
        toast.info("There is no text to read aloud.");
        return;
      }
      setAudioSession("playback");
      unlockDeviceSpeech();
      const ctrl = new AbortController();
      controller.current = ctrl;
      setSequence(isSequence);
      void (async () => {
        try {
          let missing: string | null = null;
          for (const item of list) {
            if (ctrl.signal.aborted) break;
            try {
              await speakOne(item, ctrl.signal);
            } catch (error) {
              // In "Hear it all", skip lines without a voice and keep reading the rest.
              if (!(error instanceof NoVoiceError) || !isSequence) throw error;
              missing ??= error.message;
            }
          }
          if (missing && !ctrl.signal.aborted) toast.info(missing, { duration: 9000 });
        } catch (error) {
          if (!ctrl.signal.aborted) {
            const message = (error as Error).message || "Read-aloud failed.";
            if (error instanceof NoVoiceError) toast.info(message, { duration: 9000 });
            else toast.error(message);
          }
        } finally {
          if (controller.current === ctrl) {
            controller.current = null;
            setActiveKey(null);
            setLoadingKey(null);
            setSequence(false);
            setAudioSession("auto");
          }
        }
      })();
    },
    [speakOne, stop],
  );

  const toggle = useCallback(
    (item: SpeechItem) => {
      if ((activeKey === item.key || loadingKey === item.key) && !sequence) stop();
      else run([item], false);
    },
    [activeKey, loadingKey, run, sequence, stop],
  );

  const readAll = useCallback((items: SpeechItem[]) => run(items, true), [run]);

  return { activeKey, loadingKey, sequence, toggle, readAll, stop };
}
