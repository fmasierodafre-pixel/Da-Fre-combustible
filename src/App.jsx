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
          <button onClick={() => setPestana('historial')} style={{ background: pestana === 'historial' ? '#f59e0b' : '#1e293b', color: pestana === 'historial' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px
