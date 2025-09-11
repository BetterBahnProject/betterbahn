import type { VendoJourney } from "@/utils/schemas";

const TIME_TOLERANCE_MS = 60_000; // 1 Minute Toleranz

export function findMatchingJourney(
	journeys: readonly VendoJourney[],
	targetDeparture: Date
) {
	if (!journeys?.length) return null;
	const expected = targetDeparture.getTime();
	return (
		journeys.find(
			(j) =>
				Math.abs(new Date(j.legs[0].departure).getTime() - expected) <=
				TIME_TOLERANCE_MS
		) || null
	);
}
