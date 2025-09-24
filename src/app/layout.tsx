import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Note: VTF Justina HUM and DIN Next LT Arabic would be loaded from font files
// For now using system fonts that approximate the brand typography

export const metadata: Metadata = {
  title: "Will's Bleach Calculator | Will's Friends",
  description: "Discover how much bleach equivalent you're absorbing from chlorinated tap water every year. Get personalized results and learn about water filtration solutions for your family.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* iClosed widget loaded dynamically in ResultsDisplay component */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        {/* Iframe Height Communication Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                let lastHeight = 0;
                let resizeTimeout;

                function sendHeightToParent() {
                  const body = document.body;
                  const html = document.documentElement;

                  // Get the full height of the document
                  const height = Math.max(
                    body.scrollHeight,
                    body.offsetHeight,
                    html.clientHeight,
                    html.scrollHeight,
                    html.offsetHeight
                  );

                  // Add some padding to prevent clipping
                  const heightWithPadding = height + 50;

                  // Only send message if height actually changed
                  if (Math.abs(heightWithPadding - lastHeight) > 10) {
                    lastHeight = heightWithPadding;

                    try {
                      // Send message to parent window (HubSpot iframe container)
                      if (window.parent && window.parent !== window) {
                        window.parent.postMessage({
                          type: 'calculator-resize',
                          height: heightWithPadding,
                          source: 'willsbleachcalculator'
                        }, '*');

                        console.log('📐 Height message sent:', heightWithPadding);
                      }
                    } catch (error) {
                      console.warn('Could not send height message to parent:', error);
                    }
                  }
                }

                // Send initial height after page loads
                function initialize() {
                  // Wait for DOM to be fully loaded
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function() {
                      setTimeout(sendHeightToParent, 100);
                    });
                  } else {
                    setTimeout(sendHeightToParent, 100);
                  }

                  // Set up observers for height changes
                  if (window.ResizeObserver) {
                    const resizeObserver = new ResizeObserver(function() {
                      clearTimeout(resizeTimeout);
                      resizeTimeout = setTimeout(sendHeightToParent, 150);
                    });
                    resizeObserver.observe(document.body);
                  }

                  // Fallback: periodically check height
                  setInterval(sendHeightToParent, 1000);
                }

                // Make function globally available for manual triggers
                window.triggerHeightUpdate = sendHeightToParent;

                // Initialize when script loads
                initialize();
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
