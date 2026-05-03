/**
 * api.js — Central API layer
 * Backend base URL: http://localhost:8080
 *
 * All functions return { data, error }
 * data  → parsed JSON on success
 * error → error message string on failure
 */

const BASE_URL = "http://localhost:8080";

let _token = localStorage.getItem("ortho_token") || null;

export function setToken(token) { 
  _token = token; 
  if (token) {
    localStorage.setItem("ortho_token", token);
  } else {
    localStorage.removeItem("ortho_token");
  }
}
export function getToken()      { return _token; }
export function clearToken()    { setToken(null); }

function authHeaders(isFormData = false) {
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (_token) headers["Authorization"] = `Bearer ${_token}`;
  return headers;
}

async function request(method, path, body, isFormData = false) {
  try {
    const options = {
      method,
      headers: authHeaders(isFormData),
    };
    
    if (body !== undefined) {
      options.body = isFormData ? body : JSON.stringify(body);
    }

    const res = await fetch(`${BASE_URL}${path}`, options);

    let data = null;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      const message =
        (typeof data === "object" && data?.message) ||
        (typeof data === "object" && data?.error) ||
        (typeof data === "string" && data) ||
        `Request failed (${res.status})`;
      return { data: null, error: message };
    }

    return { data, error: null };
  } catch (err) {
    console.error(`[API] ${method} ${path} →`, err);
    return { data: null, error: "Network error — is the backend running?" };
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginUser({ username, password }) {
  const result = await request("POST", "/auth/login", { username, password });
  if (result.data?.token) setToken(result.data.token);
  return result;
}

export async function logoutUser() {
  clearToken();
  return { data: { success: true }, error: null };
}

export async function registerUser({ username, email, password, role = "CLINICIAN" }) {
  return request("POST", "/auth/register", { username, email, password, role });
}

export async function registerAdminUser() {
  // Utility for initial setup if needed
  return request("POST", "/auth/register", { username: "admin", password: "password", role: "ADMIN" });
}

// ── Patients ──────────────────────────────────────────────────────────────────

export async function registerPatient(formData) {
  return request("POST", "/patient/register", formData);
}

export async function getPatient(id) {
  return request("GET", `/patient/${id}`);
}

export async function getAllPatients() {
  return request("GET", "/patient");
}

export async function updatePatient(id, formData) {
  return request("PUT", `/patient/${id}`, formData);
}

export async function deletePatient(id) {
  return request("DELETE", `/patient/${id}`);
}

export async function getAllHistoryLogs() {
  return request("GET", "/patient/history/all");
}

// ── Appointments ──────────────────────────────────────────────────────────────

export async function getAllAppointments() {
  return request("GET", "/appointment");
}

export async function createAppointment(data) {
  return request("POST", "/appointment/register", data);
}

export async function getAppointment(id) {
  return request("GET", `/appointment/${id}`);
}

export async function sendReminder(id) {
  return request("POST", `/appointment/${id}/remind`);
}

// ── Radiographs ───────────────────────────────────────────────────────────────

export async function uploadRadiograph(patientId, file, description, category = "RADIOGRAPH") {
  const formData = new FormData();
  formData.append("image", file);
  if (description) formData.append("description", description);
  formData.append("category", category);

  return request("POST", `/radiograph/upload/${patientId}`, formData, true);
}

export async function deleteRadiograph(id) {
  return request("DELETE", `/radiograph/${id}`);
}

// ── Admin Users ──────────────────────────────────────────────────────────────

export async function getUsers() {
  return request("GET", "/admin/users");
}

export async function createUser(data) {
  return request("POST", "/admin/users", data);
}

export async function deleteUser(id) {
  return request("DELETE", `/admin/users/${id}`);
}

// ── Access Management ────────────────────────────────────────────────────────

export async function getStudents() {
  return request("GET", "/access/students");
}

export async function getPatientAccess(patientId) {
  return request("GET", `/access/patient/${patientId}`);
}

export async function grantPatientAccess(patientId, userId) {
  return request("POST", `/access/patient/${patientId}/grant`, { userId });
}

export async function revokePatientAccess(patientId, userId) {
  return request("DELETE", `/access/patient/${patientId}/revoke/${userId}`);
}
