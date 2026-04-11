'use client';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, Filler);

export interface PieChartProps {
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

export const PieChart = ({ data, title, height = 300 }: PieChartProps) => {
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
    elements: {
      arc: {
        borderWidth: 2,
        borderColor: '#FFFFFF',
      },
    },
  };

  return (
    <div style={{ height }} className="p-4">
      <Pie options={options} data={data} />
    </div>
  );
};
