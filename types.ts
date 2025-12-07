export enum PatientStatus {
  WAITING = 'WAITING',
  IN_CONSULTATION = 'IN_CONSULTATION',
  COMPLETED = 'COMPLETED'
}

export const PAYMENT_METHODS = [
  'Efectivo $',
  'Pago Móvil',
  'Zelle',
  'Binance',
  'Cashea',
  'Transferencia Bancaria',
  'Efectivo Bs.',
  'Biopago'
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number];

export interface PaymentRecord {
  method: PaymentMethod;
  amount: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  consultationShare: number;
  procedureShare: number;
}

export interface MedicalProcedure {
  id: string;
  name: string;
  price: number;
}

export interface PatientProfile {
  id: string;
  name: string;
  cedula: string;
  isMinor: boolean;
  representativeName?: string;
  birthDate: string;
  phone: string;
  email: string;
}

export interface Patient extends PatientProfile {
  visitId: string;
  reason: string;
  status: PatientStatus;
  arrivalTime: number;
  startConsultationTime?: number;
  endConsultationTime?: number;
  assignedDoctorId?: string;
  assignedRoom?: string;
  baseCost?: number;
  performedProcedures?: MedicalProcedure[];
  totalCost?: number;
  payments?: PaymentRecord[];
  doctorEarnings?: number;
  clinicEarnings?: number;
}

export const CLINIC_ROOMS = [
  'Consultorio 1', 'Consultorio 2', 'Consultorio 3', 'Consultorio 4',
  'Consultorio 5', 'Consultorio 6', 'Consultorio 7', 'Área de Ecografía'
];
