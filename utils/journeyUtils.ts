import type { CommonJourneyParams } from "@/app/api/journeys/journeys";
import { trpcClient } from "./TRPCProvider";
import type { ExtractedData } from "./types";
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

export const calculateTransferTimeInMinutes = (leg: VendoLeg) => {
	if (!leg.walking || !leg.departure || !leg.arrival) return 0;
	return Math.round(
		(new Date(leg.arrival).getTime() - new Date(leg.departure).getTime()) /
			60000
	);
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

// =================
// API Functions
// =================

/**
 * @param {Object} extractedData - The journey data extracted from URL
 * @throws {Error} When API call fails or returns error
 */
export const searchForJourneys = async (
	extractedData: ExtractedData
): Promise<VendoJourney[]> => {
	const {
		fromStationId,
		toStationId,
		date,
		time,
		bahnCard,
		hasDeutschlandTicket,
		passengerAge,
		travelClass,
	} = extractedData;

	// Validate required fields
	if (!fromStationId || !toStationId) {
		throw new Error(
			"Unvollständige Reisedaten: Start- und Zielbahnhof erforderlich"
		);
	}

	let departureTime = "";

	if (date && time) {
		departureTime = `${date}T${time}:00`;
	}

	const commonParams: CommonJourneyParams = {
		from: fromStationId,
		hasDeutschlandTicket: hasDeutschlandTicket ?? false,
		travelClass: travelClass ? Number.parseInt(travelClass, 10) : 2,
		bahnCard: bahnCard ? Number.parseInt(bahnCard, 10) : undefined,
		passengerAge: passengerAge ? Number.parseInt(passengerAge, 10) : undefined,
		to: toStationId,
	};

	if (departureTime.trim()) {
		return await trpcClient.journeys.query({
			type: "accurate-time",
			...commonParams,
			departure: new Date(departureTime),
		});
	}

	return await trpcClient.journeys.query({
		type: "no-accurate-time",
		...commonParams,
		results: 10,
	});
};
