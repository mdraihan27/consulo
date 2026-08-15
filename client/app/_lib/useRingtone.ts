"use client";

import { useEffect, useRef } from "react";

/**
 * A ringing tone synthesised with WebAudio, so there is no audio asset to ship
 * or fail to load.
 *
 * `incoming` rings the classic two-burst pattern; `outgoing` plays a quieter
 * single ringback so the caller knows something is happening.
 *
 * Browsers refuse to start audio until the user has interacted with the page.
 * That is handled as best effort: if the context will not resume, the call still
 * works, it is just silent.
 */
export function useRingtone(mode: "incoming" | "outgoing" | null) {
	const contextRef = useRef<AudioContext | null>(null);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (!mode) return;

		const AudioContextCtor =
			typeof window !== "undefined"
				? window.AudioContext || (window as any).webkitAudioContext
				: undefined;
		if (!AudioContextCtor) return;

		let cancelled = false;

		const context: AudioContext = contextRef.current ?? new AudioContextCtor();
		contextRef.current = context;
		void context.resume?.().catch(() => {});

		const burst = (startAt: number, duration: number, frequency: number, peak: number) => {
			const oscillator = context.createOscillator();
			const gain = context.createGain();

			oscillator.type = "sine";
			oscillator.frequency.value = frequency;

			// Shaped rather than square, so it fades instead of clicking.
			gain.gain.setValueAtTime(0, startAt);
			gain.gain.linearRampToValueAtTime(peak, startAt + 0.05);
			gain.gain.setValueAtTime(peak, startAt + duration - 0.05);
			gain.gain.linearRampToValueAtTime(0, startAt + duration);

			oscillator.connect(gain);
			gain.connect(context.destination);
			oscillator.start(startAt);
			oscillator.stop(startAt + duration);
		};

		const ring = () => {
			if (cancelled || context.state === "closed") return;
			const now = context.currentTime;

			if (mode === "incoming") {
				burst(now, 0.4, 480, 0.18);
				burst(now + 0.6, 0.4, 480, 0.18);
			} else {
				burst(now, 0.9, 420, 0.06);
			}
		};

		ring();
		timerRef.current = setInterval(ring, mode === "incoming" ? 2400 : 3000);

		return () => {
			cancelled = true;
			if (timerRef.current) clearInterval(timerRef.current);
			timerRef.current = null;
		};
	}, [mode]);

	// Release the audio device when the component using this goes away.
	useEffect(() => {
		return () => {
			contextRef.current?.close().catch(() => {});
			contextRef.current = null;
		};
	}, []);
}
