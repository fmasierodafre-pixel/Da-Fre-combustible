import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vlllvmklgokwwuvnasuo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbGx2bWtsZ29rd3d1dm5hc3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NTgxMzgsImV4cCI6MjEwNzEzNDEzOH0.Q5rP9pu0bW-1F16mBsbn69t95TzeB437PmWHPEp_Mzc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [tanques, setTanques] = useState([]);
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

  // Filtros generales de historial
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroDia, setFiltroDia] = useState('');

  // Filtros interactivos para el Dashboard
  const [dashAnio, setDashAnio] = useState('');
  const [dashMes, setDashMes] = useState('');
  const [dashObra, setDashObra] = useState('');
  const [dashDesde, setDashDesde] = useState('');
  const [dashHasta, setDashHasta] = useState('');

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

  const [nuevoChofer, setNuevoChofer] = useState({ nombre: '', equipo_habitual: '' });
  const [nuevoEquipo, setNuevoEquipo] = useState({ codigo: '', descripcion: '', tipo: 'Máquina', obra_predeterminada: 'RN40', tipo_combustible: 'Infinia Diesel' });
  const [formService, setFormService] = useState({ codigo_equipo: '', hm_km_actual: '', tipo_service: 'Service Completo (Filtros y Aceite)', observaciones: '' });

  const [excelRows, setExcelRows] = useState([]);
  const [excelName, setExcelName] = useState('');
  const [subiendoExcel, setSubiendoExcel] = useState(false);

  useEffect(() => {
    if (supabase) {
      fetchDatos();
    }
  }, []);

  async function fetchDatos() {
    setLoading(true);
    try {
      const { data: tanquesData } = await supabase.from('tanques').select('*');
      const { data: cargasData } = await supabase.from('cargas_diarias').select('*').order('id', { ascending: false });
      const { data: equiposData } = await supabase.from('equipos').select('*');
      const { data: mantData } = await supabase.from('mantenimiento').select('*');

      if (cargasData) {
        setTodasLasCargas(cargasData);
        extraerEquipos(cargasData);
      }
      if (equiposData && equiposData.length > 0) {
        setEquipos(equiposData);
      }
      if (mantData) {
        setMantenimientos(mantData);
      }

      const listaTanquesBase = (tanquesData && tanquesData.length > 0) ? tanquesData : [
        { id: 1, nombre: 'Cisterna Principal (PPL)', capacidad_l: 8500 },
        { id: 2, nombre: 'Cisterna Camión', capacidad_l: 4000 },
        { id: 3, nombre: 'PLAASF', capacidad_l: 2000 }
      ];

      calcularStockTanques(listaTanquesBase, cargasData || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function calcularStockTanques(tanquesBase, cargasData) {
    const tanquesCalculados = tanquesBase.map(t => {
      const capacidad = parseFloat(t.capacidad_l || t.stock_actual_l || 8500);
      let totalSalidas = 0;
      let totalEntradas = 0;
      const nombreTanque = (t.nombre || '').toLowerCase();

      cargasData.forEach(c => {
        const litros = parseFloat(c['Litros Indicados'] || c['Litros Reales'] || 0);
        const origenCarga = (c.Origen || '').toLowerCase();
        const destinoCarga = (c['Destino / Equipo'] || '').toLowerCase();
        const tipoMov = (c['Tipo Movimiento'] || '').toLowerCase();

        // 1. COMPRAS E INGRESOS (Dafre -> Camión, YPF -> PPL)
        if (tipoMov.includes('compra')) {
          if (nombreTanque.includes('camión') && origenCarga.includes('dafre')) {
            totalEntradas += litros;
          }
          if ((nombreTanque.includes('principal') || nombreTanque.includes('ppl')) && origenCarga.includes('ypf')) {
            totalEntradas += litros;
          }
        }

        // 2. TRANSFERENCIAS (PPL -> Cisterna Camión)
        if (tipoMov.includes('transferencia')) {
          if (nombreTanque.includes('principal') || nombreTanque.includes('ppl')) {
            totalSalidas += litros; // Sale de la principal
          }
          if (nombreTanque.includes('camión') || nombreTanque.includes('camion')) {
            totalEntradas += litros; // Entra a la cisterna del camión
          }
        }

        // 3. CONSUMOS A VEHÍCULOS (Desde Cisterna Camión o PPL)
        if (tipoMov.includes('consumo')) {
          if (nombreTanque.includes('camión') && (origenCarga.includes('camión') || origenCarga.includes('camion'))) {
            totalSalidas += litros;
          }
          if ((nombreTanque.includes('principal') || nombreTanque.includes('ppl')) && (origenCarga.includes('principal') || origenCarga.includes('ppl'))) {
            totalSalidas += litros;
          }
        }
      });

      // Cálculo de stock real respetando el límite físico máximo de la cisterna
      let stockReal = capacidad - totalSalidas + totalEntradas;
      if (stockReal > capacidad) stockReal = capacidad;
      if (stockReal < 0) stockReal = 0;

      return { 
        ...t, 
        stock_real: stockReal, 
        capacidad: capacidad, 
        totalEntradas, 
        totalSalidas 
      };
    });

    setTanques(tanquesCalculados);
  }

  function extraerEquipos(cargasArray) {
    const equiposMap = {};
    cargasArray.forEach(c => {
      const eqCode = c.Equipo || c['Destino / Equipo'];
      if (eqCode && eqCode.trim() !== '' && !eqCode.toLowerCase().includes('cisterna') && !eqCode.toLowerCase().includes('plaasf') && !eqCode.toLowerCase().includes('ppl') && !equiposMap[eqCode]) {
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
      fetchDatos();
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

      alert(`¡Lote de ${filasAInsertar.length} registros sincronizado correctamente!`);
      setExcelRows([]);
      setExcelName('');
      setPestana('dashboard');
      fetchDatos();
    } catch (err) {
      console.error(err);
      alert('Error al sincronizar: ' + err.message);
    }
    setSubiendoExcel(false);
  };

  // Filtrado para Historial
  const cargasFiltradas = todasLasCargas.filter(c => {
    if (!c.Fecha) return true;
    const matchAnio = filtroAnio ? c.Fecha.includes(filtroAnio) : true;
    const matchMes = filtroMes ? c.Fecha.includes(`-${filtroMes}-`) || c.Fecha.includes(`/${filtroMes}/`) : true;
    const matchDia = filtroDia ? c.Fecha.endsWith(`-${filtroDia}`) || c.Fecha.startsWith(`${filtroDia}/`) : true;
    return matchAnio && matchMes && matchDia;
  });

  // Filtrado interactivo para el Dashboard
  const cargasDashboardFiltradas = todasLasCargas.filter(c => {
    if (!c.Fecha) return true;
    const fechaCarga = c.Fecha.split('T')[0];
    const anioCarga = fechaCarga.split('-')[0] || '';
    const mesCarga = fechaCarga.split('-')[1] || '';
    
    const matchAnio = dashAnio ? anioCarga === dashAnio : true;
    const matchMes = dashMes ? mesCarga === dashMes || mesCarga === `0${dashMes}`.slice(-2) : true;
    const matchObra = dashObra ? (c.Obra || '').toLowerCase().includes(dashObra.toLowerCase()) : true;
    
    let matchRango = true;
    if (dashDesde && fechaCarga < dashDesde) matchRango = false;
    if (dashHasta && fechaCarga > dashHasta) matchRango = false;

    return matchAnio && matchMes && matchObra && matchRango;
  });

  // Consumo por máquina (excluyendo vacíos y tanques)
  const consumoPorVehiculoDash = {};
  const rendimientoPorVehiculoDash = {};

  cargasDashboardFiltradas.forEach(c => {
    const eq = c.Equipo || c['Destino / Equipo'];
    if (eq && eq.trim() !== '') {
      const eqUpper = eq.toUpperCase();
      if (!eqUpper.includes('CISTERNA') && !eqUpper.includes('PLAASF') && !eqUpper.includes('PPL')) {
        const litros = parseFloat(c['Litros Indicados'] || c['Litros Reales'] || 0);
        consumoPorVehiculoDash[eq] = (consumoPorVehiculoDash[eq] || 0) + litros;

        const rendStr = c['Rendimiento (L/h o L/km)'] || '0';
        const rendVal = parseFloat(rendStr.toString().replace(',', '.')) || 0;
        if (rendVal > 0) {
          rendimientoPorVehiculoDash[eq] = rendimientoPorVehiculoDash[eq] ? (rendimientoPorVehiculoDash[eq] + rendVal) / 2 : rendVal;
        }
      }
    }
  });

  const consumoOrdenado = Object.entries(consumoPorVehiculoDash).sort((a, b) => b[1] - a[1]);
  const maxLitrosConsumo = consumoOrdenado.length > 0 ? consumoOrdenado[0][1] : 1;

  const rendimientoOrdenado = Object.entries(rendimientoPorVehiculoDash).sort((a, b) => b[1] - a[1]);
  const maxRendimiento = rendimientoOrdenado.length > 0 ? rendimientoOrdenado[0][1] : 1;

  // Estado de Mantenimiento
  const estadoMantenimientoEquipos = equipos.map(eq => {
    const cargasEq = todasLasCargas.filter(c => (c.Equipo === eq.codigo || c['Destino / Equipo'] === eq.codigo));
    let ultimoLectura = 0;
    cargasEq.forEach(c => {
      const val = parseFloat(c.Orometro || c.Kilometros || 0);
      if (val > ultimoLectura) ultimoLectura = val;
    });

    const esMaquina = eq.tipo === 'Máquina' || eq.codigo.startsWith('M') || eq.codigo.startsWith('CAT') || eq.codigo.startsWith('P');
    const intervaloService = esMaquina ? 250 : 400;

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

    return { ...eq, ultimoLectura, intervaloService, ultimoServiceLectura, horasRestantes: Math.max(0, horasRestantes), estado, colorEstado };
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
          <h2 style={{ fontSize: '16px', marginBottom: '15px', color: '#cbd5e1' }}>Stock Actual en Cisternas (Litros Reales - Límite Físico)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            {tanques.length > 0 ? (
              tanques.map(t => (
                <div key={t.id} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#38bdf8' }}>{t.nombre}</h3>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4ade80' }}>{t.stock_real.toFixed(0)} Lts</div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '6px 0 0 0' }}>Capacidad Máxima: {t.capacidad} Lts</p>
                  <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '6px', borderTop: '1px solid #334155', paddingTop: '6px' }}>
                    Entradas (Compras/Transf): +{t.totalEntradas.toFixed(0)} L<br/>
                    Salidas (Consumos/Transf): -{t.totalSalidas.toFixed(0)} L
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', backgroundColor: '#1e293b', borderRadius: '8px', color: '#94a3b8' }}>
                Calculando stock de cisternas...
              </div>
            )}
          </div>

          {/* Panel de Filtros para los Gráficos */}
          <div style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Año</label>
              <input type="text" placeholder="Ej: 2026" value={dashAnio} onChange={e => setDashAnio(e.target.value)} style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', width: '90px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Mes (01-12)</label>
              <input type="text" placeholder="Ej: 10" value={dashMes} onChange={e => setDashMes(e.target.value)} style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', width: '80px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Obra</label>
              <input type="text" placeholder="Ej: RN40" value={dashObra} onChange={e => setDashObra(e.target.value)} style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', width: '110px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Desde</label>
              <input type="date" value={dashDesde} onChange={e => setDashDesde(e.target.value)} style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Hasta</label>
              <input type="date" value={dashHasta} onChange={e => setDashHasta(e.target.value)} style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => { setDashAnio(''); setDashMes(''); setDashObra(''); setDashDesde(''); setDashHasta(''); }} style={{ background: '#334155', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Limpiar Filtros</button>
            </div>
          </div>

          {/* Dos columnas para los gráficos: Consumo Total y Rendimiento Promedio */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
            
            {/* Gráfico 1: Consumo Total (Litros) */}
            <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#f59e0b' }}>📊 Consumo Total por Máquina / Vehículo (Litros)</h3>
              {consumoOrdenado.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                  {consumoOrdenado.map(([vehiculo, litros], idx) => {
                    const porcentaje = Math.max(4, (litros / maxLitrosConsumo) * 100);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '80px', fontSize: '12px', fontWeight: 'bold', color: '#38bdf8', textAlign: 'right' }}>{vehiculo}</div>
                        <div style={{ flex: 1, backgroundColor: '#0f172a', borderRadius: '6px', height: '22px', position: 'relative', overflow: 'hidden', border: '1px solid #334155' }}>
                          <div style={{ width: `${porcentaje}%`, backgroundColor: '#f59e0b', height: '100%', borderRadius: '4px' }}></div>
                          <span style={{ position: 'absolute', right: '8px', top: '2px', fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>{litros.toFixed(1)} L</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', textAlign: 'center', margin: 0 }}>No hay consumos registrados.</p>
              )}
            </div>

            {/* Gráfico 2: Rendimiento Promedio (Litros / Hora o Km) */}
            <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#38bdf8' }}>📈 Rendimiento Promedio (L / hs o L / km)</h3>
              {rendimientoOrdenado.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                  {rendimientoOrdenado.map(([vehiculo, rend], idx) => {
                    const porcentaje = Math.max(4, (rend / maxRendimiento) * 100);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '80px', fontSize: '12px', fontWeight: 'bold', color: '#f59e0b', textAlign: 'right' }}>{vehiculo}</div>
                        <div style={{ flex: 1, backgroundColor: '#0f172a', borderRadius: '6px', height: '22px', position: 'relative', overflow: 'hidden', border: '1px solid #334155' }}>
                          <div style={{ width: `${porcentaje}%`, backgroundColor: '#38bdf8', height: '100%', borderRadius: '4px' }}></div>
                          <span style={{ position: 'absolute', right: '8px', top: '2px', fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>{rend.toFixed(2)} L/u</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', textAlign: 'center', margin: 0 }}>No hay suficientes datos de rendimiento en el lote.</p>
              )}
            </div>

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
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#f59e0b' }}>{c['Litros Indicados'] || c['Litros Reales'] || 0} L</td>
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

      {/* NUEVA CARGA */}
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
                <option value="YPF">YPF (Compra Principal)</option>
                <option value="Dafre (chiringuito)">Dafre (Compra Camión)</option>
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
                <option value="OBRA VIAL">OBRA VIAL</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Tipo Combustible</label>
              <select value={formCarga["Tipo Combustible"]} onChange={e => setFormCarga({...formCarga, "Tipo Combustible": e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }}>
                <option value="Infinia Diesel">Infinia Diesel</option>
                <option value="Diesel 500">Diesel 500</option>
                <option value="Nafta">Nafta</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Litros Cargados</label>
              <input type="number" placeholder="Ej: 150" value={formCarga["Litros Indicados"]} onChange={e => setFormCarga({...formCarga, "Litros Indicados": e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', marginTop: '5px' }} />
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
              <button type="submit" style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '12px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Guardar Carga</button>
            </div>
          </form>
        </div>
      )}

      {/* EQUIPOS */}
      {pestana === 'equipos' && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '25px' }}>
            <h2 style={{ fontSize: '18px', color: '#f59e0b', marginBottom: '15px' }}>+ Agregar Nuevo Equipo / Vehículo</h2>
            <form onSubmit={handleGuardarEquipo} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <input type="text" placeholder="Código (Ej: M048)" value={nuevoEquipo.codigo} onChange={e => setNuevoEquipo({...nuevoEquipo, codigo: e.target.value})} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
              <input type="text" placeholder="Descripción (Ej: Excavadora CAT)" value={nuevoEquipo.descripcion} onChange={e => setNuevoEquipo({...nuevoEquipo, descripcion: e.target.value})} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
              <select value={nuevoEquipo.tipo} onChange={e => setNuevoEquipo({...nuevoEquipo, tipo: e.target.value})} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }}>
                <option value="Máquina">Máquina (Service c/250 hs)</option>
                <option value="Camión / Vehículo">Camión / Vehículo (Service c/400 km)</option>
              </select>
              <button type="submit" style={{ background: '#4ade80', color: '#000', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Equipo</button>
            </form>
          </div>

          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '18px', color: '#38bdf8', marginBottom: '15px' }}>Flota Completa Registrada ({equipos.length})</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '10px' }}>Código</th>
                  <th style={{ padding: '10px' }}>Descripción</th>
                  <th style={{ padding: '10px' }}>Tipo</th>
                  <th style={{ padding: '10px' }}>Obra Predeterminada</th>
                </tr>
              </thead>
              <tbody>
                {equipos.map((eq, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#f59e0b' }}>{eq.codigo}</td>
                    <td style={{ padding: '10px' }}>{eq.descripcion || '-'}</td>
                    <td style={{ padding: '10px' }}>{eq.tipo || 'Máquina'}</td>
                    <td style={{ padding: '10px', color: '#38bdf8' }}>{eq.obra_predeterminada || 'RN40'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHOFERES */}
      {pestana === 'choferes' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '25px' }}>
            <h2 style={{ fontSize: '18px', color: '#f59e0b', marginBottom: '15px' }}>+ Registrar Nuevo Chofer</h2>
            <form onSubmit={handleGuardarChofer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <input type="text" placeholder="Nombre Completo" value={nuevoChofer.nombre} onChange={e => setNuevoChofer({...nuevoChofer, nombre: e.target.value})} style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
              <input type="text" placeholder="Equipo Habitual (Ej: M047)" value={nuevoChofer.equipo_habitual} onChange={e => setNuevoChofer({...nuevoChofer, equipo_habitual: e.target.value})} style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
              <button type="submit" style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Chofer</button>
            </form>
          </div>

          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '18px', color: '#38bdf8', marginBottom: '15px' }}>Nómina de Choferes</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '10px' }}>Nombre</th>
                  <th style={{ padding: '10px' }}>Equipo Asignado</th>
                </tr>
              </thead>
              <tbody>
                {choferes.map((ch, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{ch.nombre}</td>
                    <td style={{ padding: '10px', color: '#f59e0b' }}>{ch.equipo_habitual || 'Sin Asignar'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MANTENIMIENTO */}
      {pestana === 'mantenimiento' && (
        <div style={{ maxWidth: '950px', margin: '0 auto' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '25px' }}>
            <h2 style={{ fontSize: '18px', color: '#f59e0b', marginBottom: '15px' }}>🛠️ Registrar Service Realizado</h2>
            <form onSubmit={handleRegistrarService} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <select value={formService.codigo_equipo} onChange={e => setFormService({...formService, codigo_equipo: e.target.value})} style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }}>
                <option value="">Seleccionar Equipo...</option>
                {equipos.map((e, i) => <option key={i} value={e.codigo}>{e.codigo} - {e.descripcion}</option>)}
              </select>
              <input type="number" placeholder="Horómetro / Km del Service" value={formService.hm_km_actual} onChange={e => setFormService({...formService, hm_km_actual: e.target.value})} style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
              <input type="text" placeholder="Detalles (Ej: Filtro aceite, aire)" value={formService.observaciones} onChange={e => setFormService({...formService, observaciones: e.target.value})} style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }} />
              <button type="submit" style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Service</button>
            </form>
          </div>

          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '18px', color: '#38bdf8', marginBottom: '15px' }}>Control de Mantenimiento Preventivo</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', backgroundColor: '#0f172a' }}>
                    <th style={{ padding: '10px' }}>Equipo</th>
                    <th style={{ padding: '10px' }}>Tipo</th>
                    <th style={{ padding: '10px' }}>Última Lectura</th>
                    <th style={{ padding: '10px' }}>Último Service</th>
                    <th style={{ padding: '10px' }}>Intervalo</th>
                    <th style={{ padding: '10px' }}>Estado Preventivo</th>
                  </tr>
                </thead>
                <tbody>
                  {estadoMantenimientoEquipos.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{m.codigo}</td>
                      <td style={{ padding: '10px' }}>{m.tipo}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{m.ultimoLectura} hs/km</td>
                      <td style={{ padding: '10px' }}>{m.ultimoServiceLectura} hs/km</td>
                      <td style={{ padding: '10px' }}>Cada {m.intervaloService} hs/km</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: m.colorEstado }}>{m.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL / CSV */}
      {pestana === 'excel' && (
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', color: '#38bdf8', marginBottom: '10px' }}>Importar Planilla CSV</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '15px' }}>Subí tu archivo CSV exportado de Excel (delimitado por punto y coma):</p>
          
          <input type="file" accept=".csv" onChange={handleCargarArchivo} style={{ color: '#f8fafc', marginBottom: '15px', width: '100%' }} />
          
          {excelName && (
            <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
              <p style={{ fontSize: '14px', color: '#f59e0b', margin: '0 0 10px 0' }}>Archivo: {excelName} ({excelRows.length} filas detectadas)</p>
              <button onClick={procesarYSubirLote} disabled={subiendoExcel} style={{ background: '#38bdf8', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                {subiendoExcel ? 'Sincronizando...' : 'Sincronizar Lote con Supabase'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
