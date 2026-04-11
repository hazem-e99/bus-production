'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface BarChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string[];
      borderColor?: string[];
    }[];
  };
  title?: string;
  height?: number;
}

export const BarChart = ({ data, title, height = 300 }: BarChartProps) => {
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
      bar: {
        borderRadius: 6,
        borderSkipped: false,
      },
    },
  };

  return (
    <div style={{ height }} className="p-4">
      <Bar options={options} data={data} />
    </div>
  );
};
