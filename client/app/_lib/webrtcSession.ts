/**
 * The peer connection half of a call, with no React in it.
 *
 * Keeping this framework free means the handshake can be driven directly in a
 * test: two sessions wired to each other, with the signalling channel faked.
 * `useWebRTCCall` is a thin wrapper that pushes these callbacks into state.
 */

export type CallState = "idle" | "calling" | "ringing" | "active" | "failed";
export type CallType = "voice" | "video";
export type CallSignalType = "call_offer" | "call_answer" | "ice_candidate" | "call_end" | "call_reject";

export type IncomingSignal = {
	type: CallSignalType;
	callType?: CallType;
	payload?: any;
};

export type CallSessionHandlers = {
	sendSignal: (type: CallSignalType, callType?: CallType, payload?: any) => void;
	onStateChange: (state: CallState) => void;
	onCallTypeChange: (type: CallType) => void;
	onLocalStream: (stream: MediaStream | null) => void;
	onRemoteStream: (stream: MediaStream | null) => void;
	onError: (message: string | null) => void;
};

const ICE_SERVERS: RTCIceServer[] = [
	{ urls: "stun:stun.l.google.com:19302" },
	{ urls: "stun:stun1.l.google.com:19302" }
];

export function describeMediaError(err: any): string {
	if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
		return "Camera and microphone access was blocked. Allow it for this site in your browser settings, then try again.";
	}
	if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
		return "No camera or microphone was found on this device.";
	}
	// NotReadableError means the operating system refused the device. A busy tab
	// is only one cause: antivirus webcam shields and the Windows camera and
	// microphone privacy settings produce exactly the same error, so the message
	// should not accuse the user of something they have already ruled out.
	if (err?.name === "NotReadableError" || err?.name === "AbortError") {
		return (
			"Windows would not hand over the camera or microphone. Another app may be holding it, " +
			"or it may be blocked by antivirus webcam protection or by Settings > Privacy & security > Camera and Microphone."
		);
	}
	return String(err?.message || "Could not start the call.");
}

export class CallSession {
	private handlers: CallSessionHandlers;
	private pc: RTCPeerConnection | null = null;
	private localStream: MediaStream | null = null;

	private pendingOffer: RTCSessionDescriptionInit | null = null;
	private pendingCallType: CallType = "voice";

	// Candidates nearly always arrive before the far side has a remote
	// description: the caller starts gathering the instant it makes an offer,
	// while the callee has not even clicked Accept. Adding one that early throws,
	// so they queue here and are flushed once the description is in place.
	private pendingCandidates: RTCIceCandidateInit[] = [];
	private hasRemoteDescription = false;

	private state: CallState = "idle";

	constructor(handlers: CallSessionHandlers) {
		this.handlers = handlers;
	}

	getState(): CallState {
		return this.state;
	}

	private setState(state: CallState) {
		this.state = state;
		this.handlers.onStateChange(state);
	}

	/**
	 * getUserMedia only exists in a secure context. Opening the app over plain
	 * http on a LAN address is the usual way to end up here, and the raw
	 * "cannot read properties of undefined" is useless to the person seeing it.
	 */
	private async getLocalMedia(type: CallType): Promise<{ stream: MediaStream; effectiveType: CallType }> {
		if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
			throw new Error(
				"Calls need a secure connection. Open the app on localhost or over https and try again."
			);
		}

		// Asking for camera and microphone together fails as a unit: if only the
		// microphone is unavailable, the whole request throws and the camera goes
		// unused. Fall back to whichever device the system will actually give us
		// rather than abandoning a call that could still connect.
		const attempts: Array<{ constraints: MediaStreamConstraints; effectiveType: CallType; notice: string | null }> =
			type === "video"
				? [
						{ constraints: { audio: true, video: true }, effectiveType: "video", notice: null },
						{
							constraints: { audio: false, video: true },
							effectiveType: "video",
							notice: "Your microphone is unavailable, so the other person will not hear you."
						},
						{
							constraints: { audio: true, video: false },
							effectiveType: "voice",
							notice: "Your camera is unavailable, so this is connecting as a voice call."
						}
				  ]
				: [{ constraints: { audio: true, video: false }, effectiveType: "voice", notice: null }];

		let lastError: any = null;

		for (const attempt of attempts) {
			try {
				const stream = await navigator.mediaDevices.getUserMedia(attempt.constraints);
				this.localStream = stream;
				this.handlers.onLocalStream(stream);
				if (attempt.notice) this.handlers.onError(attempt.notice);
				return { stream, effectiveType: attempt.effectiveType };
			} catch (err: any) {
				lastError = err;
				// Refused permission applies to every device; retrying with fewer
				// of them only produces the same prompt again.
				if (err?.name === "NotAllowedError" || err?.name === "SecurityError") break;
			}
		}

