import React, { useState, useEffect } from 'react';
import { Patient, PatientStatus, Doctor, CLINIC_ROOMS, MedicalProcedure, PAYMENT_METHODS, PaymentMethod, PaymentRecord, PatientProfile } from './types';
import { PatientCard } from './components/PatientCard';
import { Dashboard } from './components/Dashboard';
import { DoctorManager } from './components/DoctorManager';
import { ServiceManager } from './components/ServiceManager';
import { Button } from './components/ui/Button';
import { LayoutDashboard, List, Stethoscope, UserPlus, Users, Tag, X, Plus, Trash2, Search, Check } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'dashboard' | 'doctors' | 'services'>('queue');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [procedures, setProcedures] = useState<MedicalProcedure[]>([]);
  const [patientDatabase, setPatientDatabase] = useState<PatientProfile[]>([]);

  // Modal States
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [assignModal, setAssignModal] = useState<{isOpen: boolean, patientId: string | null}>({isOpen: false, patientId: null});
  const [finishModal, setFinishModal] = useState<{isOpen: boolean, patientId: string | null}>({isOpen: false, patientId: null});
  
  // Forms
  const [formPatient, setFormPatient] = useState({name: '', cedula: '', isMinor: false, representativeName: '', birthDate: '', phone: '', email: '', reason: ''});
  const [searchResults, setSearchResults] = useState<PatientProfile[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  
  // Billing
  const [baseCost, setBaseCost] = useState('');
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<string[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');

  useEffect(() => {
    const savedDocs = localStorage.getItem('mediflow_doctors');
    const savedProcs = localStorage.getItem('mediflow_procedures');
    const savedDB = localStorage.getItem('mediflow_patient_db');
    const savedPatients = localStorage.getItem('mediflow_patients');
    if (savedDocs) setDoctors(JSON.parse(savedDocs));
    if (savedProcs) setProcedures(JSON.parse(savedProcs));
    if (savedDB) setPatientDatabase(JSON.parse(savedDB));
    if (savedPatients) setPatients(JSON.parse(savedPatients));
  }, []);

  useEffect(() => { localStorage.setItem('mediflow_doctors', JSON.stringify(doctors)); }, [doctors]);
  useEffect(() => { localStorage.setItem('mediflow_procedures', JSON.stringify(procedures)); }, [procedures]);
  useEffect(() => { localStorage.setItem('mediflow_patient_db', JSON.stringify(patientDatabase)); }, [patientDatabase]);
  useEffect(() => { localStorage.setItem('mediflow_patients', JSON.stringify(patients)); }, [patients]);

  const handleAddPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatient.name) return;
    let patientId = crypto.randomUUID();
    const existing = patientDatabase.find(p => p.cedula === formPatient.cedula || p.name.toLowerCase() === formPatient.name.toLowerCase());
    if (existing) {
       patientId = existing.id;
    } else {
       const newProfile = { id: patientId, ...formPatient };
       setPatientDatabase(prev => [...prev, newProfile]);
    }
    const newVisit: Patient = {
      id: patientId, visitId: crypto.randomUUID(), ...formPatient,
      status: PatientStatus.WAITING, arrivalTime: Date.now()
    };
    setPatients(prev => [newVisit, ...prev]);
    setIsPatientModalOpen(false);
    setFormPatient({name: '', cedula: '', isMinor: false, representativeName: '', birthDate: '', phone: '', email: '', reason: ''});
  };

  const handleAssignDoctor = () => {
    if (!assignModal.patientId || !selectedDoctorId || !selectedRoom) return;
    setPatients(prev => prev.map(p => p.visitId === assignModal.patientId ? {...p, status: PatientStatus.IN_CONSULTATION, assignedDoctorId: selectedDoctorId, assignedRoom: selectedRoom, startConsultationTime: Date.now()} : p));
    setAssignModal({isOpen: false, patientId: null});
  };

  const handleFinish = () => {
    if (!finishModal.patientId) return;
    const p = patients.find(pat => pat.visitId === finishModal.patientId);
    if (!p) return;
    const doc = doctors.find(d => d.id === p.assignedDoctorId);
    const base = parseFloat(baseCost) || 0;
    const procs = procedures.filter(pr => selectedProcedureIds.includes(pr.id));
    const procCost = procs.reduce((sum, pr) => sum + pr.price, 0);
    const total = base + procCost;
    let docEarn = 0;
    if (doc) {
       docEarn = (base * doc.consultationShare / 100) + procs.reduce((sum, pr) => sum + (pr.price * doc.procedureShare / 100), 0);
    }
    setPatients(prev => prev.map(pt => pt.visitId === finishModal.patientId ? {
      ...pt, status: PatientStatus.COMPLETED, endConsultationTime: Date.now(), baseCost: base, performedProcedures: procs, totalCost: total, payments, doctorEarnings: docEarn, clinicEarnings: total - docEarn
    } : pt));
    setFinishModal({isOpen: false, patientId: null});
  };

  const handleSearch = (q: string) => {
    if (!q) setSearchResults([]);
    else setSearchResults(patientDatabase.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.cedula.includes(q)));
  };

  const selectPatient = (p: PatientProfile) => {
    setFormPatient(prev => ({...prev, name: p.name, cedula: p.cedula, isMinor: p.isMinor, representativeName: p.representativeName || '', birthDate: p.birthDate, phone: p.phone, email: p.email}));
    setSearchResults([]);
  };

  const addPayment = () => {
    if(!paymentAmount || !paymentMethod) return;
    setPayments([...payments, {method: paymentMethod as PaymentMethod, amount: parseFloat(paymentAmount)}]);
    setPaymentAmount(''); setPaymentMethod('');
  };

  const currentP = patients.find(p => p.visitId === finishModal.patientId);
  const totalCostCalc = (parseFloat(baseCost) || 0) + procedures.filter(pr => selectedProcedureIds.includes(pr.id)).reduce((sum, pr) => sum + pr.price, 0);
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = totalCostCalc - paid;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <aside className="w-64 bg-white border-r hidden md:block p-4 space-y-1">
         <div className="flex items-center gap-2 text-medical-600 font-bold text-xl px-2 mb-6"><Stethoscope /> Medcon</div>
         <button onClick={() => setActiveTab('queue')} className={`w-full flex gap-3 px-3 py-2 rounded ${activeTab === 'queue' ? 'bg-medical-50 text-medical-600' : 'hover:bg-slate-50'}`}><List /> Sala de Espera</button>
         <button onClick={() => setActiveTab('dashboard')} className={`w-full flex gap-3 px-3 py-2 rounded ${activeTab === 'dashboard' ? 'bg-medical-50 text-medical-600' : 'hover:bg-slate-50'}`}><LayoutDashboard /> Reportes</button>
         <button onClick={() => setActiveTab('doctors')} className={`w-full flex gap-3 px-3 py-2 rounded ${activeTab === 'doctors' ? 'bg-medical-50 text-medical-600' : 'hover:bg-slate-50'}`}><Users /> Médicos</button>
         <button onClick={() => setActiveTab('services')} className={`w-full flex gap-3 px-3 py-2 rounded ${activeTab === 'services' ? 'bg-medical-50 text-medical-600' : 'hover:bg-slate-50'}`}><Tag /> Servicios</button>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
         <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0">
           <h1 className="font-bold text-lg capitalize">{activeTab}</h1>
           {activeTab === 'queue' && <Button onClick={() => setIsPatientModalOpen(true)}><UserPlus size={18} className="mr-2"/> Nuevo Ingreso</Button>}
         </header>

         <div className="flex-1 overflow-auto p-6 pb-24">
            {activeTab === 'queue' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
                 <div>
                    <h2 className="font-bold mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400"/> En Espera</h2>
                    {patients.filter(p => p.status === PatientStatus.WAITING).map(p => (
                       <PatientCard key={p.visitId} patient={p} onAdvance={(id) => {setAssignModal({isOpen: true, patientId: id}); setSelectedDoctorId(''); setSelectedRoom('');}} />
                    ))}
                 </div>
                 <div>
                    <h2 className="font-bold mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-medical-500"/> En Consulta</h2>
                    {patients.filter(p => p.status === PatientStatus.IN_CONSULTATION).map(p => (
                       <PatientCard key={p.visitId} patient={p} doctor={doctors.find(d => d.id === p.assignedDoctorId)} onAdvance={(id) => {setFinishModal({isOpen: true, patientId: id}); setBaseCost(''); setSelectedProcedureIds([]); setPayments([]);}} />
                    ))}
                 </div>
              </div>
            )}
            {activeTab === 'dashboard' && <Dashboard patients={patients} doctors={doctors} />}
            {activeTab === 'doctors' && <DoctorManager doctors={doctors} onAddDoctor={d => setDoctors([...doctors, d])} />}
            {activeTab === 'services' && <ServiceManager procedures={procedures} onAddProcedure={p => setProcedures([...procedures, p])} onDeleteProcedure={id => setProcedures(procedures.filter(p => p.id !== id))} />}
         </div>
      </main>

      {/* Modal Nuevo Paciente */}
      {isPatientModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between mb-4"><h3 className="font-bold text-lg">Nuevo Ingreso</h3><button onClick={() => setIsPatientModalOpen(false)}><X /></button></div>
              <form onSubmit={handleAddPatient} className="space-y-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                    <input className="w-full pl-10 border rounded p-2" placeholder="Buscar paciente..." onChange={e => handleSearch(e.target.value)} />
                    {searchResults.length > 0 && <div className="absolute top-full left-0 right-0 bg-white border shadow-lg mt-1 z-10">{searchResults.map(r => <div key={r.id} onClick={() => selectPatient(r)} className="p-2 hover:bg-slate-50 cursor-pointer">{r.name}</div>)}</div>}
                 </div>
                 <input required value={formPatient.name} onChange={e => setFormPatient({...formPatient, name: e.target.value})} placeholder="Nombre" className="w-full border p-2 rounded" />
                 <input value={formPatient.cedula} onChange={e => setFormPatient({...formPatient, cedula: e.target.value})} placeholder="Cédula" className="w-full border p-2 rounded" />
                 <label className="flex items-center gap-2"><input type="checkbox" checked={formPatient.isMinor} onChange={e => setFormPatient({...formPatient, isMinor: e.target.checked})} /> Es menor</label>
                 {formPatient.isMinor && <input value={formPatient.representativeName} onChange={e => setFormPatient({...formPatient, representativeName: e.target.value})} placeholder="Representante" className="w-full border p-2 rounded" />}
                 <textarea required value={formPatient.reason} onChange={e => setFormPatient({...formPatient, reason: e.target.value})} placeholder="Motivo" className="w-full border p-2 rounded" />
                 <Button type="submit" className="w-full">Registrar</Button>
              </form>
           </div>
        </div>
      )}

      {/* Modal Asignar */}
      {assignModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-md p-6">
              <h3 className="font-bold text-lg mb-4">Asignar Médico</h3>
              <select className="w-full border p-2 rounded mb-4" value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}>
                 <option value="">Seleccionar Médico...</option>
                 {doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>)}
              </select>
              <select className="w-full border p-2 rounded mb-4" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                 <option value="">Seleccionar Consultorio...</option>
                 {CLINIC_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <Button onClick={handleAssignDoctor} disabled={!selectedDoctorId || !selectedRoom} className="w-full">Confirmar</Button>
           </div>
        </div>
      )}

      {/* Modal Finalizar */}
      {finishModal.isOpen && currentP && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
               <h3 className="font-bold text-lg mb-4">Facturación</h3>
               <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                     <label>Costo Base</label>
                     <input type="number" value={baseCost} onChange={e => setBaseCost(e.target.value)} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                     <label>Procedimientos</label>
                     <div className="border p-2 h-32 overflow-y-auto rounded bg-slate-50">
                        {procedures.map(proc => (
                           <label key={proc.id} className="flex gap-2 items-center mb-1">
                              <input type="checkbox" checked={selectedProcedureIds.includes(proc.id)} onChange={() => setSelectedProcedureIds(prev => prev.includes(proc.id) ? prev.filter(id => id !== proc.id) : [...prev, proc.id])} />
                              <span className="text-sm">{proc.name} (${proc.price})</span>
                           </label>
                        ))}
                     </div>
                  </div>
               </div>
               <div className="bg-slate-50 p-4 rounded mb-4">
                  <h4 className="font-bold mb-2">Pagos (Restante: ${remaining.toFixed(2)})</h4>
                  <div className="flex gap-2 mb-2">
                     <select className="border p-1 rounded" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}><option value="">Método...</option>{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select>
                     <input type="number" className="border p-1 rounded w-24" placeholder="$" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                     <Button size="sm" onClick={addPayment} disabled={!paymentMethod || !paymentAmount}><Plus size={14}/></Button>
                  </div>
                  {payments.map((p, i) => <div key={i} className="flex justify-between text-sm border-b py-1"><span>{p.method}</span><span>${p.amount}</span></div>)}
               </div>
               <Button onClick={handleFinish} disabled={remaining > 0.1} variant="success" className="w-full">Cerrar Consulta</Button>
               {remaining > 0.1 && <p className="text-red-500 text-xs text-center mt-1">Debe cubrir el monto total.</p>}
            </div>
         </div>
      )}
    </div>
  );
};
export default App;
