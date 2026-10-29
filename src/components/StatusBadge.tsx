import React from 'react';
import { SubmissionStatus } from '../types/database';

interface StatusBadgeProps {
  status: SubmissionStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';

  switch (status) {
    case 'Draft':
      badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';
      break;
    case 'Diajukan':
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'Sedang Dianalisis':
      badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      break;
    case 'Menunggu Persetujuan':
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'Disetujui':
      badgeStyle = 'bg-sky-50 text-sky-800 border-sky-300 font-semibold';
      break;
    case 'Siap Dicairkan':
      badgeStyle = 'bg-cyan-50 text-cyan-800 border-cyan-300 font-medium';
      break;
    case 'Dicairkan Sebagian':
      badgeStyle = 'bg-orange-50 text-orange-800 border-orange-300 font-medium';
      break;
    case 'Selesai Dicairkan':
      badgeStyle = 'bg-finance-navy text-white border-finance-navy font-semibold';
      break;
    case 'Ditolak':
      badgeStyle = 'bg-red-50 text-red-700 border-red-200 font-medium';
      break;
    case 'Dibatalkan':
      badgeStyle = 'bg-gray-100 text-gray-500 border-gray-300 line-through';
      break;
    default:
      badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  }[size];

  return (
    <span className={`inline-flex items-center rounded-md border ${badgeStyle} ${sizeClasses} whitespace-nowrap transition-colors`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
      {status}
    </span>
  );
};
