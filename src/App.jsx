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
  const [equipos, setEquipos] = useState([]);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [pestana, setPestana] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  const [formCarga, setFormCarga] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo_movimiento: 'Consumo',
    origen: 'Cisterna Principal (PPL)',
    equipo_codigo: '',
    chofer: '',
    obra: 'RN40',
    tipo_combustible: 'Infinia Diesel',
    litros_indicados: '',
    horometro: '',
    kilometros: '',
    observaciones: ''
  });

  const [excelRows, setExcelRows] = useState([]);
  const [excelName, setExcelName] = useState('');
  const [subiendoExcel, setSubiendoExcel] = useState(false);

  useEffect(() => {
    if (supabase) {
      fetchTanques();
      fetchCargas();
      fetchEquipos();
      fetchMantenimientos();
    }
  }, []);

  async function fetchTanques() {
    try {
      const { data } = await supabase.from('tanques').select('*');
      if (data) setTanques(data);
    } catch (e) { console.error(e); }
  }

  async function fetchCargas() {
    setLoading(true);
    try {
      const { data } = await supabase.from('cargas_diarias').select('*').order('id', { ascending: false }).limit(20);
      if (data) setCargas(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function fetchEquipos() {
    try {
      const { data } = await supabase.from('equipos').select('*');
      if (data) setEquipos(data);
    } catch (e) { console.error(e); }
  }

  async function fetchMantenimientos() {
    try {
      const { data } = await supabase.from('mantenimiento').select('*');
      if (data) setMantenimientos(data);
    } catch (e) { console.error(e); }
  }

  const handleGuardarCargaManual = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('cargas_diarias').insert([formCarga]);
      if (error) throw error;
      alert('¡Carga registrada con éxito en Supabase!');
      setFormCarga({
        fecha: new Date().toISOString().split('T')[0],
        tipo_movimiento: 'Consumo',
        origen: 'Cisterna Principal (PPL)',
        equipo_codigo: '',
        chofer: '',
        obra: 'RN40',
        tipo_combustible: 'Infinia Diesel',
        litros_indicados: '',
        horometro: '',
        kilometros: '',
        observaciones: ''
      });
      setPestana('dashboard');
      fetchCargas();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
  };

  const handleCargarArchivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n');
      
      // Separar estrictamente por punto y coma (;) y limpiar comillas
      const rows = lines.map(line => line.split(';').map(val => val.trim().replace(/^"|"$/g, '')));
      
      setExcelRows(rows);
      console.log("Filas leídas del CSV:", rows.length);
      alert(`¡Archivo leído con éxito! Se detectaron ${rows.length} filas.`);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const procesarYSubirLote = async () => {
    if (!supabase || excelRows.length === 0) return;
    setSubiendoExcel(true);
    try {
      const filasAInsertar = excelRows.slice(1).map(row => ({
        "Semana": row[0] || 'Semana Actual',
        "Fecha": row[1] || new Date().toISOString().split('T')[0],
        "Tipo Movimiento": row[2] || 'Consumo',
        "Origen": row[3] || 'Cisterna Principal',
        "Destino / Equipo": row[4] || '',
        "Equipo": row[5] || row[4] || '',
        "Chofer": row[6] || '',
        "Obra": row[7] || '',
        "Tipo Combustible": row[8] || 'Infinia Diesel',
        "Litros Indicados": parseFloat(row[9]?.replace(',', '.')) || 0,
        "Factor Calibracion": parseFloat(row[10]?.replace(',', '.')) || 1,
        "Litros Reales": parseFloat(row[11]?.replace(',', '.')) || 0,
        "Control": row[12] || '',
        "Orometro": row[13] || '',
        "Kilometros": row[14] || '',
        "HM/KM Anterior": row[15] || '',
        "Rendimiento (L/h o L/km)": row[16] || '',
        "Observaciones": row[17] || '',
        "Descripción Equipo": row[18] || ''
      })).filter(item => item["Litros Indicados"] > 0);

      const { error } = await supabase.from('cargas_diarias').insert(filasAInsertar);
      if (error) throw error;

      alert(`¡Lote de ${filasAInsertar.length} registros sincronizado correctamente a Supabase!`);
      setExcelRows([]);
      setExcelName('');
      setPestana('dashboard');
      fetchCargas();
    } catch (err) {
      console.error("Error al sincronizar:", err);
      alert('Error al sincronizar: ' + err.message);
    }
    setSubiendoExcel(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px', borderBottom: '1px solid #1e293b', paddingBottom: '15px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>⛽ DA FRE - Combustibles</h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>Gestión Integral de Flota, Cisternas y Mantenimiento</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setPestana('dashboard')} style={{ background: pestana === 'dashboard' ? '#f59e0b' : '#1e293b', color: pestana === 'dashboard' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Dashboard</button>
          <button onClick={() => setPestana('nueva_carga')} style={{ background: pestana === 'nueva_carga' ? '#f59e0b' : '#1e293b', color: pestana === 'nueva_carga' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Nueva Carga</button>
          <button onClick={() => setPestana('equipos')} style={{ background: pestana === 'equipos' ? '#f59e0b' : '#1e293b', color: pestana === 'equipos' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Equipos</button>
          <button onClick={() => setPestana('mantenimiento')} style={{ background: pestana === 'mantenimiento' ? '#f59e0b' : '#1e293b', color: pestana === 'mantenimiento' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Mantenimiento</button>
          <button onClick={() => setPestana('excel')} style={{ background: pestana === 'excel' ? '#38bdf8' : '#1e293b', color: pestana === 'excel' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Excel / CSV</button>
        </div>
      </header>

      {pestana === 'dashboard' && (
        <div>
          <h2 style={{ fontSize: '16px', marginBottom: '15px', color: '#cbd5e1' }}>Stock de Cisternas</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            {tanques.length > 0 ? (
              tanques.map(t => (
                <div key={t.id} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#38bdf8' }}>{t.nombre}</h3>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b' }}>{t.stock_actual_l || t.capacidad_l || 0} Lts</div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '6px 0 0 0' }}>Capacidad: {t.capacidad_l || 'N/D'} Lts</p>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', backgroundColor: '#1e293b', borderRadius: '8px', color: '#94a3b8' }}>
                Cargando cisternas desde Supabase o tabla vacía...
              </div>
            )}
          </div>

          <h2 style={{ fontSize: '16px', marginBottom: '15px', color: '#cbd5e1' }}>Últimas Cargas Registradas</h2>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
            {cargas.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', backgroundColor: '#0f172a' }}>
                      <th style={{ padding: '12px' }}>Fecha</th>
                      <th style={{ padding: '12px' }}>Movimiento</th>
                      <th style={{ padding: '12px' }}>Origen</th>
                      <th style={{ padding: '12px' }}>Equipo</th>
                      <th style={{ padding: '12px' }}>Chofer</th>
                      <th style={{ padding: '12px' }}>Litros</th>
                      <th style={{ padding: '12px' }}>Obra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargas.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '12px' }}>{c.Fecha || c.fecha || '-'}</td>
                        <td style={{ padding: '12px', color: c['Tipo Movimiento'] === 'Compra' ? '#4ade80' : '#38bdf8' }}>{c['Tipo Movimiento'] || c.tipo_movimiento || '-'}</td>
                        <td style={{ padding: '12px' }}>{c.Origen || c.origen || '-'}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.Equipo || c.equipo_codigo || '-'}</td>
                        <td style={{ padding: '12px' }}>{c.Chofer || c.chofer || '-'}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#f59e0b' }}>{c['Litros Indicados'] || c.litros_indicados || 0} L</td>
                        <td style={{ padding: '12px' }}>{c.Obra || c.obra || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                {loading ? 'Cargando registros...' : 'No hay registros de cargas recientes en Supabase.'}
              </div>
            )}
          </div>
        </div>
      )}

      {pestana === 'nueva_carga' && (
        <div style={{ maxWidth: '650px', margin: '0 auto', backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', color: '#f59e0b' }}>+ Registrar Nueva Carga Manual</h2>
          <form onSubmit={handleGuardarCargaManual} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Fecha</label>
              <input type="date" value={formCarga.fecha} onChange={e => setFormCarga({...formCarga, fecha: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Tipo de Movimiento</label>
              <select value={formCarga.tipo_movimiento} onChange={e => setFormCarga({...formCarga, tipo_movimiento: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }}>
                <option value="Consumo">Consumo</option>
                <option value="Compra">Compra</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Origen / Cisterna</label>
              <input type="text" value={formCarga.origen} onChange={e => setFormCarga({...formCarga, origen: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Código de Equipo</label>
              <input type="text" placeholder="Ej: CAM551" value={formCarga.equipo_codigo} onChange={e => setFormCarga({...formCarga, equipo_codigo: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Chofer / Responsable</label>
              <input type="text" placeholder="Nombre" value={formCarga.chofer} onChange={e => setFormCarga({...formCarga, chofer: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Obra</label>
              <input type="text" value={formCarga.obra} onChange={e => setFormCarga({...formCarga, obra: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Tipo Combustible</label>
              <select value={formCarga.tipo_combustible} onChange={e => setFormCarga({...formCarga, tipo_combustible: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }}>
                <option value="Infinia Diesel">Infinia Diesel</option>
                <option value="Diesel 500">Diesel 500</option>
                <option value="Nafta">Nafta</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Litros</label>
              <input type="number" placeholder="150" value={formCarga.litros_indicados} onChange={e => setFormCarga({...formCarga, litros_indicados: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }} />
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
              <button type="submit" style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '12px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Guardar Carga</button>
            </div>
          </form>
        </div>
      )}

      {pestana === 'equipos' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', color: '#f59e0b', marginBottom: '10px' }}>Flota de Equipos</h2>
          {equipos.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '10px' }}>Código</th>
                  <th style={{ padding: '10px' }}>Descripción</th>
                  <th style={{ padding: '10px' }}>Tipo</th>
                  <th style={{ padding: '10px' }}>Combustible</th>
                </tr>
              </thead>
              <tbody>
                {equipos.map((eq, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{eq.codigo || '-'}</td>
                    <td style={{ padding: '10px' }}>{eq.descripcion || '-'}</td>
                    <td style={{ padding: '10px' }}>{eq.tipo || '-'}</td>
                    <td style={{ padding: '10px', color: '#38bdf8' }}>{eq.tipo_combustible || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No hay equipos registrados en Supabase.</div>
          )}
        </div>
      )}

      {pestana === 'mantenimiento' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', color: '#f59e0b', marginBottom: '10px' }}>Control de Mantenimiento</h2>
          {mantenimientos.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '10px' }}>Equipo</th>
                  <th style={{ padding: '10px' }}>Último HM/KM</th>
                  <th style={{ padding: '10px' }}>Próximo Service</th>
                  <th style={{ padding: '10px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {mantenimientos.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{m.codigo_equipo || '-'}</td>
                    <td style={{ padding: '10px' }}>{m.ultimo_hm_km || '-'}</td>
                    <td style={{ padding: '10px' }}>{m.proximo_service || '-'}</td>
                    <td style={{ padding: '10px', color: '#38bdf8' }}>{m.estado || 'OK'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No hay registros de mantenimiento.</div>
          )}
        </div>
      )}

      {pestana === 'excel' && (
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', color: '#38bdf8', marginBottom: '10px' }}>Importar Planilla CSV</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '15px' }}>Subí tu archivo CSV exportado de Excel (delimitado por punto y coma):</p>
          
          <input type="file" accept=".csv" onChange={handleCargarArchivo} style={{ color: '#f8fafc', marginBottom: '15px', width: '100%' }} />
          
          {excelName && (
            <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
              <p style={{ fontSize: '14px', color: '#f59e0b', margin: '0 0 10px 0' }}>Archivo: {excelName} ({excelRows.length} filas detectadas)</p>
              <button onClick={procesarYSubirLote} disabled={subiendoExcel} style={{ background: '#38bdf8', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                {subiendoExcel ? 'Sincronizando con Supabase...' : 'Sincronizar Lote con Supabase'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
