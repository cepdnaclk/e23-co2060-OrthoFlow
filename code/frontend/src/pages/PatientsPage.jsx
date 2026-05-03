import { useState, useEffect } from "react";
import { C } from "../constants.js";
import { AppLayout, Badge, Avatar, Reveal } from "../components.jsx";
import { getAllPatients } from "../api.js";

/**
 * PatientsPage
 * Props:
 *   setPage:            (page: string) => void
 *   setSelectedPatient: (patient: object) => void
 */
export default function PatientsPage({ setPage, setSelectedPatient, onLogout, user }) {
  const isClinician = user?.role === 'STAFF' || user?.role === 'ADMIN';
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]); // removed fallback
  const [loadError, setLoadError] = useState("");
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoadingList(true);
      const { data, error } = await getAllPatients();
      if (error) {
        // Backend unreachable — keep mock data, show soft warning
        setLoadError("Could not reach backend — showing local data.");
      } else if (Array.isArray(data) && data.length > 0) {
        // Normalise backend fields to match our UI shape
        const normalised = data.map((p) => ({
          ...p,
          id:       p.id,
          displayId: p.patientId || p.id || p.registrationNumber || "—",
          name:     p.name      || p.fullName     || "Unknown",
          initials: (p.name || p.fullName || "?")
                      .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
          status:   p.status    || "Assessment",
          phone:    p.telephone || p.phone        || "",
          dob:      p.dob ? new Date(p.dob).toLocaleDateString() : (p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : ""),
        }));
        setPatients(normalised);
      }
      setLoadingList(false);
    };
    fetchPatients();
  }, []);

  const filtered = patients.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.displayId || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.phone|| "").includes(search)
  );

  return (
    <AppLayout active="patients" setPage={setPage} setSelectedPatient={setSelectedPatient} onLogout={onLogout} user={user}>
      <div style={{ padding: 28 }}>
        {/* ── Backend status banner ── */}
        {loadError && (
          <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#856404" }}>
            ⚠ {loadError}
          </div>
        )}
        {loadingList && (
          <div style={{ textAlign: "center", padding: "20px 0", color: C.gray400, fontSize: 13 }}>
            Loading patients from server…
          </div>
        )}
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
              Patients
            </h1>
            <div style={{ color: C.gray500, fontSize: 13, marginTop: 4 }}>
              {patients.length} total patients
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
        </Reveal>

        {/* ── Search ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#fff",
            border: `1px solid ${C.gray200}`,
            borderRadius: 10,
            padding: "10px 16px",
            marginBottom: 16,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={C.gray400}>
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID or phone…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 14,
              background: "transparent",
              color: C.gray900,
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                background: "none",
                border: "none",
                color: C.gray400,
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* ── Patient List ── */}
        <Reveal style={{
          background: "#fff",
          borderRadius: 14,
          border: `1px solid ${C.gray200}`,
          overflow: "hidden",
        }}>
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 140px 160px 120px",
              padding: "10px 20px",
              borderBottom: `1px solid ${C.gray100}`,
              background: C.gray50,
            }}
          >
            {["Patient", "DOB", "Phone", "Status"].map((h) => (
              <div
                key={h}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.gray500,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: C.gray400,
                fontSize: 14,
              }}
            >
              <img src="/empty_patients_illustration.png" alt="No Patients" style={{ width: 140, marginBottom: 16, opacity: 0.9 }} />
              <div>No patients found matching "{search}"</div>
            </div>
          ) : (
            filtered.map((p, i) => (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedPatient(p);
                  setPage("patient-detail");
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 140px 160px 120px",
                  alignItems: "center",
                  padding: "14px 20px",
                  borderBottom:
                    i < filtered.length - 1
                      ? `1px solid ${C.gray100}`
                      : "none",
                  cursor: "pointer",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = C.gray50)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#fff")
                }
              >
                {/* Name + initials */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12 }}
                >
                  <Avatar initials={p.initials} size={40} />
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
                    <div style={{ fontSize: 12, color: C.gray500 }}>{p.displayId}</div>
                  </div>
                </div>

                {/* DOB */}
                <div style={{ fontSize: 13, color: C.gray700 }}>{p.dob}</div>

                {/* Phone */}
                <div style={{ fontSize: 13, color: C.gray700 }}>{p.phone}</div>

                {/* Status */}
                <Badge label={p.status} />
              </div>
            ))
          )}
        </Reveal>
      </div>
    </AppLayout>
  );
}
