import type { SplitAnalysis } from "@/app/api/journeys/analyzeSingleSplit";
import { SplitOptions } from "@/components/SplitOptions/SplitOptions";
import type { VendoJourney } from "@/utils/schemas";
import type { ExtractedData } from "@/utils/types";

// Status constants
const STATUS = {
	LOADING: "loading",
	SELECTING: "selecting",
	ANALYZING: "analyzing",
	DONE: "done",
	ERROR: "error",
} as const;

type Status = (typeof STATUS)[keyof typeof STATUS];

interface SplitOptionsCardProps {
	splitOptions?: SplitAnalysis[];
	extractedData?: ExtractedData;
	selectedJourney?: VendoJourney;
	status?: Status;
}

export function SplitOptionsCard({
	splitOptions,
	selectedJourney,
	extractedData,
	status,
}: SplitOptionsCardProps) {
	const renderContent = () => {
		if (status === STATUS.SELECTING) {
			return (
				<p className="">
					Bitte wählen Sie eine Verbindung aus der Liste links aus.
				</p>
			);
		}

		if (!selectedJourney) {
			return <p className="">Keine Verbindung ausgewählt.</p>;
		}

		if (!splitOptions || status === STATUS.ANALYZING) {
			return (
				<div className="flex items-center justify-center py-8">
					<div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-b-transparent mr-3" />
					<span className="">Analysiere Optionen...</span>
				</div>
			);
		}

		if (splitOptions.length > 0) {
			return (
				<SplitOptions
					splitOptions={splitOptions}
					originalJourney={selectedJourney}
					loadingSplits={false}
					hasDeutschlandTicket={extractedData?.hasDeutschlandTicket || false}
					travelClass={extractedData?.travelClass || "2"}
					bahnCard={extractedData?.bahnCard || null}
				/>
			);
		}

		return (
			<div className="bg-background border border-card-border rounded-lg p-4 text-center">
				<p className="">
					Für diese Verbindung konnten keine günstigeren Split-Ticket Optionen
					gefunden werden.
				</p>
				<p className="text-sm mt-2">
					Das ursprüngliche Ticket ist bereits die beste Option.
				</p>
			</div>
		);
	};

	return (
		<div className="space-y-6">
			<h3 className="font-semibold text-lg ">Split-Ticket Optionen</h3>
			{renderContent()}
		</div>
	);
}
