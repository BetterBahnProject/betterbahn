import { useEffect, useState } from "react";

export const useUrlParams = () => {
	const [hasDeutschlandTicket, setHasDeutschlandTicket] = useState(false);
	const [travelClass, setTravelClass] = useState("2");
	const [bahnCard, setBahnCard] = useState<string | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const searchParams = new URLSearchParams(window.location.search);

		setHasDeutschlandTicket(
			searchParams.get("hasDeutschlandTicket") === "true"
		);

		setTravelClass(searchParams.get("travelClass") || "2");
		setBahnCard(searchParams.get("bahnCard"));
	}, []);

	return { hasDeutschlandTicket, travelClass, bahnCard };
};
