import React, { useState } from 'react';
import { Doctor } from '../types';
import { Button } from './ui/Button';
import { UserPlus, Phone, Mail, Percent } from 'lucide-react';

interface DoctorManagerProps {
  doctors: Doctor[];
  onAddDoctor: (doctor: Doctor) => void;
}

export const DoctorManager: React.FC<DoctorManagerProps> = ({ doctors, onAddDoctor }) => {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [consultShare, setConsultShare] = useState('50');
  const [procShare, setProcShare] = useState('40');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !specialty) return;
    onAddDoctor({
      id: crypto.randomUUID(),
      name, specialty, phone, email,
      consultationShare: parseFloat(consultShare) || 0,
      procedureShare: parseFloat(procShare) || 0,
    });
    setName(''); setSpecialty(''); setPhone(''); setEmail('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Registrar Médico</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="Nombre Completo" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
          <input required placeholder="Especialidad" value={specialty} onChange={e => setSpecialty(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="% Consulta" value={consultShare} onChange={e => setConsultShare(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            <input type="number" placeholder="% Proced." value={procShare} onChange={e => setProcShare(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <Button type="submit" className="w-full">Guardar</Button>
        </form>
      </div>
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        {doctors.map(doc => (
          <div key={doc.id} className="bg-white p-4 rounded-lg border border-slate-200">
             <h3 className="font-bold">{doc.name}</h3>
             <p className="text-sm text-medical-600">{doc.specialty}</p>
             <p className="text-xs text-slate-500 mt-2">Ganancia: {doc.consultationShare}% / {doc.procedureShare}%</p>
          </div>
        ))}
      </div>
    </div>
  );
};
