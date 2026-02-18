import type { Metadata } from "next";
import { AuthProvider } from "@/components/layout/auth-provider";
import { TopNav } from "@/components/layout/top-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Stamp",
  description: "A postcard-style social platform for status updates."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6">
            <TopNav />
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
