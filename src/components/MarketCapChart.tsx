"use client";

import dynamic from "next/dynamic";

const Chart = dynamic(() => import("./MarketCapChartInner"), { ssr: false });

export default Chart;
