import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Providers from "@/components/providers"
import { RootErrorBoundary } from "@/components/root-error-boundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ChatBot Pro - Business Dashboard",
  description: "Manage your business chatbot with ease",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RootErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </RootErrorBoundary>
      </body>
    </html>
  )
}
