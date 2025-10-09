import type { VendoLeg } from "@/utils/schemas";

export const TrainIdentifier = ({ leg }: { leg: VendoLeg }) => {
	// Try to get the best train identifier
	if (leg.line?.name) {
		return leg.line.name;
	}

	if (leg.line?.product && leg.line?.productName) {
		return `${leg.line.product} ${leg.line.productName}`;
	}

	if (leg.line?.product) {
		return leg.line.product;
	}

	if (leg.line?.mode && typeof leg.line.mode === "string") {
		return leg.line.mode;
	}

	if (leg.mode) {
		return leg.mode;
	}

	return "Train";
};
