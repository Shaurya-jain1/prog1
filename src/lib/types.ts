export type TokenStatus = "waiting" | "called" | "served" | "absent" | "cancelled";

export interface DaySchedule {
  open: string;
  close: string;
}

export interface Office {
  id: string;
  name: string;
  district: string;
  state: string;
  code: string;
  adminPhone: string;
  adminUid: string;
  adminPasswordHash?: string;
  public: boolean;
  serviceTypes: string[];
  dailyLimit: number;
  appointmentPrice?: number;
  schedule: Record<string, DaySchedule | null>;
  createdAt: any;
}

export interface QueueDay {
  id: string;
  date: string;
  officeId: string;
  isOpen: boolean;
  isPaused: boolean;
  currentToken: number;
  totalIssued: number;
}

export interface Token {
  id: string;
  number: number;
  name: string;
  phone: string;
  serviceType: string;
  status: TokenStatus;
  issuedAt: any;
  calledAt?: any;
  servedAt?: any;
  waitMinutes: number;
  rating?: number;
}

export interface SmsLog {
  id: string;
  tokenId: string;
  phone: string;
  message: string;
  type: "confirmation" | "ten_away" | "five_away" | "called";
  sentAt: any;
  cost: number;
}
