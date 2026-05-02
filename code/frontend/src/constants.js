// ─── Color Palette ────────────────────────────────────────────────────────────
export const C = {
  navy: "#0f1624",
  navyMid: "#1a2540",
  sidebar: "#111827",
  blue: "#2196f3",
  blueLight: "#42a5f5",
  teal: "#00bfa5",
  white: "#ffffff",
  gray50: "#f8fafc",
  gray100: "#f1f5f9",
  gray200: "#e2e8f0",
  gray400: "#94a3b8",
  gray500: "#64748b",
  gray700: "#334155",
  gray900: "#0f172a",
  green: "#10b981",
  orange: "#f59e0b",
  purple: "#8b5cf6",
  red: "#ef4444",
};

// ─── Status Badge Colors ──────────────────────────────────────────────────────
export const STATUS_COLORS = {
  "Active Treatment": { bg: "#d1fae5", color: "#065f46" },
  Planning: { bg: "#dbeafe", color: "#1e40af" },
  Assessment: { bg: "#fef3c7", color: "#92400e" },
  Retention: { bg: "#ede9fe", color: "#5b21b6" },
  Diagnosis: { bg: "#fee2e2", color: "#991b1b" },
  Scheduled: { bg: "#e0f2fe", color: "#0369a1" },
  Confirmed: { bg: "#d1fae5", color: "#065f46" },
  Cancelled: { bg: "#fee2e2", color: "#991b1b" },
};

// ─── Patient Statuses ─────────────────────────────────────────────────────────
export const PATIENT_STATUSES = [
  "Assessment",
  "Planning",
  "Active Treatment",
  "Retention",
  "Diagnosis",
];

// ─── Nav items ────────────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "patients", label: "Patients" },
  { id: "appointments", label: "Appointments" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "Settings" },
];
