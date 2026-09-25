import { useState, useEffect } from "react";
import { C } from "../constants.js";
import { AppLayout, Badge, Reveal } from "../components.jsx";
import { getAllAppointments, sendReminder, getAllPatients, createAppointment, updateAppointmentStatus } from "../api.js";
import { toast, customAlert } from "../dialogs.js";
import { getClinicians, rescheduleAppointment } from '../api.js';
import './AppointmentsPage.css';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { SectionTabs, LoadingState, ErrorState } from '../ui.jsx';

function getAppointmentDateTime(appointment) {
  const date = new Date(appointment.date);
  const [hours = "0", minutes = "0"] = String(appointment.time || "00:00").split(":");
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Number(hours),
    Number(minutes),
    0,
    0
  );
}

const CHANNEL_STATUS_STYLES = {
  Pending: { bg: "rgba(245, 158, 11, 0.14)", color: "#b45309" },
  Sent: { bg: "rgba(16, 185, 129, 0.14)", color: "#047857" },
  Mock: { bg: "rgba(59, 130, 246, 0.14)", color: "#1d4ed8" },
  Skipped: { bg: "rgba(148, 163, 184, 0.16)", color: "#64748b" },
  Failed: { bg: "rgba(239, 68, 68, 0.14)", color: "#b91c1c" },
  "Not required": { bg: "rgba(148, 163, 184, 0.16)", color: "#64748b" },
};

