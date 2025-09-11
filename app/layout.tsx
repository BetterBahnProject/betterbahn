import { Navbar } from "@/components/Layout/Navbar";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { TRPCReactProvider } from "@/utils/TRPCProvider";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata = {
	title: "Better Bahn - Split-Ticketing",
	description: "Eine App von Lukas Weihrauch",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<TRPCReactProvider>
			<html lang="de">
				<body
					className={`${geistSans.variable} ${geistMono.variable} antialiased container mx-auto px-2 py-6`}
				>
					<Navbar />
					{children}
				</body>
			</html>
		</TRPCReactProvider>
	);
}