		throw lastError ?? new Error("Could not start the call.");
	}

	/** Turn a hardware failure into something that names the missing device. */
	private async explainMediaFailure(err: any, type: CallType): Promise<string> {
		const base = describeMediaError(err);

		try {
			const devices = await navigator.mediaDevices?.enumerateDevices?.();
			if (!devices) return base;

			const cameras = devices.filter((d) => d.kind === "videoinput").length;
			const microphones = devices.filter((d) => d.kind === "audioinput").length;

			if (type === "video" && cameras === 0 && microphones === 0) {
				return "This device has no camera or microphone available to the browser.";
			}
			if (type === "video" && cameras === 0) {
				return "No camera is available to the browser on this device. You can still start a voice call.";
			}
			if (microphones === 0) {
				return "No microphone is available to the browser on this device.";
			}
		} catch {
			// Enumeration is best effort; fall back to the generic explanation.
		}

		return base;
	}

	private createPeerConnection(): RTCPeerConnection {
		const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

		pc.onicecandidate = (event) => {
			if (event.candidate) {
				const candidate = typeof event.candidate.toJSON === "function" ? event.candidate.toJSON() : event.candidate;
				this.handlers.sendSignal("ice_candidate", undefined, candidate);
			}
		};

		pc.ontrack = (event) => {
			this.handlers.onRemoteStream(event.streams[0]);
		};

		pc.onconnectionstatechange = () => {
			if (pc.connectionState === "connected") {
				this.setState("active");
			} else if (pc.connectionState === "failed") {
				this.fail("The connection dropped. Check your network and try again.");
			}
		};

		this.pc = pc;
		this.hasRemoteDescription = false;
		// Deliberately does NOT clear pendingCandidates. By the time the callee
		// builds its connection, the caller's candidates have already arrived and
		// are sitting in the queue; wiping it here throws away every one of them
		// and the call connects on neither side.
		return pc;
	}

	private async flushPendingCandidates() {
		if (!this.pc) return;
		const queued = this.pendingCandidates;
		this.pendingCandidates = [];

		for (const candidate of queued) {
			try {
				await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
			} catch {
				// A candidate the connection has moved past is not worth failing over.
			}
		}
	}

	/** Release hardware and the connection without touching the visible state. */
	private releaseResources() {
		this.pc?.close();
		this.pc = null;

		this.localStream?.getTracks().forEach((track) => track.stop());
		this.localStream = null;

		this.pendingOffer = null;
		this.pendingCandidates = [];
		this.hasRemoteDescription = false;

		this.handlers.onLocalStream(null);
		this.handlers.onRemoteStream(null);
	}

	/**
	 * Stop everything but stay on screen with the reason. Dropping straight back
	 * to idle would unmount the dialog and swallow the message, which makes a
	 * refused camera look exactly like a button that does nothing.
	 */
	private fail(message: string) {
		this.releaseResources();
		this.handlers.onError(message);
		this.setState("failed");
	}

	/** Full reset, including clearing any error. */
	close() {
		this.releaseResources();
		this.handlers.onError(null);
		this.setState("idle");
	}

	async start(type: CallType) {
		this.handlers.onError(null);
		this.handlers.onCallTypeChange(type);
		this.setState("calling");

		try {
			const { stream, effectiveType } = await this.getLocalMedia(type);
			if (effectiveType !== type) this.handlers.onCallTypeChange(effectiveType);

			const pc = this.createPeerConnection();
			stream.getTracks().forEach((track) => pc.addTrack(track, stream));

			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);
			this.handlers.sendSignal("call_offer", effectiveType, offer);
		} catch (err: any) {
			this.fail(await this.explainMediaFailure(err, type));
		}
	}

	async accept() {
		const offer = this.pendingOffer;
		if (!offer) return;

		const type = this.pendingCallType;
		this.handlers.onError(null);
		this.handlers.onCallTypeChange(type);

		try {
			const { stream, effectiveType } = await this.getLocalMedia(type);
			if (effectiveType !== type) this.handlers.onCallTypeChange(effectiveType);

			const pc = this.createPeerConnection();
			stream.getTracks().forEach((track) => pc.addTrack(track, stream));

			await pc.setRemoteDescription(new RTCSessionDescription(offer));
			this.hasRemoteDescription = true;
			await this.flushPendingCandidates();

			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);
			this.handlers.sendSignal("call_answer", effectiveType, answer);

			this.pendingOffer = null;
			this.setState("active");
		} catch (err: any) {
			this.handlers.sendSignal("call_reject");
			this.fail(await this.explainMediaFailure(err, type));
		}
	}

	reject() {
		this.handlers.sendSignal("call_reject");
		this.close();
	}

	end() {
		this.handlers.sendSignal("call_end");
		this.close();
	}

	async handleSignal(event: IncomingSignal) {
		if (event.type === "call_offer") {
			// A second caller while we are mid call gets a refusal rather than
			// silently trampling the connection in progress.
			if (this.pc) {
				this.handlers.sendSignal("call_reject");
				return;
			}
			this.pendingOffer = event.payload;
			this.pendingCallType = event.callType || "voice";
			this.pendingCandidates = [];
			this.hasRemoteDescription = false;
			this.handlers.onCallTypeChange(this.pendingCallType);
			this.setState("ringing");
			return;
		}

		if (event.type === "call_answer") {
			if (!this.pc) return;
			await this.pc.setRemoteDescription(new RTCSessionDescription(event.payload));
			this.hasRemoteDescription = true;
			await this.flushPendingCandidates();
			this.setState("active");
			return;
		}

		if (event.type === "ice_candidate") {
			if (!event.payload) return;
			if (!this.pc || !this.hasRemoteDescription) {
				this.pendingCandidates.push(event.payload);
				return;
			}
			try {
				await this.pc.addIceCandidate(new RTCIceCandidate(event.payload));
			} catch {
				// Ignore candidates that no longer apply.
			}
			return;
		}

		if (event.type === "call_end" || event.type === "call_reject") {
			// Only meaningful if we are actually in a call; a stray reject from a
			// busy peer should not wipe an unrelated error message.
			if (this.state === "idle") return;
			this.close();
		}
	}

	dispose() {
		this.releaseResources();
		this.state = "idle";
	}
}
