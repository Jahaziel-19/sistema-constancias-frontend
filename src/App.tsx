import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "@/pages/Login.tsx";
import Verify from "@/pages/Verify";
import RequireAuth from "@/components/auth/RequireAuth";
import ModuloProtegido from "@/components/ModuloProtegido";
import { usePuede } from "@/hooks/usePuede";
import AdminLayout from "@/layouts/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import Alumnos from "@/pages/admin/Alumnos";
import Calificaciones from "@/pages/admin/Calificaciones";
import Emision from "@/pages/admin/Emision";
import Catalogos from "@/pages/admin/Catalogos";
import Auditoria from "@/pages/admin/Auditoria";
import Registros from "@/pages/admin/Registros";
import Ciclos from "@/pages/admin/Ciclos";
import { useAuthStore } from "@/stores/auth";

const ORDEN_MODULOS = ["dashboard", "alumnos", "calificaciones", "ciclos", "emision", "registros", "catalogos", "auditoria"];
const RUTA_MODULO: Record<string, string> = {
  dashboard: "dashboard",
  alumnos: "alumnos",
  calificaciones: "calificaciones",
  ciclos: "ciclos",
  emision: "emision",
  registros: "registros",
  catalogos: "catalogos",
  auditoria: "auditoria",
};

function PrimerModulo() {
  const puede = usePuede();
  const primero = ORDEN_MODULOS.find((m) => puede(m)) ?? "emision";
  return <Navigate to={RUTA_MODULO[primero]} replace />;
}

export default function App() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const cargarPerfil = useAuthStore((s) => s.cargarPerfil);

  useEffect(() => {
    if (accessToken) void cargarPerfil();
  }, [accessToken, cargarPerfil]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verificar" element={<Verify />} />

        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<PrimerModulo />} />
          <Route path="dashboard" element={<ModuloProtegido modulo="dashboard"><Dashboard /></ModuloProtegido>} />
          <Route path="alumnos" element={<ModuloProtegido modulo="alumnos"><Alumnos /></ModuloProtegido>} />
          <Route path="calificaciones" element={<ModuloProtegido modulo="calificaciones"><Calificaciones /></ModuloProtegido>} />
          <Route path="emision" element={<ModuloProtegido modulo="emision"><Emision /></ModuloProtegido>} />
          <Route path="registros" element={<ModuloProtegido modulo="registros"><Registros /></ModuloProtegido>} />
          <Route path="catalogos" element={<ModuloProtegido modulo="catalogos"><Catalogos /></ModuloProtegido>} />
          <Route path="auditoria" element={<ModuloProtegido modulo="auditoria"><Auditoria /></ModuloProtegido>} />
          <Route path="ciclos" element={<ModuloProtegido modulo="ciclos"><Ciclos /></ModuloProtegido>} />
        </Route>
      </Routes>
    </Router>
  );
}
