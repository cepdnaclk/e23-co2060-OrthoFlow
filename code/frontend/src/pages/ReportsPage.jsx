import { useState, useEffect } from "react";
import { C } from "../constants.js";
import { AppLayout } from "../components.jsx";
import { getAllHistoryLogs, getAllPatients, getAllAppointments } from "../api.js";

export default function ReportsPage({ setPage, setSelectedPatient, onLogout, user }) {
  const [logs, setLogs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [logsRes, patRes, apptRes] = await Promise.all([
        getAllHistoryLogs(),
        getAllPatients(),
        getAllAppointments()
      ]);
      
      if (!logsRes.error && Array.isArray(logsRes.data)) setLogs(logsRes.data);
      if (!patRes.error && Array.isArray(patRes.data)) setPatients(patRes.data);
      if (!apptRes.error && Array.isArray(apptRes.data)) setAppointments(apptRes.data);
      
      setLoading(false);
    };
    fetchData();
  }, []);

  // Compute dynamic chart data
  const statusCounts = patients.reduce((acc, p) => {
    const s = p.status || "Assessment";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const DONUT_DATA = Object.entries(statusCounts).map(([label, count], i) => {
    const colors = [C.teal, C.blue, C.red, C.orange, C.purple, "#10b981"];
    return { label, count, color: colors[i % colors.length] };
  });

  const apptCounts = appointments.reduce((acc, a) => {
    const t = a.type || "Other";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const maxAppt = Math.max(...Object.values(apptCounts), 1);
  const APPT_TYPES = Object.entries(apptCounts).map(([label, count]) => ({
    label, count, max: maxAppt
  })).sort((a, b) => b.count - a.count);

  const MONTHS = [];
  const MONTHLY_COUNTS = [0, 0, 0, 0, 0, 0];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    MONTHS.push(d.toLocaleString('default', { month: 'short' }));
  }
  
  patients.forEach(p => {
    if (!p.createdAt) return;
    const d = new Date(p.createdAt);
    const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (diffMonths >= 0 && diffMonths <= 5) {
      MONTHLY_COUNTS[5 - diffMonths]++;
    }
  });

  const maxMonthly = Math.max(...MONTHLY_COUNTS, 1);

  return (
    <AppLayout active="reports" setPage={setPage} setSelectedPatient={setSelectedPatient} onLogout={onLogout} user={user}>
      <div style={{ padding: 28 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: C.gray900,
            margin: "0 0 4px",
          }}
        >
          Reports & History
        </h1>
        <div style={{ color: C.gray500, fontSize: 13, marginBottom: 24 }}>
          Overview of patient data and clinical history logs
        </div>

        {/* ── Monthly Registrations ── */}
        <Card title="Monthly Registrations">
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 6,
              height: 120,
              paddingTop: 16,
            }}
          >
            {/* Y-axis labels */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "100%",
                paddingBottom: 20,
                marginRight: 6,
              }}
            >
              {[8, 6, 4, 2, 0].map((n) => (
                <div
                  key={n}
                  style={{ fontSize: 10, color: C.gray400, lineHeight: 1 }}
                >
                  {n}
                </div>
              ))}
            </div>

            {/* Bars */}
            {MONTHS.map((m, i) => {
              const val = MONTHLY_COUNTS[i];
              const heightPct = val / maxMonthly;
              return (
                <div
                  key={m}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    height: "100%",
                    justifyContent: "flex-end",
                  }}
                >
                  <div
                    style={{
                      width: "60%",
                      height: val > 0 ? `${heightPct * 80}px` : "2px",
                      background:
                        val > 0
                          ? `linear-gradient(to top, ${C.blue}, ${C.blueLight})`
                          : C.gray100,
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.3s ease",
                    }}
                  />
                  <div style={{ fontSize: 10, color: C.gray500 }}>{m}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Patient Status Distribution ── */}
        <Card title="Patient Status Distribution">
          <div
            style={{
              display: "flex",
              gap: 32,
              alignItems: "center",
              flexWrap: "wrap",
              paddingTop: 8,
            }}
          >
            {/* SVG Donut */}
            <DonutChart data={DONUT_DATA} />

            {/* Legend */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {DONUT_DATA.map((d) => (
                <div
                  key={d.label}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: d.color,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ fontSize: 13, color: C.gray700 }}>
                    {d.label}{" "}
                    <span style={{ color: C.gray400 }}>({d.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* ── Appointment Types ── */}
        <Card title="Appointment Types">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              paddingTop: 8,
            }}
          >
            {APPT_TYPES.length > 0 ? APPT_TYPES.map((t) => (
              <div
                key={t.label}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div
                  style={{
                    width: 130,
                    fontSize: 12,
                    color: C.gray500,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {t.label}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 22,
                    background: C.gray100,
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(t.count / t.max) * 100}%`,
                      background: `linear-gradient(to right, ${C.teal}, #00e5c8)`,
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: C.gray700,
                    fontWeight: 600,
                    width: 20,
                    textAlign: "right",
                  }}
                >
                  {t.count}
                </div>
              </div>
            )) : <div style={{ color: C.gray400, fontSize: 13 }}>No appointments to display.</div>}
          </div>
        </Card>

        {/* ── Clinical History Logs ── */}
        <Card title="Global Clinical History">
          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: C.gray400, fontSize: 13 }}>Loading reports...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: C.gray400, fontSize: 13 }}>No activity found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {logs.map((log) => (
                <div key={log.id} style={{ display: "flex", padding: "16px 0", borderBottom: `1px solid ${C.gray100}` }}>
                  <div style={{ position: "relative", marginRight: 20 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.blue, border: "2px solid #fff", boxShadow: `0 0 0 2px ${C.blue}40`, position: "relative", zIndex: 1, marginTop: 4 }} />
                    <div style={{ position: "absolute", top: 16, bottom: -16, left: 5, width: 2, background: C.gray200 }} />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: C.gray900 }}>
                        {log.action} <span style={{ color: C.gray400, fontWeight: 400 }}>on</span> {log.patient?.name || "Unknown Patient"}
                      </div>
                      <div style={{ fontSize: 12, color: C.gray500, whiteSpace: "nowrap" }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                    {log.details && (
                      <div style={{ fontSize: 13, color: C.gray600, background: C.gray50, padding: "8px 12px", borderRadius: 8, marginTop: 8 }}>
                        {log.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

// ── Helper Components ─────────────────────────────────────────────────────────

function Card({ title, children }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: `1px solid ${C.gray200}`,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 15,
          color: C.gray900,
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const safeTotal = total || 1;
  const r = 44;
  const cx = 60;
  const cy = 60;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const slices = data.map((d) => {
    const pct = d.count / safeTotal;
    const dash = pct * circ;
    const gap = circ - dash;
    const rotate = offset * 360 - 90;
    offset += pct;
    return { ...d, dash, gap, rotate };
  });

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
      {slices.map((s) => (
        <circle
          key={s.label}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth="26"
          strokeDasharray={`${s.dash} ${s.gap}`}
          transform={`rotate(${s.rotate} ${cx} ${cy})`}
        />
      ))}
      {/* Inner white circle */}
      <circle cx={cx} cy={cy} r="31" fill="white" />
      {/* Center label */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 14, fontWeight: 700, fill: C.gray900 }}
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 8, fill: C.gray500 }}
      >
        patients
      </text>
    </svg>
  );
}
