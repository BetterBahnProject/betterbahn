import { ErrorDisplay } from "@/components/discount/ErrorDisplay";
import { StatusBox, type Progress } from "@/components/discount/StatusBox";
import { Journey } from "@/components/Journey";
import type { VendoJourney } from "@/utils/schemas";
import { trpc } from "@/utils/TRPCProvider";
import { useState } from "react";
import { ComparisonView } from "./Analysis";
import { useUrlParams } from "./useUrlParams";

export const DiscountContent = () => {
	const params = useUrlParams();
	const journeysQuery = trpc.getJourney.useQuery(params);

	const [analysisProgress, setAnalysisProgress] = useState<Progress | null>(
		null
	);

	const [analysisError, setAnalysisError] = useState<string | null>(null);

	const [selectedJourney, setSelectedJourney] = useState<VendoJourney | null>(
		null
	);

	if (journeysQuery.isError) {
		return <ErrorDisplay error={journeysQuery.error.message} />;
	}

	if (analysisError) {
		return <ErrorDisplay error={analysisError} />;
	}

	if (journeysQuery.isLoading) {
		return (
			<div className="bg-primary text-white rounded-lg flex gap-3 justify-center items-center p-3 text-xl italic">
				<div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent" />
				Lade Reise...
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{analysisProgress !== null && <StatusBox progress={analysisProgress} />}

			<div className="rounded-lg shadow-md p-6 space-y-4">
				<div className="text-xl text-center font-bold text-foreground">
					Wähle deine Verbindung
				</div>
				{(journeysQuery.data ?? []).map((journey, index) => (
					<Journey
						key={index}
						journey={journey}
						isSelected={
							selectedJourney === journey || journeysQuery.data?.length === 1
						}
						onClick={() => setSelectedJourney(journey)}
					/>
				))}
			</div>

			{selectedJourney ? (
				<ComparisonView
					journey={selectedJourney}
					setProgress={setAnalysisProgress}
					setAnalysisError={setAnalysisError}
				/>
			) : (
				journeysQuery.isSuccess &&
				journeysQuery.data.length === 1 && (
					<ComparisonView
						journey={journeysQuery.data[0]}
						setProgress={setAnalysisProgress}
						setAnalysisError={setAnalysisError}
					/>
				)
			)}
		</div>
	);
};
