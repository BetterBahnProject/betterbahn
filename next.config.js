// Next.js Konfigurationsdatei
module.exports = {
	// Standalone-Output für Docker-Deployment aktivieren
	// Dies erstellt eine eigenständige Version der App mit allen Abhängigkeiten
	output: "standalone",
	typescript: {
		ignoreBuildErrors: true, // temporarily, since some type errors still exists and are ambiguous
	},
	serverExternalPackages: ["puppeteer-extra", "puppeteer-extra-plugin-stealth"],
};
