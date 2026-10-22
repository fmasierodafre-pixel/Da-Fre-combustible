import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://vlllvmklgokwwuvnasuo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbGx2bWtsZ29rd3d1dm5hc3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NTgxMzgsImV4cCI6MjEwNzEzNDEzOH0.Q5rP9pu0bW-1F16mBsbn69t95TzeB437PmWHPEp_Mzc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// ---------- Utilidades de importación (CSV exportado de Excel en español) ----------
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const primera = text.split('\n')[0] || '';
  const delim = (primera.match(/;/g) || []).length >= (primera.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ''));
}
// Acepta 20/07/2026 o 2026-07-20 y devuelve 2026-07-20
function aISO(v) {
  v = (v || '').trim();
  let m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[0] : '';
}
// Acepta 1569, 216,7 o 1.569,5
function aNum(v) {
  if (v === undefined || v === null) return null;
  let s = String(v).trim();
  if (!s || s === '-') return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
function numTxt(v) { const n = aNum(v); return n === null ? '' : String(n); }

const PERMISOS = {
  admin: ['dashboard', 'historial', 'nueva_carga', 'equipos', 'choferes', 'mantenimiento', 'obras', 'flota', 'excel', 'usuarios'],
  gerencia: ['dashboard'],
  logistica: ['dashboard', 'equipos', 'obras', 'flota'],
  mantenimiento: ['mantenimiento', 'flota'],
  playero: ['nueva_carga'],
  administrativo: ['historial', 'excel']
};
const ROLES = Object.keys(PERMISOS);
const TAB_NOMBRE = { dashboard: 'Dashboard', historial: 'Historial', nueva_carga: 'Nueva Carga', equipos: 'Equipos', choferes: 'Choferes', mantenimiento: 'Mantenimiento', obras: 'Obras', flota: 'Flota e Historial', excel: 'Excel/CSV', usuarios: 'Usuarios' };
const ESTADOS_FLOTA = ['En obra', 'Standby', 'Fuera de obra', 'En taller'];
const ESTADO_COLOR = { 'En obra': '#4ade80', 'Standby': '#facc15', 'Fuera de obra': '#b4bcc0', 'En taller': '#f87171' };
const hoyISO = () => new Date().toISOString().split('T')[0];
const diasDesde = (f) => f ? Math.max(0, Math.floor((new Date() - new Date(f + 'T00:00:00')) / 86400000)) : 0;
const ETIQUETA_ROL = { admin: '👑 Administrador', gerencia: '📈 Gerencia', logistica: '⛽ Logística', mantenimiento: '🛠️ Mantenimiento', playero: '📝 Carga de combustible', administrativo: '📊 Administrativo' };

// XLSX-START: genera un .xlsx real sin librerías externas
const crcTabla = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u8) => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = crcTabla[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function crearZip(archivos) {
  const enc = new TextEncoder(); const partes = [], central = []; let offset = 0;
  const u16 = (n) => [n & 255, (n >> 8) & 255];
  const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  archivos.forEach(([nombre, texto]) => {
    const nb = enc.encode(nombre), datos = enc.encode(texto), crc = crc32(datos);
    const local = new Uint8Array([0x50, 0x4b, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0, 0, ...u32(crc), ...u32(datos.length), ...u32(datos.length), ...u16(nb.length), 0, 0]);
    partes.push(local, nb, datos);
    central.push(new Uint8Array([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0, 0, ...u32(crc), ...u32(datos.length), ...u32(datos.length), ...u16(nb.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(offset)]), nb);
    offset += local.length + nb.length + datos.length;
  });
  const tam = central.reduce((a, b) => a + b.length, 0);
  const fin = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(archivos.length), ...u16(archivos.length), ...u32(tam), ...u32(offset), 0, 0]);
  return new Blob([...partes, ...central, fin], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
const escXml = (v) => String(v).replace(/[<>&"]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const colLetra = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
function crearXlsx(datos, nombreHoja) {
  const keys = Object.keys(datos[0]);
  const celda = (v, c, r, estilo) => {
    const ref = colLetra(c) + r;
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"${estilo ? ' s="1"' : ''}><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${estilo ? ' s="1"' : ''}><is><t xml:space="preserve">${escXml(typeof v === 'object' ? JSON.stringify(v) : v)}</t></is></c>`;
  };
  let filas = `<row r="1">${keys.map((k, c) => celda(k, c, 1, true)).join('')}</row>`;
  datos.forEach((d, i) => { filas += `<row r="${i + 2}">${keys.map((k, c) => celda(d[k], c, i + 2, false)).join('')}</row>`; });
  const hoja = String(nombreHoja || 'Datos').replace(/[\\/?*\[\]:]/g, '').slice(0, 31) || 'Datos';
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return crearZip([
    ['[Content_Types].xml', `${X}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `${X}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escXml(hoja)}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `${X}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF3F62A8"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ['xl/worksheets/sheet1.xml', `${X}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="${keys.length}" width="20" customWidth="1"/></cols><sheetData>${filas}</sheetData><autoFilter ref="A1:${colLetra(keys.length - 1)}${datos.length + 1}"/></worksheet>`]
  ]);
}
// XLSX-END

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
  const [sesion, setSesion] = useState(null);
  const [rol, setRol] = useState(null);
  const [authListo, setAuthListo] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginMsg, setLoginMsg] = useState('');
  const [obrasLista, setObrasLista] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [formAsig, setFormAsig] = useState({ equipo: '', estado: 'En obra', obra: '', chofer: '', fecha: hoyISO(), horometro: '', observaciones: '' });
  const [editAsig, setEditAsig] = useState(null);
  const [filtroEstadoFlota, setFiltroEstadoFlota] = useState('Todos');
  const [filtroAsigEquipo, setFiltroAsigEquipo] = useState('');
  const [filtroAsigObra, setFiltroAsigObra] = useState('');
  const [filtroEquipoHist, setFiltroEquipoHist] = useState('');
  const [vehiculoDash, setVehiculoDash] = useState('');
  const [nombreObraNueva, setNombreObraNueva] = useState('');
  const [rolesUsuario, setRolesUsuario] = useState([]);
  const [usuariosApp, setUsuariosApp] = useState([]);
  const [formUsuario, setFormUsuario] = useState({ email: '', nombre: '', rol: 'gerencia' });
  const tiene = (...r) => r.some(x => rolesUsuario.includes(x));
  const esAdmin = tiene('admin');
  const puede = (t) => rolesUsuario.some(r => (PERMISOS[r] || []).includes(t));
  const puedeEditarHist = tiene('admin') || tiene('administrativo');
  const puedeServices = tiene('admin') || tiene('mantenimiento');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroDia, setFiltroDia] = useState('');
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
  const [excelMsg, setExcelMsg] = useState('');
  const [edit, setEdit] = useState(null);
  const [reemplazarTodo, setReemplazarTodo] = useState(true);
  async function cargarRol(session) {
    if (!session) { setSesion(null); setRol(null); setRolesUsuario([]); setAuthListo(true); return; }
    const { data } = await supabase.from('usuarios_app').select('*').eq('email', (session.user.email || '').toLowerCase()).maybeSingle();
    const lista = data && data.activo ? [data.rol, ...(data.roles_extra || [])].filter(r => PERMISOS[r]) : [];
    if (lista.length > 0) {
      const permitidas = [...new Set(lista.flatMap(r => PERMISOS[r]))];
      setSesion(session); setRol(data.rol); setRolesUsuario(lista); setPestana(permitidas[0]); setLoginMsg('');
      fetchDatos();
    } else {
      await supabase.auth.signOut();
      setSesion(null); setRol(null); setRolesUsuario([]);
      setLoginMsg('Tu usuario no está habilitado. Pedile acceso al administrador.');
    }
    setAuthListo(true);
  }
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginMsg('Ingresando...');
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginForm.email.trim(), password: loginForm.password });
    if (error) { setLoginMsg('Correo o contraseña incorrectos.'); return; }
    await cargarRol(data.session);
  };
  useEffect(() => {
    if (!supabase) { setAuthListo(true); return; }
    supabase.auth.getSession().then(({ data }) => cargarRol(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => { if (evento === 'SIGNED_OUT') cargarRol(null); });
    return () => sub.subscription.unsubscribe();
  }, []);
  async function traerTodasLasCargas() {
    let todas = [], desde = 0;
    const paso = 1000;
    while (true) {
      const { data, error } = await supabase.from('cargas_diarias').select('*').order('id', { ascending: false }).range(desde, desde + paso - 1);
      if (error) throw error;
      todas = todas.concat(data || []);
      if (!data || data.length < paso) break;
      desde += paso;
    }
    return todas;
  }
  async function fetchDatos() {
    setLoading(true);
    try {
      const { data: tanquesData } = await supabase.from('tanques').select('*');
      const cargasData = await traerTodasLasCargas();
      const { data: equiposData } = await supabase.from('equipos').select('*');
      const { data: mantData } = await supabase.from('mantenimiento').select('*');
      const { data: choferesData } = await supabase.from('choferes').select('*');
      const { data: obrasData } = await supabase.from('obras').select('*').order('nombre');
      if (obrasData) setObrasLista(obrasData);
      const { data: usuariosData } = await supabase.from('usuarios_app').select('*').order('email');
      if (usuariosData) setUsuariosApp(usuariosData);
      const { data: asigData } = await supabase.from('asignaciones').select('*').order('desde', { ascending: false }).order('id', { ascending: false });
      if (asigData) setAsignaciones(asigData);
      if (choferesData && choferesData.length > 0) setChoferes(choferesData);
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
        { id: 1, nombre: 'Cisterna Principal (PPL)', capacidad_l: 8500, stock_inicial_l: 0, factor_calibracion: 0.9090909 },
        { id: 2, nombre: 'Cisterna Camión', capacidad_l: 4000, stock_inicial_l: 0, factor_calibracion: 0.9852 },
        { id: 3, nombre: 'PLAASF', capacidad_l: 2000, stock_inicial_l: 0, factor_calibracion: 1 }
      ];
      calcularStockTanques(listaTanquesBase, cargasData || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }
  function calcularStockTanques(tanquesBase, cargasData) {
    // Misma regla que 04_Tanques del Excel:
    //   entradas = litros reales cuyo DESTINO es el tanque
    //   salidas  = litros reales cuyo ORIGEN es el tanque
    const litrosDe = (c) => parseFloat(c['Litros Reales'] ?? c['Litros Indicados'] ?? 0) || 0;
    const tanquesCalculados = tanquesBase.map(t => {
      const capacidad = parseFloat(t.capacidad_l) || 0;
      const inicial = parseFloat(t.stock_inicial_l) || 0;
      const nombre = (t.nombre || '').trim().toLowerCase();
      let totalEntradas = 0, totalSalidas = 0;
      cargasData.forEach(c => {
        if ((c['Destino / Equipo'] || '').trim().toLowerCase() === nombre) totalEntradas += litrosDe(c);
        if ((c.Origen || '').trim().toLowerCase() === nombre) totalSalidas += litrosDe(c);
      });
      if (nombre === 'plaasf') totalSalidas = totalEntradas; // igual que el Excel: la planta consume todo lo que recibe
      return { ...t, stock_real: inicial + totalEntradas - totalSalidas, capacidad, totalEntradas, totalSalidas };
    });
    setTanques(tanquesCalculados);
  }
  function extraerEquipos(cargasArray) {
    const equiposMap = {};
    cargasArray.forEach(c => {
      const eqCode = c.Equipo || c['Destino / Equipo'];
      if (eqCode && eqCode.trim() !== '' && !eqCode.toLowerCase().includes('cisterna') && !eqCode.toLowerCase().includes('plaasf') && !eqCode.toLowerCase().includes('ppl') && !equiposMap[eqCode]) {
        const esMaquina = eqCode.startsWith('M') || eqCode.startsWith('CAT') || eqCode.startsWith('P') || eqCode.startsWith('GEN');
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
      const tipo = formCarga["Tipo Movimiento"];
      const indicados = aNum(formCarga["Litros Indicados"]);
      const esAjuste = tipo === 'Ajuste';
      if (!indicados || (!esAjuste && indicados <= 0)) throw new Error(esAjuste ? 'Ingresá los litros del ajuste (positivo si sobra, negativo si falta).' : 'Ingresá los litros indicados por el surtidor.');
      if (esAjuste && !tanques.some(t => t.nombre === formCarga.Origen)) throw new Error('Para un ajuste elegí una cisterna en "Origen / Cisterna".');
      if (tipo === 'Consumo' && !formCarga.Equipo) throw new Error('Elegí el equipo que recibe el combustible.');
      const destino = tipo === 'Consumo' ? formCarga.Equipo
        : (tipo === 'Transferencia' ? 'Cisterna Camión'
        : (formCarga.Origen === 'Dafre (chiringuito)' ? 'Cisterna Camión' : 'Cisterna Principal (PPL)'));
      const tanqueOrigen = tanques.find(t => t.nombre === formCarga.Origen);
      const factor = tanqueOrigen && tanqueOrigen.factor_calibracion ? parseFloat(tanqueOrigen.factor_calibracion) : 1;
      const registro = {
        ...formCarga,
        "Destino / Equipo": destino,
        Equipo: tipo === 'Consumo' ? formCarga.Equipo : '',
        "Litros Indicados": indicados,
        "Factor Calibracion": factor,
        "Litros Reales": Math.round(indicados * factor * 10) / 10,
        Orometro: numTxt(formCarga.Orometro),
        Kilometros: numTxt(formCarga.Kilometros),
        ...(tipo !== 'Consumo' ? { Chofer: '', Obra: '' } : {})
      };
      const registroAjuste = esAjuste ? { ...formCarga, "Tipo Movimiento": 'Ajuste de Stock', Origen: indicados < 0 ? formCarga.Origen : '', "Destino / Equipo": indicados > 0 ? formCarga.Origen : '', Equipo: '', Chofer: '', Obra: '', "Tipo Combustible": '', "Litros Indicados": indicados, "Factor Calibracion": 1, "Litros Reales": Math.abs(indicados), Orometro: '', Kilometros: '' } : null;
      const { error } = await supabase.from('cargas_diarias').insert([esAjuste ? registroAjuste : registro]);
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
  const handleGuardarChofer = async (e) => {
    e.preventDefault();
    if (!nuevoChofer.nombre) return;
    const ch = { id: Date.now(), nombre: nuevoChofer.nombre, equipo_habitual: nuevoChofer.equipo_habitual };
    setChoferes([...choferes, ch]);
    try { await supabase.from('choferes').insert([{ nombre: ch.nombre, equipo_habitual: ch.equipo_habitual }]); } catch (err) { console.error(err); }
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
  const handleCambiarObraEquipo = async (codigoEquipo, nuevaObra) => {
    setEquipos(equipos.map(eq => eq.codigo === codigoEquipo ? { ...eq, obra_predeterminada: nuevaObra } : eq));
    try {
      await supabase.from('equipos').update({ obra_predeterminada: nuevaObra }).eq('codigo', codigoEquipo);
      alert(`¡Obra actualizada a ${nuevaObra} para el equipo ${codigoEquipo}!`);
    } catch (err) { console.error(err); }
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
  const handleGuardarEdicion = async () => {
    try {
      const reales = aNum(edit['Litros Reales']);
      if (reales === null || reales <= 0) throw new Error('Los litros deben ser un número mayor a 0.');
      const f = parseFloat(edit['Factor Calibracion']) || 1;
      const cambios = { Fecha: edit.Fecha, Equipo: edit.Equipo || '', Chofer: edit.Chofer || '', Obra: edit.Obra || '', Observaciones: edit.Observaciones || '', 'Litros Reales': reales };
      if (edit['Tipo Movimiento'] !== 'Ajuste de Stock') cambios['Litros Indicados'] = Math.round(reales / f * 10) / 10;
      if (edit['Tipo Movimiento'] === 'Consumo') cambios['Destino / Equipo'] = edit.Equipo || '';
      const { error } = await supabase.from('cargas_diarias').update(cambios).eq('id', edit.id);
      if (error) throw error;
      setEdit(null);
      await fetchDatos();
    } catch (err) { alert('Error al guardar: ' + err.message); }
  };
  const handleEliminarRegistro = async () => {
    if (!window.confirm('¿Eliminar este registro definitivamente? Cambia el stock y los consumos.')) return;
    const { error } = await supabase.from('cargas_diarias').delete().eq('id', edit.id);
    if (error) { alert('Error al eliminar: ' + error.message); return; }
    setEdit(null);
    await fetchDatos();
  };
  const handleCambiarIntervalo = async (codigo, valor) => {
    const n = aNum(valor);
    if (!n || n <= 0) return;
    setEquipos(prev => prev.map(e => e.codigo === codigo ? { ...e, intervalo_service: n } : e));
    try {
      const { error } = await supabase.from('equipos').update({ intervalo_service: n }).eq('codigo', codigo);
      if (error) throw error;
    } catch (err) { alert('No se pudo guardar el intervalo (¿ejecutaste actualizacion_mejoras.sql?): ' + err.message); }
  };
  const cerrarAbierta = async (cod, fecha, hm) => {
    const ab = abiertaDe(cod);
    if (ab) { const { error } = await supabase.from('asignaciones').update({ hasta: fecha, ...(hm !== null && hm !== undefined ? { horometro_hasta: hm } : {}) }).eq('id', ab.id); if (error) throw error; }
  };
  const handleRegistrarAsignacion = async (e) => {
    e.preventDefault();
    const f = formAsig;
    if (!f.equipo) { alert('Elegí un equipo.'); return; }
    if (f.estado === 'En obra' && !f.obra) { alert('Elegí la obra.'); return; }
    try {
      const hm = aNum(f.horometro);
      await cerrarAbierta(f.equipo, f.fecha, hm);
      const { error } = await supabase.from('asignaciones').insert([{ equipo: f.equipo, estado: f.estado, obra: f.estado === 'En obra' ? f.obra : '', chofer: f.chofer, desde: f.fecha, horometro_desde: hm, observaciones: f.observaciones }]);
      if (error) throw error;
      if (f.estado === 'En obra' && (tiene('admin') || tiene('logistica'))) await supabase.from('equipos').update({ obra_predeterminada: f.obra }).eq('codigo', f.equipo);
      setFormAsig({ ...f, equipo: '', chofer: '', horometro: '', observaciones: '' });
      await fetchDatos();
    } catch (err) { alert('Error al registrar (¿ejecutaste etapa3_flota.sql?): ' + err.message); }
  };
  const handleDarSalidaTaller = async (cod) => {
    const eq = equipos.find(x => x.codigo === cod);
    try {
      await cerrarAbierta(cod, hoyISO(), null);
      const { error } = await supabase.from('asignaciones').insert([{ equipo: cod, estado: 'En obra', obra: (eq && eq.obra_predeterminada) || '', chofer: '', desde: hoyISO(), observaciones: 'Salida de taller' }]);
      if (error) throw error;
      await fetchDatos();
    } catch (err) { alert('Error: ' + err.message); }
  };
  const handleGuardarAsigEdit = async () => {
    const { id, ...resto } = editAsig;
    const { error } = await supabase.from('asignaciones').update({ estado: resto.estado, obra: resto.obra || '', chofer: resto.chofer || '', desde: resto.desde, hasta: resto.hasta || null, horometro_desde: aNum(resto.horometro_desde), horometro_hasta: aNum(resto.horometro_hasta), observaciones: resto.observaciones || '' }).eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    setEditAsig(null); await fetchDatos();
  };
  const handleEliminarAsig = async () => {
    if (!window.confirm('¿Eliminar este registro del historial?')) return;
    const { error } = await supabase.from('asignaciones').delete().eq('id', editAsig.id);
    if (error) { alert('Error: ' + error.message); return; }
    setEditAsig(null); await fetchDatos();
  };
  const handleActualizarUsuario = async (u, cambios) => {
    const { error } = await supabase.from('usuarios_app').update(cambios).eq('id', u.id);
    if (error) { alert('Error: ' + error.message); return; }
    setUsuariosApp(prev => prev.map(x => x.id === u.id ? { ...x, ...cambios } : x));
  };
  const toggleRolExtra = (u, r) => {
    const act = u.roles_extra || [];
    handleActualizarUsuario(u, { roles_extra: act.includes(r) ? act.filter(x => x !== r) : [...act, r] });
  };
  const handleAltaUsuario = async (e) => {
    e.preventDefault();
    const email = formUsuario.email.trim().toLowerCase();
    if (!email) return;
    const { data, error } = await supabase.from('usuarios_app').insert([{ email, nombre: formUsuario.nombre, rol: formUsuario.rol, roles_extra: [] }]).select();
    if (error) { alert('Error: ' + error.message); return; }
    setUsuariosApp([...usuariosApp, ...(data || [])]);
    setFormUsuario({ email: '', nombre: '', rol: 'gerencia' });
  };
  const handleAgregarObra = async () => {
    const n = nombreObraNueva.trim();
    if (!n) return;
    if (obrasLista.some(o => o.nombre.toLowerCase() === n.toLowerCase())) { alert('Esa obra ya existe.'); return; }
    const { data, error } = await supabase.from('obras').insert([{ nombre: n, activa: true }]).select();
    if (error) { alert('Error al crear la obra: ' + error.message); return; }
    setObrasLista([...obrasLista, ...(data || [])]);
    setNombreObraNueva('');
  };
  const handleToggleObra = async (o) => {
    const { error } = await supabase.from('obras').update({ activa: !o.activa }).eq('id', o.id);
    if (error) { alert('Error: ' + error.message); return; }
    setObrasLista(obrasLista.map(x => x.id === o.id ? { ...x, activa: !o.activa } : x));
  };
  const resumenObras = obrasLista.map(o => {
    const cs = todasLasCargas.filter(c => c.Obra === o.nombre);
    const uniq = (k) => [...new Set(cs.map(c => c[k]).filter(Boolean))];
    return { ...o, equiposAsignados: equipos.filter(e => e.obra_predeterminada === o.nombre).length, litros: cs.reduce((a, c) => a + (parseFloat(c['Litros Reales']) || 0), 0), equiposQuePasaron: uniq('Equipo'), choferesQuePasaron: uniq('Chofer') };
  });
  const handleCargarArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelName(file.name);
    setExcelMsg('Leyendo archivo...');
    try {
      const buf = await file.arrayBuffer();
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
      catch { text = new TextDecoder('windows-1252').decode(buf); }
      const rows = parseCSV(text);
      setExcelRows(rows);
      setExcelMsg(rows.length > 1 ? `Se leyeron ${rows.length - 1} filas. Ya podés sincronizar.` : 'El archivo no tiene datos.');
    } catch (err) {
      setExcelRows([]);
      setExcelMsg('No se pudo leer el archivo: ' + err.message);
    }
  };
  const procesarYSubirLote = async () => {
    if (!supabase || excelRows.length < 2) return;
    setSubiendoExcel(true);
    try {
      const filas = excelRows.slice(1).map(row => {
        const indicados = aNum(row[9]);
        const factor = aNum(row[10]);
        const reales = aNum(row[11]);
        return {
          "Semana": row[0] || '',
          "Fecha": aISO(row[1]),
          "Tipo Movimiento": row[2] || '',
          "Origen": row[3] || '',
          "Destino / Equipo": row[4] || '',
          "Equipo": row[5] || '',
          "Chofer": row[6] || '',
          "Obra": row[7] || '',
          "Tipo Combustible": row[8] || '',
          "Litros Indicados": indicados,
          "Factor Calibracion": factor,
          "Litros Reales": reales !== null ? reales : (indicados !== null ? Math.round(indicados * (factor ?? 1) * 10) / 10 : null),
          "Control": row[12] || '',
          "Orometro": numTxt(row[13]),
          "Kilometros": numTxt(row[14]),
          "HM/KM Anterior": numTxt(row[15]),
          "Rendimiento (L/h o L/km)": numTxt(row[16]),
          "Observaciones": row[17] || '',
          "Descripción Equipo": row[18] || ''
        };
      }).filter(f => f.Fecha && (f["Litros Reales"] || 0) > 0);
      if (filas.length === 0) throw new Error('No se encontraron filas válidas (fechas DD/MM/AAAA o AAAA-MM-DD y litros reales mayores a 0).');
      if (reemplazarTodo) {
        const { error: errDel } = await supabase.from('cargas_diarias').delete().gte('id', 0);
        if (errDel) throw errDel;
      }
      for (let i = 0; i < filas.length; i += 200) {
        const { error } = await supabase.from('cargas_diarias').insert(filas.slice(i, i + 200));
        if (error) throw error;
        setExcelMsg(`Subiendo... ${Math.min(i + 200, filas.length)} de ${filas.length}`);
      }
      setExcelMsg(`✅ Listo: ${filas.length} movimientos cargados en Supabase.`);
      await fetchDatos();
    } catch (err) {
      setExcelMsg('❌ Error al subir: ' + (err.message || JSON.stringify(err)));
    }
    setSubiendoExcel(false);
  };
  const exportarACSV = (arrayDatos, nombreArchivo) => {
    if (!arrayDatos || arrayDatos.length === 0) { alert('No hay datos para exportar.'); return; }
    const url = URL.createObjectURL(crearXlsx(arrayDatos, nombreArchivo));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const aniosDisponibles = [...new Set(todasLasCargas.map(c => c.Fecha ? c.Fecha.split('-')[0] : '').filter(Boolean))].sort().reverse();
  const mesesDisponibles = [
    { num: '01', nombre: 'Enero' }, { num: '02', nombre: 'Febrero' }, { num: '03', nombre: 'Marzo' },
    { num: '04', nombre: 'Abril' }, { num: '05', nombre: 'Mayo' }, { num: '06', nombre: 'Junio' },
    { num: '07', nombre: 'Julio' }, { num: '08', nombre: 'Agosto' }, { num: '09', nombre: 'Septiembre' },
    { num: '10', nombre: 'Octubre' }, { num: '11', nombre: 'Noviembre' }, { num: '12', nombre: 'Diciembre' }
  ];
  const obrasDisponibles = [...new Set([...obrasLista.map(o => o.nombre), ...todasLasCargas.map(c => c.Obra).filter(Boolean)])].sort();
  const obrasSeleccionables = obrasLista.filter(o => o.activa !== false).map(o => o.nombre).length > 0 ? obrasLista.filter(o => o.activa !== false).map(o => o.nombre) : ['RN40', 'CANTERA', 'PLANTA ÁRIDOS', 'PLANTA ASFALTO'];
  const cargasFiltradas = todasLasCargas.filter(c => !filtroEquipoHist || c.Equipo === filtroEquipoHist || c['Destino / Equipo'] === filtroEquipoHist).filter(c => {
    if (!c.Fecha) return true;
    const fechaCarga = c.Fecha.split('T')[0];
    const anioCarga = fechaCarga.split('-')[0] || '';
    const mesCarga = fechaCarga.split('-')[1] || '';
    const diaCarga = fechaCarga.split('-')[2] || '';
    const matchAnio = filtroAnio ? anioCarga === filtroAnio : true;
    const matchMes = filtroMes ? mesCarga === filtroMes || mesCarga === `0${filtroMes}`.slice(-2) : true;
    const matchDia = filtroDia ? diaCarga === filtroDia || diaCarga === `0${filtroDia}`.slice(-2) : true;
    return matchAnio && matchMes && matchDia;
  });
  const cargasDashboardFiltradas = todasLasCargas.filter(c => {
    if (!c.Fecha) return true;
    const fechaCarga = c.Fecha.split('T')[0];
    const anioCarga = fechaCarga.split('-')[0] || '';
    const mesCarga = fechaCarga.split('-')[1] || '';
    const matchAnio = dashAnio ? anioCarga === dashAnio : true;
    const matchMes = dashMes ? mesCarga === `0${dashMes}`.slice(-2) : true;
    const matchObra = dashObra ? (c.Obra || '').toLowerCase().trim() === dashObra.toLowerCase().trim() : true;
    let matchRango = true;
    if (dashDesde && fechaCarga < dashDesde) matchRango = false;
    if (dashHasta && fechaCarga > dashHasta) matchRango = false;
    return matchAnio && matchMes && matchObra && matchRango;
  });
  const consumoPorVehiculoDash = {};
  const rendimientoPorVehiculoDash = {};
  const consumoGeneradores = {};
  const rendSum = {}, rendCnt = {};
  cargasDashboardFiltradas.forEach(c => {
    const eq = c.Equipo || c['Destino / Equipo'];
    const obra = (c.Obra || '').toUpperCase();
    if (eq && eq.trim() !== '') {
      const eqUpper = eq.toUpperCase();
      if (!eqUpper.includes('CISTERNA') && !eqUpper.includes('PLAASF') && !eqUpper.includes('PPL')) {
        const litros = parseFloat(c['Litros Reales'] || c['Litros Indicados'] || 0);
        consumoPorVehiculoDash[eq] = (consumoPorVehiculoDash[eq] || 0) + litros;
        if (eqUpper.includes('GEN')) {
          consumoGeneradores[eq] = (consumoGeneradores[eq] || 0) + litros;
        }
        const rendStr = c['Rendimiento (L/h o L/km)'] || '0';
        const rendVal = parseFloat(rendStr.toString().replace(',', '.')) || 0;
        if (rendVal > 0 && (parseFloat(c['HM/KM Anterior']) || 0) > 0) {
          rendSum[eq] = (rendSum[eq] || 0) + rendVal;
          rendCnt[eq] = (rendCnt[eq] || 0) + 1;
          rendimientoPorVehiculoDash[eq] = rendSum[eq] / rendCnt[eq];
        }
      }
    }
    if (obra.includes('ASFALTO')) {
      const litros = parseFloat(c['Litros Reales'] || c['Litros Indicados'] || 0);
      consumoPorVehiculoDash['PLANTA ASFALTO'] = (consumoPorVehiculoDash['PLANTA ASFALTO'] || 0) + litros;
    }
  });
  const consumoOrdenado = Object.entries(consumoPorVehiculoDash).sort((a, b) => b[1] - a[1]);
  const maxLitrosConsumo = consumoOrdenado.length > 0 ? consumoOrdenado[0][1] : 1;
  const generadoresOrdenado = Object.entries(consumoGeneradores).sort((a, b) => b[1] - a[1]);
  const maxGen = generadoresOrdenado.length > 0 ? generadoresOrdenado[0][1] : 1;
  const rendimientoOrdenado = Object.entries(rendimientoPorVehiculoDash).sort((a, b) => b[1] - a[1]);
  const maxRendimiento = rendimientoOrdenado.length > 0 ? rendimientoOrdenado[0][1] : 1;
  const ultimaLecturaDe = (cod) => {
    const v = todasLasCargas.filter(c => c.Equipo === cod).map(c => parseFloat(c.Orometro || c.Kilometros)).filter(n => n > 0);
    return v.length ? Math.max(...v) : null;
  };
  const datosEstadia = (a) => {
    const fin = a.hasta || hoyISO();
    const litros = todasLasCargas.filter(c => c.Equipo === a.equipo && c.Fecha && c.Fecha.slice(0, 10) >= a.desde && c.Fecha.slice(0, 10) <= fin).reduce((t, c) => t + (parseFloat(c['Litros Reales']) || 0), 0);
    const hmFin = a.horometro_hasta != null ? parseFloat(a.horometro_hasta) : (a.hasta ? null : ultimaLecturaDe(a.equipo));
    const uso = a.horometro_desde != null && hmFin != null && hmFin >= parseFloat(a.horometro_desde) ? Math.round((hmFin - parseFloat(a.horometro_desde)) * 10) / 10 : null;
    return { litros: Math.round(litros * 10) / 10, uso };
  };
  const consumoMensualVehiculo = (() => {
    if (!vehiculoDash) return [];
    const m = {};
    todasLasCargas.filter(c => c.Equipo === vehiculoDash && c.Fecha).forEach(c => {
      const k = c.Fecha.slice(0, 7);
      const o = m[k] || (m[k] = { mes: k, cargas: 0, litros: 0, lec: [] });
      o.cargas++; o.litros += parseFloat(c['Litros Reales']) || 0;
      const l = parseFloat(c.Orometro || c.Kilometros); if (l > 0) o.lec.push(l);
    });
    return Object.values(m).sort((a, b) => a.mes.localeCompare(b.mes)).map(o => ({ ...o, litros: Math.round(o.litros * 10) / 10, uso: o.lec.length > 1 ? Math.round((Math.max(...o.lec) - Math.min(...o.lec)) * 10) / 10 : 0 }));
  })();
  const abiertaDe = (cod) => asignaciones.find(a => a.equipo === cod && !a.hasta);
  const estadoDe = (cod) => (abiertaDe(cod) || {}).estado || 'En obra';
  const estadoMantenimientoEquipos = equipos.map(eq => {
    const cargasEq = todasLasCargas.filter(c => (c.Equipo === eq.codigo || c['Destino / Equipo'] === eq.codigo));
    let ultimoLectura = 0, primerLectura = Infinity;
    cargasEq.forEach(c => {
      const val = parseFloat(c.Orometro || c.Kilometros || 0);
      if (val > ultimoLectura) ultimoLectura = val;
      if (val > 0 && val < primerLectura) primerLectura = val;
    });
    if (primerLectura === Infinity) primerLectura = ultimoLectura;
    const esCamion = /cami|batea/i.test(eq.tipo || '');
    const intervaloService = parseFloat(eq.intervalo_service) || (esCamion ? 400 : 250);
    // Umbrales: camiones verde hasta 350/400, amarillo hasta 380, naranja hasta 400. Máquinas verde hasta 150/250, amarillo hasta 200, naranja hasta 250. Rojo = vencido.
    const umbrales = esCamion ? [0.875, 0.95] : [0.6, 0.8];
    const serviceRegistrado = mantenimientos.filter(m => m.codigo_equipo === eq.codigo).sort((a, b) => (parseFloat(b.ultimo_hm_km) || 0) - (parseFloat(a.ultimo_hm_km) || 0))[0];
    const ultimoServiceLectura = serviceRegistrado ? parseFloat(serviceRegistrado.ultimo_hm_km || 0) : primerLectura;
    const horasDesdeUltimoService = Math.max(ultimoLectura - ultimoServiceLectura, 0);
    const horasRestantes = intervaloService - horasDesdeUltimoService;
    const pct = horasDesdeUltimoService / intervaloService;
    let estado = 'OK', colorEstado = '#4ade80';
    if (pct > 1) { estado = `VENCIDO (+${Math.abs(horasRestantes).toFixed(0)} hs/km)`; colorEstado = '#ef4444'; }
    else if (pct > umbrales[1]) { estado = `PRÓXIMO (${horasRestantes.toFixed(0)} restantes)`; colorEstado = '#f97316'; }
    else if (pct > umbrales[0]) { estado = `ATENCIÓN (${horasRestantes.toFixed(0)} restantes)`; colorEstado = '#facc15'; }
    const estFlota = estadoDe(eq.codigo);
    if (estFlota !== 'En obra') { estado = estFlota.toUpperCase(); colorEstado = ESTADO_COLOR[estFlota]; }
    return { ...eq, ultimoLectura, intervaloService, ultimoServiceLectura, horasDesdeUltimoService, pct, horasRestantes: Math.max(0, horasRestantes), estado, colorEstado };
  });
  if (!authListo) return <div style={{ minHeight: '100vh', background: '#2b3133', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>Cargando...</div>;
  if (!sesion) return (
    <div style={{ minHeight: '100vh', background: '#2b3133', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px' }}>
      <form onSubmit={handleLogin} style={{ background: '#fff', borderRadius: '12px', padding: '30px', width: '100%', maxWidth: '360px', borderTop: '6px solid #3f62a8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ background: '#3f62a8', color: '#fff', fontWeight: 'bold', fontSize: '22px', padding: '6px 12px', borderRadius: '4px' }}>DA FRÉ</div>
          <div style={{ color: '#373f42', fontSize: '13px' }}>Obras Civiles S.A.<br />Control de Combustible y Flota</div>
        </div>
        <input type="email" required placeholder="Correo electrónico" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #b4bcc0', boxSizing: 'border-box' }} />
        <input type="password" required placeholder="Contraseña" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} style={{ width: '100%', padding: '10px', marginBottom: '14px', borderRadius: '6px', border: '1px solid #b4bcc0', boxSizing: 'border-box' }} />
        <button type="submit" style={{ width: '100%', padding: '11px', background: '#0069b4', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Ingresar</button>
        {loginMsg && <p style={{ color: '#b91c1c', fontSize: '13px', marginBottom: 0 }}>{loginMsg}</p>}
      </form>
    </div>
  );
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#2b3133', color: '#f8fafc', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px', backgroundColor: '#ffffff', padding: '15px 25px', borderRadius: '10px', borderBottom: '3px solid #1e3a8a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: '#3f62a8', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '20px', color: '#ffffff', letterSpacing: '1px' }}>
            DA FRÉ
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#373f42', margin: 0 }}>Gestión de Vehículos</h1>
            <p style={{ color: '#5f686c', fontSize: '12px', margin: '2px 0 0 0' }}>Obras Civiles S.A. — Control de Combustible y Flota</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#4da3e0', background: '#232829', padding: '6px 12px', borderRadius: '6px', border: '1px solid #1e3a8a' }}>
            {rolesUsuario.map(r => ETIQUETA_ROL[r]).join(' + ')} · {sesion && sesion.user.email}
          </span>
          <button onClick={() => supabase.auth.signOut()} style={{ background: '#505a5e', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
            Salir
          </button>
        </div>
      </header>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '25px', backgroundColor: '#373f42', padding: '10px', borderRadius: '8px' }}>
        {puede('dashboard') && <button onClick={() => setPestana('dashboard')} style={{ background: pestana === 'dashboard' ? '#3f62a8' : '#454e51', color: '#f8fafc', border: pestana === 'dashboard' ? '1px solid #38bdf8' : 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Dashboard</button>}
        {puede('historial') && <button onClick={() => setPestana('historial')} style={{ background: pestana === 'historial' ? '#3f62a8' : '#454e51', color: '#f8fafc', border: pestana === 'historial' ? '1px solid #38bdf8' : 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Historial y Filtros</button>}
        {puede('nueva_carga') && <button onClick={() => setPestana('nueva_carga')} style={{ background: pestana === 'nueva_carga' ? '#3f62a8' : '#454e51', color: '#f8fafc', border: pestana === 'nueva_carga' ? '1px solid #38bdf8' : 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Nueva Carga</button>}
        {puede('equipos') && <button onClick={() => setPestana('equipos')} style={{ background: pestana === 'equipos' ? '#3f62a8' : '#454e51', color: '#f8fafc', border: pestana === 'equipos' ? '1px solid #38bdf8' : 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Equipos y Obras</button>}
        {puede('choferes') && <button onClick={() => setPestana('choferes')} style={{ background: pestana === 'choferes' ? '#3f62a8' : '#454e51', color: '#f8fafc', border: pestana === 'choferes' ? '1px solid #38bdf8' : 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Choferes</button>}
        {puede('mantenimiento') && <button onClick={() => setPestana('mantenimiento')} style={{ background: pestana === 'mantenimiento' ? '#3f62a8' : '#454e51', color: '#f8fafc', border: pestana === 'mantenimiento' ? '1px solid #38bdf8' : 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Mantenimiento</button>}
        {puede('usuarios') && <button onClick={() => setPestana('usuarios')} style={{ background: pestana === 'usuarios' ? '#3f62a8' : '#454e51', color: '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>👥 Usuarios</button>}
        {puede('flota') && <button onClick={() => setPestana('flota')} style={{ background: pestana === 'flota' ? '#3f62a8' : '#454e51', color: '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>🚛 Flota e Historial</button>}
        {puede('obras') && <button onClick={() => setPestana('obras')} style={{ background: pestana === 'obras' ? '#3f62a8' : '#454e51', color: '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>🏗️ Obras</button>}
        {puede('excel') && <button onClick={() => setPestana('excel')} style={{ background: pestana === 'excel' ? '#3f62a8' : '#454e51', color: '#f8fafc', border: pestana === 'excel' ? '1px solid #38bdf8' : 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Excel / CSV</button>}
      </div>
      {pestana === 'dashboard' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ fontSize: '16px', color: '#cbd5e1', margin: 0 }}>Stock Actual en Cisternas (Litros Reales Oficiales al 16/10)</h2>
            <button onClick={() => exportarACSV(tanques, 'stock_cisternas')} style={{ background: '#3f62a8', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>📥 Descargar Excel</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            {tanques.length > 0 ? (
              tanques.map(t => {
                const esNegativo = t.stock_real < 0;
                return (
                  <div key={t.id} style={{ backgroundColor: '#373f42', padding: '18px', borderRadius: '10px', border: `1px solid ${esNegativo ? '#ef4444' : '#3f62a8'}` }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#4da3e0' }}>{t.nombre}</h3>
                    <div style={{ fontSize: '26px', fontWeight: 'bold', color: esNegativo ? '#ef4444' : '#4ade80' }}>
                      {t.stock_real.toFixed(1)} Lts {esNegativo && '⚠️ (Déficit)'}
                    </div>
                    <p style={{ fontSize: '12px', color: '#b4bcc0', margin: '6px 0 0 0' }}>Capacidad Máxima: {t.capacidad} Lts</p>
                    <div style={{ fontSize: '11px', color: '#7ea4e8', marginTop: '8px', borderTop: '1px solid #1e3a8a', paddingTop: '8px' }}>
                      Entradas: +{t.totalEntradas.toFixed(1)} L<br/>
                      Salidas: -{t.totalSalidas.toFixed(1)} L
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', backgroundColor: '#373f42', borderRadius: '8px', color: '#b4bcc0' }}>
                Calculando stock de cisternas...
              </div>
            )}
          </div>
          <div style={{ backgroundColor: '#373f42', padding: '15px', borderRadius: '10px', border: '1px solid #1e3a8a', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Año</label>
              <select value={dashAnio} onChange={e => setDashAnio(e.target.value)} style={{ padding: '7px 10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }}>
                <option value="">Todos</option>
                {aniosDisponibles.map((a, i) => <option key={i} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Mes</label>
              <select value={dashMes} onChange={e => setDashMes(e.target.value)} style={{ padding: '7px 10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }}>
                <option value="">Todos</option>
                {mesesDisponibles.map((m, i) => <option key={i} value={m.num}>{m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Obra</label>
              <select value={dashObra} onChange={e => setDashObra(e.target.value)} style={{ padding: '7px 10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }}>
                <option value="">Todas</option>
                {obrasDisponibles.map((ob, i) => <option key={i} value={ob}>{ob}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Desde</label>
              <input type="date" value={dashDesde} onChange={e => setDashDesde(e.target.value)} style={{ padding: '6px 10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Hasta</label>
              <input type="date" value={dashHasta} onChange={e => setDashHasta(e.target.value)} style={{ padding: '6px 10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => { setDashAnio(''); setDashMes(''); setDashObra(''); setDashDesde(''); setDashHasta(''); }} style={{ background: '#505a5e', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Limpiar Filtros</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
            <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #1e3a8a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '15px', color: '#7ea4e8', margin: 0 }}>📊 Consumo Total (Litros)</h3>
                <button onClick={() => exportarACSV(consumoOrdenado.map(([v, l]) => ({ Equipo: v, Litros: l })), 'consumo_total')} style={{ background: '#3f62a8', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>📥 Descargar Excel</button>
              </div>
              {consumoOrdenado.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
                  {consumoOrdenado.map(([vehiculo, litros], idx) => {
                    const porcentaje = Math.max(4, (litros / maxLitrosConsumo) * 100);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '90px', fontSize: '11px', fontWeight: 'bold', color: '#4da3e0', textAlign: 'right' }}>{vehiculo}</div>
                        <div style={{ flex: 1, backgroundColor: '#2b3133', borderRadius: '6px', height: '22px', position: 'relative', overflow: 'hidden', border: '1px solid #1e3a8a' }}>
                          <div style={{ width: `${porcentaje}%`, backgroundColor: '#7ea4e8', height: '100%', borderRadius: '4px' }}></div>
                          <span style={{ position: 'absolute', right: '8px', top: '2px', fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>{litros.toFixed(1)} L</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: '#b4bcc0', textAlign: 'center', margin: 0 }}>No hay consumos registrados.</p>
              )}
            </div>
            <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #1e3a8a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '15px', color: '#4da3e0', margin: 0 }}>⚡ Consumo de Generadores (GEN01 / GEN02)</h3>
                <button onClick={() => exportarACSV(generadoresOrdenado.map(([v, l]) => ({ Generador: v, Litros: l })), 'consumo_generadores')} style={{ background: '#3f62a8', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>📥 Descargar Excel</button>
              </div>
              {generadoresOrdenado.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
                  {generadoresOrdenado.map(([gen, litros], idx) => {
                    const porcentaje = Math.max(4, (litros / maxGen) * 100);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '90px', fontSize: '11px', fontWeight: 'bold', color: '#7ea4e8', textAlign: 'right' }}>{gen}</div>
                        <div style={{ flex: 1, backgroundColor: '#2b3133', borderRadius: '6px', height: '22px', position: 'relative', overflow: 'hidden', border: '1px solid #1e3a8a' }}>
                          <div style={{ width: `${porcentaje}%`, backgroundColor: '#4da3e0', height: '100%', borderRadius: '4px' }}></div>
                          <span style={{ position: 'absolute', right: '8px', top: '2px', fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>{litros.toFixed(1)} L</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: '#b4bcc0', textAlign: 'center', margin: 0 }}>No hay consumos de generadores registrados.</p>
              )}
            </div>
            <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #1e3a8a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '15px', color: '#4da3e0', margin: 0 }}>📈 Rendimiento Promedio (L / hs o L / km)</h3>
                <button onClick={() => exportarACSV(rendimientoOrdenado.map(([v, r]) => ({ Equipo: v, Rendimiento: r })), 'rendimientos')} style={{ background: '#3f62a8', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>📥 Descargar Excel</button>
              </div>
              {rendimientoOrdenado.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
                  {rendimientoOrdenado.map(([vehiculo, rend], idx) => {
                    const porcentaje = Math.max(4, (rend / maxRendimiento) * 100);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '90px', fontSize: '11px', fontWeight: 'bold', color: '#7ea4e8', textAlign: 'right' }}>{vehiculo}</div>
                        <div style={{ flex: 1, backgroundColor: '#2b3133', borderRadius: '6px', height: '22px', position: 'relative', overflow: 'hidden', border: '1px solid #1e3a8a' }}>
                          <div style={{ width: `${porcentaje}%`, backgroundColor: '#4da3e0', height: '100%', borderRadius: '4px' }}></div>
                          <span style={{ position: 'absolute', right: '8px', top: '2px', fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>{rend.toFixed(2)} L/u</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: '#b4bcc0', textAlign: 'center', margin: 0 }}>No hay datos suficientes de rendimiento.</p>
              )}
            </div>
          </div>
          <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #3f62a8', marginTop: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
              <h2 style={{ fontSize: '18px', color: '#7ea4e8', margin: 0 }}>🔎 Consumo mensual por vehículo o máquina</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={vehiculoDash} onChange={e => setVehiculoDash(e.target.value)} style={{ padding: '7px 10px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px' }}>
                  <option value="">Elegí un equipo...</option>
                  {equipos.map(x => <option key={x.codigo} value={x.codigo}>{x.codigo} - {x.descripcion}</option>)}
                </select>
                {consumoMensualVehiculo.length > 0 && <button onClick={() => exportarACSV(consumoMensualVehiculo.map(o => ({ Equipo: vehiculoDash, Mes: o.mes, Cargas: o.cargas, Litros: o.litros, 'Horas/km (1ª a última carga)': o.uso, 'L por hora/km': o.uso > 0 ? Math.round(o.litros / o.uso * 100) / 100 : '' })), 'consumo_' + vehiculoDash)} style={{ background: '#3f62a8', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer' }}>📥 Descargar Excel</button>}
              </div>
            </div>
            {consumoMensualVehiculo.length === 0 ? <p style={{ color: '#b4bcc0', margin: 0 }}>{vehiculoDash ? 'Este equipo no tiene cargas registradas.' : 'Elegí un equipo para ver sus litros mes a mes.'}</p> : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {consumoMensualVehiculo.map(o => (
                  <div key={o.mes} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 200px', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ color: '#7ea4e8', fontWeight: 'bold' }}>{o.mes}</span>
                    <div style={{ background: '#2b3133', borderRadius: '6px', height: '22px', overflow: 'hidden' }}><div style={{ width: `${(o.litros / Math.max(...consumoMensualVehiculo.map(x => x.litros))) * 100}%`, height: '100%', background: '#4da3e0', color: '#000', fontSize: '12px', paddingLeft: '8px', lineHeight: '22px', fontWeight: 'bold' }}>{o.litros} L</div></div>
                    <span style={{ color: '#cbd5e1' }}>{o.cargas} cargas{o.uso > 0 ? ` · ${o.uso} hs/km · ${(o.litros / o.uso).toFixed(1)} L/u` : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {pestana === 'historial' && (
        <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #1e3a8a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', color: '#7ea4e8', margin: 0 }}>Historial Completo y Filtros por Fecha</h2>
            <button onClick={() => exportarACSV(cargasFiltradas, 'historial_cargas')} style={{ background: '#3f62a8', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>📥 Descargar Excel</button>
          </div>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '5px' }}>Año</label>
              <select value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)} style={{ padding: '8px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }}>
                <option value="">Todos</option>
                {aniosDisponibles.map((a, i) => <option key={i} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '5px' }}>Mes</label>
              <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ padding: '8px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }}>
                <option value="">Todos</option>
                {mesesDisponibles.map((m, i) => <option key={i} value={m.num}>{m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '5px' }}>Día (Ej: 16)</label>
              <input type="text" placeholder="Todos" value={filtroDia} onChange={e => setFiltroDia(e.target.value)} style={{ padding: '8px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px', width: '80px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#b4bcc0', marginBottom: '4px' }}>Equipo</label>
              <select value={filtroEquipoHist} onChange={e => setFiltroEquipoHist(e.target.value)} style={{ padding: '8px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }}>
                <option value="">Todos</option>
                {equipos.map(x => <option key={x.codigo} value={x.codigo}>{x.codigo} - {x.descripcion}</option>)}
              </select>
            </div>
            <div>
              <button onClick={() => { setFiltroAnio(''); setFiltroMes(''); setFiltroDia(''); setFiltroEquipoHist(''); }} style={{ background: '#505a5e', color: '#fff', border: 'none', padding: '9px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Limpiar Filtros</button>
            </div>
          </div>
          <p style={{ color: '#7ea4e8', fontSize: '14px', margin: '0 0 12px' }}>📊 {cargasFiltradas.length} movimientos · {cargasFiltradas.reduce((t, c) => t + (parseFloat(c['Litros Reales']) || 0), 0).toFixed(0)} L en total (según los filtros elegidos)</p>
          {edit && puedeEditarHist && (
            <div style={{ background: '#2b3133', border: '1px solid #7ea4e8', borderRadius: '10px', padding: '15px', marginBottom: '15px' }}>
              <h3 style={{ color: '#7ea4e8', margin: '0 0 10px', fontSize: '15px' }}>✏️ Editando registro #{edit.id} ({edit['Tipo Movimiento']})</h3>
              <datalist id="dl-choferes">{choferes.map((c, i) => <option key={i} value={c.nombre} />)}</datalist>
              <datalist id="dl-equipos">{equipos.map((e, i) => <option key={i} value={e.codigo} />)}</datalist>
              <datalist id="dl-obras">{obrasDisponibles.map((o, i) => <option key={i} value={o} />)}</datalist>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Fecha<input type="date" value={edit.Fecha || ''} onChange={e => setEdit({ ...edit, Fecha: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%' }} /></label>
                <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Equipo<input list="dl-equipos" value={edit.Equipo || ''} onChange={e => setEdit({ ...edit, Equipo: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%' }} /></label>
                <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Chofer<input list="dl-choferes" value={edit.Chofer || ''} onChange={e => setEdit({ ...edit, Chofer: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%' }} /></label>
                <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Obra<input list="dl-obras" value={edit.Obra || ''} onChange={e => setEdit({ ...edit, Obra: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%' }} /></label>
                <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Litros reales<input type="number" step="any" value={edit['Litros Reales'] ?? ''} onChange={e => setEdit({ ...edit, 'Litros Reales': e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%' }} /></label>
                <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Observaciones<input value={edit.Observaciones || ''} onChange={e => setEdit({ ...edit, Observaciones: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%' }} /></label>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button onClick={handleGuardarEdicion} style={{ background: '#7ea4e8', color: '#000', border: 'none', padding: '9px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar cambios</button>
                <button onClick={() => setEdit(null)} style={{ background: '#505a5e', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleEliminarRegistro} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', cursor: 'pointer', marginLeft: 'auto' }}>Eliminar registro</button>
              </div>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e3a8a', color: '#b4bcc0', backgroundColor: '#2b3133' }}>
                  <th style={{ padding: '12px' }}>Fecha</th>
                  <th style={{ padding: '12px' }}>Movimiento</th>
                  <th style={{ padding: '12px' }}>Origen</th>
                  <th style={{ padding: '12px' }}>Equipo</th>
                  <th style={{ padding: '12px' }}>Chofer</th>
                  <th style={{ padding: '12px' }}>Litros</th>
                  <th style={{ padding: '12px' }}>Obra</th>
                  {puedeEditarHist && <th style={{ padding: '12px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {cargasFiltradas.length > 0 ? (
                  cargasFiltradas.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #131b31' }}>
                      <td style={{ padding: '12px' }}>{c.Fecha || '-'}</td>
                      <td style={{ padding: '12px', color: c['Tipo Movimiento'] === 'Compra' ? '#4ade80' : '#4da3e0' }}>{c['Tipo Movimiento'] || '-'}</td>
                      <td style={{ padding: '12px' }}>{c.Origen || '-'}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.Equipo || '-'}</td>
                      <td style={{ padding: '12px' }}>{c.Chofer || '-'}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#7ea4e8' }}>{c['Tipo Movimiento'] === 'Ajuste de Stock' ? (c['Destino / Equipo'] ? '+' : '−') : ''}{c['Litros Reales'] || c['Litros Indicados'] || 0} L</td>
                      <td style={{ padding: '12px' }}>{c.Obra || '-'}</td>
                      {puedeEditarHist && <td style={{ padding: '12px' }}><button onClick={() => setEdit({ ...c })} title="Editar" style={{ background: 'transparent', border: '1px solid #7ea4e8', color: '#7ea4e8', borderRadius: '6px', cursor: 'pointer', padding: '3px 8px' }}>✏️</button></td>}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#b4bcc0' }}>No se encontraron registros.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {pestana === 'nueva_carga' && puede('nueva_carga') && (
        <div style={{ maxWidth: '650px', margin: '0 auto', backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #1e3a8a' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', color: '#7ea4e8' }}>+ Registrar Nueva Carga Manual</h2>
          <form onSubmit={handleGuardarCargaManual} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Fecha</label>
              <input type="date" value={formCarga.Fecha} onChange={e => setFormCarga({...formCarga, Fecha: e.target.value})} style={{ width: '100%', padding: '10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px', marginTop: '5px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Tipo de Movimiento</label>
              <select value={formCarga["Tipo Movimiento"]} onChange={e => setFormCarga({...formCarga, "Tipo Movimiento": e.target.value})} style={{ width: '100%', padding: '10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px', marginTop: '5px' }}>
                <option value="Consumo">Consumo</option>
                <option value="Transferencia">Transferencia (Cisterna PPL -&gt; Camión)</option>
                <option value="Compra">Compra / Ingreso</option>
                <option value="Ajuste">Ajuste de Stock (Corte Mensual)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Origen / Cisterna</label>
              <select value={formCarga.Origen} onChange={e => setFormCarga({...formCarga, Origen: e.target.value})} style={{ width: '100%', padding: '10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px', marginTop: '5px' }}>
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
                style={{ width: '100%', padding: '10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px', marginTop: '5px' }} 
              />
              <datalist id="lista-equipos">
                {equipos.map((eq, i) => <option key={i} value={eq.codigo}>{eq.descripcion || eq.codigo}</option>)}
              </datalist>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Chofer / Responsable</label>
              <select value={formCarga.Chofer} onChange={e => setFormCarga({...formCarga, Chofer: e.target.value})} style={{ width: '100%', padding: '10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px', marginTop: '5px' }}>
                <option value="">Seleccionar Chofer...</option>
                {choferes.map(ch => <option key={ch.id} value={ch.nombre}>{ch.nombre} (Habitual: {ch.equipo_habitual || 'N/A'})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Obra</label>
              <select value={formCarga.Obra} onChange={e => setFormCarga({...formCarga, Obra: e.target.value})} style={{ width: '100%', padding: '10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px', marginTop: '5px' }}>
                {obrasSeleccionables.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Tipo Combustible</label>
              <select value={formCarga["Tipo Combustible"]} onChange={e => setFormCarga({...formCarga, "Tipo Combustible": e.target.value})} style={{ width: '100%', padding: '10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px', marginTop: '5px' }}>
                <option value="Infinia Diesel">Infinia Diesel</option>
                <option value="Diesel 500">Diesel 500</option>
                <option value="Nafta">Nafta</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>{formCarga["Tipo Movimiento"] === 'Ajuste' ? 'Litros de ajuste (+ sobra / - falta)' : 'Litros Cargados'}</label>
              {formCarga["Tipo Movimiento"] === 'Ajuste' && (() => { const t = tanques.find(x => x.nombre === formCarga.Origen); return <p style={{ fontSize: '12px', color: '#7ea4e8', margin: '4px 0 0' }}>{t ? `El sistema marca ${t.stock_real.toFixed(1)} L en esta cisterna. Si la varilla marca otro valor, cargá la diferencia.` : 'Elegí una cisterna en "Origen / Cisterna".'}</p>; })()}
              <input type="number" step="any" placeholder="Ej: 150" value={formCarga["Litros Indicados"]} onChange={e => setFormCarga({...formCarga, "Litros Indicados": e.target.value})} style={{ width: '100%', padding: '10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px', marginTop: '5px' }} />
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
              <button type="submit" style={{ background: '#7ea4e8', color: '#000', border: 'none', padding: '12px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Guardar Carga</button>
            </div>
          </form>
        </div>
      )}
      {pestana === 'equipos' && (
        <div style={{ maxWidth: '950px', margin: '0 auto' }}>
          {(esAdmin || tiene('logistica')) && (
            <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #1e3a8a', marginBottom: '25px' }}>
              <h2 style={{ fontSize: '18px', color: '#7ea4e8', marginBottom: '15px' }}>+ Agregar Nuevo Equipo / Vehículo</h2>
              <form onSubmit={handleGuardarEquipo} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <input type="text" placeholder="Código (Ej: M048)" value={nuevoEquipo.codigo} onChange={e => setNuevoEquipo({...nuevoEquipo, codigo: e.target.value})} style={{ padding: '8px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }} />
                <input type="text" placeholder="Descripción (Ej: Excavadora CAT)" value={nuevoEquipo.descripcion} onChange={e => setNuevoEquipo({...nuevoEquipo, descripcion: e.target.value})} style={{ padding: '8px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }} />
                <select value={nuevoEquipo.tipo} onChange={e => setNuevoEquipo({...nuevoEquipo, tipo: e.target.value})} style={{ padding: '8px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }}>
                  <option value="Máquina">Máquina (Service c/250 hs)</option>
                  <option value="Camión / Vehículo">Camión / Vehículo (Service c/400 km)</option>
                </select>
                <button type="submit" style={{ background: '#4ade80', color: '#000', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Equipo</button>
              </form>
            </div>
          )}
          <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #1e3a8a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ fontSize: '18px', color: '#4da3e0', margin: 0 }}>Gestión de Flota y Cambio de Obra ({equipos.length})</h2>
              <button onClick={() => exportarACSV(equipos, 'flota_equipos')} style={{ background: '#3f62a8', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>📥 Descargar Excel</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e3a8a', color: '#b4bcc0' }}>
                  <th style={{ padding: '10px' }}>Código</th>
                  <th style={{ padding: '10px' }}>Descripción</th>
                  <th style={{ padding: '10px' }}>Tipo</th>
                  <th style={{ padding: '10px' }}>Obra Actual / Asignar</th>
                </tr>
              </thead>
              <tbody>
                {equipos.map((eq, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #131b31' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#7ea4e8' }}>{eq.codigo}</td>
                    <td style={{ padding: '10px' }}>{eq.descripcion || '-'}</td>
                    <td style={{ padding: '10px' }}>{eq.tipo || 'Máquina'}</td>
                    <td style={{ padding: '10px' }}>
                      <select 
                        value={eq.obra_predeterminada || 'RN40'} 
                        onChange={e => handleCambiarObraEquipo(eq.codigo, e.target.value)}
                        disabled={!(esAdmin || tiene('logistica'))}
                        style={{ padding: '5px 8px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }}
                      >
                        {obrasSeleccionables.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {pestana === 'choferes' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {esAdmin && (
            <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #1e3a8a', marginBottom: '25px' }}>
              <h2 style={{ fontSize: '18px', color: '#7ea4e8', marginBottom: '15px' }}>+ Registrar Nuevo Chofer</h2>
              <form onSubmit={handleGuardarChofer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <input type="text" placeholder="Nombre Completo" value={nuevoChofer.nombre} onChange={e => setNuevoChofer({...nuevoChofer, nombre: e.target.value})} style={{ padding: '10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }} />
                <input type="text" placeholder="Equipo Habitual (Ej: M047)" value={nuevoChofer.equipo_habitual} onChange={e => setNuevoChofer({...nuevoChofer, equipo_habitual: e.target.value})} style={{ padding: '10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }} />
                <button type="submit" style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Chofer</button>
              </form>
            </div>
          )}
          <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #1e3a8a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ fontSize: '18px', color: '#4da3e0', margin: 0 }}>Nómina de Choferes</h2>
              <button onClick={() => exportarACSV(choferes, 'nomina_choferes')} style={{ background: '#3f62a8', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>📥 Descargar Excel</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e3a8a', color: '#b4bcc0' }}>
                  <th style={{ padding: '10px' }}>Nombre</th>
                  <th style={{ padding: '10px' }}>Equipo Asignado</th>
                </tr>
              </thead>
              <tbody>
                {choferes.map((ch, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #131b31' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{ch.nombre}</td>
                    <td style={{ padding: '10px', color: '#7ea4e8' }}>{ch.equipo_habitual || 'Sin Asignar'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {pestana === 'mantenimiento' && (
        <div style={{ maxWidth: '950px', margin: '0 auto' }}>
          {equipos.some(x => estadoDe(x.codigo) === 'En taller') && (
            <div style={{ backgroundColor: '#373f42', padding: '20px', borderRadius: '12px', border: '1px solid #f87171', marginBottom: '25px' }}>
              <h2 style={{ fontSize: '18px', color: '#f87171', margin: '0 0 12px' }}>🔧 Equipos en taller</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead><tr style={{ color: '#b4bcc0' }}><th style={{ padding: '8px' }}>Equipo</th><th style={{ padding: '8px' }}>Ingreso</th><th style={{ padding: '8px' }}>Días</th><th style={{ padding: '8px' }}>Falla / observaciones</th><th style={{ padding: '8px' }}></th></tr></thead>
                <tbody>
                  {equipos.filter(x => estadoDe(x.codigo) === 'En taller').map(x => { const ab = abiertaDe(x.codigo); return (
                    <tr key={x.codigo} style={{ borderTop: '1px solid #454e51' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#7ea4e8' }}>{x.codigo} <span style={{ color: '#b4bcc0', fontWeight: 'normal' }}>{x.descripcion}</span></td>
                      <td style={{ padding: '8px' }}>{ab.desde}</td>
                      <td style={{ padding: '8px' }}>{diasDesde(ab.desde)}</td>
                      <td style={{ padding: '8px' }}>{ab.observaciones || '-'}</td>
                      <td style={{ padding: '8px' }}>{puede('flota') && <button onClick={() => handleDarSalidaTaller(x.codigo)} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '9px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Dar salida / Habilitar</button>}</td>
                    </tr>); })}
                </tbody>
              </table>
            </div>
          )}
          {puedeServices && (
            <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #1e3a8a', marginBottom: '25px' }}>
              <h2 style={{ fontSize: '18px', color: '#7ea4e8', marginBottom: '15px' }}>🛠️ Registrar Service Realizado</h2>
              <form onSubmit={handleRegistrarService} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <select value={formService.codigo_equipo} onChange={e => setFormService({...formService, codigo_equipo: e.target.value})} style={{ padding: '10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }}>
                  <option value="">Seleccionar Equipo...</option>
                  {equipos.map((e, i) => <option key={i} value={e.codigo}>{e.codigo} - {e.descripcion}</option>)}
                </select>
                <input type="number" placeholder="Horómetro / Km del Service" value={formService.hm_km_actual} onChange={e => setFormService({...formService, hm_km_actual: e.target.value})} style={{ padding: '10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }} />
                <input type="text" placeholder="Detalles (Ej: Filtro aceite, aire)" value={formService.observaciones} onChange={e => setFormService({...formService, observaciones: e.target.value})} style={{ padding: '10px', background: '#2b3133', border: '1px solid #1e3a8a', color: '#fff', borderRadius: '6px' }} />
                <button type="submit" style={{ background: '#7ea4e8', color: '#000', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Service</button>
              </form>
            </div>
          )}
          <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #1e3a8a', marginBottom: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ fontSize: '18px', color: '#4da3e0', margin: 0 }}>Control de Mantenimiento Preventivo</h2>
              <button onClick={() => exportarACSV(estadoMantenimientoEquipos, 'mantenimiento_preventivo')} style={{ background: '#3f62a8', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>📥 Descargar Excel</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e3a8a', color: '#b4bcc0', backgroundColor: '#2b3133' }}>
                    <th style={{ padding: '10px' }}>Equipo</th>
                    <th style={{ padding: '10px' }}>Tipo</th>
                    <th style={{ padding: '10px' }}>Última Lectura</th>
                    <th style={{ padding: '10px' }}>Último Service</th>
                    <th style={{ padding: '10px' }}>Recorrido desde service</th>
                    <th style={{ padding: '10px' }}>Intervalo (editable)</th>
                    <th style={{ padding: '10px' }}>Estado Preventivo</th>
                  </tr>
                </thead>
                <tbody>
                  {estadoMantenimientoEquipos.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #131b31' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{m.codigo}</td>
                      <td style={{ padding: '10px' }}>{m.tipo}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{m.ultimoLectura} hs/km</td>
                      <td style={{ padding: '10px' }}>{m.ultimoServiceLectura} hs/km</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{m.horasDesdeUltimoService.toFixed(0)} hs/km</td>
                      <td style={{ padding: '10px' }}><input key={m.codigo + m.intervaloService} type="number" defaultValue={m.intervaloService} disabled={!puedeServices} onBlur={e => handleCambiarIntervalo(m.codigo, e.target.value)} style={{ width: '70px', padding: '5px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px' }} /> hs/km</td>
                      <td style={{ padding: '10px', minWidth: '190px' }}>
                        <div style={{ background: '#2b3133', borderRadius: '6px', height: '12px', overflow: 'hidden', border: '1px solid #505a5e' }}>
                          <div style={{ width: `${Math.min(m.pct * 100, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #4ade80 0%, #facc15 60%, #f97316 85%, #ef4444 100%)', backgroundSize: `${100 / Math.max(Math.min(m.pct, 1), 0.01)}% 100%` }} />
                        </div>
                        <div style={{ fontSize: '11px', color: m.colorEstado, fontWeight: 'bold', marginTop: '4px' }}>{m.estado}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #1e3a8a' }}>
            <h2 style={{ fontSize: '18px', color: '#7ea4e8', marginBottom: '15px' }}>📜 Historial de Services Registrados</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e3a8a', color: '#b4bcc0', backgroundColor: '#2b3133' }}>
                  <th style={{ padding: '10px' }}>Fecha</th>
                  <th style={{ padding: '10px' }}>Equipo</th>
                  <th style={{ padding: '10px' }}>Horómetro / KM</th>
                  <th style={{ padding: '10px' }}>Tipo de Service</th>
                  <th style={{ padding: '10px' }}>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {mantenimientos.length > 0 ? (
                  mantenimientos.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #131b31' }}>
                      <td style={{ padding: '10px' }}>{m.fecha || '-'}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#4da3e0' }}>{m.codigo_equipo}</td>
                      <td style={{ padding: '10px' }}>{m.ultimo_hm_km}</td>
                      <td style={{ padding: '10px' }}>{m.tipo_service}</td>
                      <td style={{ padding: '10px' }}>{m.observaciones || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#b4bcc0' }}>No hay services registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {pestana === 'usuarios' && puede('usuarios') && (
        <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #3f62a8' }}>
          <h2 style={{ fontSize: '18px', color: '#7ea4e8', margin: '0 0 8px' }}>👥 Usuarios y permisos</h2>
          <p style={{ fontSize: '13px', color: '#cbd5e1', margin: '0 0 15px' }}>Paso 1: creá la cuenta en Supabase (Authentication → Users → Add user). Paso 2: dala de alta acá con el mismo correo. Una persona puede tener varios roles: ve las pestañas de todos ellos.</p>
          <form onSubmit={handleAltaUsuario} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <input type="email" required placeholder="correo@empresa.com" value={formUsuario.email} onChange={e => setFormUsuario({ ...formUsuario, email: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px' }} />
            <input placeholder="Nombre" value={formUsuario.nombre} onChange={e => setFormUsuario({ ...formUsuario, nombre: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px' }} />
            <select value={formUsuario.rol} onChange={e => setFormUsuario({ ...formUsuario, rol: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px' }}>{ROLES.map(r => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}</select>
            <button type="submit" style={{ background: '#7ea4e8', color: '#000', border: 'none', padding: '9px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Dar de alta</button>
          </form>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead><tr style={{ color: '#b4bcc0', background: '#2b3133' }}><th style={{ padding: '8px' }}>Usuario</th><th style={{ padding: '8px' }}>Rol principal</th><th style={{ padding: '8px' }}>Roles adicionales</th><th style={{ padding: '8px' }}>Pestañas que ve</th><th style={{ padding: '8px' }}>Activo</th></tr></thead>
              <tbody>
                {usuariosApp.map(u => { const propio = sesion && sesion.user.email.toLowerCase() === u.email.toLowerCase(); const lista = [u.rol, ...(u.roles_extra || [])]; return (
                  <tr key={u.id} style={{ borderTop: '1px solid #454e51', opacity: u.activo ? 1 : 0.5 }}>
                    <td style={{ padding: '8px' }}><b style={{ color: '#7ea4e8' }}>{u.email}</b><br /><span style={{ color: '#b4bcc0' }}>{u.nombre}{propio ? ' (vos)' : ''}</span></td>
                    <td style={{ padding: '8px' }}><select disabled={propio} value={u.rol} onChange={e => handleActualizarUsuario(u, { rol: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px' }}>{ROLES.map(r => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}</select></td>
                    <td style={{ padding: '8px' }}>{ROLES.filter(r => r !== u.rol).map(r => <label key={r} style={{ display: 'block', fontSize: '12px' }}><input type="checkbox" disabled={propio} checked={(u.roles_extra || []).includes(r)} onChange={() => toggleRolExtra(u, r)} /> {ETIQUETA_ROL[r]}</label>)}</td>
                    <td style={{ padding: '8px', fontSize: '12px', maxWidth: '220px' }}>{[...new Set(lista.flatMap(r => PERMISOS[r] || []))].map(t => TAB_NOMBRE[t]).join(', ')}</td>
                    <td style={{ padding: '8px' }}><input type="checkbox" disabled={propio} checked={!!u.activo} onChange={e => handleActualizarUsuario(u, { activo: e.target.checked })} /></td>
                  </tr>); })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {pestana === 'flota' && puede('flota') && (
        <div style={{ display: 'grid', gap: '25px' }}>
          <datalist id="fl-choferes">{choferes.map((c, i) => <option key={i} value={c.nombre} />)}</datalist>
          <datalist id="fl-obras">{obrasDisponibles.map((o, i) => <option key={i} value={o} />)}</datalist>
          <form onSubmit={handleRegistrarAsignacion} style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #3f62a8' }}>
            <h2 style={{ fontSize: '18px', color: '#7ea4e8', margin: '0 0 15px' }}>🔄 Registrar cambio de estado, obra o chofer</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Equipo<select value={formAsig.equipo} onChange={e => setFormAsig({ ...formAsig, equipo: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }}><option value="">Elegir...</option>{equipos.map(x => <option key={x.codigo} value={x.codigo}>{x.codigo} - {x.descripcion}</option>)}</select></label>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Estado<select value={formAsig.estado} onChange={e => setFormAsig({ ...formAsig, estado: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }}>{ESTADOS_FLOTA.map(x => <option key={x} value={x}>{x}</option>)}</select></label>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Obra<select disabled={formAsig.estado !== 'En obra'} value={formAsig.obra} onChange={e => setFormAsig({ ...formAsig, obra: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }}><option value="">Elegir...</option>{obrasSeleccionables.map(o => <option key={o} value={o}>{o}</option>)}</select></label>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Chofer<input list="fl-choferes" value={formAsig.chofer} onChange={e => setFormAsig({ ...formAsig, chofer: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} /></label>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Fecha<input type="date" value={formAsig.fecha} onChange={e => setFormAsig({ ...formAsig, fecha: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} /></label>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Horómetro / km en este momento<input type="number" step="any" value={formAsig.horometro} onChange={e => setFormAsig({ ...formAsig, horometro: e.target.value })} placeholder={formAsig.equipo && ultimaLecturaDe(formAsig.equipo) ? `Última en cargas: ${ultimaLecturaDe(formAsig.equipo)}` : ''} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} /></label>
              <label style={{ fontSize: '12px', color: '#cbd5e1' }}>{formAsig.estado === 'En taller' ? 'Falla detectada' : 'Observaciones'}<input value={formAsig.observaciones} onChange={e => setFormAsig({ ...formAsig, observaciones: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} /></label>
            </div>
            <button type="submit" style={{ background: '#7ea4e8', color: '#000', border: 'none', padding: '9px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}>Registrar cambio</button>
          </form>
          <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #3f62a8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
              <h2 style={{ fontSize: '18px', color: '#7ea4e8', margin: 0 }}>Estado actual de la flota</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={filtroEstadoFlota} onChange={e => setFiltroEstadoFlota(e.target.value)} style={{ padding: '6px', background: '#2b3133', color: '#fff', border: '1px solid #3f62a8', borderRadius: '6px' }}>{['Todos', ...ESTADOS_FLOTA].map(x => <option key={x} value={x}>{x}</option>)}</select>
                <button onClick={() => exportarACSV(equipos.map(x => { const ab = abiertaDe(x.codigo) || {}; return { Equipo: x.codigo, Descripcion: x.descripcion, Estado: estadoDe(x.codigo), Obra: ab.obra || x.obra_predeterminada || '', Chofer: ab.chofer || '', Desde: ab.desde || '', Dias: ab.desde ? diasDesde(ab.desde) : '' }; }), 'estado_flota')} style={{ background: '#3f62a8', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>📥 Descargar Excel</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '380px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead><tr style={{ color: '#b4bcc0', background: '#2b3133' }}><th style={{ padding: '8px' }}>Equipo</th><th style={{ padding: '8px' }}>Estado</th><th style={{ padding: '8px' }}>Obra</th><th style={{ padding: '8px' }}>Chofer</th><th style={{ padding: '8px' }}>Desde</th></tr></thead>
                <tbody>
                  {equipos.filter(x => filtroEstadoFlota === 'Todos' || estadoDe(x.codigo) === filtroEstadoFlota).map(x => { const ab = abiertaDe(x.codigo) || {}; const est = estadoDe(x.codigo); return (
                    <tr key={x.codigo} style={{ borderTop: '1px solid #454e51' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#7ea4e8' }}>{x.codigo} <span style={{ color: '#b4bcc0', fontWeight: 'normal' }}>{x.descripcion}</span></td>
                      <td style={{ padding: '8px', color: ESTADO_COLOR[est], fontWeight: 'bold' }}>● {est}</td>
                      <td style={{ padding: '8px' }}>{ab.obra || x.obra_predeterminada || '-'}</td>
                      <td style={{ padding: '8px' }}>{ab.chofer || '-'}</td>
                      <td style={{ padding: '8px' }}>{ab.desde ? `${ab.desde} (${diasDesde(ab.desde)} d)` : '-'}</td>
                    </tr>); })}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #3f62a8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
              <h2 style={{ fontSize: '18px', color: '#7ea4e8', margin: 0 }}>Historial de obras, choferes y estados</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={filtroAsigEquipo} onChange={e => setFiltroAsigEquipo(e.target.value)} style={{ padding: '6px', background: '#2b3133', color: '#fff', border: '1px solid #3f62a8', borderRadius: '6px' }}><option value="">Todos los equipos</option>{equipos.map(x => <option key={x.codigo} value={x.codigo}>{x.codigo}</option>)}</select>
                <select value={filtroAsigObra} onChange={e => setFiltroAsigObra(e.target.value)} style={{ padding: '6px', background: '#2b3133', color: '#fff', border: '1px solid #3f62a8', borderRadius: '6px' }}><option value="">Todas las obras</option>{obrasDisponibles.map(o => <option key={o} value={o}>{o}</option>)}</select>
                <button onClick={() => exportarACSV(asignaciones.filter(a => (!filtroAsigEquipo || a.equipo === filtroAsigEquipo) && (!filtroAsigObra || a.obra === filtroAsigObra)).map(a => ({ Equipo: a.equipo, Estado: a.estado, Obra: a.obra, Chofer: a.chofer, Desde: a.desde, Hasta: a.hasta || 'Vigente', 'Horómetro entrada': a.horometro_desde, 'Horómetro salida': a.horometro_hasta, 'Horas/km': datosEstadia(a).uso, Litros: datosEstadia(a).litros, Observaciones: a.observaciones })), 'historial_asignaciones')} style={{ background: '#3f62a8', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>📥 Descargar Excel</button>
              </div>
            </div>
            {editAsig && (
              <div style={{ background: '#2b3133', border: '1px solid #7ea4e8', borderRadius: '10px', padding: '15px', marginBottom: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Estado<select value={editAsig.estado} onChange={e => setEditAsig({ ...editAsig, estado: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }}>{ESTADOS_FLOTA.map(x => <option key={x} value={x}>{x}</option>)}</select></label>
                  <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Obra<input list="fl-obras" value={editAsig.obra || ''} onChange={e => setEditAsig({ ...editAsig, obra: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} /></label>
                  <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Chofer<input list="fl-choferes" value={editAsig.chofer || ''} onChange={e => setEditAsig({ ...editAsig, chofer: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} /></label>
                  <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Desde<input type="date" value={editAsig.desde || ''} onChange={e => setEditAsig({ ...editAsig, desde: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} /></label>
                  <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Hasta (vacío = vigente)<input type="date" value={editAsig.hasta || ''} onChange={e => setEditAsig({ ...editAsig, hasta: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} /></label>
                  <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Horóm. entrada<input type="number" step="any" value={editAsig.horometro_desde ?? ''} onChange={e => setEditAsig({ ...editAsig, horometro_desde: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} /></label>
                  <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Horóm. salida<input type="number" step="any" value={editAsig.horometro_hasta ?? ''} onChange={e => setEditAsig({ ...editAsig, horometro_hasta: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} /></label>
                  <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Observaciones<input value={editAsig.observaciones || ''} onChange={e => setEditAsig({ ...editAsig, observaciones: e.target.value })} style={{ padding: '8px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} /></label>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button onClick={handleGuardarAsigEdit} style={{ background: '#7ea4e8', color: '#000', border: 'none', padding: '9px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar</button>
                  <button onClick={() => setEditAsig(null)} style={{ background: '#505a5e', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={handleEliminarAsig} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', cursor: 'pointer', marginLeft: 'auto' }}>Eliminar</button>
                </div>
              </div>
            )}
            <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead><tr style={{ color: '#b4bcc0', background: '#2b3133' }}><th style={{ padding: '8px' }}>Equipo</th><th style={{ padding: '8px' }}>Estado</th><th style={{ padding: '8px' }}>Obra</th><th style={{ padding: '8px' }}>Chofer</th><th style={{ padding: '8px' }}>Desde</th><th style={{ padding: '8px' }}>Hasta</th><th style={{ padding: '8px' }}>Horóm. entrada</th><th style={{ padding: '8px' }}>Horóm. salida</th><th style={{ padding: '8px' }}>Horas/km</th><th style={{ padding: '8px' }}>Litros</th><th style={{ padding: '8px' }}>Obs.</th>{esAdmin && <th style={{ padding: '8px' }}></th>}</tr></thead>
                <tbody>
                  {asignaciones.filter(a => (!filtroAsigEquipo || a.equipo === filtroAsigEquipo) && (!filtroAsigObra || a.obra === filtroAsigObra)).map(a => (
                    <tr key={a.id} style={{ borderTop: '1px solid #454e51' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#7ea4e8' }}>{a.equipo}</td>
                      <td style={{ padding: '8px', color: ESTADO_COLOR[a.estado] }}>{a.estado}</td>
                      <td style={{ padding: '8px' }}>{a.obra || '-'}</td>
                      <td style={{ padding: '8px' }}>{a.chofer || '-'}</td>
                      <td style={{ padding: '8px' }}>{a.desde}</td>
                      <td style={{ padding: '8px' }}>{a.hasta || 'Vigente'}</td>
                      <td style={{ padding: '8px' }}>{a.horometro_desde ?? '-'}</td>
                      <td style={{ padding: '8px' }}>{a.horometro_hasta ?? '-'}</td>
                      <td style={{ padding: '8px' }}>{datosEstadia(a).uso ?? '-'}</td>
                      <td style={{ padding: '8px' }}>{datosEstadia(a).litros} L{datosEstadia(a).uso > 0 ? ` · ${(datosEstadia(a).litros / datosEstadia(a).uso).toFixed(1)} L/u` : ''}</td>
                      <td style={{ padding: '8px', maxWidth: '200px' }}>{a.observaciones || ''}</td>
                      {esAdmin && <td style={{ padding: '8px' }}><button onClick={() => setEditAsig({ ...a })} style={{ background: 'transparent', border: '1px solid #7ea4e8', color: '#7ea4e8', borderRadius: '6px', cursor: 'pointer', padding: '3px 8px' }}>✏️</button></td>}
                    </tr>
                  ))}
                  {asignaciones.length === 0 && <tr><td colSpan="8" style={{ padding: '25px', textAlign: 'center', color: '#b4bcc0' }}>Todavía no hay registros. Los equipos figuran "En obra" hasta que registres un cambio.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {pestana === 'obras' && puede('obras') && (
        <div style={{ backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #3f62a8' }}>
          <h2 style={{ fontSize: '18px', color: '#7ea4e8', marginBottom: '15px' }}>🏗️ Gestión de Obras</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input placeholder="Nombre de la nueva obra" value={nombreObraNueva} onChange={e => setNombreObraNueva(e.target.value)} style={{ padding: '9px', background: '#2b3133', border: '1px solid #3f62a8', color: '#fff', borderRadius: '6px', minWidth: '220px' }} />
            <button onClick={handleAgregarObra} style={{ background: '#7ea4e8', color: '#000', border: 'none', padding: '9px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Agregar obra</button>
            <button onClick={() => exportarACSV(resumenObras.map(o => ({ Obra: o.nombre, Estado: o.activa ? 'Activa' : 'Fuera de obra', 'Equipos asignados': o.equiposAsignados, 'Litros consumidos': Math.round(o.litros * 10) / 10, 'Equipos que pasaron': o.equiposQuePasaron.join(', '), 'Choferes que pasaron': o.choferesQuePasaron.join(', ') })), 'historial_obras')} style={{ background: '#3f62a8', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', cursor: 'pointer' }}>📥 Descargar Excel</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead><tr style={{ borderBottom: '1px solid #3f62a8', color: '#b4bcc0', backgroundColor: '#2b3133' }}>
                <th style={{ padding: '10px' }}>Obra</th><th style={{ padding: '10px' }}>Estado</th><th style={{ padding: '10px' }}>Equipos asignados hoy</th><th style={{ padding: '10px' }}>Litros</th><th style={{ padding: '10px' }}>Equipos que pasaron</th><th style={{ padding: '10px' }}>Choferes que pasaron</th><th style={{ padding: '10px' }}></th>
              </tr></thead>
              <tbody>
                {resumenObras.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #454e51', opacity: o.activa ? 1 : 0.6 }}>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#7ea4e8' }}>{o.nombre}</td>
                    <td style={{ padding: '10px' }}>{o.activa ? '🟢 Activa' : '⚪ Fuera de obra'}</td>
                    <td style={{ padding: '10px' }}>{o.equiposAsignados}</td>
                    <td style={{ padding: '10px' }}>{o.litros.toFixed(0)} L</td>
                    <td style={{ padding: '10px', maxWidth: '240px', fontSize: '12px' }}>{o.equiposQuePasaron.join(', ') || '-'}</td>
                    <td style={{ padding: '10px', maxWidth: '240px', fontSize: '12px' }}>{o.choferesQuePasaron.join(', ') || '-'}</td>
                    <td style={{ padding: '10px' }}>{esAdmin && <button onClick={() => handleToggleObra(o)} style={{ background: 'transparent', border: '1px solid #7ea4e8', color: '#7ea4e8', borderRadius: '6px', cursor: 'pointer', padding: '4px 10px' }}>{o.activa ? 'Dar de baja' : 'Reactivar'}</button>}</td>
                  </tr>
                ))}
                {resumenObras.length === 0 && <tr><td colSpan="7" style={{ padding: '25px', textAlign: 'center', color: '#b4bcc0' }}>Todavía no hay obras. Ejecutá etapa2_A_usuarios_y_obras.sql en Supabase.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {pestana === 'excel' && puede('excel') && (
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#373f42', padding: '25px', borderRadius: '12px', border: '1px solid #1e3a8a' }}>
          <h2 style={{ fontSize: '18px', color: '#4da3e0', marginBottom: '10px' }}>Importar Planilla CSV</h2>
          <p style={{ fontSize: '13px', color: '#b4bcc0', marginBottom: '15px' }}>Subí tu archivo CSV exportado de Excel (delimitado por punto y coma):</p>
          <input type="file" accept=".csv" onChange={handleCargarArchivo} style={{ color: '#f8fafc', marginBottom: '15px', width: '100%' }} />
          {excelName && (
            <div style={{ background: '#2b3133', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
              <p style={{ fontSize: '14px', color: '#7ea4e8', margin: '0 0 10px 0' }}>Archivo: {excelName} ({Math.max(excelRows.length - 1, 0)} filas de datos)</p>
          <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '10px' }}>
            <input type="checkbox" checked={reemplazarTodo} onChange={e => setReemplazarTodo(e.target.checked)} /> Reemplazar todo el historial (evita duplicados si ya subiste este archivo)
          </label>
          {excelMsg && <p style={{ fontSize: '13px', color: '#4da3e0', margin: '0 0 10px 0' }}>{excelMsg}</p>}
              <button onClick={procesarYSubirLote} disabled={subiendoExcel} style={{ background: '#4da3e0', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                {subiendoExcel ? 'Sincronizando...' : 'Sincronizar Lote con Supabase'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
