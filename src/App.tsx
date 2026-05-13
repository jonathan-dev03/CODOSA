import React, { StrictMode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Splash from './pages/Splash';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Journal from './pages/Journal';
import Discipline from './pages/Discipline';
import Schedule from './pages/Schedule';
import Homework from './pages/Homework';
import Account from './pages/Account';
import Layout from './components/Layout';
import './i18n/config';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <div className="h-screen w-screen flex items-center justify-center"><div className="loader"></div></div>;
  if (!user) return <Navigate to="/login" />;
  if (profile && !profile.is_approved) {
    return (
      <div className="h-screen w-screen p-8 flex flex-col items-center justify-center text-center bg-primary text-white">
        <h1 className="text-2xl font-bold mb-4">Kont an attant / Compte en attente</h1>
        <p className="opacity-80">Administratè a dwe aktive kont ou an anvan ou ka aksede platfòm la.</p>
        <p className="opacity-80 mt-2">L'administrateur doit activer votre compte avant que vous puissiez accéder à la plateforme.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-8 px-6 py-2 bg-secondary rounded-full font-bold"
        >
          Tcheke ankò / Vérifier à nouveau
        </button>
      </div>
    );
  }
  
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/splash" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/home" />} />
            <Route path="home" element={<Home />} />
            <Route path="journal" element={<Journal />} />
            <Route path="discipline" element={<Discipline />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="homework" element={<Homework />} />
            <Route path="account" element={<Account />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/splash" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
