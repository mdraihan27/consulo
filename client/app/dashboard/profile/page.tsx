"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getMe, updateProfile, type PublicUser } from "../../_lib/api";
import { Spinner } from "../../_components/Spinner";

const MAX_BIO_LENGTH = 1000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export default function ProfilePage() {
	const [user, setUser] = useState<PublicUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [username, setUsername] = useState("");
	const [bio, setBio] = useState("");
	const [title, setTitle] = useState("");

	// Avatar edits are staged locally and only sent when the form is saved.
	const [pendingPicture, setPendingPicture] = useState<string | null>(null);
	const [removePicture, setRemovePicture] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	function hydrate(me: PublicUser) {
		setUser(me);
		setFirstName(me.firstName || "");
		setLastName(me.lastName || "");
		setUsername(me.username || "");
		setBio(me.bio || "");
		setTitle(me.title || "");
		setPendingPicture(null);
		setRemovePicture(false);
	}

	useEffect(() => {
		let isMounted = true;
		(async () => {
			try {
				const me = await getMe();
				if (isMounted) hydrate(me);
			} catch (err: any) {
				if (isMounted) setError(err?.message || "Could not load your profile.");
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	function handlePictureChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setError("Choose an image file.");
			return;
		}
		if (file.size > MAX_IMAGE_BYTES) {
			setError("That image is larger than 4MB. Pick a smaller one.");
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			setPendingPicture(String(reader.result));
			setRemovePicture(false);
			setError(null);
		};
		reader.onerror = () => setError("Could not read that file.");
		reader.readAsDataURL(file);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!user) return;

		setIsSaving(true);
		setError(null);
		setNotice(null);

		try {
			// Send only what actually changed so untouched fields stay untouched.
			const patch: Parameters<typeof updateProfile>[0] = {};
			if (firstName.trim() !== (user.firstName || "")) patch.firstName = firstName.trim();
			if (lastName.trim() !== (user.lastName || "")) patch.lastName = lastName.trim();
			if (username.trim().toLowerCase() !== (user.username || "")) patch.username = username.trim().toLowerCase();
			if (bio.trim() !== (user.bio || "")) patch.bio = bio.trim();
			if (user.role === "freelancer" && title.trim() !== (user.title || "")) patch.title = title.trim();
			if (pendingPicture) patch.profilePictureBase64 = pendingPicture;
			if (removePicture) patch.removeProfilePicture = true;

			if (Object.keys(patch).length === 0) {
				setNotice("Nothing to save yet.");
				return;
			}

			hydrate(await updateProfile(patch));
			setNotice("Profile updated.");
		} catch (err: any) {
			setError(err?.message || "Could not save your profile.");
		} finally {
			setIsSaving(false);
		}
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Spinner />
			</div>
		);
	}

	if (!user) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 px-6 py-20">
				<p className="text-sm text-text-muted">{error || "Profile not found."}</p>
				<Link href="/dashboard" className="text-sm font-medium text-accent hover:underline">
					← Back to Dashboard
				</Link>
			</div>
		);
	}

	const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`;
	const shownPicture = removePicture ? "" : pendingPicture || user.profilePicture || "";
	const hasPictureEdit = Boolean(pendingPicture) || removePicture;

	return (
		<div className="mx-auto w-full max-w-3xl px-6 py-10">
				<h1 className="text-2xl font-bold tracking-tight text-text-primary">Edit your profile</h1>
					<p className="mt-1 text-sm text-text-body">
						This is what clients and consultants see when they find you on Consulo.
					</p>

					{error && (
						<p className="mt-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>
					)}
					{notice && (
						<p className="mt-4 rounded-xl border border-border bg-bg-soft px-4 py-3 text-sm text-text-body">{notice}</p>
					)}

					<form onSubmit={handleSubmit} className="mt-8 space-y-6">
						<section className="rounded-2xl border border-border bg-base p-6">
							<h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Photo</h2>

							<div className="mt-4 flex flex-wrap items-center gap-5">
								<div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-bg-soft">
									{shownPicture ? (
										<img src={shownPicture} alt={user.firstName} className="h-full w-full object-cover" />
									) : (
										<span className="text-2xl font-bold text-text-muted">{initials}</span>
									)}
								</div>

								<div className="flex flex-wrap items-center gap-2">
									<input
										ref={fileInputRef}
										type="file"
										accept="image/*"
										onChange={handlePictureChange}
										className="hidden"
									/>
									<button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										className="rounded-xl border border-border-strong px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-soft transition cursor-pointer"
									>
										Choose image
									</button>

									{shownPicture && (
										<button
											type="button"
											onClick={() => {
												setPendingPicture(null);
												setRemovePicture(true);
											}}
											className="rounded-xl border border-border-strong px-4 py-2 text-sm font-semibold text-accent hover:bg-bg-soft transition cursor-pointer"
										>
											Remove
										</button>
									)}

									{hasPictureEdit && (
										<button
											type="button"
											onClick={() => {
												setPendingPicture(null);
												setRemovePicture(false);
												if (fileInputRef.current) fileInputRef.current.value = "";
											}}
											className="text-sm font-semibold text-accent hover:underline cursor-pointer"
										>
											Undo
										</button>
									)}
								</div>
							</div>

							{hasPictureEdit && (
								<p className="mt-3 text-xs text-text-muted">
									{removePicture ? "Your photo will be removed when you save." : "New photo will upload when you save."}
								</p>
							)}
						</section>

						<section className="rounded-2xl border border-border bg-base p-6">
							<h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Details</h2>

							<div className="mt-4 grid gap-4 sm:grid-cols-2">
								<label className="block">
									<span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
										First name
									</span>
									<input
										type="text"
										value={firstName}
										onChange={(e) => setFirstName(e.target.value)}
										maxLength={60}
										required
										className="w-full rounded-xl border border-border bg-bg-soft px-4 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
									/>
								</label>

								<label className="block">
									<span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
										Last name
									</span>
									<input
										type="text"
										value={lastName}
										onChange={(e) => setLastName(e.target.value)}
										maxLength={60}
										required
										className="w-full rounded-xl border border-border bg-bg-soft px-4 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
									/>
								</label>
							</div>

							<label className="mt-4 block">
								<span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
									Username
								</span>
								<div className="flex items-center rounded-xl border border-border bg-bg-soft focus-within:border-accent">
									<span className="pl-4 text-sm text-text-muted">@</span>
									<input
										type="text"
										value={username}
										onChange={(e) => setUsername(e.target.value.toLowerCase())}
										maxLength={30}
										required
										className="w-full rounded-xl bg-transparent px-2 py-2.5 text-sm text-text-primary focus:outline-none"
									/>
								</div>
								<span className="mt-1 block text-xs text-text-muted">
									Lowercase letters, numbers, dots, underscores and hyphens. 3–30 characters.
								</span>
							</label>

							<label className="mt-4 block">
								<span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
									Email
								</span>
								<input
									type="email"
									value={user.email}
									disabled
									className="w-full cursor-not-allowed rounded-xl border border-border bg-bg-muted px-4 py-2.5 text-sm text-text-muted"
								/>
								<span className="mt-1 block text-xs text-text-muted">
									Your email comes from your Google account and can't be changed here.
								</span>
							</label>

							{user.role === "freelancer" && (
								<label className="mt-4 block">
									<span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
										Your field
									</span>
									<input
										type="text"
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										maxLength={100}
										placeholder="e.g. Cloud Architecture"
										className="w-full rounded-xl border border-border bg-bg-soft px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
									/>
									<span className="mt-1 block text-xs text-text-muted">
										Clients search on this, and it sets the topic of your AI assessment.
									</span>
								</label>
							)}
						</section>

						<section className="rounded-2xl border border-border bg-base p-6">
							<div className="flex items-center justify-between">
								<h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">About you</h2>
								<span className={`text-xs ${bio.length > MAX_BIO_LENGTH ? "text-accent" : "text-text-muted"}`}>
									{bio.length}/{MAX_BIO_LENGTH}
								</span>
							</div>

							<textarea
								value={bio}
								onChange={(e) => setBio(e.target.value)}
								rows={6}
								maxLength={MAX_BIO_LENGTH}
								placeholder={
									user.role === "freelancer"
										? "What do you help clients with, and what have you worked on?"
										: "A short introduction helps consultants understand what you need."
								}
								className="mt-3 w-full resize-none rounded-xl border border-border bg-bg-soft px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
							/>
						</section>

						<div className="flex items-center justify-end gap-3">
							<Link
								href={user.role === "freelancer" ? `/dashboard/consultant/${user.id}` : "/dashboard"}
								className="rounded-xl border border-border-strong px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-soft transition"
							>
								{user.role === "freelancer" ? "View public profile" : "Cancel"}
							</Link>
							<button
								type="submit"
								disabled={isSaving}
								className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 transition cursor-pointer"
							>
								{isSaving ? "Saving..." : "Save changes"}
							</button>
						</div>
				</form>
		</div>
	);
}
