```python
# Let's write a small script to verify that our App.jsx string can be generated cleanly without issues.
code_header = "import React, { useState, useEffect } from 'react';"
print("Python interpreter ready. Preparing complete App.jsx code.")


```

```text
Python interpreter ready. Preparing complete App.jsx code.


```

const cargasFiltradas = todasLasCargas.filter(c => {
if (!c.Fecha) return true;
const matchAnio = filtroAnio ? c.Fecha.includes(filtroAnio) : true;
const matchMes = filtroMes ? c.Fecha.includes(`-${filtroMes}-`) || c.Fecha.includes(`/${filtroMes}/`) : true;
const matchDia = filtroDia ? c.Fecha.endsWith(`-${filtroDia}`) || c.Fecha.startsWith(`${filtroDia}/`) : true;
return matchAnio && matchMes && matchDia;
});

// Filtrado interactivo para el Dashboard (con soporte correcto para campo Hasta)
const cargasDashboardFiltradas = todasLasCargas.filter(c => {
if (!c.Fecha) return true;
const fechaCarga = c.Fecha.split('T')[0];
const anioCarga = fechaCarga.split('-')[0] || '';
const mesCarga = fechaCarga.split('-')[1] || '';

```
const matchAnio = dashAnio ? anioCarga === dashAnio : true;
const matchMes = dashMes ? mesCarga === dashMes || mesCarga === `0${dashMes}`.slice(-2) : true;
const matchObra = dashObra ? (c.Obra || '').toLowerCase().trim() === dashObra.toLowerCase().trim() : true;

let matchRango = true;
if (dashDesde && fechaCarga < dashDesde) matchRango = false;
if (dashHasta && fechaCarga > dashHasta) matchRango = false;

return matchAnio && matchMes && matchObra && matchRango;

```

});

// Consumo por máquina y rendimiento promedio
const consumoPorVehiculoDash = {};
const rendimientoPorVehiculoDash = {};

