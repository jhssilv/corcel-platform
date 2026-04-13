/**
 * Theme utility — manages dark/light mode with OS preference detection
 * and localStorage persistence.
 */

const STORAGE_KEY = "theme-preference";

type ThemeMode = "light" | "dark";

function getSystemPreference(): ThemeMode {
	if (typeof window === "undefined") {
		return "dark";
	}

	return window.matchMedia("(prefers-color-scheme: light)").matches
		? "light"
		: "dark";
}

function getStoredPreference(): ThemeMode | null {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === "light" || stored === "dark") {
			return stored;
		}

		return null;
	} catch {
		return null;
	}
}

function applyTheme(theme: ThemeMode) {
	const root = document.documentElement;

	if (theme === "light") {
		root.classList.add("light");
		root.classList.remove("dark");
	} else {
		root.classList.add("dark");
		root.classList.remove("light");
	}
}

export function initTheme(): ThemeMode {
	const stored = getStoredPreference();
	const theme = stored ?? getSystemPreference();
	applyTheme(theme);
	return theme;
}

export function toggleTheme(): ThemeMode {
	const root = document.documentElement;
	const isCurrentlyLight = root.classList.contains("light");
	const newTheme: ThemeMode = isCurrentlyLight ? "dark" : "light";

	applyTheme(newTheme);
	localStorage.setItem(STORAGE_KEY, newTheme);
	return newTheme;
}

export function getCurrentTheme(): ThemeMode {
	return document.documentElement.classList.contains("light")
		? "light"
		: "dark";
}
