import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { authAPI } from './lib/supabase.js'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Pipeline from './pages/Pipeline.jsx'
import Clientes from './pages/Clientes.jsx'
import Projetos from './pages/Projetos.jsx'
import Financeiro from './pages/Financeiro.jsx'
import Proposta from './pages/Proposta.jsx'
import Portal from './pages/Portal.jsx'
import Dados from './pages/Dados.jsx'
import Agenda from './pages/Agenda.jsx'

function PrivateRoute({ session, children }) {
  if (session === null) return <Navigate to="/login" replace />
  if (session === undefined) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'var(--text3)' }}>Carregando...</div>
  return children
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    authAPI.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = authAPI.onAuthChange((_event, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/" element={
          <PrivateRoute session={session}>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="projetos" element={<Projetos />} />
          <Route path="financeiro" element={<Financeiro />} />
          <Route path="proposta" element={<Proposta />} />
          <Route path="dados" element={<Dados />} />
          <Route path="agenda" element={<Agenda />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
