import { incrementApiCount } from "@/utils/apiCounter";
import type { SplitPoint } from "@/utils/types";
import { type SearchJourneysOptions } from "db-vendo-client";
import { data as loyaltyCards } from "db-vendo-client/format/loyalty-cards";
import type { SplitJourneyInput } from "../splitJourney/splitJourney";
import { fetchJourney } from "./fetchJourney";

const MIN_SINGLE_SAVINGS_FACTOR = 1; // Preis muss < original * 0.98 sein

export async function analyzeSingleSplit(
	input: SplitJourneyInput,
	splitPoint: SplitPoint
) {
	const origin = input.originalJourney.legs.at(0)!.origin;
	const destination = input.originalJourney.legs.at(-1)!.destination;

	const queryOptions: SearchJourneysOptions = {
		results: 1,
		stopovers: true,
		firstClass: input.travelClass === 1,
		notOnlyFastRoutes: true,
		remarks: true,
		transfers: 3,
		age: input.passengerAge,
		deutschlandTicketDiscount: input.hasDeutschlandTicket,
		loyaltyCard:
			input.bahnCard && [25, 50, 100].includes(input.bahnCard)
				? {
						type: loyaltyCards.BAHNCARD,
						discount: input.bahnCard,
						class: input.travelClass || 2,
				  }
				: undefined,
	};

	try {
		// Increment API counters for both segments
		incrementApiCount(
			"SPLIT_SEARCH_SEGMENT_1",
			`${origin?.name} → ${splitPoint.station?.name}`
		);
		incrementApiCount(
			"SPLIT_SEARCH_SEGMENT_2",
			`${splitPoint.station?.name} → ${destination?.name}`
		);

		const [firstJourney, secondJourney] = await Promise.all([
			fetchJourney({
				from: origin!.id,
				to: splitPoint.station.id,
				queryOptions,
				targetDeparture: input.originalJourney.legs.at(0)!.departure,
			}),
			fetchJourney({
				from: splitPoint.station.id,
				to: destination!.id,
				queryOptions,
				targetDeparture: splitPoint.departure,
			}),
		]);

		if (
			!firstJourney ||
			!secondJourney ||
			(firstJourney.price?.amount === undefined &&
				secondJourney.price?.amount === undefined)
		) {
			return null;
		}

		let totalPrice: number | null = null; // null = unknown

		// TODO this MIN_SINGLE_SAVINGS filter can probably be moved to frontend, no filtering on backend necessary
		if (
			firstJourney.price?.amount !== undefined &&
			secondJourney.price?.amount !== undefined
		) {
			totalPrice = firstJourney.price.amount + secondJourney.price.amount;
			const originalPrice = input.originalJourney.price?.amount || 0;

			if (totalPrice >= originalPrice * MIN_SINGLE_SAVINGS_FACTOR) {
				return null;
			}
		}

		return {
			splitStations: [splitPoint.station],
			segments: [firstJourney, secondJourney],
		} as const;
	} catch (error) {
		const typedError = error as { message: string };
		console.log(
			`Single split analysis error at ${splitPoint.station.name}:`,
			typedError.message
		);
		throw error;
	}
}

export type SplitAnalysis = Exclude<
	Awaited<ReturnType<typeof analyzeSingleSplit>>,
	null
>;
