import React from 'react';
import { SubmissionStatus, SSHStatus } from '../types/database';

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
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
      break;
    case 'Sedang Dianalisis':
      badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium';
      break;
    case 'Draft Siap Dicairkan':
      badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
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

// SSH Status Badge: Sesuai, Di Atas, Di Bawah, Belum Ada (Section E)
export const SSHBadge: React.FC<{
  status?: SSHStatus;
  diff?: number | null;
  percentageDiff?: number | null;
  size?: 'sm' | 'md';
}> = ({ status = 'BELUM_ADA', diff, percentageDiff, size = 'sm' }) => {
  if (status === 'SESUAI') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title="Harga pengajuan sama dengan acuan standar SSH">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        SESUAI SSH
      </span>
    );
  }

  if (status === 'DI_ATAS' || status === 'MELEBIHI') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200" title={`Harga melebihi acuan SSH: +Rp${Number(diff || 0).toLocaleString('id-ID')} (${percentageDiff ? Math.round(percentageDiff) : 0}%)`}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
        DI ATAS SSH {diff ? `(+Rp${Number(diff).toLocaleString('id-ID')})` : ''}
      </span>
    );
  }

  if (status === 'DI_BAWAH') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200" title={`Harga di bawah acuan SSH (efisiensi): -Rp${Math.abs(Number(diff || 0)).toLocaleString('id-ID')}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        DI BAWAH SSH
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200" title="Item belum memiliki referensi harga standar di Master SSH">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
      BELUM ADA SSH
    </span>
  );
};
