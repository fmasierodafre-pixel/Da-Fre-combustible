import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vlllvmklgokwwuvnasuo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbGx2bWtsZ29rd3d1dm5hc3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NTgxMzgsImV4cCI6MjEwNzEzNDEzOH0.Q5rP9pu0bW-1F16mBsbn69t95TzeB437PmWHPEp_Mzc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [tanques, setTanques] = useState([]);
  const [cargas, setCargas] = useState([]);
  const [todasLasCargas, setTodasLasCargas] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [choferes, setChoferes] = useState([
    { id: 1, nombre: 'IGNACIO GONZALEZ', equipo_habitual: 'R059' },
    { id: 2, nombre: 'HECTOR PACHECO', equipo_habitual: 'M047' },
    { id: 3, nombre: 'JORGE CANO', equipo_habitual: 'M041' },
    { id: 4, nombre: 'MARCELO GUAJARDO', equipo_habitual: 'M024' },
    { id: 5, nombre: 'ENZO FERNANDEZ', equipo_habitual: 'CFN735' },
    { id: 6, nombre: 'MANUEL DINATALE', equipo_habitual: 'M029' }
  ]);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [pestana, setPestana] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Filtros de fecha para el historial
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroDia, setFiltroDia] = useState('');

  // Formulario Carga Manual
  const [formCarga, setFormCarga] = useState({
    Fecha: new Date().toISOString().split('T')[0],
    "Tipo Movimiento": 'Consumo',
    Origen: 'Cisterna Camión',
    Equipo: '',
    Chofer: '',
    Obra: 'RN40',
    "Tipo Combustible": 'Infinia Diesel',
    "Litros Indicados": '',
    Orometro: '',
    Kilometros: '',
    Observaciones: ''
  });

  // Formulario Nuevo Chofer
  const [nuevoChofer, setNuevoChofer] = useState({ nombre: '', equipo_habitual: '' });

  // Formulario Nuevo Equipo
  const [nuevoEquipo, setNuevoEquipo] = useState({ codigo: '', descripcion: '', tipo: 'Máquina', obra_predeterminada: 'RN40', tipo_combustible: 'Infinia Diesel' });

  // Formulario Registro Service Mantenimiento
  const [formService, setFormService] = useState({ codigo_equipo: '', hm_km_actual: '', tipo_service: 'Service Completo (Filtros y Aceite)', observaciones: '' });

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
      const { data: tanquesData } = await supabase.from('tanques').select('*');
      const { data: cargasData } = await supabase.from('cargas_diarias').select('*');
      
      if (tanquesData) {
        const tanquesCalculados = tanquesData.map(t => {
          const capacidad = parseFloat(t.capacidad_l || t.stock_actual_l || 0);
          let totalSalidas = 0;
          let totalEntradas = 0;

          if (cargasData) {
            cargasData.forEach(c => {
              const litros = parseFloat(c['Litros Indicados'] || 0);
              if (c.Origen && c.Origen.toLowerCase().includes(t.nombre.toLowerCase())) {
                if (c['Tipo Movimiento'] === 'Consumo' || c['Tipo Movimiento'] === 'Transferencia') {
                  totalSalidas += litros;
                }
              }
              if (c['Tipo Movimiento'] === 'Compra' && c.Origen && c.Origen.toLowerCase().includes(t.nombre.toLowerCase())) {
                totalEntradas += litros;
              }
            });
          }
          const stockReal = Math.max(0, capacidad - totalSalidas + totalEntradas);
          return { ...t, stock_real: stockReal, capacidad: capacidad };
        });
        setTanques(tanquesCalculados);
      }
    } catch (e) { console.error(e); }
  }

  async function fetchCargas() {
    setLoading(true);
    try {
      const { data } = await supabase.from('cargas_diarias').select('*').order('id', { ascending: false }).limit(10);
      if (data) setCargas(data);

      const { data: dataTodas } = await supabase.from('cargas_diarias').select('*').order('id', { ascending: false });
      if (dataTodas) {
        setTodasLasCargas(dataTodas);
        extraerEquiposYCuentas(dataTodas);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function extraerEquiposYCuentas(cargasArray) {
    const equiposMap = {};
    cargasArray.forEach(c => {
      const eqCode = c.Equipo || c['Destino / Equipo'];
      if (eqCode && !equiposMap[eqCode]) {
        const esMaquina = eqCode.startsWith('M') || eqCode.startsWith('CAT') || eqCode.startsWith('P');
        equiposMap[eqCode] = {
          codigo: eqCode,
          descripcion: c['Descripción Equipo'] || (esMaquina ? 'Maquinaria Pesada' : 'Vehículo / Camión'),
          tipo: esMaquina ? 'Máquina' : 'Camión / Vehículo',
          obra_predeterminada: c.Obra || 'RN40',
          tipo_combustible: c['Tipo Combustible'] || 'Infinia Diesel'
        };
      }
    });

    setEquipos(prev => {
      const codigosExistentes = new Set(prev.map(p => p.codigo));
      const nuevos = Object.values(equiposMap).filter(e => !codigosExistentes.has(e.codigo));
      return [...prev, ...nuevos];
    });
  }

  async function fetchEquipos() {
    try {
      const { data } = await supabase.from('equipos').select('*');
      if (data && data.length > 0) {
        setEquipos(prev => {
          const codigos = new Set(prev.map(p => p.codigo));
          const unicosBD = data.filter(d => !codigos.has(d.codigo));
          return [...prev, ...unicosBD];
        });
      }
    } catch (e) { console.error(e); }
  }

  async function fetchMantenimientos() {
    try {
      const { data } = await supabase.from('mantenimiento').select('*');
      if (data && data.length > 0) setMantenimientos(data);
    } catch (e) { console.error(e); }
  }

  // Cambio dinámico en formulario de Carga al elegir un Equipo
  const handleSeleccionEquipoForm = (codigoEq) => {
    const eqEncontrado = equipos.find(e => e.codigo === codigoEq);
    const choferAsignado = choferes.find(ch => ch.equipo_habitual === codigoEq);

    setFormCarga(prev => ({
      ...prev,
      Equipo: codigoEq,
      Obra: eqEncontrado ? eqEncontrado.obra_predeterminada || prev.Obra : prev.Obra,
      Chofer: choferAsignado ? choferAsignado.nombre : prev.Chofer,
      "Tipo Combustible": eqEncontrado ? eqEncontrado.tipo_combustible || prev["Tipo Combustible"] : prev["Tipo Combustible"]
    }));
  };

  const handleGuardarCargaManual = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('cargas_diarias').insert([formCarga]);
      if (error) throw error;
      alert('¡Carga registrada con éxito!');
      setFormCarga({
        Fecha: new Date().toISOString().split('T')[0],
        "Tipo Movimiento": 'Consumo',
        Origen: 'Cisterna Camión',
        Equipo: '',
        Chofer: '',
        Obra: 'RN40',
        "Tipo Combustible": 'Infinia Diesel',
        "Litros Indicados": '',
        Orometro: '',
        Kilometros: '',
        Observaciones: ''
      });
      setPestana('dashboard');
      fetchCargas();
      fetchTanques();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
  };

  const handleGuardarChofer = (e) => {
    e.preventDefault();
    if (!nuevoChofer.nombre) return;
    const ch = { id: Date.now(), nombre: nuevoChofer.nombre, equipo_habitual: nuevoChofer.equipo_habitual };
    setChoferes([...choferes, ch]);
    setNuevoChofer({ nombre: '', equipo_habitual: '' });
    alert('¡Chofer agregado correctamente!');
  };

  const handleGuardarEquipo = async (e) => {
    e.preventDefault();
    if (!nuevoEquipo.codigo) return;
    setEquipos([...equipos, nuevoEquipo]);
    try {
      await supabase.from('equipos').insert([nuevoEquipo]);
    } catch (err) { console.error(err); }
    setNuevoEquipo({ codigo: '', descripcion: '', tipo: 'Máquina', obra_predeterminada: 'RN40', tipo_combustible: 'Infinia Diesel' });
    alert('¡Equipo creado exitosamente!');
  };

  const handleRegistrarService = async (e) => {
    e.preventDefault();
    if (!formService.codigo_equipo) return;
    const nuevoReg = {
      id: Date.now(),
      codigo_equipo: formService.codigo_equipo,
      fecha: new Date().toISOString().split('T')[0],
      ultimo_hm_km: parseFloat(formService.hm_km_actual) || 0,
      tipo_service: formService.tipo_service,
      observaciones: formService.observaciones
    };
    setMantenimientos([nuevoReg, ...mantenimientos]);
    try {
      await supabase.from('mantenimiento').insert([nuevoReg]);
    } catch (err) { console.error(err); }
    setFormService({ codigo_equipo: '', hm_km_actual: '', tipo_service: 'Service Completo (Filtros y Aceite)', observaciones: '' });
    alert('¡Registro de Service guardado correctamente!');
  };

  const handleCargarArchivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n');
      const rows = lines.map(line => line.split(';').map(val => val.trim().replace(/^"|"$/g, '')));
      setExcelRows(rows);
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
        "Origen": row[3] || 'Cisterna Camión',
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
      fetchTanques();
    } catch (err) {
      console.error("Error al sincronizar:", err);
      alert('Error al sincronizar: ' + err.message);
    }
    setSubiendoExcel(false);
  };

  // Filtrado de cargas para el historial
  const cargasFiltradas = todasLasCargas.filter(c => {
    if (!c.Fecha) return true;
    const matchAnio = filtroAnio ? c.Fecha.includes(filtroAnio) : true;
    const matchMes = filtroMes ? c.Fecha.includes(`-${filtroMes}-`) || c.Fecha.includes(`/${filtroMes}/`) : true;
    const matchDia = filtroDia ? c.Fecha.endsWith(`-${filtroDia}`) || c.Fecha.startsWith(`${filtroDia}/`) : true;
    return matchAnio && matchMes && matchDia;
  });

  // Consumos acumulados por equipo
  const consumoPorVehiculo = {};
  todasLasCargas.forEach(c => {
    const eq = c.Equipo || c['Destino / Equipo'] || 'Sin Asignar';
    const litros = parseFloat(c['Litros Indicados'] || 0);
    consumoPorVehiculo[eq] = (consumoPorVehiculo[eq] || 0) + litros;
  });

  // Obtener último orómetro/kilómetro de cada vehículo para Mantenimiento
  const estadoMantenimientoEquipos = equipos.map(eq => {
    const cargasEq = todasLasCargas.filter(c => (c.Equipo === eq.codigo || c['Destino / Equipo'] === eq.codigo));
    let ultimoLectura = 0;
    cargasEq.forEach(c => {
      const val = parseFloat(c.Orometro || c.Kilometros || 0);
      if (val > ultimoLectura) ultimoLectura = val;
    });

    const esMaquina = eq.tipo === 'Máquina' || eq.codigo.startsWith('M') || eq.codigo.startsWith('CAT') || eq.codigo.startsWith('P');
    const intervaloService = esMaquina ? 250 : 400; // 250hs máquinas, 400km camiones

    const serviceRegistrado = mantenimientos.find(m => m.codigo_equipo === eq.codigo);
    const ultimoServiceLectura = serviceRegistrado ? parseFloat(serviceRegistrado.ultimo_hm_km || 0) : 0;

    const horasDesdeUltimoService = ultimoLectura - ultimoServiceLectura;
    const horasRestantes = intervaloService - horasDesdeUltimoService;

    let estado = 'OK';
    let colorEstado = '#4ade80';

    if (horasRestantes <= 0) {
      estado = 'VENCIDO - REALIZAR SERVICE';
      colorEstado = '#ef4444';
    } else if (horasRestantes <= 50) {
      estado = `ALERTA (${horasRestantes.toFixed(0)} hs restantes)`;
      colorEstado = '#f59e0b';
    }

    return {
      ...eq,
      ultimoLectura,
      intervaloService,
      ultimoServiceLectura,
      horasRestantes: Math.max(0, horasRestantes),
      estado,
      colorEstado
    };
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px', borderBottom: '1px solid #1e293b', paddingBottom: '15px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>🚗 DA FRE - Gestión de Vehículos</h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>Flota, Cisternas, Choferes y Mantenimiento Preventivo</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setPestana('dashboard')} style={{ background: pestana === 'dashboard' ? '#f59e0b' : '#1e293b', color: pestana === 'dashboard' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Dashboard</button>
          <button onClick={() => setPestana('historial')} style={{ background: pestana === 'historial' ? '#f59e0b' : '#1e293b', color: pestana === 'historial' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Historial y Filtros</button>
          <button onClick={() => setPestana('nueva_carga')} style={{ background: pestana === 'nueva_carga' ? '#f59e0b' : '#1e293b', color: pestana === 'nueva_carga' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Nueva Carga</button>
          <button onClick={() => setPestana('equipos')} style={{ background: pestana === 'equipos' ? '#f59e0b' : '#1e293b', color: pestana === 'equipos' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Equipos</button>
          <button onClick={() => setPestana('choferes')} style={{ background: pestana === 'choferes' ? '#f59e0b' : '#1e293b', color: pestana === 'choferes' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Choferes</button>
          <button onClick={() => setPestana('mantenimiento')} style={{ background: pestana === 'mantenimiento' ? '#f59e0b' : '#1e293b', color: pestana === 'mantenimiento' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Mantenimiento</button>
          <button onClick={() => setPestana('excel')} style={{ background: pestana === 'excel' ? '#38bdf8' : '#1e293b', color: pestana === 'excel' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Excel / CSV</button>
        </div>
      </header>

      {/* DASHBOARD */}
      {pestana === 'dashboard' && (
        <div>
          <h2 style={{ fontSize: '16px', marginBottom: '15px', color: '#cbd5e1' }}>Stock Actual en Cisternas (Litros Reales)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            {tanques.length > 0 ? (
              tanques.map(t => (
                <div key={t.id} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#38bdf8' }}>{t.nombre}</h3>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4ade80' }}>{t.stock_real} Lts</div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '6px 0 0 0' }}>Capacidad: {t.capacidad} Lts</p>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', backgroundColor: '#1e293b', borderRadius: '8px', color: '#94a3b8' }}>
                Calculando stock de cisternas...
              </div>
            )}
          </div>

          <h2 style={{ fontSize: '16px', marginBottom: '15px', color: '#cbd5e1' }}>Consumo Acumulado por Vehículo / Equipo (Litros)</h2>
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '30px' }}>
            {Object.keys(consumoPorVehiculo).length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {Object.entries(consumoPorVehiculo).map(([vehiculo, litros], idx) => (
                  <div key={idx} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8' }}>{vehiculo}</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b', marginTop: '5px' }}>{litros.toFixed(1)} Lts</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', textAlign: 'center', margin: 0 }}>No hay consumos registrados aún.</p>
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
                        <td style={{ padding: '12px' }}>{c.Fecha || '-'}</td>
                        <td style={{ padding: '12px', color: c['Tipo Movimiento'] === 'Compra' ? '#4ade80' : '#38bdf8' }}>{c['Tipo Movimiento'] || '-'}</td>
                        <td style={{ padding: '12px' }}>{c.Origen || '-'}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.Equipo || '-'}</td>
                        <td style={{ padding: '12px' }}>{c.Chofer || '-'}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#f59e0b' }}>{c['Litros Indicados'] || 0} L</td>
                        <td style={{ padding: '12px' }}>{c.Obra || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Cargando registros...</div>
            )}
          </div>
        </div>
      )}

      {/* HISTORIAL Y FILTROS */}
      {pestana === 'historial' && (
        <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', color: '#f59e0b', marginBottom: '15px' }}>Historial Completo y Filtros por Fecha</h2>
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '5px' }}>Año (Ej: 2026)</label>
              <input type="text" placeholder="Todos" value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '5px' }}>Mes (Ej: 10)</label>
              <input type="text" placeholder="Todos" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '5px' }}>Día (Ej: 07)</label>
              <input type="text" placeholder="Todos" value={filtroDia} onChange={e => setFiltroDia(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={() => { setFiltroAnio(''); setFiltroMes(''); setFiltroDia(''); }} style={{ background: '#334155', color: '#fff', border: 'none', padding: '9px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Limpiar Filtros</button>
            </div>
          </div>

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
                {cargasFiltradas.length > 0 ? (
                  cargasFiltradas.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px' }}>{c.Fecha || '-'}</td>
                      <td style={{ padding: '12px', color: c['Tipo Movimiento'] === 'Compra' ? '#4ade80' : '#38bdf8' }}>{c['Tipo Movimiento'] || '-'}</td>
                      <td style={{ padding: '12px' }}>{c.Origen || '-'}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.Equipo || '-'}</td>
                      <td style={{ padding: '12px' }}>{c.Chofer || '-'}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#f59e0b' }}>{c['Litros Indicados'] || 0} L</td>
                      <td style={{ padding: '12px' }}>{c.Obra || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No se encontraron registros.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NUEVA CARGA MANUAL */}
      {pestana === 'nueva_carga' && (
        <div style={{ maxWidth: '650px', margin: '0 auto', backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', color: '#f59e0b' }}>+ Registrar Nueva Carga Manual</h2>
          <form onSubmit={handleGuardarCargaManual} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Fecha</label>
              <input type="date" value={formCarga.Fecha} onChange={e => setFormCarga({...formCarga, Fecha: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Tipo de Movimiento</label>
              <select value={formCarga["Tipo Movimiento"]} onChange={e => setFormCarga({...formCarga, "Tipo Movimiento": e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }}>
                <option value="Consumo">Consumo</option>
                <option value="Transferencia">Transferencia (Cisterna PPL -&gt; Camión)</option>
                <option value="Compra">Compra / Ingreso</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Origen / Cisterna</label>
              <select value={formCarga.Origen} onChange={e => setFormCarga({...formCarga, Origen: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }}>
                <option value="Cisterna Camión">Cisterna Camión (Reparto)</option>
                <option value="Cisterna Principal (PPL)">Cisterna Principal (PPL)</option>
                <option value="PLAASF">PLAASF</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Código de Equipo (Predictivo)</label>
              <input 
                list="lista-equipos" 
                placeholder="Escribe o selecciona..." 
                value={formCarga.Equipo} 
                onChange={e => handleSeleccionEquipoForm(e.target.value)} 
                style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }} 
              />
              <datalist id="lista-equipos">
                {equipos.map((eq, i) => <option key={i} value={eq.codigo}>{eq.descripcion || eq.codigo}</option>)}
              </datalist>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Chofer / Responsable</label>
              <select value={formCarga.Chofer} onChange={e => setFormCarga({...formCarga, Chofer: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }}>
                <option value="">Seleccionar Chofer...</option>
                {choferes.map(ch => <option key={ch.id} value={ch.nombre}>{ch.nombre} (Habitual: {ch.equipo_habitual || 'N/A'})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Obra</label>
              <select value={formCarga.Obra} onChange={e => setFormCarga({...formCarga, Obra: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }}>
                <option value="RN40">RN40</option>
                <option value="CANTERA">CANTERA</option>
                <option value="PLANTA ÁRIDOS">PLANTA ÁRIDOS</option>
                <option value="OBRA VIAL">OBRA VIAL</