function ChannelBadge({ label, status }) {
  const normalizedStatus = status || "Pending";
  const style = CHANNEL_STATUS_STYLES[normalizedStatus] || CHANNEL_STATUS_STYLES.Pending;

  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        borderRadius: 20,
        padding: "3px 9px",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {label}: {normalizedStatus}
    </span>
  );
}

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
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState('Calendar');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [clinicianFilter, setClinicianFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [clinicians, setClinicians] = useState([]);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    clinicianId: user?.id || '',
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
    setLoadError('');
    const [apptRes, patRes] = await Promise.all([
      getAllAppointments(),
      getAllPatients()
    ]);
    
    if (!apptRes.error && Array.isArray(apptRes.data)) {
      setAppointments(apptRes.data.map(a => {
        const appointmentAt = getAppointmentDateTime(a);
        return {
          ...a,
          upcoming: a.upcoming ?? (appointmentAt >= new Date()),
          status: a.status || "Scheduled",
          patientName: a.patient?.name || a.patientName || "Unknown",
          fullDate: a.date ? appointmentAt.toDateString() : "",
          day: a.date ? appointmentAt.getDate() : ""
        };
      }));
    }
    
    if (!patRes.error && Array.isArray(patRes.data)) {
      setPatients(patRes.data);
    }
    
    setLoadError(apptRes.error || patRes.error || '');
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    getClinicians().then(result => { if (result.data) setClinicians(result.data); });
  }, []);

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patientId || !formData.date || !formData.time) return customAlert("Please fill all fields");
    setSubmitting(true);
    setFormError('');
    const { error } = await (editingId ? rescheduleAppointment(editingId, formData) : createAppointment(formData));
    setSubmitting(false);
    if (!error) {
      setShowModal(false);
      setFormData({ patientId: "", date: "", time: "", type: "adjustment", duration: "30min" });
      fetchData();
    } else {
      setFormError(error);
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    if (clinicianFilter && String(a.clinicianId) !== clinicianFilter) return false;
    if (statusFilter && a.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = a.patientName?.toLowerCase().includes(q);
    const idMatch = a.patientId?.toLowerCase().includes(q) || a.patient?.patientId?.toLowerCase().includes(q) || a.patient?.id?.toLowerCase().includes(q);
    const phoneMatch = a.patient?.phone?.toLowerCase().includes(q);
    return nameMatch || idMatch || phoneMatch;
  });

  const upcoming = filteredAppointments.filter((a) => a.upcoming);
  const past = filteredAppointments.filter((a) => !a.upcoming);

  const handleStatusChange = async (id, newStatus) => {
    const previous = appointments.find((a) => a.id === id);
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );

    const { data, error } = await updateAppointmentStatus(id, newStatus);
    if (error) {
      if (previous) {
        setAppointments((prev) => prev.map((a) => (a.id === id ? previous : a)));
      }
      toast("Could not update appointment status: " + error, "error");
      return;
    }

    if (data) {
      setAppointments((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          const appointmentAt = getAppointmentDateTime(data);
          return {
            ...a,
            ...data,
            upcoming: appointmentAt >= new Date(),
            patientName: data.patient?.name || a.patientName || "Unknown",
            fullDate: data.date ? appointmentAt.toDateString() : a.fullDate,
            day: data.date ? appointmentAt.getDate() : a.day,
          };
        })
      );
      toast("Appointment status updated", "success");
      window.dispatchEvent(new Event("notificationsRefresh"));
    }
  };

  const handleRemind = async (id) => {
    toast("Sending reminder...", "info");
    const { data, error } = await sendReminder(id);
    if (!error) {
      const result = data?.result || {};
      const channelSummary = [
        `Patient email ${result.patientEmailStatus || "Pending"}`,
        `Clinician email ${result.clinicianEmailStatus || "Pending"}`,
      ].join(", ");
      const warnings = data?.result?.warnings || [];
      toast(
        `Reminder processed: ${channelSummary}`,
        warnings.length ? "warning" : "success"
      );
      fetchData();
      window.dispatchEvent(new Event("notificationsRefresh"));
    } else {
      toast(error, "error");
    }
  };

  const AppointmentRow = ({ appt }) => (
    <div
      className="appointment-row"
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
        <div style={{ fontSize: 12, color: C.gray500 }}>Clinician: {appt.clinician?.fullName || clinicians.find(c => c.id === appt.clinicianId)?.fullName || 'Unassigned'}</div>
      </div>

      {/* Status badges */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <Badge label={appt.status} />
        <ChannelBadge label="Email" status={appt.patientEmailStatus} />
        <ChannelBadge label="Panel" status={appt.patientNotificationStatus} />
      </div>

      {/* Remind button (upcoming only) */}
      {isClinician && appt.upcoming && ['Scheduled', 'Confirmed'].includes(appt.status) && (
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
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          Remind
        </button>
      )}

      {/* Status changer */}
      {isClinician && <button type="button" onClick={() => {
        setEditingId(appt.id); setFormError('');
        setFormData({ patientId: appt.patientId, clinicianId: appt.clinicianId || user.id, date: appt.date.slice(0, 10), time: appt.time, type: appt.type, duration: appt.duration });
        setShowModal(true);
      }} style={{ background: C.surface, color: C.gray700, border: `1px solid ${C.gray200}`, borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>Reschedule</button>}
      {isClinician && (
        <select
          value={appt.status}
          onChange={(e) => handleStatusChange(appt.id, e.target.value)}
          style={{
            border: `1px solid ${C.gray200}`,
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            color: C.gray700,
            background: C.surface,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <option>Scheduled</option>
          <option>Confirmed</option>
          <option>Cancelled</option>
          <option>Completed</option>
          <option>Missed</option>
        </select>
      )}
    </div>
  );

  return (
    <AppLayout active="appointments" setPage={setPage} setSelectedPatient={setSelectedPatient} onLogout={onLogout} user={user} compactOnMobile>
      <div style={{ padding: 28 }}>
        {/* ── Header ── */}
        <Reveal style={{
          display: "flex",
          flexWrap: 'wrap',
          gap: 12,
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
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => { setEditingId(null); setFormError(''); setFormData({ patientId: '', clinicianId: user.id, date: '', time: '', type: 'adjustment', duration: '30min' }); setShowModal(true); }}
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
            </div>
          )}
        </Reveal>

        {/* ── Search Bar ── */}
        <Reveal style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: C.surface,
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

        <div className="appointment-toolbar">
          <SectionTabs items={['Calendar', 'List']} value={view} onChange={setView} label="Appointment view" />
          <select aria-label="Filter clinician" value={clinicianFilter} onChange={e => setClinicianFilter(e.target.value)}>
            <option value="">All clinicians</option>{clinicians.map(c => <option key={c.id} value={c.id}>{c.fullName || c.username}</option>)}
          </select>
          <select aria-label="Filter status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>{['Scheduled','Confirmed','Completed','Missed','Cancelled'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        {loading && <LoadingState label="Loading appointments..." />}
        {loadError && <ErrorState message={loadError} onRetry={fetchData} />}
        {!loading && !loadError && view === 'Calendar' && <section className="appointment-calendar">
          <FullCalendar plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" height="auto" eventDisplay="block"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }} dayMaxEvents={2}
            dateClick={info => setSelectedDate(info.dateStr)}
            eventClick={info => setSelectedDate(info.event.startStr.slice(0,10))}
            dayCellClassNames={info => info.date.toLocaleDateString('en-CA') === selectedDate ? ['selected-day'] : []}
            events={filteredAppointments.map(a => ({ id: String(a.id), title: a.patientName, start: `${a.date.slice(0,10)}T${a.time || '00:00'}`, color: a.status === 'Cancelled' ? '#777' : a.status === 'Completed' ? '#23836c' : '#087ca7' }))}
          />
          <h2 className="day-agenda-title">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric', year:'numeric' })}</h2>
          {filteredAppointments.filter(a => a.date.slice(0,10) === selectedDate).sort((a,b) => a.time.localeCompare(b.time)).map(a => <AppointmentRow key={a.id} appt={a} />)}
          {!filteredAppointments.some(a => a.date.slice(0,10) === selectedDate) && <p style={{color:C.gray500}}>No appointments for this day.</p>}
        </section>}
        <div hidden={loading || Boolean(loadError) || view !== 'List'}>
        {/* ── Upcoming ── */}
        <Reveal style={{
          background: C.surface,
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
          background: C.surface,
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
      </div>

      {/* ── New Appointment Modal ── */}
      {showModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex",
          alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div className="appointment-modal" role="dialog" aria-modal="true" aria-label={editingId ? 'Reschedule Appointment' : 'Schedule Appointment'} style={{
            background: C.surface, borderRadius: 16, width: "100%", maxWidth: 500,
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)", overflow: "hidden"
          }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.gray100}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, color: C.gray900 }}>{editingId ? 'Reschedule Appointment' : 'Schedule Appointment'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 24, color: C.gray400, cursor: "pointer" }}>×</button>
            </div>
            
            <form onSubmit={handleModalSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {formError && <p role="alert" style={{ color: C.red, margin: 0 }}>{formError}</p>}
              <label style={{ color: C.gray700, fontSize: 13 }}>Clinician
                <select aria-label="Clinician" required value={formData.clinicianId || ''} onChange={event => setFormData({ ...formData, clinicianId: event.target.value })} style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 6, border: `1px solid ${C.gray200}` }}>
                  <option value="">Select clinician...</option>{clinicians.map(clinician => <option key={clinician.id} value={clinician.id}>{clinician.fullName || clinician.username}</option>)}
                </select>
              </label>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.gray700, marginBottom: 6 }}>Patient</label>
                <select 
                  value={formData.patientId} 
                  disabled={Boolean(editingId)}
                  onChange={e => setFormData({...formData, patientId: e.target.value})}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.gray200}`, fontSize: 14 }}
                  required
                >
                  <option value="">Select a patient...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name || p.fullName || "Unknown patient"}</option>
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
                  style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.surface, color: C.gray700, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: C.blue, color: "#fff", fontSize: 14, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer" }}
                >
                  {submitting ? "Saving..." : editingId ? "Save appointment" : "Schedule Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
