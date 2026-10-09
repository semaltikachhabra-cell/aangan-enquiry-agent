import "./globals.css";
export const metadata = { title: "Aangan Studio — Enquiry Agent", description: "Phone enquiry agent + founder dashboard" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body>
      <nav><b>Aangan Studio</b><a href="/call">Simulate a call</a><a href="/dashboard">Founder dashboard</a></nav>
      <main>{children}</main>
    </body></html>
  );
}
