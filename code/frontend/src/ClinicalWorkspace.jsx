import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import definitions from '../../shared/clinicalFields.json';
import CaseHistoryForm from './CaseHistoryForm.jsx';
import { getClinicalRecords, createClinicalRecord, approveClinicalRecord, downloadConsent } from './api.js';
import { toast, confirmDialog } from './dialogs.js';
import './clinicalWorkspace.css';
import { Printer, Plus, Save } from 'lucide-react';

function RecordValues({ record }) {
  const definition = definitions.find(item => item.kind === record.kind);
  return <dl className="clinical-values">{definition?.fields.filter(field => record.data[field.key]).map(field => <div key={field.key}><dt>{field.label}</dt><dd>{record.data[field.key]}</dd></div>)}</dl>;
}
export default function ClinicalWorkspace({ patient, user, onPatientChange, view, resetKey, onDirtyChange }) {
  const [records, setRecords] = useState([]);
  const [kind, setKind] = useState('TREATMENT_PLAN');
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { setKind(view === 'visits' ? 'VISIT' : 'TREATMENT_PLAN'); setEditing(null); setFile(null); }, [view, resetKey]);
  useEffect(() => { onDirtyChange?.(Boolean(editing)); }, [editing, onDirtyChange]);
  const canWrite = ['STAFF', 'ADMIN'].includes(user?.role) && !patient.archivedAt;
  const definition = definitions.find(item => item.kind === kind);
  const load = async () => {
    setLoading(true);
    const result = await getClinicalRecords(patient.id);
    if (result.error) setError(result.error); else { setRecords(result.data); setError(''); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [patient.id]);
  const begin = record => { setFile(null); setError(''); setEditing(record ? { previousId: record.id, data: { ...record.data } } : { data: {} }); };
  const save = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    const result = await createClinicalRecord(patient.id, { ...editing, kind }, file);
    setBusy(false);
    if (result.error) { setError(result.error); return; }
    setEditing(null); setFile(null); await load(); onPatientChange?.(); toast('Clinical record saved', 'success');
  };
  const approve = async record => {
    if (!await confirmDialog('Approve treatment plan', `Approve revision ${record.version}? Your name and approval time will be recorded.`)) return;
    setBusy(true);
    const result = await approveClinicalRecord(patient.id, record.id);
    setBusy(false);
    if (result.error) setError(result.error); else { await load(); onPatientChange?.(); toast('Treatment plan approved', 'success'); }
  };
  return <section className="clinical-workspace">
    <header className="clinical-heading"><h2>{view === 'visits' ? 'Progress visits' : 'Treatment & follow-up'}</h2><button className="btn" type="button" disabled={loading || Boolean(error)} onClick={() => window.print()}><Printer size={16} />Print case summary / PDF</button></header>
    <div className="clinical-tabs" role="tablist" aria-label="Clinical records" hidden={view === 'visits'}>{definitions.filter(item => !view || item.kind !== 'VISIT').map(item => <button type="button" role="tab" aria-selected={kind === item.kind} key={item.kind} onClick={async () => {
      if (editing && !await confirmDialog('Discard unsaved record', 'Switch sections without saving this record?')) return;
      setKind(item.kind); setEditing(null); setFile(null); setError('');
    }}>{item.label}</button>)}</div>
    {error && <p role="alert" className="clinical-error">{error}</p>}
    {loading ? <p>Loading clinical records...</p> : <div role="tabpanel" aria-label={definition.label}>
      {canWrite && !editing && <button className="btn btn-primary" type="button" onClick={() => begin(null)}><Plus size={16} />Add {definition.label.toLowerCase().replace(/s$/, '')}</button>}
      {editing && <form onSubmit={save} className="clinical-editor">
        <h3>{editing.previousId ? 'New revision' : 'New record'}</h3>
        <div className="clinical-field-grid">{definition.fields.map(field => <label key={field.key}>{field.label}{field.required ? ' *' : ''}
          {field.type === 'select' ? <select aria-label={`${field.label}${field.required ? ' *' : ''}`} required={field.required} value={editing.data[field.key] || ''} onChange={event => setEditing({ ...editing, data: { ...editing.data, [field.key]: event.target.value } })}><option value="">Select...</option>{field.options.map(option => <option key={option}>{option}</option>)}</select> : field.type === 'date' ? <input aria-label={`${field.label}${field.required ? ' *' : ''}`} type="date" required={field.required} value={editing.data[field.key] || ''} onChange={event => setEditing({ ...editing, data: { ...editing.data, [field.key]: event.target.value } })} /> : <textarea aria-label={`${field.label}${field.required ? ' *' : ''}`} rows={3} required={field.required} maxLength={10000} value={editing.data[field.key] || ''} onChange={event => setEditing({ ...editing, data: { ...editing.data, [field.key]: event.target.value } })} />}
        </label>)}</div>
        {kind === 'CONSENT' && <label>Signed document (PDF, PNG, JPEG; up to 10 MB)<input type="file" accept="application/pdf,image/png,image/jpeg" required={editing.data.decision === 'Granted'} onChange={event => setFile(event.target.files[0] || null)} /></label>}
        <div className="clinical-actions"><button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save record'}</button><button type="button" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div>
      </form>}
      {!records.some(record => record.kind === kind) && !editing && <p className="clinical-muted">No {definition.label.toLowerCase()} recorded.</p>}
      {records.filter(record => record.kind === kind).map(record => {
        const superseded = records.some(item => item.previousId === record.id);
        return <article className="clinical-record" key={record.id}>
          <header><strong>{record.data.date || record.data.signedDate || record.data.completionDate || new Date(record.createdAt).toLocaleDateString()} · Revision {record.version}</strong><span>{superseded ? 'Superseded' : record.status}</span></header>
          <p className="clinical-muted">Recorded by {record.authorName} · {new Date(record.createdAt).toLocaleString()}</p>
          {record.approvedAt && <p>Approved by {record.approvedName} · {new Date(record.approvedAt).toLocaleString()}</p>}
          <RecordValues record={record} />
          <div className="clinical-actions">
            {record.hasDocument && <button type="button" onClick={() => downloadConsent(patient.id, record).catch(error => setError(error.message))}>Download signed document</button>}
            {canWrite && !superseded && <button type="button" disabled={busy} onClick={() => begin(record)}>Revise</button>}
            {canWrite && !superseded && record.kind === 'TREATMENT_PLAN' && record.status === 'Pending approval' && <button type="button" disabled={busy} onClick={() => approve(record)}>Approve plan</button>}
          </div>
        </article>;
      })}
    </div>}
    {createPortal(<div className="clinical-print">
      <h1>OrthoFlow Clinic - Case record</h1><h2>{patient.name}</h2>
      <p>{patient.patientId} · {patient.status}{patient.archivedAt ? ' · Archived' : ''}</p>
      <dl>{[['Date of birth', patient.dob?.slice(0, 10)], ['Gender', patient.gender], ['Phone', patient.phone], ['Email', patient.email], ['Address', patient.address], ['Guardian', patient.guardian], ['Chief complaint', patient.chiefComplaint], ['Medical history', patient.medicalHistory], ['Dental history', patient.dentalHistory], ['Allergies', patient.allergies], ['Notes', patient.notes]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not recorded'}</dd></div>)}</dl>
      <CaseHistoryForm value={patient.caseHistory} readOnly />
      {definitions.map(item => <section key={item.kind}><h2>{item.label}</h2>{records.filter(record => record.kind === item.kind).map(record => <article key={record.id}><h3>Record {record.id} · Revision {record.version} · {records.some(next => next.previousId === record.id) ? 'Superseded' : record.status}</h3><p>{record.authorName} · {new Date(record.createdAt).toLocaleString()}</p>{record.approvedAt && <p>Approved: {record.approvedName} · {new Date(record.approvedAt).toLocaleString()}</p>}<RecordValues record={record} />{record.hasDocument && <p>Signed document: {record.documentName}</p>}</article>)}</section>)}
      <h2>Appointments</h2>{patient.appointments?.map(appointment => <p key={appointment.id}>{appointment.date.slice(0, 10)} {appointment.time} · {appointment.type} · {appointment.status}</p>)}
      <h2>Media register</h2>{patient.radiographs?.map(image => <p key={image.id}>{image.category} · {image.description} · {image.uploadDate?.slice(0, 10)}</p>)}
      <p>Generated {new Date().toLocaleString()}</p>
    </div>, document.body)}
  </section>;
}
