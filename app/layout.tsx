import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "ATS Resume Tailor",
  description: "Upload master resumes, provide a job description, and generate an ATS-optimized tailored resume",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 lg:ml-64 min-h-screen pt-14 lg:pt-0">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
