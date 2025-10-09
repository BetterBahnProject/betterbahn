import type { VendoLeg } from "@/utils/schemas";

export const LegDuration = ({ leg }: { leg: VendoLeg }) => {
	const diffMs = leg.arrival.getTime() - leg.departure.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const hours = Math.floor(diffMins / 60);
	const minutes = diffMins % 60;
	return `${hours}h ${minutes}m`;
};
