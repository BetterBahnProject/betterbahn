import type { VendoJourney } from "@/utils/schemas";
import { JourneyCard } from "./JourneyCard/JourneyCard";

interface Props {
	isSelected?: boolean;
	onClick: () => void;
	journey: VendoJourney;
}

export const Journey = ({ journey, onClick, isSelected }: Props) => (
	<div
		className={`space-y-3 transition-colors p-2 rounded-lg ${
			isSelected ? "ring-2 ring-blue-500 bg-blue-500/10" : ""
		}`}
	>
		<JourneyCard journey={journey} isSelected={isSelected} onClick={onClick} />

		{isSelected && (
			<p className="p-3 bg-blue-500/15 rounded-lg border-l-4 border-blue-500 text-blue-600 dark:text-blue-400 text-sm">
				✅ Diese Verbindung ausgewählt - Scroll nach unten für Split-Ticket
				Analyse
			</p>
		)}
	</div>
);
