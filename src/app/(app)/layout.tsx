"use client";

import { AnalysisProvider } from "@/components/AnalysisProvider";
import { CountdownProviderWithRefresh } from "@/lib/countdown-context";
import { TimeframeProvider } from "@/lib/timeframe";
import { ToastContainer } from "@/components/OpportunityToast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TimeframeProvider>
      <AnalysisProvider>
        <CountdownProviderWithRefresh>
          {children}
          <ToastContainer />
        </CountdownProviderWithRefresh>
      </AnalysisProvider>
    </TimeframeProvider>
  );
}
