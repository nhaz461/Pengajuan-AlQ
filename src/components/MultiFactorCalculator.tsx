import React from 'react';
import { MultiFactor } from '../types/database';
import { Plus, Trash2, Calculator, Info } from 'lucide-react';

interface MultiFactorCalculatorProps {
  unitPrice: number;
  factors: MultiFactor[];
  onChangeFactors: (newFactors: MultiFactor[]) => void;
  onTotalCalculated: (total: number, effectiveVolume: number) => void;
  disabled?: boolean;
}

export const MultiFactorCalculator: React.FC<MultiFactorCalculatorProps> = ({
  unitPrice,
  factors,
  onChangeFactors,
  onTotalCalculated,
  disabled = false
}) => {
  // Add a new factor
  const handleAddFactor = () => {
    const newFactor: MultiFactor = {
      id: `factor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: '',
      value: 1,
      satuan: ''
    };
    const updated = [...factors, newFactor];
    onChangeFactors(updated);
    recalculate(unitPrice, updated);
  };

  // Remove factor
  const handleRemoveFactor = (id: string) => {
    const updated = factors.filter(f => f.id !== id);
    onChangeFactors(updated);
    recalculate(unitPrice, updated);
  };

  // Update specific factor
  const handleUpdateFactor = (id: string, field: keyof MultiFactor, val: any) => {
    let cleanVal = val;
    if (field === 'value') {
      // Validate non-negative and reasonable limits
      const num = parseFloat(val);
      if (isNaN(num) || num < 0) {
        cleanVal = 0;
      } else if (num > 1000000) {
        cleanVal = 1000000; // prevent absurd volume inputs
      } else {
        cleanVal = num;
      }
    }

    const updated = factors.map(f => (f.id === id ? { ...f, [field]: cleanVal } : f));
    onChangeFactors(updated);
    recalculate(unitPrice, updated);
  };

  const recalculate = (price: number, currentFactors: MultiFactor[]) => {
    if (currentFactors.length === 0) {
      onTotalCalculated(price, 1);
      return;
    }

    const effectiveVolume = currentFactors.reduce((acc, f) => acc * (Number(f.value) || 0), 1);
    const total = Math.round(price * effectiveVolume * 100) / 100;
    onTotalCalculated(total, effectiveVolume);
  };

  const calculatedVolume = factors.length > 0 
    ? factors.reduce((acc, f) => acc * (Number(f.value) || 0), 1)
    : 1;
  const grandTotal = Math.round(unitPrice * calculatedVolume * 100) / 100;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 font-medium text-slate-800">
          <Calculator className="w-4 h-4 text-finance-blue" />
          <span>Faktor Perkalian Volume Dinamis (Multivolume)</span>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={handleAddFactor}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-finance-blue bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Faktor
          </button>
        )}
      </div>

      {factors.length === 0 ? (
        <div className="text-xs text-slate-500 py-2 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Tidak ada faktor tambahan. Volume menggunakan nilai standar 1. Klik "Tambah Faktor" jika memiliki perkalian (contoh: Mapel × Siswa × Hari).</span>
        </div>
      ) : (
        <div className="space-y-2">
          {factors.map((factor, index) => (
            <div key={factor.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border border-slate-200 shadow-sm">
              <div className="col-span-1 text-xs font-semibold text-slate-400 text-center">
                #{index + 1}
              </div>
              <div className="col-span-4">
                <input
                  type="text"
                  placeholder="Nama Faktor (cth: Siswa, Hari)"
                  value={factor.name}
                  disabled={disabled}
                  onChange={(e) => handleUpdateFactor(factor.id, 'name', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:border-finance-blue focus:ring-1 focus:ring-finance-blue"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Nilai"
                  value={factor.value === 0 ? '' : factor.value}
                  disabled={disabled}
                  onChange={(e) => handleUpdateFactor(factor.id, 'value', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-right focus:border-finance-blue focus:ring-1 focus:ring-finance-blue"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="text"
                  placeholder="Satuan (cth: Org, Hari)"
                  value={factor.satuan}
                  disabled={disabled}
                  onChange={(e) => handleUpdateFactor(factor.id, 'satuan', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:border-finance-blue focus:ring-1 focus:ring-finance-blue"
                />
              </div>
              <div className="col-span-1 text-right">
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFactor(factor.id)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Hapus faktor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Real-time formula breakdown */}
      <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-1 font-mono">
          <span className="font-semibold text-slate-800">Rp{unitPrice.toLocaleString('id-ID')}</span>
          {factors.map((f, i) => (
            <span key={f.id} className="text-slate-500">
              × {f.value} {f.satuan || f.name || `Faktor${i + 1}`}
            </span>
          ))}
          {factors.length > 0 && (
            <span className="text-finance-blue font-semibold ml-1">
              (Vol: {calculatedVolume.toLocaleString('id-ID')})
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="text-slate-500 mr-1.5">Total:</span>
          <span className="text-sm font-bold text-finance-navy font-mono">
            Rp{grandTotal.toLocaleString('id-ID')}
          </span>
        </div>
      </div>
    </div>
  );
};
