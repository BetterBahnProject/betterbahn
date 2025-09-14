import type { VendoLeg } from "@/utils/schemas";

const formatLegDuration = (duration: unknown) => {
	if (!duration) return null;

	// Handle string duration (ISO 8601 format like PT1H30M)
	if (typeof duration === "string") {
		const match = duration.match(/PT(\d+H)?(\d+M)?/);
		if (match) {
			const hours = match[1] ? match[1].replace("H", "") : "0";
			const minutes = match[2] ? match[2].replace("M", "") : "0";
			return `${hours}h ${minutes}m`;
		}
	}

	// Handle duration object with departure/arrival times
	if (
		typeof duration === "object" &&
		duration &&
		"departure" in duration &&
		"arrival" in duration
	) {
		try {
			const dep = new Date(duration.departure);
			const arr = new Date(duration.arrival);
			const diffMs = arr.getTime() - dep.getTime();
			const diffMins = Math.floor(diffMs / 60000);
			const hours = Math.floor(diffMins / 60);
			const minutes = diffMins % 60;
			return `${hours}h ${minutes}m`;
		} catch {
			return null;
		}
	}

	// Handle already formatted string
	if (typeof duration === "string" && duration.includes("h")) {
		return duration;
	}

	return null;
};

export const LegDuration = ({ leg }: { leg: VendoLeg }) => {
	if (leg.duration) {
		const formatted = formatLegDuration(leg.duration);
		if (formatted) return formatted;
	}

	try {
		const dep = leg.departure;
		const arr = leg.arrival;
		const diffMs = arr.getTime() - dep.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const hours = Math.floor(diffMins / 60);
		const minutes = diffMins % 60;
		return `${hours}h ${minutes}m`;
	} catch {
		return "";
	}
};
