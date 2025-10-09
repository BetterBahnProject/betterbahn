"use client";

import { formatTime } from "@/utils/formatUtils";
import { formatPriceDE } from "@/utils/priceUtils";
import type { VendoJourney } from "@/utils/schemas";
import { getTransferStations } from "./getTransferStations";
import { JourneyDuration } from "./JourneyDuration";
import { LegDetails } from "./LegDetails";
import { useUrlParams } from "../discount/useUrlParams";

export const JourneyCard = ({
	journey,
	isSelected = false,
	onClick,
}: {
	journey: VendoJourney;
	isSelected?: boolean;
	onClick: () => void;
}) => {
	const firstLeg = journey.legs.at(0);
	const lastLeg = journey.legs.at(-1);
	const nonWalkingLegs = journey.legs.filter((leg) => !leg.walking);
	const transferCountWithoutWalking = Math.max(0, nonWalkingLegs.length - 1);
	const transferStationsWithoutWalking = getTransferStations(nonWalkingLegs);
	const { travelClass } = useUrlParams();

	const priceDisplay =
		journey.price?.amount === undefined
			? "Preis auf Anfrage"
			: formatPriceDE(journey.price.amount);

	return (
		<div
			className={`border rounded-lg p-4 transition-all duration-200 bg-background border-foreground/30 ${
				isSelected
					? "shadow-md"
					: "hover:shadow-md hover:bg-foreground/5 cursor-pointer"
			}`}
			onClick={onClick}
		>
			{/* Journey Header - Similar to SplitOptions */}
			<div className="flex justify-between">
				<div>
					<span className="text-sm text-foreground/60">Verbindung:</span>
					<span className="text-lg font-bold text-blue-600 ml-2">
						{formatTime(firstLeg?.departure)} → {formatTime(lastLeg?.arrival)}
					</span>
					{transferCountWithoutWalking > 0 &&
						transferStationsWithoutWalking.length > 0 && (
							<span className="ml-2 text-sm text-green-600 font-medium">
								🚆 via {transferStationsWithoutWalking.join(", ")}
							</span>
						)}
				</div>
				<div className="text-right">
					<div className="text-sm text-foreground/60">
						<JourneyDuration journey={journey} />
					</div>
					<div className="text-lg font-bold text-foreground">
						{priceDisplay}
					</div>
				</div>
			</div>

			{/* Route Summary */}
			<div className="text-sm text-foreground/70 mb-2">
				{firstLeg?.origin?.name || "Unbekannt"} →{" "}
				{lastLeg?.destination?.name || "Unbekannt"}
				{transferCountWithoutWalking > 0 && (
					<span className="ml-2 text-xs text-orange-600">
						({transferCountWithoutWalking} Umstieg
						{transferCountWithoutWalking > 1 ? "e" : ""})
					</span>
				)}
			</div>

			{/* Journey Legs - Similar to SplitOptions segments */}
			<div className="text-xs text-foreground/60 space-y-3 mb-3">
				{journey.legs
					.filter((leg) => !leg.walking)
					.map((leg, legIndex) => (
						<LegDetails key={legIndex} leg={leg} legIndex={legIndex} />
					))}
			</div>

			{/* Journey Summary - Similar to SplitOptions pricing summary */}
			<div className="border-t pt-3 flex justify-between items-center">
				<div>
					<div className="text-sm font-medium text-foreground/80">
						Gesamt: {priceDisplay}
					</div>
					<div className="text-xs text-foreground/70">
						{travelClass === "1" ? "1. Klasse" : "2. Klasse"}
						{transferCountWithoutWalking > 0 &&
							transferStationsWithoutWalking.length > 0 && (
								<span className="ml-2">
									• {transferCountWithoutWalking} Umstieg
									{transferCountWithoutWalking > 1 ? "e" : ""}
								</span>
							)}
					</div>
				</div>
				<div className="text-right">
					<div className="text-xs text-foreground/60">
						<JourneyDuration journey={journey} />
					</div>
					<div className="text-xs text-blue-600">
						{firstLeg?.departure.toLocaleDateString("de-DE", {
							day: "2-digit",
							month: "2-digit",
						})}{" "}
						• {formatTime(firstLeg?.departure)}-{formatTime(lastLeg?.arrival)}
					</div>
				</div>
			</div>
		</div>
	);
};
