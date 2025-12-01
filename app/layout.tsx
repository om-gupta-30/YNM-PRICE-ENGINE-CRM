import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import "react-datepicker/dist/react-datepicker.css";
import Footer from "@/components/layout/Footer";
import GlobalBackground from "@/components/layout/GlobalBackground";
import AuthGuard from "@/components/layout/AuthGuard";
import { UserProvider } from "@/contexts/UserContext";
import ClientLayout from "@/components/layout/ClientLayout";
import FloatingMascot from "@/components/animations/FloatingMascot";
import CelebrationEffect from "@/components/crm/CelebrationEffect";
import CelebrationToast from "@/components/crm/CelebrationToast";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "YNM Safety Price Engine",
  description: "Price calculation engine for MBCB, Signages, and Paint modules",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} dark`} suppressHydrationWarning style={{ overflowX: 'hidden', colorScheme: 'dark' }}>
      <body className="min-h-screen flex flex-col relative dark" style={{ transform: 'translateZ(0)', overflowX: 'hidden', backgroundColor: '#1A103C', color: '#F1F5F9' }}>
        {/* Global background - rendered once, never re-renders */}
        <GlobalBackground />
        
        <AuthGuard>
          <UserProvider>
            <ClientLayout>
              <CelebrationEffect />
              <CelebrationToast />
              <div className="flex-grow flex flex-col relative z-10 pointer-events-auto" style={{ transform: 'translateZ(0)' }}>
                <main className="flex-grow w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 relative z-10 pointer-events-auto page-transition-enter-active">
                  {children}
                </main>
              </div>
              <Footer />
            </ClientLayout>
          </UserProvider>
        </AuthGuard>
        <FloatingMascot />
      </body>
    </html>
  );
}

