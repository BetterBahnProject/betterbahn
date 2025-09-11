"use client";
import { JourneyResults } from "@/components/JourneyResults";
import { ErrorDisplay } from "@/components/discount/ErrorDisplay";
import { OriginalJourneyCard } from "@/components/discount/OriginalJourneyCard";
import { SplitOptionsCard } from "@/components/discount/SplitOptionsCard";
import { StatusBox } from "@/components/discount/StatusBox";
import { LOADING_MESSAGES, STATUS } from "@/components/discount/constants";
import { useDiscountAnalysis } from "@/components/discount/useDiscountAnalysis";
import { trpcClient } from "@/utils/TRPCProvider";
import { searchForJourneys } from "@/utils/journeyUtils";
import type { ValidatedVendoJourney } from "@/utils/schemas";
import type { ExtractedData } from "@/utils/types";
import { type TRPCClientError } from "@trpc/client";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { z } from "zod/v4";
import type { AppRouter } from "../api/[trpc]/route";

function Discount() {
	const searchParams = useSearchParams();

	const {
		status,
		journeys,
		extractedData,
		error,
		selectedJourney,
		splitOptions,
		loadingMessage,
		progressInfo,
		setStatus,
		setJourneys,
		setExtractedData,
		setError,
		setSelectedJourney,
		setLoadingMessage,
		analyzeSplitOptions,
		handleJourneySelect,
	} = useDiscountAnalysis();

	useEffect(() => {
		const initializeFlow = async () => {
			try {
				const urlFromParams = searchParams.get("url");

				if (!urlFromParams) {
					throw new Error("Keine URL zum Parsen angegeben.");
				}

				// Parse URL
				setLoadingMessage(LOADING_MESSAGES.parsing);

				const journeyDetails = await trpcClient.parseUrl.query({
					url: urlFromParams,
				});

				const journeyData: ExtractedData = {
					fromStation: journeyDetails.fromStation,
					toStation: journeyDetails.toStation,
					fromStationId: journeyDetails.fromStationId,
					toStationId: journeyDetails.toStationId,
					date: journeyDetails.date,
					time: journeyDetails.time,
					travelClass:
						journeyDetails.class?.toString() ||
						searchParams.get("travelClass") ||
						"2",
					bahnCard: searchParams.get("bahnCard") ?? undefined,
					hasDeutschlandTicket:
						searchParams.get("hasDeutschlandTicket") === "true",
					passengerAge: searchParams.get("passengerAge") || "",
				};

				setExtractedData(journeyData);

				// Search for journeys
				setLoadingMessage(LOADING_MESSAGES.searching);

				const foundJourneys = (await searchForJourneys(
					journeyData
				)) as ValidatedVendoJourney[];

				setLoadingMessage("");

				if (foundJourneys.length === 1) {
					setLoadingMessage(LOADING_MESSAGES.single_journey_flow);
					setSelectedJourney(foundJourneys[0]);
					await analyzeSplitOptions(foundJourneys[0], journeyData);
				} else if (foundJourneys.length > 1) {
					setJourneys(foundJourneys);
					setStatus(STATUS.SELECTING);
				} else {
					setJourneys([]);
					setStatus(STATUS.DONE);
				}
			} catch (err) {
				const typedErr = err as { message: string };
				setError(typedErr.message);
				setStatus(STATUS.ERROR);

				if (
					z.object({ name: z.literal("TRPCClientError") }).safeParse(err)
						.success
				) {
					const trpcClientError = err as TRPCClientError<AppRouter>;

					if (trpcClientError.data?.zodError) {
						setError(trpcClientError.data.zodError);
					}
				}
			}
		};

		initializeFlow();
	}, [searchParams, analyzeSplitOptions]);

	// Computed values
	const getStatusMessage = () => {
		if (status === STATUS.ERROR) return null; // Don't show errors in StatusBox
		if (status === STATUS.DONE) return "Analyse abgeschlossen";
		return loadingMessage;
	};

	const isLoading = status === STATUS.LOADING || status === STATUS.ANALYZING;

	// Render helpers
	const renderContent = () => {
		if (status === STATUS.ERROR) {
			return (
				<div className="w-full">
					<ErrorDisplay error={error} />
				</div>
			);
		}

		return (
			<div className="w-full space-y-6">
				{/* Journey Selection */}
				{status === STATUS.SELECTING && (
					<div className="bg-background rounded-lg shadow p-6">
						<h3 className="font-semibold text-lg mb-4 text-foreground">
							Wähle deine Verbindung
						</h3>
						<JourneyResults
							journeys={journeys}
							travelClass={extractedData?.travelClass || "2"}
							onJourneySelect={handleJourneySelect}
							selectedJourney={selectedJourney}
						/>
					</div>
				)}

				{/* Comparison View */}
				{selectedJourney && extractedData && splitOptions && (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div className="bg-background rounded-lg shadow p-6">
							<OriginalJourneyCard
								extractedData={extractedData}
								selectedJourney={selectedJourney}
							/>
						</div>
						<div className="bg-background rounded-lg shadow p-6">
							<SplitOptionsCard
								splitOptions={splitOptions}
								selectedJourney={selectedJourney}
								extractedData={extractedData}
								status={status}
							/>
						</div>
					</div>
				)}
			</div>
		);
	};

	return (
		<section className="mt-16 w-full max-w-7xl mx-auto ">
			{getStatusMessage() && (
				<StatusBox
					message={getStatusMessage()!}
					isLoading={isLoading}
					progressInfo={progressInfo ?? undefined}
				/>
			)}
			{renderContent()}
		</section>
	);
}

export default function DiscountPage() {
	return (
		<Suspense fallback={<div>Laden...</div>}>
			<Discount />
		</Suspense>
	);
}
