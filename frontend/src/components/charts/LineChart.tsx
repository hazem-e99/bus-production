'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface LineChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string;
    }[];
  };
  title?: string;
  height?: number;
}

export const LineChart = ({ data, title, height = 300 }: LineChartProps) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            family: 'Inter, sans-serif',
            size: 12,
          },
        },
      },
      title: {
        display: !!title,
        text: title,
        font: {
          family: 'Inter, sans-serif',
          size: 16,
          weight: 600,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#6B7280',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        titleFont: {
          family: 'Inter, sans-serif',
          size: 14,
          weight: 600,
        },
        bodyFont: {
          family: 'Inter, sans-serif',
          size: 13,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: '#F3F4F6',
          borderColor: '#E5E7EB',
        },
        ticks: {
          font: {
            family: 'Inter, sans-serif',
            size: 12,
          },
          color: '#6B7280',
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#F3F4F6',
          borderColor: '#E5E7EB',
        },
        ticks: {
          font: {
            family: 'Inter, sans-serif',
            size: 12,
          },
          color: '#6B7280',
        },
      },
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
        borderWidth: 2,
        borderColor: '#FFFFFF',
      },
      line: {
        tension: 0.4,
        borderWidth: 3,
      },
    },
  };

  return (
    <div style={{ height }} className="p-4">
      <Line options={options} data={data} />
    </div>
  );
};
