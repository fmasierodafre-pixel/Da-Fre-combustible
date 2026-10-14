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
  const [cargas, setCargas] = useState([]);
  const [pestana, setPestana] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  
  const [excelRows, setExcelRows] = useState([]);
  const [excelName, setExcelName] = useState('');
  const [subiendoExcel, setSubiendoExcel] = useState(false);

  useEffect(() => {
    if (supabase) {
      fetchTanques();
      fetchCargas();
    }
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

  async function fetchCargas() {
    try {
      const { data, error } = await supabase.from('cargas_diarias').select('*').limit(20);
      if (!error && data) setCargas(data);
    } catch (err) {
      console.error(err);
    }
  }

  // Lector de CSV / Texto
  const handleCargarExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelName(file.name);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n');
      const rows = lines.map(line => line.split(/[,;\t]/).map(val => val.trim().replace(/^["']|["']$/g, ''))).filter(r => r.length > 1 && r[0] !== '');
      setExcelRows(rows);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Subir datos a la tabla real cargas_diarias en Supabase
  const procesarDatosExcelEnSupabase = async () => {
    if (!supabase) {
      alert('Supabase no está conectado.');
      return;
    }
    if (excelRows.length === 0) {
      alert('No hay filas para procesar.');
      return;
    }

    setSubiendoExcel(true);
    try {
      // Omitimos la primera fila de encabezados y adaptamos a las columnas reales de cargas_diarias
      const filasAInsertar = excelRows.slice(1).map(row => ({
        semana: row[0] ? String(row[0]) : '',
        fecha: row[1] ? String(row[1]) : new Date().toISOString().split('T')[0],
        tipo_movimiento: row[2] ? String(row[2]) : '',
        origen: row[3] ? String(row[3]) : ''
      })).filter(item => item.semana !== '' || item.tipo_movimiento !== '');

      if (filasAInsertar.length === 0) {
        alert('No se encontraron registros válidos para insertar.');
        setSubiendoExcel(false);
        return;
      }

      const { error } = await supabase.from('cargas_diarias').insert(filasAInsertar);
      if (error) throw error;

      alert(¡Se subieron exitosamente ${filasAInsertar.length} registros a la tabla cargas_diarias!);
      setExcelRows([]);
      setExcelName('');
      setPestana('dashboard');
      fetchCargas();
    } catch (err) {
      alert('Error al sincronizar con Supabase: ' + err.message);
    }
    setSubiendoExcel(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>⛽ DA FRE - Combustibles y Flota</h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '5px 0 0 0' }}>Gestión Integral - DA FRE</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setPestana('dashboard')} style={{ background: pestana === 'dashboard' ? '#f59e0b' : '#1e293b', color: pestana === 'dashboard' ? '#000' : '#fff', border: '1px solid #475569', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📊 Dashboard</button>
          <button onClick={() => setPestana('equipos')} style={{ background: pestana === 'equipos' ? '#f59e0b' : '#1e293b', color: pestana === 'equipos' ? '#000' : '#fff', border: '1px solid #475569', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>🚜 Equipos</button>
          <button onClick={() => setPestana('mantenimiento')} style={{ background: pestana === 'mantenimiento' ? '#f59e0b' : '#1e293b', color: pestana === 'mantenimiento' ? '#000' : '#fff', border: '1px solid #475569', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>🔧 Mantenimiento</button>
          <button onClick={() => setPestana('excel')} style={{ background: pestana === 'excel' ? '#f59e0b' : '#1e293b', color: pestana === 'excel' ? '#000' : '#fff', border: '1px solid #475569', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📁 Excel</button>
          <button onClick={() => { fetchTanques(); fetchCargas(); }} style={{ background: '#1e293b', color: '#fff', border: '1px solid #475569', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer' }}>🔄</button>
        </div>
      </header>

      {pestana === 'dashboard' && (
        <div>
          <h2 style={{ fontSize: '16px', marginBottom: '15px', color: '#cbd5e1' }}>Stock de Cisternas</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            {tanques.length > 0 ? (
              tanques.map(t => (
                <div key={t.id} style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{t.nombre}</h3>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#f59e0b' }}>{Number(t.stock_actual_l || 0).toLocaleString('es-AR')} L</div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '5px 0 0 0' }}>Capacidad: {Number(t.capacidad_l || 0).toLocaleString('es-AR')} L</p>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px', color: '#94a3b8', backgroundColor: '#1e293b', borderRadius: '8px' }}>
                {loading ? 'Cargando cisternas...' : 'No hay cisternas registradas en Supabase.'}
              </div>
            )}
          </div>

          <h2 style={{ fontSize: '16px', marginBottom: '15px', color: '#cbd5e1' }}>Registros en Cargas Diarias</h2>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
            {cargas.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '12px' }}>Semana</th>
                    <th style={{ padding: '12px' }}>Fecha</th>
                    <th style={{ padding: '12px' }}>Tipo Movimiento</th>
                    <th style={{ padding: '12px' }}>Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {cargas.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.semana || '-'}</td>
                      <td style={{ padding: '12px', color: '#f59e0b' }}>{c.fecha || '-'}</td>
                      <td style={{ padding: '12px' }}>{c.tipo_movimiento || '-'}</td>
                      <td style={{ padding: '12px' }}>{c.origen || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No hay registros en cargas_diarias todavía. Subí tu archivo para empezar.</div>
            )}
          </div>
        </div>
      )}

      {pestana === 'equipos' && (
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', color: '#f59e0b', marginBottom: '10px' }}>🚜 Gestión de Equipos y Flota</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>Listado de unidades, maquinarias y consumos asociados.</p>
          <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
            Módulo de equipos operativo.
          </div>
        </div>
      )}

      {pestana === 'mantenimiento' && (
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', color: '#f59e0b', marginBottom: '10px' }}>🔧 Control de Mantenimiento</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>Seguimiento preventivo de flota y service.</p>
          <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
            Módulo de mantenimiento operativo.
          </div>
        </div>
      )}

      {pestana === 'excel' && (
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', color: '#38bdf8', marginBottom: '10px' }}>📁 Importar Planilla CSV a "cargas_diarias"</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '15px' }}>Seleccioná tu archivo CSV para subir los registros directamente a Supabase.</p>
          
          <input type="file" accept=".csv, .txt" onChange={handleCargarExcel} style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#fff', border: '1px dashed #475569', borderRadius: '6px', marginBottom: '15px' }} />

          {excelName && (
            <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
              <p style={{ fontSize: '14px', color: '#f59e0b', margin: '0 0 10px 0' }}>📄 Archivo: <strong>{excelName}</strong> ({excelRows.length} filas detectadas)</p>
              
              <button onClick={procesarDatosExcelEnSupabase} disabled={subiendoExcel} style={{ background: '#38bdf8', color: '#000', fontWeight: 'bold', padding: '12px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '100%' }}>
                {subiendoExcel ? '⏳ Subiendo a Supabase...' : '🚀 Subir y Sincronizar con Supabase'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
