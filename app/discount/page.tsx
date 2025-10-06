"use client";

import { JourneyResults } from "@/components/JourneyResults";
import { ErrorDisplay } from "@/components/discount/ErrorDisplay";
import { OriginalJourneyCard } from "@/components/discount/OriginalJourneyCard";
import { SplitOptionsCardContent } from "@/components/discount/SplitOptionsCard";
import { StatusBox } from "@/components/discount/StatusBox";
import { trpc } from "@/utils/TRPCProvider";
import type { VendoJourney } from "@/utils/schemas";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

const Discount = () => {
	const searchParams = useSearchParams();
	const [journeys, setJourneys] = useState<VendoJourney[]>([]);
	const [splitOptions, setSplitPoints] = useState<[] | null>(null);

	const [selectedJourney, setSelectedJourney] = useState<VendoJourney | null>(
		null
	);

	const sub = trpc.combi.useSubscription(
		{
			vbid: searchParams.get("vbid")!,
			travelClass: Number.parseInt(searchParams.get("travelClass")!, 10),
			bahnCard: searchParams.has("bahnCard")
				? Number.parseInt(searchParams.get("bahnCard")!, 10)
				: null,
			hasDeutschlandTicket: searchParams.get("hasDeutschlandTicket") === "true",
			passengerAge: searchParams.get("passengerAge")
				? Number.parseInt(searchParams.get("passengerAge")!, 10)
				: undefined,
		},
		{
			onData(data) {
				switch (data.type) {
					case "journeys": {
						setJourneys(data.journeys);
						break;
					}
					case "complete": {
						setSplitPoints(data.splitOptions);
						break;
					}
				}
			},
		}
	);

	return (
		<section className="mt-16 w-full max-w-7xl mx-auto ">
			{sub.data?.type === "processing" && (
				<StatusBox
					checked={sub.data.checked}
					total={sub.data.total}
					currentStation={sub.data.currentStation}
				/>
			)}
			{sub.status === "error" ? (
				<div className="w-full">
					<ErrorDisplay error={sub.error?.message} />
				</div>
			) : (
				<div className="w-full space-y-6">
					{/* Journey Selection */}
					<div className="bg-background rounded-lg shadow p-6">
						<h3 className="font-semibold text-lg mb-4 text-foreground">
							Wähle deine Verbindung
						</h3>
						<JourneyResults
							journeys={journeys}
							onJourneySelect={setSelectedJourney}
							selectedJourney={selectedJourney}
						/>
					</div>

					{/* Comparison View */}
					{selectedJourney && splitOptions && (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<div className="bg-background rounded-lg shadow p-6">
								<OriginalJourneyCard selectedJourney={selectedJourney} />
							</div>
							<div className="bg-background rounded-lg shadow p-6">
								<div className="space-y-6">
									<h3 className="font-semibold text-lg ">
										Split-Ticket Optionen
									</h3>
									<SplitOptionsCardContent
										loading={sub.status === "pending"}
										splitOptions={splitOptions}
										selectedJourney={selectedJourney}
									/>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</section>
	);
};

export default Discount;
