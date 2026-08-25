import { createContext, useContext, useState, type ReactNode } from 'react';

interface DashboardPeriodValue {
  anio: number;
  mes: number;
  setPeriodo: (anio: number, mes: number) => void;
}

const DashboardPeriodContext = createContext<DashboardPeriodValue | null>(null);

export function DashboardPeriodProvider({ children }: { children: ReactNode }) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  return (
    <DashboardPeriodContext.Provider
      value={{
        anio,
        mes,
        setPeriodo: (nuevoAnio, nuevoMes) => {
          setAnio(nuevoAnio);
          setMes(nuevoMes);
        },
      }}
    >
      {children}
    </DashboardPeriodContext.Provider>
  );
}

export function useDashboardPeriod() {
  const ctx = useContext(DashboardPeriodContext);
  if (!ctx) throw new Error('useDashboardPeriod debe usarse dentro de <DashboardPeriodProvider>');
  return ctx;
}
