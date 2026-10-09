JavaScript
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error('Error al inicializar Supabase:', e);
  }
}

export default function App() {
  const [tanques, setTanques] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (supabase) {
      fetchTanques();
    } else {
      setErrorMsg('Faltan las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel.');
    }
  }, []);

  async function fetchTanques() {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.from('tanques').select('*');
      if (error) {
        setErrorMsg('Error al conectar con la base de datos: ' + error.message);
      } else if (data) {
        setTanques(data);
      }
    } catch (err) {
      setErrorMsg('Error de red al consultar Supabase.');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#ffffff', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #334155', paddingBottom: '15px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>
            ⛽ DA FRE - Gestión de Flota y Combustibles
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '5px 0 0 0' }}>Control de Cisternas y Cargas Diarias</p>
        </div>
        <button 
          onClick={fetchTanques} 
          style={{ backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #475569', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' }}>
          {loading ? 'Cargando...' : '🔄 Actualizar'}
        </button>
      </header>

      {errorMsg && (
        <div style={{ backgroundColor: '#7f1d1d', color: '#fecaca', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ef4444' }}>
          ⚠️ <strong>Atención:</strong> {errorMsg}
        </div>
      )}

      <section>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#cbd5e1' }}>Stock de Cisternas</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {tanques.length > 0 ? (
            tanques.map((t) => (
              <div key={t.id} style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>{t.nombre}</h3>
                  <span style={{ fontSize: '12px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '4px 8px', borderRadius: '12px' }}>
                    Factor: {t.factor_calibracion}
                  </span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>
                  {Number(t.stock_actual_l).toLocaleString('es-AR')} <span style={{ fontSize: '16px', color: '#94a3b8' }}>L</span>
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '5px 0 0 0' }}>
                  Capacidad Total: {Number(t.capacidad_l).toLocaleString('es-AR')} L
                </p>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8', backgroundColor: '#1e293b', borderRadius: '8px' }}>
              {loading ? 'Conectando con Supabase...' : 'No hay cisternas registradas para mostrar.'}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
