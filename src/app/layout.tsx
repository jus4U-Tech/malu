import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "BBB da Malu",
    description: "Gerenciador de bolão do BBB da Malu",
    other: {
        "apple-mobile-web-app-capable": "yes",
        "apple-mobile-web-app-status-bar-style": "black-translucent",
        "theme-color": "#0c0508",
    },
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR">
            <body style={{ margin: 0, padding: 0, background: "#0d0d1a" }}>
                {children}
            </body>
        </html>
    );
}
