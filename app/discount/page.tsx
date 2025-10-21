"use client";

import { Suspense } from "react";
import { DiscountContent } from "./DiscountContent";

const Discount = () => (
	<section className="mt-16 w-full max-w-7xl mx-auto ">
		{/* Suspense is for useSearchParams https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout */}
		<Suspense>
			<DiscountContent />
		</Suspense>
	</section>
);

export default Discount;
