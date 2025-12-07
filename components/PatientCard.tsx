import React, { useState, useEffect } from 'react';
import { Patient, PatientStatus, Doctor } from '../types';
import { Button } from './ui/Button';
import { Clock, User, CheckCircle, ArrowRight, Activity, MapPin, Stethoscope, DollarSign } from 'lucide-react';

interface PatientCardProps {
  patient: Patient;
  doctor?: Doctor;
  onAdvance: (id: string) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, doctor, onAdvance }) => {
  const [elapsed, setElapsed] = useState('0m');

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      let diff = 0;
      if (patient.status === PatientStatus.WAITING) diff = now - patient.arrivalTime;
      else if (patient.status === PatientStatus.IN_CONSULTATION && patient.startConsultationTime) diff = now - patient.startConsultationTime;
      else return;
      const minutes = Math.floor(diff / 60000);
      setElapsed(`${minutes}m`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [patient]);

  return (
    <div className={`p-4 rounded-lg shadow-sm border border-slate-200 mb-3 bg-white`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-slate-100 text-slate-500"><User size={20} /></div>
          <div>
            <h3 className="font-bold text-slate-800">{patient.name}</h3>
            <p className="text-sm text-slate-500 mb-1">{patient.reason}</p>
            {(patient.assignedDoctorId || patient.assignedRoom) && (
              <div className="flex items-center gap-3 text-xs font-medium text-slate-700">
                {doctor && <span className="flex items-center gap-1 text-medical-700"><Stethoscope size={12} /> Dr. {doctor.name}</span>}
                {patient.assignedRoom && <span className="flex items-center gap-1 text-slate-600"><MapPin size={12} /> {patient.assignedRoom}</span>}
              </div>
            )}
            <div className="flex gap-2 text-xs text-slate-600 mt-1">
               {patient.status === PatientStatus.WAITING && <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 rounded"><Clock size={12} /> Espera: {elapsed}</span>}
               {patient.status === PatientStatus.IN_CONSULTATION && <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 rounded"><Activity size={12} /> Consulta: {elapsed}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
           {patient.status === PatientStatus.WAITING && (
             <Button onClick={() => onAdvance(patient.visitId)} size="sm" variant="primary">Asignar <ArrowRight className="w-4 h-4 ml-1" /></Button>
           )}
           {patient.status === PatientStatus.IN_CONSULTATION && (
             <Button onClick={() => onAdvance(patient.visitId)} size="sm" variant="success">Finalizar <CheckCircle className="w-4 h-4 ml-1" /></Button>
           )}
           {patient.status === PatientStatus.COMPLETED && patient.totalCost && (
             <span className="text-xs font-bold text-emerald-600 flex items-center"><DollarSign size={10} /> {patient.totalCost.toFixed(2)}</span>
           )}
        </div>
      </div>
    </div>
  );
};
