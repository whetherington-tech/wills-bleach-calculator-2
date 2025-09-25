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

        {/* Iframe Height Communication Script - Anti-Loop Version */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                let lastHeight = 0;
                let resizeTimeout;
                let measurementCount = 0;
                let isResizing = false;

                function sendHeightToParent() {
                  // Prevent excessive measurements that cause loops
                  measurementCount++;
                  if (measurementCount > 50) {
                    console.warn('📐 Height measurement limit reached, stopping to prevent loops');
                    return;
                  }

                  // Prevent rapid-fire measurements
                  if (isResizing) {
                    return;
                  }

                  const body = document.body;
                  const html = document.documentElement;

                  // Get content height (NOT window height to avoid iframe feedback)
                  const contentHeight = Math.max(
                    body.scrollHeight,
                    body.offsetHeight,
                    html.scrollHeight,
                    html.offsetHeight
                  );

                  // Minimal padding to prevent clipping
                  const heightWithPadding = contentHeight + 20;

                  // Only send if change is significant (prevents micro-adjustments causing loops)
                  const heightDifference = Math.abs(heightWithPadding - lastHeight);
                  if (heightDifference > 15) {
                    lastHeight = heightWithPadding;
                    isResizing = true;

                    try {
                      if (window.parent && window.parent !== window) {
                        window.parent.postMessage({
                          type: 'calculator-resize',
                          height: heightWithPadding,
                          source: 'willsbleachcalculator'
                        }, '*');

                        console.log('📐 Height message sent:', heightWithPadding, '(measurement #' + measurementCount + ', diff: +' + heightDifference + 'px)');
                      }
                    } catch (error) {
                      console.warn('Could not send height message to parent:', error);
                    }

                    // Reset resize flag after a delay
                    setTimeout(() => {
                      isResizing = false;
                    }, 500);
                  }
                }

                // Send initial height after page loads
                function initialize() {
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function() {
                      setTimeout(sendHeightToParent, 300);
                    });
                  } else {
                    setTimeout(sendHeightToParent, 300);
                  }

                  // Less aggressive ResizeObserver
                  if (window.ResizeObserver) {
                    const resizeObserver = new ResizeObserver(function() {
                      clearTimeout(resizeTimeout);
                      resizeTimeout = setTimeout(sendHeightToParent, 400);
                    });
                    resizeObserver.observe(document.body);
                  }

                  // Reduced polling frequency to prevent loops
                  setInterval(sendHeightToParent, 3000);
                }

                // Make function globally available for manual triggers
                window.triggerHeightUpdate = function() {
                  // Reset measurement count on manual triggers
                  measurementCount = 0;
                  sendHeightToParent();
                };

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