cargasDashboardFiltradas.forEach(c => {
const eq = c.Equipo || c['Destino / Equipo'];
if (eq && eq.trim() !== '') {
const eqUpper = eq.toUpperCase();
if (!eqUpper.includes('CISTERNA') && !eqUpper.includes('PLAASF') && !eqUpper.includes('PPL')) {
const litros = parseFloat(c['Litros Reales'] || c['Litros Indicados'] || 0);
consumoPorVehiculoDash[eq] = (consumoPorVehiculoDash[eq] || 0) + litros;

```
    const rendStr = c['Rendimiento (L/h o L/km)'] || '0';
    const rendVal = parseFloat(rendStr.toString().replace(',', '.')) || 0;
    if (rendVal > 0) {
      rendimientoPorVehiculoDash[eq] = rendimientoPorVehiculoDash[eq] ? (rendimientoPorVehiculoDash[eq] + rendVal) / 2 : rendVal;
    }
  }
}

```

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

```
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

```

});

return (
<div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding: '20px', fontFamily: 'sans-serif' }}>
<header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px', borderBottom: '1px solid #1e293b', paddingBottom: '15px' }}>

<h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>🚗 DA FRE - Gestión de Vehículos
<p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>Flota, Cisternas, Choferes y Mantenimiento Preventivo

<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
<button onClick={() => setPestana('dashboard')} style={{ background: pestana === 'dashboard' ? '#f59e0b' : '#1e293b', color: pestana === 'dashboard' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Dashboard
<button onClick={() => setPestana('historial')} style={{ background: pestana === 'historial' ? '#f59e0b' : '#1e293b', color: pestana === 'historial' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Historial y Filtros
<button onClick={() => setPestana('nueva_carga')} style={{ background: pestana === 'nueva_carga' ? '#f59e0b' : '#1e293b', color: pestana === 'nueva_carga' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Nueva Carga
<button onClick={() => setPestana('equipos')} style={{ background: pestana === 'equipos' ? '#f59e0b' : '#1e293b', color: pestana === 'equipos' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Equipos
<button onClick={() => setPestana('choferes')} style={{ background: pestana === 'choferes' ? '#f59e0b' : '#1e293b', color: pestana === 'choferes' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Choferes
<button onClick={() => setPestana('mantenimiento')} style={{ background: pestana === 'mantenimiento' ? '#f59e0b' : '#1e293b', color: pestana === 'mantenimiento' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Mantenimiento
<button onClick={() => setPestana('excel')} style={{ background: pestana === 'excel' ? '#38bdf8' : '#1e293b', color: pestana === 'excel' ? '#000' : '#f8fafc', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Excel / CSV



```
  {/* DASHBOARD */}
  {pestana === 'dashboard' && (
    <div>
      <h2 style={{ fontSize: '16px', marginBottom: '15px', color: '#cbd5e1' }}>Stock Actual en Cisternas (Litros Reales - Permite Negativos por Errores)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        {tanques.length > 0 ? (
          tanques.map(t => {
            const esNegativo = t.stock_real < 0;
            return (
              <div key={t.id} style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: `1px solid ${esNegativo ? '#ef4444' : '#334155'}` }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#38bdf8' }}>{t.nombre}</h3>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: esNegativo ? '#ef4444' : '#4ade80' }}>
                  {t.stock_real.toFixed(0)} Lts {esNegativo && '⚠️ (Déficit)'}
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '6px 0 0 0' }}>Capacidad Máxima: {t.capacidad} Lts</p>
                <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '6px', borderTop: '1px solid #334155', paddingTop: '6px' }}>
                  Entradas (Compras/Transf): +{t.totalEntradas.toFixed(0)} L<br/>
                  Salidas (Consumos/Transf): -{t.totalSalidas.toFixed(0)} L
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', backgroundColor: '#1e293b', borderRadius: '8px', color: '#94a3b8' }}>
            Calculando stock de cisternas...
          </div>
        )}
      </div>

      {/* Panel de Filtros Desplegables para los Gráficos */}
      <div style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Año</label>
          <select value={dashAnio} onChange={e => setDashAnio(e.target.value)} style={{ padding: '7px 10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }}>
            <option value="">Todos</option>
            {aniosDisponibles.map((a, i) => <option key={i} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Mes</label>
          <select value={dashMes} onChange={e => setDashMes(e.target.value)} style={{ padding: '7px 10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }}>
            <option value="">Todos</option>
            {mesesDisponibles.map((m, i) => <option key={i} value={m.num}>{m.nombre}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '3px' }}>Obra</label>
          <select value={dashObra} onChange={e => setDashObra(e.target.value)} style={{ padding: '7px 10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }}>
            <option value="">Todas</option>
            {obrasDisponibles.map((ob, i) => <option key={i} value={ob}>{ob}</option>)}
          </select>
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
            <p style={{ color: '#94a3b8', textAlign: 'center', margin: 0 }}>No hay consumos registrados para los filtros seleccionados.</p>
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
            <p style={{ color: '#94a3b8', textAlign: 'center', margin: 0 }}>No hay suficientes datos de rendimiento para los filtros seleccionados.</p>
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
          <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '5px' }}>Año</label>
          <select value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }}>
            <option value="">Todos</option>
            {aniosDisponibles.map((a, i) => <option key={i} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '5px' }}>Mes</label>
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }}>
            <option value="">Todos</option>
            {mesesDisponibles.map((m, i) => <option key={i} value={m.num}>{m.nombre}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '5px' }}>Día (Ej: 07)</label>
          <input type="text" placeholder="Todos" value={filtroDia} onChange={e => setFiltroDia(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', width: '80px' }} />
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
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#f59e0b' }}>{c['Litros Reales'] || c['Litros Indicados'] || 0} L</td>
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

```

);
}

```



```
