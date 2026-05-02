import { useState, useEffect } from "react";
import { C } from "../constants.js";
import { AppLayout, Badge, Reveal } from "../components.jsx";
import { getAllAppointments, sendReminder, getAllPatients, createAppointment } from "../api.js";
import { toast, customAlert } from "../dialogs.js";

/**
 * AppointmentsPage
 * Props:
 *   setPage: (page: string) => void
 */
export default function AppointmentsPage({ setPage, setSelectedPatient, onLogout, user }) {
  const isClinician = user?.role === 'STAFF' || user?.role === 'ADMIN';
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    patientId: "",
    date: "",
    time: "",
    type: "adjustment",
    duration: "30min",
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [apptRes, patRes] = await Promise.all([
      getAllAppointments(),
      getAllPatients()
    ]);
    
    if (!apptRes.error && Array.isArray(apptRes.data)) {
      setAppointments(apptRes.data.map(a => ({
        ...a,
        upcoming: a.upcoming ?? (new Date(a.date) >= new Date()),
        status: a.status || "Scheduled",
        patientName: a.patient?.name || a.patientName || "Unknown",
        fullDate: a.date ? new Date(a.date).toDateString() : "",
        day: a.date ? new Date(a.date).getDate() : ""
      })));
    }
    
    if (!patRes.error && Array.isArray(patRes.data)) {
      setPatients(patRes.data);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patientId || !formData.date || !formData.time) return customAlert("Please fill all fields");
    setSubmitting(true);
    const { error } = await createAppointment(formData);
    setSubmitting(false);
    if (!error) {
      setShowModal(false);
      setFormData({ patientId: "", date: "", time: "", type: "adjustment", duration: "30min" });
      fetchData();
    } else {
      customAlert("Failed to create appointment: " + error);
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = a.patientName?.toLowerCase().includes(q);
    const idMatch = a.patientId?.toLowerCase().includes(q) || a.patient?.patientId?.toLowerCase().includes(q) || a.patient?.id?.toLowerCase().includes(q);
    const phoneMatch = a.patient?.phone?.toLowerCase().includes(q);
    return nameMatch || idMatch || phoneMatch;
  });

  const upcoming = filteredAppointments.filter((a) => a.upcoming);
  const past = filteredAppointments.filter((a) => !a.upcoming);

  const handleStatusChange = (id, newStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
  };

  const handleRemind = async (id) => {
    toast("Sending reminder...", "info");
    const { error } = await sendReminder(id);
    if (!error) {
      toast("Reminder sent successfully!", "success");
    } else {
      customAlert("Failed to send reminder");
    }
  };

  const AppointmentRow = ({ appt }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 20px",
        borderBottom: `1px solid ${C.gray100}`,
      }}
    >
      {/* Date badge */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: appt.upcoming
            ? `linear-gradient(135deg, ${C.blue}, #1565c0)`
            : C.gray200,
          color: appt.upcoming ? "#fff" : C.gray500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {appt.day}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: C.gray900,
            marginBottom: 2,
          }}
        >
          {appt.patientName}
        </div>
        <div style={{ fontSize: 12, color: C.gray500 }}>
          {appt.fullDate} · {appt.time} · {appt.type} · {appt.duration}
        </div>
      </div>

      {/* Status badge */}
      <Badge label={appt.status} />

      {/* Remind button (upcoming only) */}
      {isClinician && appt.upcoming && (
        <button
          onClick={() => handleRemind(appt.id)}
          style={{
            background: "none",
            border: `1px solid ${C.gray200}`,
            borderRadius: 8,
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: 12,
            color: C.gray700,
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
            fontWeight: 500,
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M22 17.607c-.786 2.28-3.139 6.317-5.563 6.361-1.608.031-2.125-.953-3.963-.953-1.837 0-2.412.923-3.932.983-2.572.099-6.542-5.827-6.542-10.995 0-4.747 3.308-7.1 6.198-7.143 1.55-.028 3.014 1.045 3.959 1.045.949 0 2.727-1.29 4.596-1.101.782.033 2.979.315 4.389 2.377l-1.264.758c-.88-1.361-2.259-1.815-3.419-1.764C14.46 6.87 12.89 7.976 12.89 7.976c-1.041 0-2.631-.981-3.917-.952-2.174.046-4.244 1.773-4.244 5.21 0 4.476 3.146 9.424 5.007 9.424 1.149 0 1.538-.756 2.855-.799.942-.042 1.879.748 2.798.748 1.479 0 2.937-2.291 3.617-4z" />
          </svg>
          Remind
        </button>
      )}

      {/* Status changer (upcoming only) */}
      {isClinician && appt.upcoming && (
        <select
          value={appt.status}
          onChange={(e) => handleStatusChange(appt.id, e.target.value)}
          style={{
            border: `1px solid ${C.gray200}`,
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            color: C.gray700,
            background: "#fff",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <option>Scheduled</option>
          <option>Confirmed</option>
          <option>Cancelled</option>
        </select>
      )}
    </div>
  );

  return (
    <AppLayout active="appointments" setPage={setPage} setSelectedPatient={setSelectedPatient} onLogout={onLogout} user={user}>
      <div style={{ padding: 28 }}>
        {/* ── Header ── */}
        <Reveal style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}>
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: C.gray900,
                margin: 0,
              }}
            >
              Appointments
            </h1>
            <div style={{ color: C.gray500, fontSize: 13, marginTop: 4 }}>
              {upcoming.length} upcoming
            </div>
          </div>
          {isClinician && (
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: C.blue,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New
              Appointment
            </button>
          )}
        </Reveal>

        {/* ── Search Bar ── */}
        <Reveal style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#fff",
            border: `1px solid ${C.gray200}`,
            borderRadius: 10,
            padding: "10px 16px",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={C.gray400}>
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              placeholder="Search appointments by patient name, ID, or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 14,
                color: C.gray900,
              }}
            />
          </div>
        </Reveal>

        {/* ── Upcoming ── */}
        <Reveal style={{
          background: "#fff",
          borderRadius: 14,
          border: `1px solid ${C.gray200}`,
          overflow: "hidden",
          marginBottom: 24,
        }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 20px",
              borderBottom: `1px solid ${C.gray100}`,
              background: C.gray50,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={C.blue}>
              <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
            </svg>
            <span
              style={{ fontWeight: 700, fontSize: 14, color: C.gray700 }}
            >
              Upcoming
            </span>
          </div>
          {upcoming.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.gray400, fontSize: 14 }}>
              <img src="/empty_appointments_illustration.png" alt="No Appointments" style={{ width: 140, marginBottom: 16, opacity: 0.9 }} />
              <div>No upcoming appointments</div>
            </div>
          ) : (
            upcoming.map((a) => (
              <AppointmentRow key={a.id} appt={a} />
            ))
          )}
        </Reveal>

        {/* ── Past ── */}
        <Reveal style={{
          background: "#fff",
          borderRadius: 14,
          border: `1px solid ${C.gray200}`,
          overflow: "hidden",
        }}>
          <div
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${C.gray100}`,
              background: C.gray50,
              fontWeight: 700,
              fontSize: 14,
              color: C.gray700,
            }}
          >
            Past Appointments
          </div>
          {past.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.gray400, fontSize: 14 }}>
              No past appointments
            </div>
          ) : (
            past.map((a) => (
              <AppointmentRow key={a.id} appt={a} />
            ))
          )}
        </Reveal>
      </div>

      {/* ── New Appointment Modal ── */}
      {showModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex",
          alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, width: "100%", maxWidth: 500,
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)", overflow: "hidden"
          }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.gray100}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, color: C.gray900 }}>Schedule Appointment</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 24, color: C.gray400, cursor: "pointer" }}>×</button>
            </div>
            
            <form onSubmit={handleModalSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.gray700, marginBottom: 6 }}>Patient</label>
                <select 
                  value={formData.patientId} 
                  onChange={e => setFormData({...formData, patientId: e.target.value})}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.gray200}`, fontSize: 14 }}
                  required
                >
                  <option value="">Select a patient...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.gray700, marginBottom: 6 }}>Date</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.gray200}`, fontSize: 14 }}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.gray700, marginBottom: 6 }}>Time</label>
                  <input 
                    type="time" 
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.gray200}`, fontSize: 14 }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.gray700, marginBottom: 6 }}>Type</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.gray200}`, fontSize: 14 }}
                  >
                    <option value="initial assessment">Initial Assessment</option>
                    <option value="adjustment">Adjustment</option>
                    <option value="treatment planning">Treatment Planning</option>
                    <option value="retention check">Retention Check</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.gray700, marginBottom: 6 }}>Duration</label>
                  <select 
                    value={formData.duration}
                    onChange={e => setFormData({...formData, duration: e.target.value})}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.gray200}`, fontSize: 14 }}
                  >
                    <option value="15min">15 mins</option>
                    <option value="30min">30 mins</option>
                    <option value="45min">45 mins</option>
                    <option value="60min">60 mins</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${C.gray200}`, background: "#fff", color: C.gray700, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: C.blue, color: "#fff", fontSize: 14, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer" }}
                >
                  {submitting ? "Scheduling..." : "Schedule Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
