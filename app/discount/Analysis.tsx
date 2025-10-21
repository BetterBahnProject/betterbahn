import { OriginalJourneyCard } from "@/components/discount/OriginalJourneyCard";
import { SplitOptionsCardContent } from "@/components/discount/SplitOptionsCard";
import type { Progress } from "@/components/discount/StatusBox";
import type { VendoJourney } from "@/utils/schemas";
import { trpc } from "@/utils/TRPCProvider";
import { useState, type Dispatch } from "react";
import type { SplitAnalysis } from "../api/analyzeJourney";
import { useUrlParams } from "./useUrlParams";

interface Props {
	journey: VendoJourney;
	setProgress: Dispatch<Progress | null>;
	setAnalysisError: Dispatch<string>;
}

export const ComparisonView = ({
	journey,
	setProgress,
	setAnalysisError,
}: Props) => {
	const params = useUrlParams();
	const [splitOptions, setSplitPoints] = useState<SplitAnalysis[] | null>(null);

	const analysisSubscription = trpc.analyzeJourney.useSubscription(
		{ ...params, journey },
		{
			onError: (err) => setAnalysisError(err.message),
			onData(data) {
				switch (data.type) {
					case "processing": {
						setProgress(data);
						break;
					}
					case "complete": {
						setProgress(null);
						setSplitPoints(data.splitOptions);
						break;
					}
				}
			},
		}
	);

	if (splitOptions === null) {
		return;
	}

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<div className="bg-background rounded-lg shadow p-6">
				<OriginalJourneyCard selectedJourney={journey} />
			</div>
			<div className="bg-background rounded-lg shadow p-6">
				<div className="space-y-6">
					<h3 className="font-semibold text-lg ">Split-Ticket Optionen</h3>
					<SplitOptionsCardContent
						loading={analysisSubscription.status === "pending"}
						splitOptions={splitOptions}
						selectedJourney={journey}
					/>
				</div>
			</div>
		</div>
	);
};
