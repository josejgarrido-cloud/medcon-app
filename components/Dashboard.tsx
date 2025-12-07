import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Patient, PatientStatus, Doctor } from '../types';
import { Button } from './ui/Button';
import { analyzeClinicFlow } from '../services/geminiService';
import { BrainCircuit, Loader2, Trophy, Wallet, Users, Clock, Filter, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DashboardProps { patients: Patient[]; doctors: Doctor[]; }

export const Dashboard: React.FC<DashboardProps> = ({ patients, doctors }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filter, setFilter] = useState('today');

  const filteredPatients = useMemo(() => {
    const now = new Date();
    return patients.filter(p => {
       if (p.status !== PatientStatus.COMPLETED) return false;
       const d = new Date(p.arrivalTime);
       if (filter === 'today') return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
       if (filter === 'month') return d.getMonth() === now.getMonth();
       return true;
    });
  }, [patients, filter]);

  const stats = useMemo(() => {
    const total = filteredPatients.length;
    const revenue = filteredPatients.reduce((acc, p) => acc + (p.totalCost || 0), 0);
    const clinicRev = filteredPatients.reduce((acc, p) => acc + (p.clinicEarnings || 0), 0);
    return { total, revenue, clinicRev };
  }, [filteredPatients]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await analyzeClinicFlow(filteredPatients, doctors);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-3 rounded-xl border">
        <div className="flex items-center gap-2"><Filter size={18} /> <span>Filtro:</span> 
          <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-slate-50 border rounded p-1">
            <option value="today">Hoy</option><option value="month">Este Mes</option><option value="all">Todo</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border shadow-sm"><p className="text-sm uppercase text-slate-500">Pacientes</p><p className="text-3xl font-bold">{stats.total}</p></div>
        <div className="bg-white p-6 rounded-xl border shadow-sm"><p className="text-sm uppercase text-slate-500">Ingresos Totales</p><p className="text-3xl font-bold text-emerald-600">${stats.revenue}</p></div>
        <div className="bg-white p-6 rounded-xl border shadow-sm"><p className="text-sm uppercase text-slate-500">Ganancia Clínica</p><p className="text-3xl font-bold text-blue-600">${stats.clinicRev}</p></div>
      </div>

      <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
         <div className="flex justify-between mb-4">
            <h3 className="font-bold flex gap-2"><BrainCircuit /> Análisis IA</h3>
            <Button onClick={handleAnalyze} disabled={isAnalyzing || stats.total === 0} variant="secondary">
              {isAnalyzing ? "Analizando..." : "Generar Reporte"}
            </Button>
         </div>
         {aiAnalysis && <div className="prose bg-white/50 p-4 rounded h-64 overflow-y-auto"><ReactMarkdown>{aiAnalysis}</ReactMarkdown></div>}
      </div>
    </div>
  );
};
