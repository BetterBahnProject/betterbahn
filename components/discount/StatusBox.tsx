export interface Progress {
	checked: number;
	total: number;
	currentStation: string | null;
}

export const StatusBox = ({
	progress: { checked, currentStation, total },
}: {
	progress: Progress;
}) => (
	<div className="bg-primary text-white rounded-lg flex flex-col items-center p-3 gap-2">
		<div className="flex items-center justify-center gap-3">
			<div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent" />
			<span className="text-xl italic">Prüfe {currentStation}...</span>
		</div>

		{/* Progress bar */}
		<div className="w-64 bg-foreground/20 rounded-full h-2">
			<div
				className="bg-white/90 h-2 rounded-full transition-[width]"
				style={{
					width: `${(checked / total) * 100}%`,
				}}
			></div>
		</div>

		{/* Progress information */}
		<div className="text-sm opacity-90">
			{Math.round((checked / total) * 100)}% — {checked} / {total} Stationen
			geprüft
		</div>
	</div>
);
