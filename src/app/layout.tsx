import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vórtex Invoice - Facturas para freelancers, sin límites",
  description:
    "Vórtex Invoice, de Vortex Company: crea facturas con emisor, cliente, ítems, impuestos y moneda, descárgalas en PDF y guarda un historial en tu propio equipo. Nada se sube a ningún servidor. Gratis, sin anuncios y 100% local.",
  keywords: [
    "Vórtex Invoice",
    "facturas online gratis",
    "facturas freelancers",
    "generador de facturas PDF",
    "facturación local",
    "sin anuncios",
  ],
  authors: [{ name: "Vortex Company" }],
  icons: {
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#161616"/><circle cx="24" cy="24" r="17" fill="none" stroke="#facc15" stroke-width="3.5"/><path d="M18 13h12v22l-3-2-3 2-3-2-3 2z" fill="none" stroke="#fde047" stroke-width="2.5" strokeLinejoin="round"/><path d="M20 20h8M20 24h8M20 28h5" stroke="#fde047" stroke-width="2" strokeLinecap="round"/></svg>`
      ),
  },
  openGraph: {
    title: "Vórtex Invoice - Facturas para freelancers, sin límites",
    description:
      "Vórtex Invoice, de Vortex Company: facturas con ítems, impuestos y PDF, con historial guardado en tu propio equipo. Gratis, sin anuncios y 100% local.",
    siteName: "Vórtex Invoice - Facturas para freelancers, sin límites",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-[#0f0f10] text-[#ececf1]">{children}</body>
    </html>
  );
}
