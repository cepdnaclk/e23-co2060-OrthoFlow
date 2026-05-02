import { useState } from "react";
import { useRef } from "react";
import { C, PATIENT_STATUSES } from "../constants.js";
import { registerPatient, updatePatient, uploadRadiograph, deleteRadiograph } from "../api.js";
import { AppLayout } from "../components.jsx";
import { toast, customAlert, confirmDialog, promptDialog } from "../dialogs.js";

const generateRegNum = () => {
  const p1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const p2 = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `ORT-${p1}-${p2}`;
};

const getEmptyForm = () => ({
  regNum: generateRegNum(),
  fullName: "",
  dob: "",
  gender: "",
  phone: "+94",
  email: "",
  address: "",
  guardianName: "",
  guardianPhone: "",
  referredBy: "",
  status: "Assessment",
  chiefComplaint: "",
  medicalHistory: "",
  dentalHistory: "",
  allergies: "",
  notes: "",
});

/**
 * NewPatientPage
 * Props:
 *   setPage: (page: string) => void
 *   onSave:  (patient: object) => void   [optional — wire to state in App]
 */
export default function NewPatientPage({ setPage, setSelectedPatient, onLogout, onSave, user, editPatient }) {
  const [form, setForm] = useState(() => {
    if (editPatient) {
      return {
        regNum: editPatient.patientId || editPatient.regNum || "",
        fullName: editPatient.name || editPatient.fullName || "",
        dob: editPatient.dob ? new Date(editPatient.dob).toISOString().split('T')[0] : "",
        gender: editPatient.gender || "",
        phone: editPatient.phone || "",
        email: editPatient.email || "",
        address: editPatient.address || "",
        guardianName: editPatient.guardian || editPatient.guardianName || "",
        guardianPhone: editPatient.guardianPhone || "",
        referredBy: editPatient.referredBy || "",
        status: editPatient.status || "Assessment",
        chiefComplaint: editPatient.chiefComplaint || "",
        medicalHistory: editPatient.medicalHistory || "",
        dentalHistory: editPatient.dentalHistory || "",
        allergies: editPatient.allergies || "",
        notes: editPatient.notes || "",
      };
    }
    return getEmptyForm();
  });
  const [errors, setErrors] = useState({});
  const [radiographs, setRadiographs] = useState(editPatient?.radiographs || []);
  // For new patients: staged images awaiting upload after patient creation
  const [pendingImages, setPendingImages] = useState([]); // [{ file, description, category, previewUrl }]
  const radioInputRef = useRef(null);
  const caseInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const isClinician = user?.role === 'STAFF' || user?.role === 'ADMIN';

  const handleFileUpload = async (e, category) => {
    const file = e.target.files[0];
    if (!file) return;

    const description = await promptDialog(`Enter a description for this ${category === 'CASE_HISTORY' ? 'case history image' : 'radiograph'}:`, category === 'CASE_HISTORY' ? 'Pre-treatment photo' : 'Radiograph');
    if (description === null) {
      e.target.value = null;
      return;
    }

    if (editPatient) {
      // Edit mode: upload immediately
      setUploadingImage(true);
      const { data, error } = await uploadRadiograph(editPatient.id, file, description, category);
      if (error) customAlert("Failed to upload image: " + error);
      else if (data) setRadiographs(prev => [data, ...prev]);
      setUploadingImage(false);
    } else {
      // New patient mode: stage for later
      const previewUrl = URL.createObjectURL(file);
      setPendingImages(prev => [{ file, description, category, previewUrl, id: previewUrl }, ...prev]);
    }
    e.target.value = null;
  };

  const handleDeleteImage = async (imageId) => {
    if (editPatient) {
      if (!(await confirmDialog("Delete Image", "Are you sure you want to delete this image?"))) return;
      const { error } = await deleteRadiograph(imageId);
      if (error) customAlert("Failed to delete image: " + error);
      else setRadiographs(prev => prev.filter(r => r.id !== imageId));
    } else {
      // Remove from pending
      setPendingImages(prev => {
        const item = prev.find(p => p.id === imageId);
        if (item) URL.revokeObjectURL(item.previewUrl);
        return prev.filter(p => p.id !== imageId);
      });
    }
  };

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.regNum.trim()) e.regNum = "Required";
    if (!form.fullName.trim()) e.fullName = "Required";
    return e;
  };

  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    setSubmitError("");
    
    let res;
    if (editPatient) {
      res = await updatePatient(editPatient.id, form);
      const { data, error } = res;
      setSubmitting(false);
      if (error) {
        setSubmitError(error);
      } else {
        toast("Patient updated successfully", "success");
        if (onSave) onSave({ ...(data || form), radiographs });
      }
    } else {
      res = await registerPatient(form);
      const { data, error } = res;
      if (error) {
        setSubmitting(false);
        setSubmitError(error);
        return;
      }
      // Upload any staged images now that we have the patient ID
      if (pendingImages.length > 0 && data?.id) {
        for (const img of pendingImages) {
          await uploadRadiograph(data.id, img.file, img.description, img.category);
        }
      }
      setSubmitting(false);
      toast("Patient created successfully", "success");
      if (onSave) onSave({ ...(data || form), radiographs });
      setPage("patients");
    }
  };



  return (
    <AppLayout active="patients" setPage={setPage} setSelectedPatient={setSelectedPatient} onLogout={onLogout} user={user}>
      <div style={{ padding: 28 }}>
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => setPage("patients")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.gray500,
              display: "flex",
              padding: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: C.gray900,
              margin: 0,
            }}
          >
            {editPatient ? "Edit Patient" : "New Patient"}
          </h1>
        </div>

        {/* ── Personal Information ── */}
        <Section title="Personal Information">
          <TextInput label="Registration Number *" fieldKey="regNum" placeholder="e.g., ORT-2024-001" half form={form} set={set} errors={errors} />
          <TextInput label="Full Name *" fieldKey="fullName" placeholder="Patient full name" half form={form} set={set} errors={errors} />
          <TextInput label="Date of Birth" fieldKey="dob" type="date" placeholder="" half form={form} set={set} errors={errors} />
          <SelectInput
            label="Gender"
            fieldKey="gender"
            half
            options={[
              { value: "", label: "Select gender" },
              "Male",
              "Female",
              "Other",
            ]}
            form={form} set={set} errors={errors}
          />
          <TextInput label="Phone" fieldKey="phone" placeholder="+94…" half form={form} set={set} errors={errors} />
          <TextInput label="Email" fieldKey="email" type="email" placeholder="patient@email.com" half form={form} set={set} errors={errors} />
          <TextInput label="Address" fieldKey="address" placeholder="Street, City" form={form} set={set} errors={errors} />
        </Section>

        {/* ── Guardian Information ── */}
        <Section title="Guardian Information (if minor)">
          <TextInput label="Guardian Name" fieldKey="guardianName" placeholder="" half form={form} set={set} errors={errors} />
          <TextInput label="Guardian Phone" fieldKey="guardianPhone" placeholder="+94…" half form={form} set={set} errors={errors} />
        </Section>

        {/* ── Clinical Information ── */}
        <Section title="Clinical Information">
          <TextInput label="Referred By" fieldKey="referredBy" placeholder="Referring doctor or clinic" half form={form} set={set} errors={errors} />
          <SelectInput label="Status" fieldKey="status" half options={PATIENT_STATUSES} form={form} set={set} errors={errors} />
          <TextArea label="Chief Complaint" fieldKey="chiefComplaint" placeholder="Primary reason for orthodontic consultation" form={form} set={set} errors={errors} />
          <TextArea label="Medical History" fieldKey="medicalHistory" placeholder="Relevant medical conditions, medications…" form={form} set={set} errors={errors} />
          <TextArea label="Dental History" fieldKey="dentalHistory" placeholder="Previous dental treatments…" form={form} set={set} errors={errors} />
          <TextArea label="Allergies" fieldKey="allergies" placeholder="Known allergies" form={form} set={set} errors={errors} />
          <TextArea label="Notes" fieldKey="notes" placeholder="Additional notes…" form={form} set={set} errors={errors} />
        </Section>

        {/* ── Image Management ── */}
        {isClinician && (
          <Section title="Image Management">
            {/* Case History */}
            <div style={{ flex: "0 0 100%", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.gray700 }}>Case History Images</div>
                  {!editPatient && <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>Images will be uploaded after patient is created.</div>}
                </div>
                <>
                  <input type="file" accept="image/*" ref={caseInputRef} style={{ display: "none" }} onChange={(e) => handleFileUpload(e, "CASE_HISTORY")} />
                  <button onClick={() => caseInputRef.current?.click()} disabled={uploadingImage} style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600, opacity: uploadingImage ? 0.7 : 1 }}>
                    {uploadingImage ? "Uploading..." : "+ Add Image"}
                  </button>
                </>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", paddingBottom: 8 }}>
                {(editPatient ? radiographs.filter(r => r.category === "CASE_HISTORY") : pendingImages.filter(r => r.category === "CASE_HISTORY")).length > 0 ? (
                  (editPatient ? radiographs.filter(r => r.category === "CASE_HISTORY") : pendingImages.filter(r => r.category === "CASE_HISTORY")).map(r => (
                    <div key={r.id} style={{ position: "relative", width: 140, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: 8, background: "#fafafa" }}>
                      <button onClick={() => handleDeleteImage(r.id)} style={{ position: "absolute", top: 6, right: 6, background: "rgba(220,38,38,0.85)", color: "white", border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, lineHeight: 1, zIndex: 1 }}>×</button>
                      <img src={editPatient ? `http://localhost:8080${r.fileUrl}` : r.previewUrl} alt={r.description} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 4 }} />
                      <div style={{ fontSize: 11, color: C.gray700, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.description}</div>
                      {!editPatient && <div style={{ fontSize: 10, color: C.blue, marginTop: 2 }}>⏳ Pending</div>}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 12, color: C.gray400, padding: "12px 0" }}>No case history images added yet.</div>
                )}
              </div>
            </div>

            {/* Radiographs */}
            <div style={{ flex: "0 0 100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.gray700 }}>Radiographs</div>
                  {!editPatient && <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>Images will be uploaded after patient is created.</div>}
                </div>
                <>
                  <input type="file" accept="image/*" ref={radioInputRef} style={{ display: "none" }} onChange={(e) => handleFileUpload(e, "RADIOGRAPH")} />
                  <button onClick={() => radioInputRef.current?.click()} disabled={uploadingImage} style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600, opacity: uploadingImage ? 0.7 : 1 }}>
                    {uploadingImage ? "Uploading..." : "+ Add Radiograph"}
                  </button>
                </>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", paddingBottom: 8 }}>
                {(editPatient ? radiographs.filter(r => r.category !== "CASE_HISTORY") : pendingImages.filter(r => r.category === "RADIOGRAPH")).length > 0 ? (
                  (editPatient ? radiographs.filter(r => r.category !== "CASE_HISTORY") : pendingImages.filter(r => r.category === "RADIOGRAPH")).map(r => (
                    <div key={r.id} style={{ position: "relative", width: 140, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: 8, background: "#fafafa" }}>
                      <button onClick={() => handleDeleteImage(r.id)} style={{ position: "absolute", top: 6, right: 6, background: "rgba(220,38,38,0.85)", color: "white", border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, lineHeight: 1, zIndex: 1 }}>×</button>
                      <img src={editPatient ? `http://localhost:8080${r.fileUrl}` : r.previewUrl} alt={r.description} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 4 }} />
                      <div style={{ fontSize: 11, color: C.gray700, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.description}</div>
                      {!editPatient && <div style={{ fontSize: 10, color: C.blue, marginTop: 2 }}>⏳ Pending</div>}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 12, color: C.gray400, padding: "12px 0" }}>No radiographs added yet.</div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* ── Actions ── */}
        {submitError && (
          <div style={{ color: C.red, fontSize: 13, marginBottom: 8, textAlign: "right" }}>
            ⚠ {submitError}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 8,
          }}
        >
          <button
            onClick={() => setPage("patients")}
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              border: `1px solid ${C.gray200}`,
              background: "#fff",
              fontSize: 14,
              cursor: "pointer",
              color: C.gray700,
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              border: "none",
              background: submitting ? C.gray400 : C.blue,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {submitting ? (
              <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            )}
            {submitting ? "Saving…" : (editPatient ? "Save Changes" : "Create Patient")}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AppLayout>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TextInput = ({ label, fieldKey, placeholder, type = "text", half = false, form, set, errors }) => (
  <div style={{ flex: `0 0 ${half ? "calc(50% - 8px)" : "100%"}`, minWidth: 0 }}>
    <label style={labelStyle}>{label}</label>
    <input
      type={type}
      value={form[fieldKey]}
      onChange={(e) => set(fieldKey, e.target.value)}
      placeholder={placeholder}
      style={{
        ...inputStyle,
        borderColor: errors[fieldKey] ? C.red : C.gray200,
      }}
    />
    {errors[fieldKey] && (
      <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>
        {errors[fieldKey]}
      </div>
    )}
  </div>
);

