import { useState, useEffect } from "react";
import LoginPage         from "./pages/LoginPage.jsx";
import DashboardPage     from "./pages/DashboardPage.jsx";
import PatientsPage      from "./pages/PatientsPage.jsx";
import PatientDetailPage from "./pages/PatientDetailPage.jsx";
import NewPatientPage    from "./pages/NewPatientPage.jsx";
import AppointmentsPage  from "./pages/AppointmentsPage.jsx";
import ReportsPage       from "./pages/ReportsPage.jsx";
import SettingsPage      from "./pages/SettingsPage.jsx";
import UsersPage         from "./pages/UsersPage.jsx";

/**
 * App — central router.
 * `user` shape: { name, email, picture, initials, provider }
 */
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("ortho_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [page, setPage] = useState(() => new URLSearchParams(window.location.search).get("page") || "dashboard");
  const [selectedPatient, setSelectedPatient] = useState(null);


  useEffect(() => {
    const currentUrlParams = new URLSearchParams(window.location.search);
    if (currentUrlParams.get("page") !== page) {
      window.history.pushState({ page, selectedPatient }, "", `?page=${page}`);
    } else {
      window.history.replaceState({ page, selectedPatient }, "", window.location.search || `?page=${page}`);
    }
  }, [page, selectedPatient]);

  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state) {
        if (e.state.page) setPage(e.state.page);
        if (e.state.selectedPatient !== undefined) setSelectedPatient(e.state.selectedPatient);
      } else {
        const params = new URLSearchParams(window.location.search);
        setPage(params.get("page") || "dashboard");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (!user) {
    return <LoginPage onLogin={(u) => { 
      localStorage.setItem("ortho_user", JSON.stringify(u));
      setUser(u); 
      setPage(u.role === "ADMIN" ? "users" : "dashboard"); 
    }} />;
  }

  const nav = (p) => setPage(p);

  const handleLogout = () => {
    if (window.google && user.provider === "google") {
      window.google.accounts.id.disableAutoSelect();
    }
    localStorage.removeItem("ortho_user");
    setUser(null);
    setPage("dashboard");
  };

  if (user?.role === "ADMIN") {
    if (page === "settings") {
      return <SettingsPage setPage={nav} setSelectedPatient={setSelectedPatient} user={user} onLogout={handleLogout} />;
    }
    return <UsersPage setPage={nav} setSelectedPatient={setSelectedPatient} onLogout={handleLogout} user={user} />;
  }

  if (user?.role === "STUDENT" && (page === "appointments" || page === "reports")) {
    return <DashboardPage setPage={nav} setSelectedPatient={setSelectedPatient} onLogout={handleLogout} user={user} />;
  }

  if (page === "dashboard")
    return <DashboardPage setPage={nav} setSelectedPatient={setSelectedPatient} onLogout={handleLogout} user={user} />;

  if (page === "patients")
    return <PatientsPage setPage={nav} setSelectedPatient={setSelectedPatient} onLogout={handleLogout} user={user} />;

  if (page === "patient-detail")
    return <PatientDetailPage patient={selectedPatient} setPage={nav} setSelectedPatient={setSelectedPatient} onLogout={handleLogout} user={user} />;

  if (page === "new-patient")
    return <NewPatientPage setPage={nav} setSelectedPatient={setSelectedPatient} onLogout={handleLogout} user={user} onSave={(p) => console.log("saved:", p)} />;

  if (page === "edit-patient")
    return <NewPatientPage setPage={nav} setSelectedPatient={setSelectedPatient} onLogout={handleLogout} user={user} editPatient={selectedPatient} onSave={(p) => { setSelectedPatient(p); nav("patient-detail"); }} />;

  if (page === "appointments")
    return <AppointmentsPage setPage={nav} setSelectedPatient={setSelectedPatient} onLogout={handleLogout} user={user} />;

  if (page === "reports")
    return <ReportsPage setPage={nav} setSelectedPatient={setSelectedPatient} onLogout={handleLogout} user={user} />;

  if (page === "settings")
    return (
      <SettingsPage
        setPage={nav}
        setSelectedPatient={setSelectedPatient}
        user={user}
        onLogout={handleLogout}
      />
    );

  return <DashboardPage setPage={nav} setSelectedPatient={setSelectedPatient} onLogout={handleLogout} user={user} />;
}
