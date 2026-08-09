"use client";

import { useEffect, useState } from "react";
import { getMe, type PublicUser } from "./api";

type CurrentUserState = {
	user: PublicUser | null;
	isLoading: boolean;
	error: string | null;
};

export function useCurrentUser(): CurrentUserState {
	const [user, setUser] = useState<PublicUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		(async () => {
			setIsLoading(true);
			setError(null);
			try {
				const me = await getMe();
				if (isMounted) setUser(me);
			} catch (e: any) {
				if (!isMounted) return;
				setUser(null);
				setError(String(e?.message || "Not authenticated"));
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	return { user, isLoading, error };
}