const SelectInput = ({ label, fieldKey, options, half = false, form, set, errors }) => (
  <div style={{ flex: `0 0 ${half ? "calc(50% - 8px)" : "100%"}`, minWidth: 0 }}>
    <label style={labelStyle}>{label}</label>
    <select
      value={form[fieldKey]}
      onChange={(e) => set(fieldKey, e.target.value)}
      style={{ ...inputStyle, background: "#fff" }}
    >
      {options.map((o) =>
        typeof o === "string" ? (
          <option key={o} value={o}>{o}</option>
        ) : (
          <option key={o.value} value={o.value}>{o.label}</option>
        )
      )}
    </select>
  </div>
);

const TextArea = ({ label, fieldKey, placeholder, rows = 2, form, set, errors }) => (
  <div style={{ flex: "0 0 100%" }}>
    <label style={labelStyle}>{label}</label>
    <textarea
      value={form[fieldKey]}
      onChange={(e) => set(fieldKey, e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle, resize: "vertical" }}
    />
  </div>
);

function Section({ title, children }) {
  return (
    <div
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
          fontWeight: 700,
          fontSize: 15,
          color: C.gray900,
          marginBottom: 16,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: C.gray700,
  display: "block",
  marginBottom: 4,
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${C.gray200}`,
  fontSize: 13,
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
  color: C.gray900,
};
