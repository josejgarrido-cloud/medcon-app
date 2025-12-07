import React, { useState } from 'react';
import { MedicalProcedure } from '../types';
import { Button } from './ui/Button';
import { Tag, Trash2 } from 'lucide-react';

interface ServiceManagerProps {
  procedures: MedicalProcedure[];
  onAddProcedure: (proc: MedicalProcedure) => void;
  onDeleteProcedure: (id: string) => void;
}

export const ServiceManager: React.FC<ServiceManagerProps> = ({ procedures, onAddProcedure, onDeleteProcedure }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;
    onAddProcedure({ id: crypto.randomUUID(), name, price: parseFloat(price) });
    setName(''); setPrice('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Crear Servicio</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="Nombre (ej. Eco)" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
          <input required type="number" placeholder="Precio ($)" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
          <Button type="submit" variant="success" className="w-full">Agregar</Button>
        </form>
      </div>
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        {procedures.map(proc => (
          <div key={proc.id} className="bg-white p-4 rounded-lg border border-slate-200 flex justify-between items-center">
             <div><h3 className="font-bold">{proc.name}</h3><p className="text-emerald-600">${proc.price}</p></div>
             <button onClick={() => onDeleteProcedure(proc.id)} className="text-red-400"><Trash2 size={18}/></button>
          </div>
        ))}
      </div>
    </div>
  );
};
