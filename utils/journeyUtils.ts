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
				transferTimeAfter: next?.walking ? calculateTransferTimeInMinutes(next) : 0,
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

	const urlParams = new URLSearchParams({
		from: fromStationId,
		to: toStationId,
		...(departureTime && { departure: departureTime }),
	});

	// Add optional parameters
	if (bahnCard && bahnCard !== "none") {
		urlParams.append("bahnCard", bahnCard);
	}

	if (hasDeutschlandTicket) {
		urlParams.append("hasDeutschlandTicket", "true");
	}

	if (passengerAge && passengerAge.trim() !== "") {
		urlParams.append("passengerAge", passengerAge.trim());
	}

	if (travelClass) {
		urlParams.append("travelClass", travelClass);
	}

	try {
		const response = await fetch(`/api/journeys?${urlParams}`);
		
		if (!response.ok) {
			let errorMessage = "Fehler beim Laden der Verbindungen";
			try {
				const data = await response.json();
				errorMessage = data.error || errorMessage;
			} catch {
				// If JSON parsing fails, use a generic error message
				errorMessage = `Server Error: ${response.status} ${response.statusText}`;
			}
			throw new Error(errorMessage);
		}

		const data = await response.json();
		return data.journeys || [];
	} catch (error) {
		const typedError = error as { message: string };

		// Re-throw with more user-friendly message if it's a network error
		if (typedError.message.includes("fetch")) {
			throw new Error(
				"Netzwerkfehler: Bitte überprüfe deine Internetverbindung",
				{ cause: error }
			);
		}
		throw error;
	}
};
