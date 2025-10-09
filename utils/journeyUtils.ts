import type {
	VendoJourney,
	VendoLeg,
	VendoOriginOrDestination,
} from "@/utils/schemas";

export const getLineInfoFromLeg = (leg: VendoLeg) => {
	if (leg.walking) return null;
	return leg.line?.name || leg.line?.product || "Unknown";
};

/**
 * Gets the display name for a station, stop, or location
 * @param stop - Can be a VendoStation, VendoStop, or VendoLocation (all have a 'name' property)
 * @returns The name of the location or "Unknown" if not available
 */
export const getStationName = (stop?: VendoOriginOrDestination) =>
	stop?.name || "Unknown";

const calculateTransferTimeInMinutes = (leg: VendoLeg) => {
	if (!leg.walking || !leg.departure || !leg.arrival) return 0;
	return Math.round((leg.arrival.getTime() - leg.departure.getTime()) / 60000);
};

// Filter out walking legs and get non-walking legs with transfer times
export const getJourneyLegsWithTransfers = (journey: VendoJourney) => {
	const legs = journey?.legs || [];

	return legs
		.map((leg, i) => {
			if (leg.walking) return null;
			const next = legs[i + 1];
			return Object.assign({}, leg, {
				transferTimeAfter: next?.walking
					? calculateTransferTimeInMinutes(next)
					: 0,
			});
		})
		.filter(Boolean) as (VendoLeg & { transferTimeAfter: number })[];
};
