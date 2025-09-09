import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import API from "./api";

function ProtectedRoute() {
  const isAuth = API.isLoggedIn();
  const loc = useLocation();
  return isAuth ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc }} />;
}

export default function App() {
  const RootRedirect = () => (API.isLoggedIn() ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />);

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginLazy />} />
      <Route path="/register" element={<RegisterLazy />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomeLazy />} />
        <Route path="/files/:id" element={<FileDetailLazy/>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import React from "react";
const LoginLazy = React.lazy(() => import("./pages/Login.jsx"));
const HomeLazy  = React.lazy(() => import("./pages/Home.jsx"));
const FileDetailLazy  = React.lazy(() => import("./pages/DetalleArchivo.jsx"));
const RegisterLazy  = React.lazy(() => import("./pages/Register.jsx"));
