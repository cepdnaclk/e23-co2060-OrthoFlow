import { useState, useEffect } from "react";
import { C } from "../constants.js";
import { AppLayout, Badge, Avatar, StatCard, Reveal } from "../components.jsx";
import { getAllPatients, getAllAppointments } from "../api.js";

/**
 * DashboardPage
 * Props:
 *   setPage:           (page: string) => void
 *   setSelectedPatient:(patient: object) => void
 */
export default function DashboardPage({ setPage, setSelectedPatient, onLogout, user }) {
  const isClinician = user?.role === 'STAFF' || user?.role === 'ADMIN';
  const [patients, setPatients]     = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [backendOnline, setBackendOnline] = useState(null); // null=checking, true, false

  useEffect(() => {
    // Fetch patients
    getAllPatients().then(({ data, error }) => {
      if (!error && Array.isArray(data) && data.length > 0) {
        setBackendOnline(true);
        setPatients(data.map((p) => ({
          ...p,
          id:       p.id        || p.patientId   || p.registrationNumber || "—",
          name:     p.name      || p.fullName     || "Unknown",
          initials: (p.name || p.fullName || "?")
                      .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
          status:   p.status    || "Assessment",
          phone:    p.telephone || p.phone        || "",
        })));
      } else if (error) {
        if (error.includes("Network error")) {
          setBackendOnline(false);
        } else {
          // If it's a 401 or something else, the backend is online but we are unauthorized
          setBackendOnline(true);
        }
      }
    });

    // Fetch appointments
    getAllAppointments().then(({ data, error }) => {
      if (!error && Array.isArray(data) && data.length > 0) {
        setAppointments(data.map((a) => {
          const dateObj = new Date(a.date);
          return {
            ...a,
            patientName: a.patient?.name || a.patientName || "Unknown Patient",
            upcoming: dateObj >= new Date(new Date().setHours(0,0,0,0)),
            status:   a.status   || "Scheduled",
            fullDate: dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
            time: a.time,
            type: a.type
          };
        }));
      }
    });
  }, []);

  const upcoming = appointments.filter((a) => a.upcoming);
  const activeCount = patients.filter((p) =>
    (p.status || "").toLowerCase().includes("active")
  ).length;
  const todayCount = appointments.filter((a) => {
    if (!a.upcoming) return false;
    const today = new Date().toDateString();
    return a.date ? new Date(a.date).toDateString() === today : false;
  }).length;

  return (
    <AppLayout active="dashboard" setPage={setPage} setSelectedPatient={setSelectedPatient} onLogout={onLogout} user={user}>
      <div style={{ padding: 28 }}>
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: C.gray900,
                margin: 0,
              }}
            >
              Dashboard
            </h1>
            <div style={{ color: C.gray500, fontSize: 13, marginTop: 4 }}>
              Sunday, April 19, 2026
            </div>
          </div>
          {isClinician && (
            <button
              onClick={() => setPage("new-patient")}
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
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Patient
            </button>
          )}
        </div>

        {/* ── Banner ── */}
        <Reveal style={{ marginBottom: 24 }}>
          <div style={{ width: "100%", height: 160, borderRadius: 16, overflow: "hidden", position: "relative" }}>
            <img src="/dashboard_banner.png" alt="Dashboard Banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 100%)", display: "flex", alignItems: "center", padding: 32 }}>
              <div style={{ color: "#fff" }}>
                <h2 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700 }}>Welcome back, {user?.name || "Dr."}</h2>
                <p style={{ margin: 0, fontSize: 15, opacity: 0.9 }}>Here's what's happening with your clinic today.</p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Backend status ── */}
        {backendOnline === false && (
          <Reveal>
            <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#856404" }}>
              ⚠ Backend offline — showing local demo data. Start the server at <strong>http://localhost:8080</strong>.
            </div>
          </Reveal>
        )}
        {/* ── Stat Cards ── */}
        <Reveal style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <StatCard
            label={user?.role === "STUDENT" ? "Assigned Patients" : "Total Patients"}
            value={patients.length}
            iconColor="#3b82f6"
            iconPath={
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            }
          />
          {user?.role !== "STUDENT" && (
            <>
              <StatCard
                label="Active Treatment"
                value={activeCount}
                iconColor="#10b981"
                iconPath={
                  <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
                }
              />
              <StatCard
                label="Today's Appointments"
                value={todayCount}
                iconColor="#f59e0b"
                iconPath={
                  <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
                }
              />
              <StatCard
                label="Upcoming This Week"
                value={upcoming.length}
                iconColor="#8b5cf6"
                iconPath={
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
                }
              />
            </>
          )}
        </Reveal>

        {/* ── Lower panels ── */}
        <Reveal style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {/* Recent Patients */}
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: `1px solid ${C.gray200}`,
              padding: 20,
              flex: "1 1 380px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div
                style={{ fontWeight: 700, fontSize: 15, color: C.gray900 }}
              >
                Recent Patients
              </div>
              <button
                onClick={() => setPage("patients")}
                style={{
                  background: "none",
                  border: "none",
                  color: C.blue,
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                View all →
              </button>
            </div>

            {patients.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedPatient(p);
                  setPage("patient-detail");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: `1px solid ${C.gray100}`,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12 }}
                >
                  <Avatar initials={p.initials} size={36} />
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: C.gray900,
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: 12, color: C.gray500 }}>{p.patientId}</div>
                  </div>
                </div>
                <Badge label={p.status} />
              </div>
            ))}
          </div>

          {/* Upcoming Appointments */}
          {user?.role !== "STUDENT" && (
            <div
              style={{
                background: "#fff",
                borderRadius: 14,
                border: `1px solid ${C.gray200}`,
                padding: 20,
                flex: "1 1 300px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{ fontWeight: 700, fontSize: 15, color: C.gray900 }}
                >
                  Upcoming Appointments
                </div>
                <button
                  onClick={() => setPage("appointments")}
                  style={{
                    background: "none",
                    border: "none",
                    color: C.blue,
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  View all →
                </button>
              </div>

              {upcoming.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "12px 0",
                    borderBottom: `1px solid ${C.gray100}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: C.gray900,
                      }}
                    >
                      {a.patientName}
                    </div>
                    <Badge label={a.status} />
                  </div>
                  <div style={{ color: C.gray500, fontSize: 12, marginTop: 3 }}>
                    {a.fullDate}, {a.time} · {a.type}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Reveal>
      </div>
    </AppLayout>
  );
}
