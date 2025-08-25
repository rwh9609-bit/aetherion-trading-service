import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import useWebSocket from '../hooks/useWebSocket';

const LivePriceChart = ({ symbol }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const [currentPrice, setCurrentPrice] = useState(null);

  // State to hold the current OHLC bar being built
  const currentBar = useRef(null);
  // State to hold all historical OHLC bars
  const allBars = useRef([]);

  // Use the WebSocket hook to connect to the Go backend
  const { lastMessage, isConnected } = useWebSocket(`ws://localhost:8080/ws/marketdata`);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        backgroundColor: '#1a1a1a',
        textColor: 'rgba(255, 255, 255, 0.9)',
      },
      grid: {
        vertLines: {
          color: 'rgba(70, 70, 70, 0.5)',
        },
        horzLines: {
          color: 'rgba(70, 70, 70, 0.5)',
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
      },
    });

    const newSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickColor: '#747474',
    });

    seriesRef.current = newSeries;
    chartRef.current = chart;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // OHLC aggregation logic
  useEffect(() => {
    if (lastMessage && lastMessage.Symbol === symbol) {
      const price = lastMessage.Price;
      const time = Math.floor(lastMessage.Ts / 1000000000); // Convert nanoseconds to seconds

      setCurrentPrice(price);

      // Determine the bar time (e.g., start of a 5-second interval)
      const barTime = Math.floor(time / 5) * 5;

      if (!currentBar.current || currentBar.current.time !== barTime) {
        // New bar or first bar
        if (currentBar.current) {
          // Finalize the previous bar and add to allBars
          allBars.current.push(currentBar.current);
          seriesRef.current.update(currentBar.current); // Update chart with finalized bar
        }
        currentBar.current = {
          time: barTime,
          open: price,
          high: price,
          low: price,
          close: price,
        };
      } else {
        // Update existing bar
        currentBar.current.high = Math.max(currentBar.current.high, price);
        currentBar.current.low = Math.min(currentBar.current.low, price);
        currentBar.current.close = price;
      }
      // Always update the current bar on the chart for real-time visualization
      seriesRef.current.update(currentBar.current);
    }
  }, [lastMessage, symbol]);

  return (
    <div>
      <h2>Live Price for {symbol}: {currentPrice ? currentPrice.toFixed(2) : 'Loading...'}</h2>
      <div ref={chartContainerRef} style={{ position: 'relative', height: '400px' }}></div>
      {!isConnected && <p>Connecting to WebSocket...</p>}
    </div>
  );
};

export default LivePriceChart;