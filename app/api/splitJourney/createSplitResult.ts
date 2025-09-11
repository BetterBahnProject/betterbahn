import type { VendoJourney } from "@/utils/schemas";
import type { TrainLine } from "@/utils/types";

export function createSplitResult(
	type: string,
	splitStations: unknown,
	segments: VendoJourney[],
	totalPrice: number,
	originalPrice: number,
	trainLine?: TrainLine
) {
	const savings = originalPrice - totalPrice;

	return {
		type: `same-train-${type}-split`,
		splitStations,
		segments,
		totalPrice,
		originalPrice,
		savings,
		savingsPercentage: ((savings / originalPrice) * 100).toFixed(1),
		trainInfo: {
			line: trainLine?.name || "Unknown",
			product: trainLine?.product || "Unknown",
		},
	};
}
