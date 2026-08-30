'use strict';

(function iifeThemeToggle(document, window) {
	var STORAGE_KEY = 'theme';
	var root = document.documentElement;
	var btn = document.getElementById('themeToggle');

	function currentTheme() {
		return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
	}

	function setTheme(theme) {
		if (theme === 'dark') {
			root.setAttribute('data-theme', 'dark');
		} else {
			root.removeAttribute('data-theme');
		}
		try {
			window.localStorage.setItem(STORAGE_KEY, theme);
		} catch (e) {
			/* localStorage unavailable — theme just won't persist */
		}
	}

	if (btn) {
		btn.addEventListener(
			'click',
			function toggleTheme() {
				setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
			},
			false
		);
	}
}(document, window));
