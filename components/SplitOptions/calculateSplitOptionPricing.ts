import type { SplitAnalysis } from "@/app/api/journeys/analyzeSingleSplit";
import {
	isLegCoveredByDeutschlandTicket,
	legIsFlixTrain,
} from "@/utils/deutschlandTicketUtils";
import { getJourneyLegsWithTransfers } from "@/utils/journeyUtils";
import type { VendoJourney } from "@/utils/schemas";

/** Berechne Split-Option Preisgestaltung mit Deutschland-Ticket Logik */
export const calculateSplitOptionPricing = ({
	splitOption,
	hasDeutschlandTicket,
	originalJourney,
}: {
	splitOption: SplitAnalysis;
	hasDeutschlandTicket: boolean;
	originalJourney: VendoJourney;
}) => {
	let totalPrice: number | null = null; // null = unknown

	if (
		splitOption.segments[0].price?.amount !== undefined &&
		splitOption.segments[1].price?.amount !== undefined
	) {
		totalPrice =
			splitOption.segments[0].price.amount +
			splitOption.segments[1].price.amount;
	}

	let savings: number | null = null;

	if (totalPrice !== null && originalJourney.price?.amount !== undefined) {
		savings = originalJourney.price.amount - totalPrice;
	}

	if (!splitOption || !splitOption.segments) {
		return {
			...splitOption,
			isFullyCovered: false,
			hasRegionalTrains: false,
			cannotShowPrice: false,
			hasPartialPricing: false,
			segmentsWithoutPricing: [] as number[],
			adjustedTotalPrice: totalPrice,
			adjustedSavings: savings,
			hasFlixTrains: null,
		};
	}

	// Überprüfe ob Split-Option Regionalzüge enthält
	const hasRegionalTrains = splitOption.segments.some((segment) => {
		const trainLegs = getJourneyLegsWithTransfers(segment);
		return trainLegs.some((leg) => {
			const product = leg.line?.product?.toLowerCase() || "";
			const regionalProducts = [
				"regional",
				"regionalbahn",
				"regionalexpress",
				"sbahn",
				"suburban",
			];
			return regionalProducts.includes(product);
		});
	});

	const hasFlixTrains = splitOption.segments.some((segment) => {
		const trainLegs = getJourneyLegsWithTransfers(segment);
		return trainLegs.some((leg) => legIsFlixTrain(leg));
	});

	let cannotShowPrice: boolean;
	let hasPartialPricing: boolean;
	let segmentsWithoutPricing: number[] = [];
	let allSegmentsCovered: boolean;

	allSegmentsCovered = splitOption.segments.every((segment) => {
		const trainLegs = getJourneyLegsWithTransfers(segment);
		return trainLegs.every((leg) =>
			isLegCoveredByDeutschlandTicket(leg, hasDeutschlandTicket)
		);
	});

	if (hasDeutschlandTicket) {
		cannotShowPrice = false;
		hasPartialPricing = false;
	} else {
		let segmentsWithPrice = 0;
		let totalSegments = splitOption.segments.length;

		splitOption.segments.forEach((segment, index) => {
			const hasPrice = segment.price;

			const segmentHasFlixTrain = getJourneyLegsWithTransfers(segment).some(
				(leg) => legIsFlixTrain(leg)
			);

			// Consider a segment as having no pricing if:
			// 1. It has no price data, OR
			// 2. It contains FlixTrain services (which we can't price)
			if (!hasPrice || segmentHasFlixTrain) {
				segmentsWithoutPricing.push(index);
			} else {
				segmentsWithPrice++;
			}
		});

		cannotShowPrice = segmentsWithPrice === 0;
		hasPartialPricing =
			segmentsWithPrice > 0 && segmentsWithPrice < totalSegments;
	}

	let adjustedTotalPrice = totalPrice;
	let adjustedSavings = savings;

	if (originalJourney) {
		// The API already returns prices with BahnCard discounts applied
		const originalJourneyApiPrice = originalJourney.price?.amount || 0;

		if (hasDeutschlandTicket) {
			let totalUncoveredPrice = 0;

			for (const segment of splitOption.segments) {
				const trainLegs = getJourneyLegsWithTransfers(segment);
				const segmentCovered = trainLegs.every((leg) =>
					isLegCoveredByDeutschlandTicket(leg, hasDeutschlandTicket)
				);
				const segmentPrice = segment.price?.amount || 0;

				if (!segmentCovered && segmentPrice > 0) {
					totalUncoveredPrice += segmentPrice;
				}
			}

			adjustedTotalPrice = totalUncoveredPrice;
		} else if (hasPartialPricing) {
			// For partial pricing, only sum up segments with available pricing
			let partialTotalPrice = 0;

			splitOption.segments.forEach((segment, index) => {
				if (!segmentsWithoutPricing.includes(index)) {
					partialTotalPrice += segment.price?.amount || 0;
				}
			});

			adjustedTotalPrice = partialTotalPrice;
		}

		if (adjustedTotalPrice !== null) {
			adjustedSavings = Math.max(
				0,
				originalJourneyApiPrice - adjustedTotalPrice
			);
		}
	}

	return {
		...splitOption,
		isFullyCovered: allSegmentsCovered && hasDeutschlandTicket,
		hasRegionalTrains,
		hasFlixTrains,
		cannotShowPrice,
		hasPartialPricing,
		segmentsWithoutPricing,
		adjustedTotalPrice,
		adjustedSavings,
	};
};
