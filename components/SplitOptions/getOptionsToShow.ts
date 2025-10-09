import type { SplitAnalysis } from "@/app/api/analyzeJourney";
import type { VendoJourney } from "@/utils/schemas";
import { calculateSplitOptionPricing } from "./calculateSplitOptionPricing";

/** Determine which split options to show based on pricing availability */
export const getOptionsToShow = ({
	splitOptions,
	hasDeutschlandTicket,
	originalJourney,
}: {
	splitOptions: SplitAnalysis[];
	hasDeutschlandTicket: boolean;
	originalJourney: VendoJourney;
}) => {
	if (splitOptions.length === 0) {
		return [];
	}

	// Calculate pricing for all options first
	const optionsWithPricing = splitOptions.map((option) => ({
		...option,
		pricing: calculateSplitOptionPricing({
			splitOption: option,
			hasDeutschlandTicket,
			originalJourney,
		}),
	}));

	// Sort by savings (highest first)
	const sortedOptions = optionsWithPricing.toSorted(
		(a, b) =>
			(b.pricing.adjustedSavings ?? 0) - (a.pricing.adjustedSavings ?? 0)
	);

	// If user has Deutschland-Ticket, always show only the cheapest option
	if (hasDeutschlandTicket) {
		return [sortedOptions[0]];
	}

	// For users without Deutschland-Ticket
	const bestOption = sortedOptions[0];

	// If the best option has complete pricing (no partial or missing pricing), show only that
	if (
		!bestOption.pricing.cannotShowPrice &&
		!bestOption.pricing.hasPartialPricing
	) {
		return [bestOption];
	}

	// If the best option has pricing issues, show options until we find one with complete pricing
	const optionsToShow = [];
	let foundCompleteOption = false;

	for (const option of sortedOptions) {
		optionsToShow.push(option);

		// If this option has complete pricing, we can stop
		if (!option.pricing.cannotShowPrice && !option.pricing.hasPartialPricing) {
			foundCompleteOption = true;
			break;
		}
	}

	// If we never found a complete option, show all options (they all have pricing issues)
	return foundCompleteOption ? optionsToShow : sortedOptions;
};
