import type { SplitAnalysis } from "@/app/api/journeys/analyzeSingleSplit";
import type { VendoJourney } from "@/utils/schemas";
import { trpcClient } from "@/utils/TRPCProvider";
import type { ExtractedData, ProgressInfo } from "@/utils/types";
import { useCallback, useState } from "react";
import { LOADING_MESSAGES, STATUS, type Status } from "./constants";

export function useDiscountAnalysis() {
	const [status, setStatus] = useState<Status>(STATUS.LOADING);
	const [journeys, setJourneys] = useState<VendoJourney[]>([]);
	const [extractedData, setExtractedData] = useState<ExtractedData | null>(
		null
	);
	const [error, setError] = useState("");
	const [selectedJourney, setSelectedJourney] = useState<VendoJourney | null>(
		null
	);
	const [splitOptions, setSplitOptions] = useState<SplitAnalysis[] | null>(null);
	const [loadingMessage, setLoadingMessage] = useState(
		LOADING_MESSAGES.initial
	);
	const [progressInfo, setProgressInfo] = useState<ProgressInfo | null>(null);

	const analyzeSplitOptions = useCallback(
		(journey: VendoJourney, journeyData: ExtractedData) => {
			setStatus(STATUS.ANALYZING);
			setLoadingMessage(LOADING_MESSAGES.analyzing);
			setProgressInfo(null);

			trpcClient.splitJourney.subscribe(
				{
					originalJourney: journey,
					bahnCard: journeyData?.bahnCard
						? Number.parseInt(journeyData.bahnCard, 10)
						: undefined,
					hasDeutschlandTicket: journeyData?.hasDeutschlandTicket || false,
					passengerAge: journeyData?.passengerAge?.trim()
						? parseInt(journeyData.passengerAge.trim(), 10)
						: undefined,
					travelClass: Number.parseInt(journeyData?.travelClass ?? "2", 10),
				},
				{
					onData: (data) => {
						switch (data.type) {
							case "start": {
								setLoadingMessage("Analyse gestartet...");

								setProgressInfo({
									total: data.total,
									checked: 0,
								});

								break;
							}
							case "processing": {
								setLoadingMessage(
									`Prüfe ${data.currentStation}...`
								);

								setProgressInfo({
									total: progressInfo!.total,
									checked: data.checked,
									currentStation: data.currentStation,
								});

								break;
							}
							case "current-done": {
								setLoadingMessage(
									data.checked === data.total
										? "Analyse abgeschlossen"
										: `${progressInfo!.checked + 1}/${progressInfo!.total} Stationen geprüft`
								);

								setProgressInfo({
									total: progressInfo!.total,
									checked: progressInfo!.checked + 1,
									currentStation: progressInfo!.currentStation
								})

								break;
							}
							case "complete": {
								setSplitOptions(data.splitOptions);
								setStatus(STATUS.DONE);
								setProgressInfo(null);
								break;
							}
						}
					},
					onError(err) {
						const typedErr = err as { message?: string };
						console.error("Error analyzing split options:", err);
						setError(
							typedErr.message || "Fehler bei der Analyse der Split-Optionen."
						);
						setStatus(STATUS.ERROR);
						setProgressInfo(null);
					},
				}
			);
		},
		[]
	);

	const handleJourneySelect = useCallback(
		(journey: VendoJourney) => {
			setSelectedJourney(journey);
			setSplitOptions(null);

			if (extractedData) {
				analyzeSplitOptions(journey, extractedData);
			} else {
				setError("Reisedaten nicht gefunden, um Split-Analyse zu starten.");
				setStatus(STATUS.ERROR);
			}
		},
		[extractedData, analyzeSplitOptions]
	);

	return {
		// State
		status,
		journeys,
		extractedData,
		error,
		selectedJourney,
		splitOptions,
		loadingMessage,
		progressInfo,
		// Actions
		setStatus,
		setJourneys,
		setExtractedData,
		setError,
		setSelectedJourney,
		setSplitOptions,
		setLoadingMessage,
		setProgressInfo,
		// Handlers
		analyzeSplitOptions,
		handleJourneySelect,
	};
}
