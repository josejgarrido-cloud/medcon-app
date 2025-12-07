import React, { useState, useEffect, useRef } from 'react';
import { Patient, PatientStatus, Doctor, CLINIC_ROOMS, MedicalProcedure, PAYMENT_METHODS, PaymentMethod, PaymentRecord, PatientProfile, User, UserRole } from './types';
import { PatientCard } from './components/PatientCard';
import { Dashboard } from './components/Dashboard';
import { DoctorManager } from './components/DoctorManager';
import { ServiceManager } from './components/ServiceManager';
import { Button } from './components/ui/Button';
import { LayoutDashboard, List, Stethoscope, X, UserPlus, Users, Tag, DollarSign, Calculator, Plus, Trash2, Search, Check, Calendar, Save, Upload, AlertTriangle, Download, Settings, LogOut, Lock, Wallet, ArrowRight } from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [activeTab, setActiveTab] = useState<'queue' | 'dashboard' | 'doctors' | 'services' | 'settings'>('queue');
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- Data State with Safe Initialization ---
  const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return defaultValue;
      return JSON.parse(saved);
    } catch (e) {
      console.error(`Error loading ${key}`, e);
      return defaultValue;
    }
  };

  const [patients, setPatients] = useState<Patient[]>(() => loadFromStorage('mediflow_patients', []));
  const [doctors, setDoctors] = useState<Doctor[]>(() => loadFromStorage('mediflow_doctors', []));
  const [procedures, setProcedures] = useState<MedicalProcedure[]>(() => loadFromStorage('mediflow_procedures', []));
  const [patientDatabase, setPatientDatabase] = useState<PatientProfile[]>(() => loadFromStorage('mediflow_patient_db', []));
  
  // Queue Filters
  const [queueDate, setQueueDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modals State
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [assignModal, setAssignModal] = useState<{ isOpen: boolean; patientId: string | null }>({ isOpen: false, patientId: null });
  const [finishModal, setFinishModal] = useState<{ isOpen: boolean; patientId: string | null }>({ isOpen: false, patientId: null });

  // Add Patient Form State
  const [formPatient, setFormPatient] = useState({
    name: '',
    cedula: '',
    isMinor: false,
    representativeName: '',
    birthDate: '',
    phone: '',
    email: '',
    reason: ''
  });
  const [searchResults, setSearchResults] = useState<PatientProfile[]>([]);

  // Assignment Form State
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');

  // Finish/Billing Form State
  const [baseCost, setBaseCost] = useState('');
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<string[]>([]);
  
  // Split Payment State
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');

  // --- Persistence Effects ---
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('mediflow_patient_db', JSON.stringify(patientDatabase));
  }, [patientDatabase, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('mediflow_doctors', JSON.stringify(doctors));
  }, [doctors, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('mediflow_procedures', JSON.stringify(procedures));
  }, [procedures, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('mediflow_patients', JSON.stringify(patients)); 
  }, [patients, isLoaded]);

  // --- Backup & Restore Functions ---
  const handleBackup = () => {
    const data = {
      date: new Date().toISOString(),
      patients,
      doctors,
      procedures,
      patientDatabase
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Medcon_Respaldo_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRestoreFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) throw new Error("El archivo está vacío");

        const data = JSON.parse(content);
        
        // Validación básica
        if (!data.date && !Array.isArray(data.doctors)) {
            throw new Error("Formato inválido: Falta fecha o estructura de datos.");
        }

        const statsMsg = `
          - Pacientes en cola: ${data.patients?.length || 0}
          - Médicos: ${data.doctors?.length || 0}
          - Servicios: ${data.procedures?.length || 0}
          - Base de datos histórica: ${data.patientDatabase?.length || 0}
        `;

        if (window.confirm(`Archivo detectado correctamente.\nContenido encontrado:\n${statsMsg}\n\n¿Deseas restaurar estos datos? (Sobrescribirá lo actual)`)) {
          // Actualizamos los estados con arrays vacíos por defecto si no existen en el archivo
          setPatients(Array.isArray(data.patients) ? data.patients : []);
          setDoctors(Array.isArray(data.doctors) ? data.doctors : []);
          setProcedures(Array.isArray(data.procedures) ? data.procedures : []);
          setPatientDatabase(Array.isArray(data.patientDatabase) ? data.patientDatabase : []);
          
          alert("¡Datos restaurados con éxito!");
        }
      } catch (error: any) {
        console.error(error);
        alert(`Error crítico al leer archivo: ${error.message}`);
      } finally {
        // Limpiar el input para permitir subir el mismo archivo de nuevo si es necesario
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  // --- Login / Auth Component ---
  const LoginScreen = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      
      const u = username.trim();
      const p = password.trim();

      // Check predefined users first
      if (u === 'admin' && p === '1234') {
        setCurrentUser({ name: 'Administrador', role: 'admin', username: 'admin' });
        return;
      }
      
      if (u === 'asistente' && p === '0000') {
        setCurrentUser({ name: 'Asistente', role: 'assistant', username: 'asistente' });
        return;
      }

      // Check against doctors
      const foundDoctor = doctors.find(d => 
        d.username && d.username.toLowerCase() === u.toLowerCase() && 
        d.password === p
      );

      if (foundDoctor) {
        setCurrentUser({ 
          id: foundDoctor.id,
          name: foundDoctor.name, 
          role: 'doctor', 
          username: foundDoctor.username || ''
        });
        return;
      }

      setError('Credenciales incorrectas. Verifique usuario y contraseña.');
      setPassword('');
    };

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
           <div className="flex justify-center mb-6 text-medical-600">
             <Stethoscope size={48} />
           </div>
           <h1 className="text-2xl font-bold text-slate-800 mb-2">Bienvenido a Medcon</h1>
           <p className="text-slate-500 mb-6">Inicie sesión para continuar</p>
           
           <form onSubmit={handleLogin} className="space-y-4">
             <div className="text-left">
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usuario</label>
               <input 
                 type="text" 
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
                 className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none"
                 autoFocus
               />
             </div>
             
             <div className="text-left">
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña</label>
               <input 
                 type="password" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none"
               />
             </div>

             {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}
             
             <Button type="submit" className="w-full h-12 text-lg mt-4">
               Ingresar <ArrowRight className="ml-2 w-5 h-5"/>
             </Button>
           </form>
           
           <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400 grid grid-cols-2 gap-4 text-left">
             <div>
               <p className="font-bold">Administrador:</p>
               <p>Usuario: admin</p>
               <p>Clave: 1234</p>
             </div>
             <div>
               <p className="font-bold">Asistente:</p>
               <p>Usuario: asistente</p>
               <p>Clave: 0000</p>
             </div>
           </div>
        </div>
      </div>
    );
  };

  // --- App Logic Handlers ---

  const getFilteredPatients = () => {
    return patients.filter(p => {
      const pDate = new Date(p.arrivalTime);
      const selectedY = parseInt(queueDate.split('-')[0]);
      const selectedM = parseInt(queueDate.split('-')[1]) - 1; 
      const selectedD = parseInt(queueDate.split('-')[2]);

      return pDate.getFullYear() === selectedY && 
             pDate.getMonth() === selectedM && 
             pDate.getDate() === selectedD;
    });
  };

  const filteredQueuePatients = getFilteredPatients();

  const handleSearchPatient = (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const results = patientDatabase.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      p.cedula.includes(query)
    );
    setSearchResults(results);
  };

  const selectExistingPatient = (profile: PatientProfile) => {
    setFormPatient(prev => ({
      ...prev,
      name: profile.name,
      cedula: profile.cedula,
      isMinor: profile.isMinor,
      representativeName: profile.representativeName || '',
      birthDate: profile.birthDate,
      phone: profile.phone,
      email: profile.email
    }));
    setSearchResults([]);
  };

  const handleAddPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatient.name.trim()) return;

    let patientId: string = crypto.randomUUID();
    const existingPatient = patientDatabase.find(p => 
      (p.cedula && p.cedula === formPatient.cedula) || 
      (p.name.toLowerCase() === formPatient.name.toLowerCase())
    );

    if (existingPatient) {
      patientId = existingPatient.id;
      const updatedDB = patientDatabase.map(p => p.id === patientId ? { ...p, ...formPatient } : p);
      setPatientDatabase(updatedDB);
    } else {
      const newProfile: PatientProfile = { id: patientId, ...formPatient };
      setPatientDatabase(prev => [...prev, newProfile]);
    }

    const newVisit: Patient = {
      id: patientId, 
      visitId: crypto.randomUUID(), 
      ...formPatient,
      status: PatientStatus.WAITING,
      arrivalTime: Date.now()
    };

    setPatients(prev => [newVisit, ...prev]);
    setIsPatientModalOpen(false);
    setFormPatient({ name: '', cedula: '', isMinor: false, representativeName: '', birthDate: '', phone: '', email: '', reason: '' });
  };

  const onAdvancePatient = (visitId: string) => {
    const patient = patients.find(p => p.visitId === visitId);
    if (!patient) return;
    
    if (patient.status === PatientStatus.WAITING) {
      setAssignModal({ isOpen: true, patientId: visitId });
      if (currentUser?.role === 'doctor' && currentUser.id) {
        handleSelectDoctorForAssignment(currentUser.id);
      } else {
        setSelectedDoctorId('');
        setSelectedRoom('');
      }

    } else if (patient.status === PatientStatus.IN_CONSULTATION) {
      if (currentUser?.role === 'doctor' && patient.assignedDoctorId !== currentUser.id) {
        alert("Solo el médico asignado puede finalizar esta consulta.");
        return;
      }
      setFinishModal({ isOpen: true, patientId: visitId });
      setBaseCost('');
      setSelectedProcedureIds([]);
      setPayments([]);
      setPaymentAmount('');
      setPaymentMethod('');
    }
  };

  const handleAssignDoctor = () => {
    if (!assignModal.patientId || !selectedDoctorId || !selectedRoom) return;
    setPatients(prev => prev.map(p => {
      if (p.visitId === assignModal.patientId) {
        return {
          ...p,
          status: PatientStatus.IN_CONSULTATION,
          assignedDoctorId: selectedDoctorId,
          assignedRoom: selectedRoom,
          startConsultationTime: Date.now()
        };
      }
      return p;
    }));
    setAssignModal({ isOpen: false, patientId: null });
  };

  const handleSelectDoctorForAssignment = (docId: string) => {
    setSelectedDoctorId(docId);
    const doc = doctors.find(d => d.id === docId);
    if (doc && doc.defaultRoom) {
      setSelectedRoom(doc.defaultRoom);
    } else {
      setSelectedRoom('');
    }
  };

  const handleAddPayment = () => {
    if (!paymentAmount || !paymentMethod) return;
    setPayments(prev => [...prev, { method: paymentMethod as PaymentMethod, amount: parseFloat(paymentAmount) }]);
    setPaymentAmount('');
    setPaymentMethod('');
  };

  const removePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleProcedure = (id: string) => {
    setSelectedProcedureIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
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
       const baseShare = (base * doc.consultationShare) / 100;
       const procShare = procs.reduce((sum, pr) => sum + ((pr.price * doc.procedureShare) / 100), 0);
       docEarn = baseShare + procShare;
    }

    setPatients(prev => prev.map(pt => pt.visitId === finishModal.patientId ? {
      ...pt, 
      status: PatientStatus.COMPLETED, 
      endConsultationTime: Date.now(), 
      baseCost: base, 
      performedProcedures: procs, 
      totalCost: total, 
      payments, 
      doctorEarnings: docEarn, 
      clinicEarnings: total - docEarn
    } : pt));
    setFinishModal({ isOpen: false, patientId: null });
  };

  // --- Handlers for Manager Components ---
  const handleUpdateDoctor = (updatedDoc: Doctor) => {
    setDoctors(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
  };

  const handleDeleteDoctor = (id: string) => {
    setDoctors(prev => prev.filter(d => d.id !== id));
  };

  const handleUpdateProcedure = (updatedProc: MedicalProcedure) => {
    setProcedures(prev => prev.map(p => p.id === updatedProc.id ? updatedProc : p));
  };

  const handleDeleteProcedure = (id: string) => {
    setProcedures(prev => prev.filter(p => p.id !== id));
  };

  // --- Computed Values for Modals ---
  const currentP = patients.find(p => p.visitId === finishModal.patientId);
  const totalCostCalc = (parseFloat(baseCost) || 0) + procedures.filter(pr => selectedProcedureIds.includes(pr.id)).reduce((sum, pr) => sum + pr.price, 0);
  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = totalCostCalc - paidAmount;

  // --- Render ---
  
  if (!currentUser) {
    return <LoginScreen />;
  }

  // Sidebar Visibility
  const showDashboard = currentUser.role === 'admin' || currentUser.role === 'doctor';
  const showDoctors = currentUser.role === 'admin' || currentUser.role === 'assistant';
  const showSettings = currentUser.role === 'admin';
  const canAddPatient = currentUser.role === 'admin' || currentUser.role === 'assistant';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <aside className="w-64 bg-white border-r hidden md:flex flex-col p-4 space-y-1 h-screen sticky top-0">
         <div className="flex items-center gap-2 text-medical-600 font-bold text-xl px-2 mb-6">
           <Stethoscope /> Medcon
         </div>
         
         <div className="flex-1 space-y-1">
           <button onClick={() => setActiveTab('queue')} className={`w-full flex gap-3 px-3 py-2 rounded transition-colors ${activeTab === 'queue' ? 'bg-medical-50 text-medical-600 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}>
             <List size={20} /> Sala de Espera
           </button>
           
           {showDashboard && (
             <button onClick={() => setActiveTab('dashboard')} className={`w-full flex gap-3 px-3 py-2 rounded transition-colors ${activeTab === 'dashboard' ? 'bg-medical-50 text-medical-600 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}>
               <LayoutDashboard size={20} /> Reportes
             </button>
           )}
           
           {currentUser.role !== 'doctor' && (
             <button onClick={() => setActiveTab('doctors')} className={`w-full flex gap-3 px-3 py-2 rounded transition-colors ${activeTab === 'doctors' ? 'bg-medical-50 text-medical-600 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}>
               <Users size={20} /> Médicos
             </button>
           )}
           
           <button onClick={() => setActiveTab('services')} className={`w-full flex gap-3 px-3 py-2 rounded transition-colors ${activeTab === 'services' ? 'bg-medical-50 text-medical-600 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}>
             <Tag size={20} /> Servicios
           </button>

           {showSettings && (
             <button onClick={() => setActiveTab('settings')} className={`w-full flex gap-3 px-3 py-2 rounded transition-colors ${activeTab === 'settings' ? 'bg-medical-50 text-medical-600 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}>
               <Settings size={20} /> Ajustes
             </button>
           )}
         </div>

         <div className="pt-4 border-t border-slate-100">
            <div className="px-3 py-2 mb-2">
               <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
               <p className="text-xs text-slate-500 capitalize">
                 {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'doctor' ? 'Médico' : 'Asistente'}
               </p>
            </div>
            <button 
              onClick={() => setCurrentUser(null)}
              className="w-full flex gap-3 px-3 py-2 rounded text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} /> Cerrar Sesión
            </button>
         </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
         <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0 z-10">
           <div className="flex items-center gap-4">
              <h1 className="font-bold text-lg capitalize flex items-center gap-2">
                {activeTab === 'queue' && <><List size={20} className="text-medical-500"/> Sala de Espera</>}
                {activeTab === 'dashboard' && <><LayoutDashboard size={20} className="text-indigo-500"/> Reportes y Análisis</>}
                {activeTab === 'doctors' && <><Users size={20} className="text-blue-500"/> Gestión de Médicos</>}
                {activeTab === 'services' && <><Tag size={20} className="text-emerald-500"/> Catálogo de Servicios</>}
                {activeTab === 'settings' && <><Settings size={20} className="text-slate-500"/> Ajustes y Respaldo</>}
              </h1>
           </div>
           
           {activeTab === 'queue' && (
             <div className="flex gap-2">
               <div className="relative hidden sm:block">
                 <input 
                    type="date" 
                    value={queueDate}
                    onChange={(e) => setQueueDate(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-medical-500 outline-none"
                 />
               </div>
               {canAddPatient && (
                 <Button onClick={() => setIsPatientModalOpen(true)}>
                   <UserPlus size={18} className="mr-2"/> Nuevo Ingreso
                 </Button>
               )}
             </div>
           )}
         </header>

         <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6 custom-scrollbar bg-slate-50">
            {activeTab === 'queue' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1600px] mx-auto">
                 <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4 px-1">
                      <h2 className="font-bold text-slate-700 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm"/> 
                        En Espera
                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                          {filteredQueuePatients.filter(p => p.status === PatientStatus.WAITING).length}
                        </span>
                      </h2>
                    </div>
                    <div className="flex-1 space-y-3">
                      {filteredQueuePatients.filter(p => p.status === PatientStatus.WAITING).length === 0 ? (
                        <div className="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                           <List size={32} className="mx-auto mb-2 opacity-50"/>
                           <p className="text-sm">Sala de espera vacía</p>
                        </div>
                      ) : (
                        filteredQueuePatients.filter(p => p.status === PatientStatus.WAITING).map(p => (
                          <PatientCard key={p.visitId} patient={p} onAdvance={(id) => onAdvancePatient(id)} />
                        ))
                      )}
                    </div>
                 </div>

                 <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4 px-1">
                      <h2 className="font-bold text-slate-700 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-medical-500 shadow-sm"/> 
                        En Consulta
                        <span className="bg-medical-100 text-medical-700 text-xs px-2 py-0.5 rounded-full">
                          {filteredQueuePatients.filter(p => p.status === PatientStatus.IN_CONSULTATION).length}
                        </span>
                      </h2>
                    </div>
                    <div className="flex-1 space-y-3">
                      {filteredQueuePatients.filter(p => p.status === PatientStatus.IN_CONSULTATION).length === 0 ? (
                        <div className="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                           <Stethoscope size={32} className="mx-auto mb-2 opacity-50"/>
                           <p className="text-sm">No hay consultas activas</p>
                        </div>
                      ) : (
                        filteredQueuePatients.filter(p => p.status === PatientStatus.IN_CONSULTATION).map(p => (
                          <PatientCard key={p.visitId} patient={p} doctor={doctors.find(d => d.id === p.assignedDoctorId)} onAdvance={(id) => onAdvancePatient(id)} />
                        ))
                      )}
                    </div>
                 </div>

                 <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4 px-1">
                      <h2 className="font-bold text-slate-700 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm"/> 
                        Atendidos
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                          {filteredQueuePatients.filter(p => p.status === PatientStatus.COMPLETED).length}
                        </span>
                      </h2>
                    </div>
                    <div className="flex-1 space-y-3">
                      {filteredQueuePatients.filter(p => p.status === PatientStatus.COMPLETED).length === 0 ? (
                        <div className="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                           <Check size={32} className="mx-auto mb-2 opacity-50"/>
                           <p className="text-sm">Sin pacientes finalizados hoy</p>
                        </div>
                      ) : (
                         filteredQueuePatients.filter(p => p.status === PatientStatus.COMPLETED)
                         .sort((a,b) => (b.endConsultationTime || 0) - (a.endConsultationTime || 0))
                         .map(p => (
                           <PatientCard key={p.visitId} patient={p} doctor={doctors.find(d => d.id === p.assignedDoctorId)} onAdvance={() => {}} />
                         ))
                      )}
                    </div>
                 </div>
              </div>
            )}
            
            {activeTab === 'dashboard' && showDashboard && (
               <Dashboard 
                 patients={patients} 
                 doctors={doctors} 
                 currentUser={currentUser}
               />
            )}

            {activeTab === 'doctors' && currentUser.role !== 'doctor' && (
              <DoctorManager 
                doctors={doctors} 
                onAddDoctor={d => setDoctors(prev => [...prev, d])} 
                onUpdateDoctor={handleUpdateDoctor}
                onDeleteDoctor={handleDeleteDoctor}
                readOnly={currentUser.role === 'assistant'}
              />
            )}
            
            {activeTab === 'services' && (
              <ServiceManager 
                procedures={procedures} 
                onAddProcedure={p => setProcedures(prev => [...prev, p])} 
                onUpdateProcedure={handleUpdateProcedure}
                onDeleteProcedure={handleDeleteProcedure}
                readOnly={currentUser.role === 'assistant' || currentUser.role === 'doctor'}
              />
            )}

            {activeTab === 'settings' && currentUser.role === 'admin' && (
               <div className="max-w-2xl mx-auto space-y-8">
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
                     <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                        <Save size={32} />
                     </div>
                     <h2 className="text-xl font-bold text-slate-800 mb-2">Respaldo de Seguridad</h2>
                     <p className="text-slate-500 mb-6">Descarga una copia completa de tu base de datos (pacientes, médicos, historial) a tu computadora.</p>
                     <Button onClick={handleBackup} size="lg">
                        <Download className="mr-2 h-5 w-5" /> Descargar Copia de Seguridad
                     </Button>
                  </div>

                  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
                     <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                        <Upload size={32} />
                     </div>
                     <h2 className="text-xl font-bold text-slate-800 mb-2">Restaurar Datos</h2>
                     <p className="text-slate-500 mb-6">Sube un archivo de respaldo (.json) para recuperar tu información. <br/><strong className="text-amber-600">¡Cuidado! Esto sobrescribirá los datos actuales.</strong></p>
                     
                     <input 
                       type="file" 
                       accept=".json" 
                       ref={fileInputRef}
                       onChange={handleRestoreFile}
                       className="hidden"
                     />
                     <Button onClick={handleRestoreClick} variant="secondary" size="lg" className="border-amber-200 text-amber-700 hover:bg-amber-50">
                        <Upload className="mr-2 h-5 w-5" /> Subir Archivo de Respaldo
                     </Button>
                  </div>
               </div>
            )}
         </div>

         <nav className="md:hidden border-t bg-white flex justify-around p-2 sticky bottom-0 z-20 shadow-lg pb-safe">
           <button onClick={() => setActiveTab('queue')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'queue' ? 'text-medical-600 bg-medical-50' : 'text-slate-500'}`}>
             <List size={20} /> <span className="text-[10px] font-medium">Espera</span>
           </button>
           
           {showDashboard && (
             <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'dashboard' ? 'text-medical-600 bg-medical-50' : 'text-slate-500'}`}>
               <LayoutDashboard size={20} /> <span className="text-[10px] font-medium">Reportes</span>
             </button>
           )}
           
           {currentUser.role !== 'doctor' && (
             <button onClick={() => setActiveTab('doctors')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'doctors' ? 'text-medical-600 bg-medical-50' : 'text-slate-500'}`}>
               <Users size={20} /> <span className="text-[10px] font-medium">Médicos</span>
             </button>
           )}
           
           <button onClick={() => setActiveTab('services')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'services' ? 'text-medical-600 bg-medical-50' : 'text-slate-500'}`}>
             <Tag size={20} /> <span className="text-[10px] font-medium">Servicios</span>
           </button>

           {showSettings && (
             <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'settings' ? 'text-medical-600 bg-medical-50' : 'text-slate-500'}`}>
               <Settings size={20} /> <span className="text-[10px] font-medium">Ajustes</span>
             </button>
           )}

            <button onClick={() => setCurrentUser(null)} className={`flex flex-col items-center p-2 rounded-lg text-red-500`}>
             <LogOut size={20} /> <span className="text-[10px] font-medium">Salir</span>
           </button>
         </nav>
      </main>

      {isPatientModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="font-bold text-lg text-slate-800">Nuevo Ingreso</h3>
                <button onClick={() => setIsPatientModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleAddPatient} className="space-y-4">
                  <div className="relative">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Buscar Paciente Existente</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                        <input 
                          className="w-full pl-10 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-medical-500 outline-none bg-white text-slate-900" 
                          placeholder="Escribe nombre o cédula..." 
                          onChange={e => handleSearchPatient(e.target.value)} 
                        />
                      </div>
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl mt-1 z-10 rounded-lg max-h-48 overflow-y-auto">
                          {searchResults.map(r => (
                            <div key={r.id} onClick={() => selectExistingPatient(r)} className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0">
                               <p className="font-bold text-slate-800">{r.name}</p>
                               <p className="text-xs text-slate-500">CI: {r.cedula} | {r.phone}</p>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-medium text-slate-700 mb-1">Cédula de Identidad</label>
                       <input 
                         value={formPatient.cedula} 
                         onChange={e => setFormPatient({...formPatient, cedula: e.target.value})} 
                         placeholder="V-12345678" 
                         disabled={formPatient.isMinor}
                         className="w-full border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none disabled:bg-slate-100 bg-white text-slate-900" 
                       />
                     </div>
                     <div className="flex items-center pt-6">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={formPatient.isMinor} 
                            onChange={e => setFormPatient({...formPatient, isMinor: e.target.checked})} 
                            className="w-4 h-4 text-medical-600 rounded focus:ring-medical-500"
                          /> 
                          <span className="text-sm font-medium text-slate-700">Es menor de edad</span>
                        </label>
                     </div>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                     <input 
                       required 
                       value={formPatient.name} 
                       onChange={e => setFormPatient({...formPatient, name: e.target.value})} 
                       className="w-full border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none bg-white text-slate-900" 
                     />
                  </div>

                  {formPatient.isMinor && (
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                      <label className="block text-xs font-bold text-amber-800 mb-1">Nombre del Representante</label>
                      <input 
                        required={formPatient.isMinor}
                        value={formPatient.representativeName} 
                        onChange={e => setFormPatient({...formPatient, representativeName: e.target.value})} 
                        className="w-full border border-amber-200 p-2 rounded bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none text-sm" 
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Nacimiento</label>
                        <input 
                          type="date"
                          value={formPatient.birthDate} 
                          onChange={e => setFormPatient({...formPatient, birthDate: e.target.value})} 
                          className="w-full border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none text-sm bg-white text-slate-900" 
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                        <input 
                          type="tel"
                          value={formPatient.phone} 
                          onChange={e => setFormPatient({...formPatient, phone: e.target.value})} 
                          className="w-full border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none text-sm bg-white text-slate-900" 
                        />
                     </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                    <input 
                      type="email"
                      value={formPatient.email} 
                      onChange={e => setFormPatient({...formPatient, email: e.target.value})} 
                      className="w-full border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none text-sm bg-white text-slate-900" 
                    />
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Motivo de Consulta</label>
                     <textarea 
                       required 
                       rows={2}
                       value={formPatient.reason} 
                       onChange={e => setFormPatient({...formPatient, reason: e.target.value})} 
                       className="w-full border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none bg-white text-slate-900" 
                     />
                  </div>

                  <Button type="submit" className="w-full py-3">Registrar Ingreso</Button>
                </form>
              </div>
           </div>
        </div>
      )}

      {assignModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="font-bold text-lg mb-4 text-slate-800">Asignar Paciente</h3>
              
              <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar Médico</label>
                   <select 
                     className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none bg-white text-slate-900" 
                     value={selectedDoctorId} 
                     onChange={e => handleSelectDoctorForAssignment(e.target.value)}
                   >
                     <option value="">-- Elegir Doctor --</option>
                     {doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>)}
                   </select>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Asignar Consultorio</label>
                   <select 
                     className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none bg-white text-slate-900" 
                     value={selectedRoom} 
                     onChange={e => setSelectedRoom(e.target.value)}
                   >
                     <option value="">-- Elegir Sala --</option>
                     {CLINIC_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                   </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setAssignModal({isOpen: false, patientId: null})} className="flex-1">Cancelar</Button>
                  <Button onClick={handleAssignDoctor} disabled={!selectedDoctorId || !selectedRoom} className="flex-1">Confirmar</Button>
                </div>
              </div>
           </div>
        </div>
      )}

      {finishModal.isOpen && currentP && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
               <div className="flex justify-between items-center p-5 border-b">
                  <div>
                    <h3 className="font-bold text-xl text-slate-800">Cierre de Consulta</h3>
                    <p className="text-sm text-slate-500">Paciente: {currentP.name}</p>
                  </div>
                  <button onClick={() => setFinishModal({isOpen: false, patientId: null})} className="text-slate-400 hover:text-slate-600"><X /></button>
               </div>
               
               <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                  {/* Costos */}
                  <div className="grid md:grid-cols-2 gap-6">
                      <div>
                         <label className="block text-sm font-bold text-slate-700 mb-2">Honorarios Médicos (Base)</label>
                         <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                            <input 
                              type="number" 
                              value={baseCost} 
                              onChange={e => setBaseCost(e.target.value)} 
                              className="w-full border border-slate-300 pl-8 p-2 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none bg-white text-slate-900" 
                              placeholder="0.00"
                            />
                         </div>
                      </div>
                      
                      <div>
                         <label className="block text-sm font-bold text-slate-700 mb-2">Procedimientos Realizados</label>
                         <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto p-2 bg-slate-50">
                            {procedures.length === 0 && <p className="text-xs text-slate-400 p-2">No hay servicios registrados.</p>}
                            {procedures.map(proc => (
                               <label key={proc.id} className="flex items-center justify-between p-2 hover:bg-white rounded cursor-pointer border-b last:border-0 border-slate-100">
                                  <div className="flex items-center gap-2">
                                     <input 
                                       type="checkbox" 
                                       checked={selectedProcedureIds.includes(proc.id)} 
                                       onChange={() => toggleProcedure(proc.id)}
                                       className="rounded text-medical-600 focus:ring-medical-500" 
                                     />
                                     <span className="text-sm text-slate-700">{proc.name}</span>
                                  </div>
                                  <span className="text-xs font-bold text-emerald-600">${proc.price}</span>
                               </label>
                            ))}
                         </div>
                      </div>
                  </div>

                  {/* Pagos */}
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                     <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2"><Wallet size={18}/> Registro de Pagos</h4>
                        <div className="text-right">
                           <p className="text-xs text-slate-500">Total a Pagar</p>
                           <p className="text-lg font-bold text-slate-900">${totalCostCalc.toFixed(2)}</p>
                        </div>
                     </div>
                     
                     <div className="flex gap-2 mb-4">
                        <select 
                          className="flex-1 border border-slate-300 p-2 rounded-lg text-sm bg-white text-slate-900" 
                          value={paymentMethod} 
                          onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                        >
                          <option value="">Método de Pago...</option>
                          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <input 
                          type="number" 
                          className="w-24 border border-slate-300 p-2 rounded-lg text-sm bg-white text-slate-900" 
                          placeholder="Monto" 
                          value={paymentAmount} 
                          onChange={e => setPaymentAmount(e.target.value)} 
                        />
                        <Button size="sm" onClick={handleAddPayment} disabled={!paymentMethod || !paymentAmount} variant="secondary">
                           <Plus size={16}/>
                        </Button>
                     </div>

                     <div className="space-y-2">
                        {payments.map((p, i) => (
                           <div key={i} className="flex justify-between items-center bg-white p-2 px-3 rounded border border-slate-200 text-sm">
                              <span className="font-medium text-slate-600">{p.method}</span>
                              <div className="flex items-center gap-3">
                                 <span className="font-bold text-slate-800">${p.amount.toFixed(2)}</span>
                                 <button onClick={() => removePayment(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                              </div>
                           </div>
                        ))}
                        {payments.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No se han registrado pagos.</p>}
                     </div>

                     <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-600">Restante por pagar:</span>
                        <span className={`text-lg font-bold ${remainingAmount > 0.01 ? 'text-red-500' : 'text-green-600'}`}>
                           ${remainingAmount.toFixed(2)}
                        </span>
                     </div>
                  </div>
               </div>

               <div className="p-5 border-t bg-slate-50 rounded-b-xl">
                  <Button onClick={handleFinish} disabled={remainingAmount > 0.1} variant="success" className="w-full py-3 text-lg shadow-md">
                     <Check className="mr-2" /> Finalizar Consulta
                  </Button>
                  {remainingAmount > 0.1 && (
                     <p className="text-red-500 text-xs text-center mt-2 flex items-center justify-center gap-1">
                        <AlertTriangle size={12} /> El monto total debe estar cubierto para cerrar.
                     </p>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
export default App;
