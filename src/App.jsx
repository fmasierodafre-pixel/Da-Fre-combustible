import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error('Error Supabase:', e);
  }
}

export default function App() {
  const [tanques, setTanques] = useState([]);
  const [pestana, setPestana] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [formCarga, setFormCarga] = useState({ tanque_id: '', equipo: '', litros: '', chofer: '', horometro_km: '' });

  useEffect(() => {
    if (supabase) fetchTanques();
  }, []);

  async function fetchTanques() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tanques').select('*');
      if (!error && data) setTanques(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const handleGuardarCarga = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('cargas').insert([formCarga]);
      if (error) throw error;
      alert('¡Carga registrada con éxito!');
      setFormCarga({ tanque_id: '', equipo: '', litros: '', chofer: '', horometro_km: '' });
      setPestana('dashboard');
      fetchTanques();
    } catch (err) {
      alert('Error al registrar: ' + err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>⛽ DA FRE - Combustibles</h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '5px 0 0 0' }}>Gestión de Flota y Cisternas</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setPestana('dashboard')} style={{ background: pestana === 'dashboard' ? '#f59e0b' : '#1e293b', color: pestana === 'dashboard' ? '#000' : '#fff', border: '1px solid #475569', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📊 Dashboard</button>
          <button onClick={() => setPestana('nueva_carga')} style={{ background: pestana === 'nueva_carga' ? '#f59e0b' : '#1e293b', color: pestana === 'nueva_carga' ? '#000' : '#fff', border: '1px solid #475569', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>➕ Nueva Carga</button>
          <button onClick={() => setPestana('excel')} style={{ background: pestana === 'excel' ? '#f59e0b' : '#1e293b', color: pestana === 'excel' ? '#000' : '#fff', border: '1px solid #475569', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📁 Excel</button>
          <button onClick={fetchTanques} style={{ background: '#1e293b', color: '#fff', border: '1px solid #475569', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>🔄</button>
        </div>
      </header>

      {pestana === 'dashboard' && (
        <div>
          <h2 style={{ fontSize: '16px', marginBottom: '15px', color: '#cbd5e1' }}>Stock de Cisternas</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {tanques.length > 0 ? (
              tanques.map(t => (
                <div key={t.id} style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{t.nombre}</h3>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#f59e0b' }}>{Number(t.stock_actual_l || 0).toLocaleString('es-AR')} L</div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '5px 0 0 0' }}>Capacidad: {Number(t.capacidad_l || 0).toLocaleString('es-AR')} L</p>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8', backgroundColor: '#1e293b', borderRadius: '8px' }}>
                {loading ? 'Cargando...' : 'No hay cisternas registradas en Supabase.'}
              </div>
            )}
          </div>
        </div>
      )}

      {pestana === 'nueva_carga' && (
        <div style={{ maxWidth: '500px', margin: '0 auto', backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#f59e0b' }}>Registrar Carga</h2>
          <form onSubmit={handleGuardarCarga} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#cbd5e1' }}>Cisterna</label>
              <select value={formCarga.tanque_id} onChange={e => setFormCarga({...formCarga, tanque_id: e.target.value})} required style={{ width: '100%', padding: '10px', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px' }}>
                <option value="">Seleccionar...</option>
                {tanques.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#cbd5e1' }}>Equipo / Vehículo</label>
              <input type="text" placeholder="Ej: Camión Scania" value={formCarga.equipo} onChange={e => setFormCarga({...formCarga, equipo: e.target.value})} required style={{ width: '100%', padding: '10px', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', color: '#cbd5e1' }}>Litros</label>
                <input type="number" placeholder="250" value={formCarga.litros} onChange={e => setFormCarga({...formCarga, litros: e.target.value})} required style={{ width: '100%', padding: '10px', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', color: '#cbd5e1' }}>Horómetro / Km</label>
                <input type="number" placeholder="145000" value={formCarga.horometro_km} onChange={e => setFormCarga({...formCarga, horometro_km: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#cbd5e1' }}>Chofer</label>
              <input type="text" placeholder="Nombre" value={formCarga.chofer} onChange={e => setFormCarga({...formCarga, chofer: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px' }} />
            </div>
            <button type="submit" style={{ background: '#f59e0b', color: '#000', fontWeight: 'bold', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' }}>Guardar Carga</button>
          </form>
        </div>
      )}

      {pestana === 'excel' && (
        <div style={{ maxWidth: '500px', margin: '0 auto', backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', color: '#38bdf8', marginBottom: '10px' }}>Importar Planilla Excel</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>Seleccioná tu archivo CSV o XLSX de consumos.</p>
          <input type="file" accept=".xlsx, .xls, .csv" onChange={() => alert('Archivo seleccionado correctamente.')} style={{ width: '100%', padding: '15px', background: '#0f172a', color: '#fff', border: '1px dashed #475569', borderRadius: '6px' }} />
        </div>
      )}
    </div>
  );
}
