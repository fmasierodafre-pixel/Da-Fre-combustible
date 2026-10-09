import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Fuel, Truck, AlertTriangle, FileSpreadsheet, PlusCircle, RefreshCw } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [tanques, setTanques] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTanques();
  }, []);

  async function fetchTanques() {
    setLoading(true);
    const { data, error } = await supabase.from('tanques').select('*');
    if (!error && data) {
      setTanques(data);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-amber-500 flex items-center gap-2">
            <Fuel className="w-8 h-8" /> DA FRE - Gestión de Flota y Combustibles
          </h1>
          <p className="text-slate-400 text-sm">Control de Cisternas y Cargas Diarias</p>
        </div>
        <button 
          onClick={fetchTanques} 
          className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-slate-300 flex items-center gap-2 text-sm">
          <RefreshCw className={w-4 h-4 ${loading ? 'animate-spin' : ''}} /> Actualizar
        </button>
      </header>

      {/* Tarjetas de Stock de Cisternas */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-slate-200">Stock de Cisternas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tanques.length > 0 ? (
            tanques.map((t) => (
              <div key={t.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg text-slate-100">{t.nombre}</h3>
                  <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full font-medium">
                    Factor: {t.factor_calibracion}
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-amber-400 mb-1">
                  {Number(t.stock_actual_l).toLocaleString('es-AR')} <span className="text-lg font-normal text-slate-400">L</span>
                </div>
                <p className="text-xs text-slate-400">Capacidad Total: {Number(t.capacidad_l).toLocaleString('es-AR')} L</p>
                
                {/* Barra de Progreso */}
                <div className="w-full bg-slate-700 h-2.5 rounded-full mt-4 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      (t.stock_actual_l / t.capacidad_l) < 0.25 ? 'bg-red-500' : 'bg-amber-500'
                    }`}
                    style={{ width: ${Math.min(Math.max((t.stock_actual_l / t.capacidad_l) * 100, 0), 100)}% }}
                  ></div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-8 text-slate-400">
              {loading ? 'Cargando cisternas desde Supabase...' : 'No se encontraron cisternas cargadas.'}
            </div>
          )}
        </div>
      </section>

      {/* Accesos Rápidos */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 flex items-center gap-4">
          <div className="bg-amber-500/20 p-4 rounded-lg text-amber-400">
            <PlusCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Nueva Carga Diaria</h3>
            <p className="text-sm text-slate-400">Registrar despacho de combustible a equipos o transferencias.</p>
          </div>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 flex items-center gap-4">
          <div className="bg-blue-500/20 p-4 rounded-lg text-blue-400">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Importar / Exportar Excel</h3>
            <p className="text-sm text-slate-400">Sincronización con archivos de flota y respaldos.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
