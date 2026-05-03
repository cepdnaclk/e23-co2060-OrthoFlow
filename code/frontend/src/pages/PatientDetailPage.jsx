import { useState, useEffect } from "react";
import { C } from "../constants.js";
import { AppLayout, Badge, Avatar } from "../components.jsx";
import { useRef } from "react";
import { getPatient, deletePatient, uploadRadiograph } from "../api.js";

/**
 * PatientDetailPage
 * Props:
 *   patient: object   – patient record from data.js
 *   setPage: (page: string) => void
 */
export default function PatientDetailPage({ patient: initialPatient, setPage, setSelectedPatient, onLogout, user }) {
  const isClinician = user?.role === 'CLINICIAN' || user?.role === 'ADMIN' || user?.role === 'DOCTOR';
  const [patient, setPatient]   = useState(initialPatient);
  const [loading, setLoading]   = useState(false);
  const [fetchError, setFetchError] = useState("");
  const radioInputRef = useRef(null);
  const caseInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleFileUpload = async (e, category) => {
    const file = e.target.files[0];
    if (!file) return;

    const description = window.prompt(`Enter a description for this ${category === 'CASE_HISTORY' ? 'case history image' : 'radiograph'}:`, category === 'CASE_HISTORY' ? 'Pre-treatment photo' : 'Radiograph');
    if (description === null) {
      e.target.value = null;
      return;
    }

    setUploadingImage(true);
    const { data, error } = await uploadRadiograph(patient.id, file, description, category);
    
    if (error) {
      alert("Failed to upload image: " + error);
    } else if (data) {
      // Append the new radiograph to state
      setPatient(prev => ({
        ...prev,
        radiographs: [data, ...(prev.radiographs || [])]
      }));
    }
    
    setUploadingImage(false);
    e.target.value = null;
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    const { error } = await deleteRadiograph(imageId);
    if (error) {
      alert("Failed to delete image: " + error);
    } else {
      setPatient(prev => ({
        ...prev,
        radiographs: (prev.radiographs || []).filter(r => r.id !== imageId)
      }));
    }
  };

  useEffect(() => {
    const id = initialPatient?.id || initialPatient?.patientId;
    if (!id) return;
    // Re-fetch full record from backend to get latest data
    setLoading(true);
    getPatient(id).then(({ data, error }) => {
      if (data && !error) {
        setPatient({
          ...initialPatient,
          ...data,
          // normalise field names
          name:     data.name      || data.fullName     || initialPatient.name,
          phone:    data.telephone || data.phone        || initialPatient.phone,
          dob:      data.dob       || data.dateOfBirth  || initialPatient.dob,
          initials: (data.name || data.fullName || initialPatient.name || "?")
                      .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
        });
      } else if (error) {
        setFetchError("Could not reload from server — showing cached data.");
      }
      setLoading(false);
    });
  }, [initialPatient?.id]);

  if (!patient) {
    setPage("patients");
    return null;
  }

  if (loading) {
    return (
      <AppLayout active="patients" setPage={setPage} setSelectedPatient={setSelectedPatient} onLogout={onLogout} user={user}>
        <div style={{ padding: 40, textAlign: "center", color: C.gray400 }}>Loading patient data…</div>
      </AppLayout>
    );
  }

  const InfoRow = ({ label, value }) => (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "8px 0",
        borderBottom: `1px solid ${C.gray100}`,
      }}
    >
      <div
        style={{
          width: 160,
          color: C.gray500,
          fontSize: 13,
          flexShrink: 0,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div style={{ color: C.gray900, fontSize: 13, flex: 1 }}>
        {value || <span style={{ color: C.gray400 }}>—</span>}
      </div>
    </div>
  );

  return (
    <AppLayout active="patients" setPage={setPage} setSelectedPatient={setSelectedPatient} onLogout={onLogout} user={user}>
      <div style={{ padding: 28 }}>
        {/* ── Backend warning ── */}
        {fetchError && (
          <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#856404" }}>
            ⚠ {fetchError}
          </div>
        )}
        {/* ── Back ── */}
        <button
          onClick={() => setPage("patients")}
          style={{
            background: "none",
            border: "none",
            color: C.blue,
            fontSize: 14,
            cursor: "pointer",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Back to Patients
        </button>

        {/* ── Patient header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
            background: "#fff",
            border: `1px solid ${C.gray200}`,
            borderRadius: 14,
            padding: 20,
          }}
        >
          <Avatar initials={patient.initials} size={64} />
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: C.gray900,
                margin: "0 0 4px",
              }}
            >
              {patient.name}
            </h1>
            <div style={{ color: C.gray500, fontSize: 13 }}>{patient.patientId}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <Badge label={patient.status} />
            {isClinician && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to delete this patient? This action cannot be undone.")) {
                      setLoading(true);
                      await deletePatient(patient.id);
                      setPage("patients");
                    }
                  }}
                  style={{
                    background: "none",
                    border: `1px solid ${C.red}`,
                    color: C.red,
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setSelectedPatient(patient);
                    setPage("edit-patient");
                  }}
                  style={{
                    background: "none",
                    border: `1px solid ${C.blue}`,
                    color: C.blue,
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Edit Patient
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Sections ── */}
        {[
          {
            title: "Personal Information",
            icon: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
            fields: [
              ["Full Name", patient.name],
              ["Date of Birth", patient.dob ? new Date(patient.dob).toLocaleDateString() : "—"],
              ["Gender", patient.gender],
              ["Phone", patient.phone],
              ["Email", patient.email],
              ["Address", patient.address],
            ],
          },
          patient.guardian
            ? {
                title: "Guardian Information",
                icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
                fields: [
                  ["Guardian Name", patient.guardian],
                  ["Guardian Phone", patient.guardianPhone],
                ],
              }
            : null,
          {
            title: "Clinical Information",
            icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
            fields: [
              ["Referred By", patient.referredBy],
              ["Status", patient.status],
              ["Chief Complaint", patient.chiefComplaint],
              ["Medical History", patient.medicalHistory],
              ["Dental History", patient.dentalHistory],
              ["Allergies", patient.allergies],
              ["Notes", patient.notes],
            ],
          },
        ]
          .filter(Boolean)
          .map((section) => (
            <div
              key={section.title}
              style={{
                background: "#fff",
                borderRadius: 14,
                border: `1px solid ${C.gray200}`,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={C.blue}
                >
                  <path d={section.icon} />
                </svg>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: C.gray900,
                  }}
                >
                  {section.title}
                </div>
              </div>
              {section.fields.map(([label, val]) => (
                <InfoRow key={label} label={label} value={val} />
              ))}
            </div>
          ))}

          {/* ── Case History Images ── */}
          <div style={{
            background: "#fff",
            borderRadius: 14,
            border: `1px solid ${C.gray200}`,
            padding: 20,
            marginBottom: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={C.blue}>
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.gray900 }}>Case History Images</div>
              </div>
              {isClinician && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    ref={caseInputRef}
                    style={{ display: "none" }}
                    onChange={(e) => handleFileUpload(e, "CASE_HISTORY")}
                  />
                  <button
                    style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600, opacity: uploadingImage ? 0.7 : 1 }}
                    onClick={() => caseInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? "Uploading..." : "Upload Case History Image"}
                  </button>
                </>
              )}
            </div>
            
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
              {(patient.radiographs || []).filter(r => r.category === "CASE_HISTORY").length > 0 ? (
                (patient.radiographs || []).filter(r => r.category === "CASE_HISTORY").map(r => (
                  <div key={r.id} className="card-hover" style={{ position: "relative", minWidth: 160, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: 8 }}>
                    {isClinician && (
                      <button
                        onClick={() => handleDeleteImage(r.id)}
                        style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,0,0,0.8)", color: "white", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
                      >
                        ×
                      </button>
                    )}
                    <img src={`http://localhost:8080${r.fileUrl}`} alt={r.description} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 4 }} />
                    <div style={{ fontSize: 12, color: C.gray700, marginTop: 4 }}>{r.description}</div>
                    <div style={{ fontSize: 10, color: C.gray400 }}>{new Date(r.uploadDate).toLocaleDateString()}</div>
                  </div>
                ))
              ) : (
                <div className="card-hover" style={{ minWidth: 200, border: `1px dashed ${C.gray300}`, borderRadius: 8, padding: 8, background: C.gray50 }}>
                  <img src="/radiograph_placeholder.png" alt="Placeholder" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 4, opacity: 0.6 }} />
                  <div style={{ fontSize: 12, color: C.gray600, marginTop: 4, fontWeight: 600 }}>Frontal Intraoral</div>
                  <div style={{ fontSize: 10, color: C.gray400 }}>No case history images uploaded</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Radiographs ── */}
          <div style={{
            background: "#fff",
            borderRadius: 14,
            border: `1px solid ${C.gray200}`,
            padding: 20,
            marginBottom: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={C.blue}>
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.gray900 }}>Radiographs</div>
              </div>
              {isClinician && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    ref={radioInputRef}
                    style={{ display: "none" }}
                    onChange={(e) => handleFileUpload(e, "RADIOGRAPH")}
                  />
                  <button
                    style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600, opacity: uploadingImage ? 0.7 : 1 }}
                    onClick={() => radioInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? "Uploading..." : "Upload Radiograph"}
                  </button>
                </>
              )}
            </div>
            
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
              {(patient.radiographs || []).filter(r => r.category !== "CASE_HISTORY").length > 0 ? (
                (patient.radiographs || []).filter(r => r.category !== "CASE_HISTORY").map(r => (
                  <div key={r.id} className="card-hover" style={{ position: "relative", minWidth: 160, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: 8 }}>
                    {isClinician && (
                      <button
                        onClick={() => handleDeleteImage(r.id)}
                        style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,0,0,0.8)", color: "white", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
                      >
                        ×
                      </button>
                    )}
                    <img src={`http://localhost:8080${r.fileUrl}`} alt={r.description} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 4 }} />
                    <div style={{ fontSize: 12, color: C.gray700, marginTop: 4 }}>{r.description}</div>
                    <div style={{ fontSize: 10, color: C.gray400 }}>{new Date(r.uploadDate).toLocaleDateString()}</div>
                  </div>
                ))
              ) : (
                <div className="card-hover" style={{ minWidth: 200, border: `1px dashed ${C.gray300}`, borderRadius: 8, padding: 8, background: C.gray50 }}>
                  <img src="/radiograph_placeholder.png" alt="Placeholder Radiograph" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 4, opacity: 0.6 }} />
                  <div style={{ fontSize: 12, color: C.gray600, marginTop: 4, fontWeight: 600 }}>Panoramic X-Ray</div>
                  <div style={{ fontSize: 10, color: C.gray400 }}>No patient radiographs uploaded</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Patient History ── */}
          <div style={{
            background: "#fff",
            borderRadius: 14,
            border: `1px solid ${C.gray200}`,
            padding: 20,
            marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={C.blue}>
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
              </svg>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.gray900 }}>History Trace</div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {patient.historyLogs && patient.historyLogs.length > 0 ? (
                patient.historyLogs.map(log => (
                  <div key={log.id} style={{ display: "flex", gap: 16, borderBottom: `1px solid ${C.gray100}`, paddingBottom: 12 }}>
                    <div style={{ color: C.gray500, fontSize: 12, minWidth: 120 }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div>
                      <div style={{ color: C.gray900, fontSize: 13, fontWeight: 600 }}>{log.action}</div>
                      <div style={{ color: C.gray500, fontSize: 12 }}>{log.details}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: C.gray400, fontSize: 13 }}>No history logs found.</div>
              )}
            </div>
          </div>
      </div>
    </AppLayout>
  );
}
