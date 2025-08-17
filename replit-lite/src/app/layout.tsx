import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Replit Lite",
	description: "Samohostowana mini-platforma do tworzenia stron",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="pl">
			<body className="antialiased">{children}</body>
		</html>
	);
}
