"use client";

import type { SplitAnalysis } from "@/app/api/journeys/analyzeSingleSplit";
import { formatDuration, formatTime } from "@/utils/formatUtils";
import { getStationName } from "@/utils/journeyUtils";
import { formatPriceDE } from "@/utils/priceUtils";
import type { VendoJourney } from "@/utils/schemas";
import { useState } from "react";
import { getOptionsToShow } from "./getOptionsToShow";
import { Segment } from "./Segment";

// Komponente zur Anzeige von Split-Ticket Optionen
export const SplitOptions = ({
	splitOptions,
	originalJourney,
	loadingSplits,
	hasDeutschlandTicket,
	travelClass,
	bahnCard,
}: {
	splitOptions: SplitAnalysis[];
	originalJourney: VendoJourney;
	loadingSplits: unknown;
	hasDeutschlandTicket: boolean;
	travelClass: string;
	bahnCard: string | null;
}) => {
	// State für erweiterte Optionsanzeige (erste Option standardmäßig erweitert)
	const [expandedOption, setExpandedOption] = useState<number | null>(0);

	const optionsToDisplay = getOptionsToShow({
		splitOptions,
		hasDeutschlandTicket,
		originalJourney,
	});

	if (loadingSplits) {
		return (
			<div className="text-center py-4">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
				<p className="text-yellow-700">Analysiere Split-Ticket Optionen...</p>
			</div>
		);
	}

	if (!splitOptions || splitOptions.length === 0) {
		return (
			<div className="text-center py-4">
				<p className="text-foreground/70">
					Keine günstigeren Split-Ticket Optionen gefunden.
				</p>
				<p className="text-xs text-foreground/60 mt-1">
					Die direkte Verbindung scheint die kostengünstigste Option zu sein.
				</p>
			</div>
		);
	}

	return (
		<>
			<div className="space-y-4">
				{optionsToDisplay.map((splitOption, splitIndex) => {
					const splitPricing = splitOption.pricing;

					if (splitPricing.cannotShowPrice) {
						return (
							<div
								key={splitIndex}
								className="border border-primary rounded-lg p-4 "
							>
								<div className="text-orange-700">
									<div className="font-medium mb-1">
										Option {splitIndex + 1}
									</div>
									<div className="text-sm">
										⚠️ Preisberechnung für
										{splitPricing.hasFlixTrains ? " FlixTrain und" : ""}{" "}
										Regionalverkehr nicht möglich. Manuelle Prüfung
										erforderlich.
									</div>
								</div>
							</div>
						);
					}

					const isExpanded = expandedOption === splitIndex;
					const departureLeg = splitOption.segments[0].legs[0];
					const lastSegment =
						splitOption.segments[splitOption.segments.length - 1];
					const arrivalLeg = lastSegment.legs[lastSegment.legs.length - 1];

					const totalChanges =
						splitOption.segments.reduce(
							(acc, s) => acc + s.legs.length - 1,
							0
						) +
						(splitOption.segments.length - 1);

					return (
						<div
							key={splitIndex}
							className={`border rounded-lg overflow-hidden shadow-sm transition-all duration-300 ${
								splitPricing.hasPartialPricing
									? "border-orange-300 bg-background"
									: "border-foreground/20 bg-background"
							} ${isExpanded ? "shadow-lg" : ""}`}
						>
							<div
								className="p-4 cursor-pointer"
								onClick={() =>
									setExpandedOption(isExpanded ? null : splitIndex)
								}
							>
								<div className="flex items-start">
									<div className="flex flex-col items-center mr-4 pt-1">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-6 w-6 text-foreground/70"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											strokeWidth="1.5"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M6 20h12M6 16h12M8 16V9a4 4 0 014-4h0a4 4 0 014 4v7"
											/>
										</svg>
										<div className="h-16 w-px bg-foreground/30 my-2"></div>
										<div className="w-2.5 h-2.5 rounded-full bg-foreground/60"></div>
									</div>

									<div className="flex-grow">
										<div className="flex justify-between items-start">
											<div>
												<span className="font-bold text-xl">
													{formatTime(departureLeg.departure)}
												</span>
												<span className="ml-3 text-lg">
													{getStationName(departureLeg.origin)}
												</span>
											</div>
											<div className="text-right">
												{splitPricing.isFullyCovered ? (
													<div className="text-green-600">
														<div className="font-bold text-lg">
															Deutschland-Ticket
														</div>
														<div className="text-sm font-medium text-green-600">
															✓ Vollständig enthalten
														</div>
													</div>
												) : (
													<>
														<div className="font-bold text-lg text-green-600">
															Spare{" "}
															{splitPricing.adjustedSavings === null
																? "?"
																: formatPriceDE(splitPricing.adjustedSavings)}
														</div>
														<div className="text-xl font-bold text-foreground">
															{splitPricing.adjustedTotalPrice === null
																? "?"
																: formatPriceDE(
																		splitPricing.adjustedTotalPrice
																  )}
															{splitPricing.hasPartialPricing && (
																<span className="text-orange-600 ml-1">*</span>
															)}
														</div>
													</>
												)}
											</div>
										</div>

										<div className="text-sm text-foreground/60 my-2 pl-1 flex items-center">
											<span>
												{formatDuration({ legs: [departureLeg, arrivalLeg] }) ||
													"Dauer unbekannt"}
											</span>
											<span className="mx-2">·</span>
											<span>
												{totalChanges} Zwischenstopp
												{totalChanges === 1 ? "" : "s"}
											</span>
											<span className="ml-2 inline-block px-1.5 py-0.5 text-xs font-semibold text-red-700 border border-red-400 rounded-sm">
												DB
											</span>
										</div>

										{splitOption.splitStations &&
											splitOption.splitStations.length > 0 && (
												<div className="text-sm text-foreground/60 mt-1 pl-1">
													Über:{" "}
													<span className="font-medium text-blue-600">
														{splitOption.splitStations
															.map((s) => s?.name)
															.join(", ")}
													</span>
												</div>
											)}

										<div className="flex justify-between items-start mt-2">
											<div>
												<span className="font-bold text-xl">
													{formatTime(arrivalLeg.arrival)}
												</span>
												<span className="ml-3 text-lg">
													{getStationName(arrivalLeg.destination)}
												</span>
											</div>
										</div>
									</div>

									<div className="flex items-center h-full ml-2">
										<svg
											className={`w-6 h-6 foreground/50 transform transition-transform ${
												isExpanded ? "rotate-180" : ""
											}`}
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fillRule="evenodd"
												d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
								</div>
							</div>

							{isExpanded && (
								<div className="border-t border-foreground/20 mt-2">
									<div className="px-4 py-3 bg-background/50/50">
										<h3 className="font-bold text-sm text-foreground mb-3">
											Die Teile deiner Reise
										</h3>
										<div className="space-y-2">
											{splitOption.segments.map((segment, segmentIndex) => (
												<Segment
													hasDeutschlandTicket={hasDeutschlandTicket}
													index={segmentIndex}
													segment={segment}
													segmentsWithoutPricing={
														splitPricing.segmentsWithoutPricing
													}
													key={segmentIndex}
													travelClass={travelClass}
													bahnCard={bahnCard}
												/>
											))}
										</div>
										{splitPricing.hasPartialPricing && (
											<div className="mt-3 text-xs text-foreground p-2 bg-background rounded-md border border-orange-200">
												* Einige Segmente haben unbekannte Preise (z.B.
												Regional- züge, FlixTrain). Der Gesamtpreis und die
												Ersparnis basieren auf verfügbaren Daten.
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</>
	);
};
