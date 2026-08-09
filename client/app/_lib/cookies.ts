export function getAccessTokenFromCookies(): string | null {
	if (typeof document === "undefined") return null;
	const match = document.cookie.match(/consulo_access_token=([^;]+)/);
	return match ? decodeURIComponent(match[1]) : null;
}
