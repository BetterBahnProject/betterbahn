import { SplitOptions } from "@/components/SplitOptions/SplitOptions";
import type { VendoJourney } from "@/utils/schemas";

interface Props {
	splitOptions: [];
	selectedJourney: VendoJourney;
	loading: boolean;
}

export const SplitOptionsCardContent = ({
	splitOptions,
	selectedJourney,
	loading,
}: Props) => {
	if (loading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-b-transparent mr-3" />
				<span className="">Analysiere Optionen...</span>
			</div>
		);
	}

	if (splitOptions.length === 0) {
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
	}

	return (
		<SplitOptions
			splitOptions={splitOptions}
			originalJourney={selectedJourney}
			loadingSplits={false}
		/>
	);
};
