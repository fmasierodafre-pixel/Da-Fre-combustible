import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;
if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
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
  const [pestana, setPestana] = useState('dashboard'); // 'dashboard', 'nueva_carga', 'excel'

  // Formulario Nueva Carga
  const [formCarga, setFormCarga] = useState({
    tanque_id: '',
    equipo: '',
    litros: '',
    chofer: '',
    horometro_km: ''
  });

  useEffect(() => {
    if (supabase) {
      fetchDatos();
    } else {
      setErrorMsg('Configura las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel.');
    }
  }, []);

  async function fetchDatos() {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: tData, error: tErr } = await supabase.from('tanques').select('*');
      if (tErr) throw tErr;
      if (tData) setTanques(tData);
    } catch (err) {
      setErrorMsg('Error al consultar datos: ' + err.message);
    }
    setLoading(false);
  }

  const handleGuardarCarga = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('cargas').insert([formCarga]);
      if (error) throw error;
      alert('¡Carga de combustible registrada exitosamente!');
      setFormCarga({ tanque_id: '', equipo: '', litros: '', chofer: '', horometro_km: '' });
      fetchDatos();
      setPestana('dashboard');
    } catch (err) {
      alert('Error al registrar carga: ' + err.message);
    }
    setLoading(false);
  };

  const handleCargarExcel = (e) => {
    const file = e.target.files[0];
    if (file) {
      alert(Archivo "${file.name}" cargado correctamente para procesamiento.);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#ffffff', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* Header y Navegación */}
      <header style={{ borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>
            ⛽ DA FRE - Gestión de Flota y Combustibles
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '5px 0 0 0' }}>Control de Cisternas, Despachos y Planillas Excel</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setPestana('dashboard')} 
            style={{ backgroundColor: pestana === 'dashboard' ? '#f59e0b' : '#1e293b', color: pestana === 'dashboard' ? '#000' : '#fff', border: '1px solid #475569', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            📊 Dashboard
          </button>
          <button 
            onClick={() => setPestana('nueva_carga')} 
            style={{ backgroundColor: pestana === 'nueva_carga' ? '#f59e0b' : '#1e293b', color: pestana === 'nueva_carga' ? '#000' : '#fff', border: '1px solid #475569', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            ➕ Nueva Carga
          </button>
          <button 
            onClick={() => setPestana('excel')} 
            style={{ backgroundColor: pestana === 'excel' ? '#f59e0b' : '#1e293b', color: pestana === 'excel' ? '#000' : '#fff', border: '1px solid #475569', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            📁 Cargar Excel
          </button>
          <button 
            onClick={fetchDatos} 
            style={{ backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #475569', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>
            🔄
          </button>
        </div>
      </header>

      {/* Alerta de Error */}
      {errorMsg && (
        <div style={{ backgroundColor: '#7f1d1d', color: '#fecaca', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ef4444' }}>
          ⚠️ <strong>Atención:</strong> {errorMsg}
        </div>
      )}

      {/* PESTAÑA 1: DASHBOARD */}
      {pestana === 'dashboard' && (
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#cbd5e1' }}>Stock de Cisternas</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {tanques.length > 0 ? (
              tanques.map((t) => (
                <div key={t.id} style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>{t.nombre}</h3>
                    <span style={{ fontSize: '12px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '4px 8px', borderRadius: '12px' }}>
                      Factor: {t.factor_calibracion || '1.0'}
                    </span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>
                    {Number(t.stock_actual_l || 0).toLocaleString('es-AR')} <span style={{ fontSize: '16px', color: '#94a3b8' }}>L</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '5px 0 0 0' }}>
                    Capacidad Total: {Number(t.capacidad_l || 0).toLocaleString('es-AR')} L
                  </p>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8', backgroundColor: '#1e293b', borderRadius: '8px' }}>
                {loading ? 'Cargando datos...' : 'No hay cisternas registradas para mostrar.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: NUEVA CARGA */}
      {pestana === 'nueva_carga' && (
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#f59e0b' }}>Registrar Carga de Combustible</h2>
          <form onSubmit={handleGuardarCarga} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#cbd5e1' }}>Cisterna de Origen</label>
              <select 
                value={formCarga.tanque_id} 
                onChange={(e) => setFormCarga({...formCarga, tanque_id: e.target.value})}
                required
                style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px' }}>
                <option value="">Seleccionar cisterna...</option>
                {tanques.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#cbd5e1' }}>Equipo / Vehículo</label>
              <input 
                type="text" 
                placeholder="Ej: Camión Scania / Camioneta Hilux"
                value={formCarga.equipo}
                onChange={(e) => setFormCarga({...formCarga, equipo: e.target.value})}
                required
                style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#cbd5e1' }}>Litros Cargados</label>
                <input 
                  type="number" 
                  placeholder="Ej: 250"
                  value={formCarga.litros}
                  onChange={(e) => setFormCarga({...formCarga, litros: e.target.value})}
                  required
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#cbd5e1' }}>Horómetro / Km</label>
                <input 
                  type="number" 
                  placeholder="Ej: 145000"
                  value={formCarga.horometro_km}
                  onChange={(e) => setFormCarga({...formCarga, horometro_km: e.target.value})}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#cbd5e1' }}>Chofer / Responsable</label>
              <input 
                type="text" 
                placeholder="Nombre del operador"
                value={formCarga.chofer}
                onChange={(e) => setFormCarga({...formCarga, chofer: e.target.value})}
                style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px' }}
              />
            </div>

            <button 
              type="submit" 
              style={{ backgroundColor: '#f59e0b', color: '#000', fontWeight: 'bold', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' }}>
              Confirmar Carga
            </button>
          </form>
        </div>
      )}

      {/* PESTAÑA 3: CARGA EXCEL */}
      {pestana === 'excel' && (
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#38bdf8' }}>📊 Módulo de Importación Excel</h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '25px' }}>
            Subí tus planillas de combustible (.xlsx, .csv) para importar datos de flota o consumos masivos.
          </p>

          <div style={{ border: '2px dashed #475569', padding: '40px 20px', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#0f172a' }}>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleCargarExcel} style={{ display: 'none' }} id="excel-upload" />
            <label htmlFor="excel-upload" style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>📁</div>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Hacé clic aquí para seleccionar tu planilla Excel</p>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Soporta formatos .XLSX, .XLS y .CSV</span>
            </label>
          </div>
        </div>
      )}

    </div>
  );
}
