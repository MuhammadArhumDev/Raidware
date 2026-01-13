import localFont from "next/font/local";
import "./globals.css";

const customSans = localFont({
  src: [
    {
      path: "../assets/fonts/Sans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/Sans-Medium.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-custom-sans",
  display: "swap",
});

export const metadata = {
  title: "Raidware - Cloud IoT Security Platform",
  description:
    "Cloud platform for secure IoT network management with sensor integration, mutual authentication, strong encryption, and IDS protection",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${customSans.className} antialiased bg-white text-gray-900 border-none outline-none`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
