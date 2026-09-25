// ─── Color Palette ────────────────────────────────────────────────────────────
export const C = {
  navy: "var(--color-navy)",
  navyMid: "var(--color-navy-mid)",
  sidebar: "var(--color-sidebar)",
  blue: "#2196f3",
  blueLight: "#42a5f5",
  teal: "#00bfa5",
  white: "var(--color-white)",
  surface: "var(--color-surface)",
  surfaceElevated: "var(--color-surface-elevated)",
  inputBg: "var(--color-input-bg)",
  pageBg: "var(--color-page-bg)",
  warningBg: "var(--color-warning-bg)",
  warningBorder: "var(--color-warning-border)",
  warningText: "var(--color-warning-text)",
  gray50: "var(--color-gray-50)",
  gray100: "var(--color-gray-100)",
  gray200: "var(--color-gray-200)",
  gray400: "var(--color-gray-400)",
  gray500: "var(--color-gray-500)",
  gray600: "var(--color-gray-600)",
  gray700: "var(--color-gray-700)",
  gray800: "var(--color-gray-800)",
  gray900: "var(--color-gray-900)",
  green: "#10b981",
  orange: "#f59e0b",
  purple: "#8b5cf6",
  red: "#ef4444",
};

export function applyStoredTheme() {
  const savedTheme = localStorage.getItem("ortho_theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme || (prefersDark ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
  return theme;
}

export function setStoredTheme(theme) {
  localStorage.setItem("ortho_theme", theme);
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme } }));
}

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
  "Discharged",
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
