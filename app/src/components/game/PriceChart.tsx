"use client";

import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  AreaSeries,
} from "lightweight-charts";

interface PriceChartProps {
  data: { time: number; value: number }[];
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    areaTopColor?: string;
    areaBottomColor?: string;
  };
}

export const PriceChart = (props: PriceChartProps) => {
  const {
    data,
    colors: {
      backgroundColor = "transparent",
      lineColor = "#2962FF",
      textColor = "#D9D9D9",
      areaTopColor = "#2962FF",
      areaBottomColor = "rgba(41, 98, 255, 0.28)",
    } = {},
  } = props;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      grid: {
        vertLines: { color: "rgba(197, 203, 206, 0.1)" },
        horzLines: { color: "rgba(197, 203, 206, 0.1)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
      },
    });

    const newSeries = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
    });

    if (data.length > 0) {
      newSeries.setData(data as any);
    }

    chartRef.current = chart;
    seriesRef.current = newSeries;

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [
    backgroundColor,
    textColor,
    lineColor,
    areaTopColor,
    areaBottomColor,
    data,
  ]); // Added data here to fix warning

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      seriesRef.current.setData(data as any);
    }
  }, [data]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
};
