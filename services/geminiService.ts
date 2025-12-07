import { GoogleGenAI } from "@google/genai";
import { Patient, PatientStatus, Doctor } from "../types";

// En producción, esto usa la variable de entorno VITE_API_KEY
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY || "API_KEY_PENDIENTE" });

export const analyzeClinicFlow = async (patients: Patient[], doctors: Doctor[]): Promise<string> => {
  const completedPatients = patients.filter(p => p.status === PatientStatus.COMPLETED);

  if (completedPatients.length === 0) {
    return "No hay suficientes datos para generar un análisis.";
  }

  const getDoctorName = (id?: string) => doctors.find(d => d.id === id)?.name || "Desconocido";

  const dataSummary = completedPatients.map(p => {
    const waitTime = p.startConsultationTime && p.arrivalTime 
      ? (p.startConsultationTime - p.arrivalTime) / 60000 
      : 0;
    const consultTime = p.endConsultationTime && p.startConsultationTime 
      ? (p.endConsultationTime - p.startConsultationTime) / 60000 
      : 0;
    
    return {
      name: p.name,
      doctor: getDoctorName(p.assignedDoctorId),
      waitTimeMinutes: waitTime.toFixed(1),
      consultTimeMinutes: consultTime.toFixed(1),
      totalCost: p.totalCost,
      doctorShare: p.doctorEarnings,
      clinicShare: p.clinicEarnings,
      payments: p.payments?.map(pay => `${pay.method}: $${pay.amount}`).join(', ')
    };
  });

  const prompt = `
    Analiza los datos de la clínica Medcon:
    ${JSON.stringify(dataSummary, null, 2)}
    Genera un reporte ejecutivo breve sobre eficiencia, ingresos y desempeño médico.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Error generando reporte.";
  } catch (error) {
    console.error("Error Gemini:", error);
    return "Error de conexión con IA. Verifica tu API Key.";
  }
};
