import { useSearchParams } from "next/navigation";

export const useUrlParams = () => {
	const searchParams = useSearchParams();

	return {
		bahnCard: searchParams.has("bahnCard")
			? Number.parseInt(searchParams.get("bahnCard")!, 10)
			: null,
		vbid: searchParams.get("vbid")!,
		travelClass: Number.parseInt(searchParams.get("travelClass")!, 10),
		hasDeutschlandTicket: searchParams.get("hasDeutschlandTicket") === "true",
		passengerAge: searchParams.get("passengerAge")
			? Number.parseInt(searchParams.get("passengerAge")!, 10)
			: undefined,
	};
};
