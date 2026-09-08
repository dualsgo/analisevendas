import { DetailedSaleRow } from "@/lib/types";
import { parseISO, format, getDay } from "date-fns";
import { getShiftForDate } from "@/lib/shift-utils";

export interface PeriodFilterConfig {
  id: "A" | "B";
  label: string;
  month: string; // "all" or "YYYY-MM"
  weekdays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday. Empty array means ALL.
  specificDates?: string[]; // If specified, overrides or refines date selection
  useCustomDays: boolean;
}

export interface SingleShiftMetrics {
  id: "manha" | "tarde" | "noite";
  nome: string;
  cupons: number;
  vNF: number;
  itens: number;
  desconto: number;
  cpf: number;
  vendedores: Set<string>;
  tkm: number;
  pa: number;
  pm: number;
  pDesconto: number;
  pCpf: number;
  tamanhoEq: number;
}

export interface PeriodShiftAggregation {
  datesCount: number;
  datesList: string[];
  totalSalesCount: number;
  shifts: {
    manha: SingleShiftMetrics;
    tarde: SingleShiftMetrics;
    noite: SingleShiftMetrics;
  };
  total: {
    cupons: number;
    vNF: number;
    itens: number;
    tkm: number;
    pa: number;
    pm: number;
    vendedoresCount: number;
  };
  employees: Record<
    string,
    {
      nome: string;
      manha: { cupons: number; vNF: number; itens: number; tkm: number; pa: number };
      tarde: { cupons: number; vNF: number; itens: number; tkm: number; pa: number };
      noite: { cupons: number; vNF: number; itens: number; tkm: number; pa: number };
      total: { cupons: number; vNF: number; itens: number; tkm: number; pa: number };
    }
  >;
}

export interface MetricVariation {
  valA: number;
  valB: number;
  diff: number; // A - B
  pct: number; // ((A - B) / B) * 100
  isPositive: boolean;
  isNeutral: boolean;
}

export interface ShiftComparisonResult {
  periodA: PeriodShiftAggregation;
  periodB: PeriodShiftAggregation;
  shifts: {
    manha: {
      vNF: MetricVariation;
      cupons: MetricVariation;
      tkm: MetricVariation;
      pa: MetricVariation;
      itens: MetricVariation;
    };
    tarde: {
      vNF: MetricVariation;
      cupons: MetricVariation;
      tkm: MetricVariation;
      pa: MetricVariation;
      itens: MetricVariation;
    };
    noite: {
      vNF: MetricVariation;
      cupons: MetricVariation;
      tkm: MetricVariation;
      pa: MetricVariation;
      itens: MetricVariation;
    };
  };
  total: {
    vNF: MetricVariation;
    cupons: MetricVariation;
    tkm: MetricVariation;
    pa: MetricVariation;
    itens: MetricVariation;
  };
  employeeComparison: Array<{
    nome: string;
    totalVNF: MetricVariation;
    totalCupons: MetricVariation;
    totalTkm: MetricVariation;
    totalPa: MetricVariation;
    byShift: {
      manha: { vNF: MetricVariation; cupons: MetricVariation; tkm: MetricVariation; pa: MetricVariation };
      tarde: { vNF: MetricVariation; cupons: MetricVariation; tkm: MetricVariation; pa: MetricVariation };
      noite: { vNF: MetricVariation; cupons: MetricVariation; tkm: MetricVariation; pa: MetricVariation };
    };
  }>;
}

/**
 * Filter available dates based on PeriodFilterConfig
 */
export function resolvePeriodDates(allDates: string[], config: PeriodFilterConfig): string[] {
  if (config.useCustomDays && config.specificDates && config.specificDates.length > 0) {
    return allDates.filter((d) => config.specificDates?.includes(d));
  }

  return allDates.filter((dStr) => {
    // Check Month filter
    if (config.month !== "all") {
      if (!dStr.startsWith(config.month)) return false;
    }

    // Check Weekdays filter
    if (config.weekdays.length > 0) {
      try {
        const d = parseISO(dStr);
        const dayOfWeek = getDay(d);
        if (!config.weekdays.includes(dayOfWeek)) return false;
      } catch {
        return false;
      }
    }

    return true;
  });
}

/**
 * Compute variation between value A and value B
 * Formula: ((A - B) / B) * 100
 */
export function computeVariation(valA: number, valB: number): MetricVariation {
  const diff = valA - valB;
  let pct = 0;
  if (valB > 0) {
    pct = (diff / valB) * 100;
  } else if (valA > 0) {
    pct = 100; // 100% growth from zero baseline
  } else {
    pct = 0;
  }

  return {
    valA,
    valB,
    diff,
    pct,
    isPositive: diff > 0.0001,
    isNeutral: Math.abs(diff) <= 0.0001,
  };
}

/**
 * Aggregate shift performance metrics for a specific set of dates
 */
export function aggregatePeriodShiftData(
  sales: DetailedSaleRow[],
  targetDates: Set<string>
): PeriodShiftAggregation {
  const shiftsRaw = {
    manha: {
      id: "manha" as const,
      nome: "Manhã",
      cupons: 0,
      vNF: 0,
      itens: 0,
      desconto: 0,
      cpf: 0,
      vendedores: new Set<string>(),
    },
    tarde: {
      id: "tarde" as const,
      nome: "Tarde",
      cupons: 0,
      vNF: 0,
      itens: 0,
      desconto: 0,
      cpf: 0,
      vendedores: new Set<string>(),
    },
    noite: {
      id: "noite" as const,
      nome: "Noite",
      cupons: 0,
      vNF: 0,
      itens: 0,
      desconto: 0,
      cpf: 0,
      vendedores: new Set<string>(),
    },
  };

  const employeesRaw: Record<
    string,
    {
      nome: string;
      manha: { cupons: number; vNF: number; itens: number };
      tarde: { cupons: number; vNF: number; itens: number };
      noite: { cupons: number; vNF: number; itens: number };
      total: { cupons: number; vNF: number; itens: number };
    }
  > = {};

  let totalSalesCount = 0;

  for (const s of sales) {
    if (!s.dhEmi) continue;
    let dStr: string;
    let d: Date;
    try {
      d = parseISO(s.dhEmi);
      dStr = format(d, "yyyy-MM-dd");
    } catch {
      continue;
    }

    if (!targetDates.has(dStr)) continue;

    totalSalesCount++;
    const turno = getShiftForDate(d);
    const bucket = shiftsRaw[turno];

    const vNF = parseFloat(s.vNF) || 0;
    const qItens = parseFloat(s.itens_qtd) || 0;
    const vDesc = parseFloat(s.desconto_total) || 0;

    bucket.cupons++;
    bucket.vNF += vNF;
    bucket.itens += qItens;
    if (vDesc > 0) bucket.desconto++;
    if (s.cpf_cnpj_dest) bucket.cpf++;

    const vend = s.vendedor || "DESCONHECIDO";
    if (vend && vend !== "COLABORADOR NÃO IDENTIFICADO") {
      bucket.vendedores.add(vend);

      if (!employeesRaw[vend]) {
        employeesRaw[vend] = {
          nome: vend,
          manha: { cupons: 0, vNF: 0, itens: 0 },
          tarde: { cupons: 0, vNF: 0, itens: 0 },
          noite: { cupons: 0, vNF: 0, itens: 0 },
          total: { cupons: 0, vNF: 0, itens: 0 },
        };
      }

      employeesRaw[vend][turno].cupons++;
      employeesRaw[vend][turno].vNF += vNF;
      employeesRaw[vend][turno].itens += qItens;

      employeesRaw[vend].total.cupons++;
      employeesRaw[vend].total.vNF += vNF;
      employeesRaw[vend].total.itens += qItens;
    }
  }

  const formatShift = (
    raw: typeof shiftsRaw.manha | typeof shiftsRaw.tarde | typeof shiftsRaw.noite
  ): SingleShiftMetrics => {
    const tkm = raw.cupons > 0 ? raw.vNF / raw.cupons : 0;
    const pa = raw.cupons > 0 ? raw.itens / raw.cupons : 0;
    const pm = raw.itens > 0 ? raw.vNF / raw.itens : 0;
    const pDesconto = raw.cupons > 0 ? (raw.desconto / raw.cupons) * 100 : 0;
    const pCpf = raw.cupons > 0 ? (raw.cpf / raw.cupons) * 100 : 0;

    return {
      ...raw,
      tkm,
      pa,
      pm,
      pDesconto,
      pCpf,
      tamanhoEq: raw.vendedores.size,
    };
  };

  const manha = formatShift(shiftsRaw.manha);
  const tarde = formatShift(shiftsRaw.tarde);
  const noite = formatShift(shiftsRaw.noite);

  const totalCupons = manha.cupons + tarde.cupons + noite.cupons;
  const totalVNF = manha.vNF + tarde.vNF + noite.vNF;
  const totalItens = manha.itens + tarde.itens + noite.itens;
  const allVends = new Set<string>([
    ...Array.from(manha.vendedores),
    ...Array.from(tarde.vendedores),
    ...Array.from(noite.vendedores),
  ]);

  const total = {
    cupons: totalCupons,
    vNF: totalVNF,
    itens: totalItens,
    tkm: totalCupons > 0 ? totalVNF / totalCupons : 0,
    pa: totalCupons > 0 ? totalItens / totalCupons : 0,
    pm: totalItens > 0 ? totalVNF / totalItens : 0,
    vendedoresCount: allVends.size,
  };

  const safeDiv = (n: number, d: number) => (d > 0 ? n / d : 0);
  const employees: PeriodShiftAggregation["employees"] = {};
  for (const [k, v] of Object.entries(employeesRaw)) {
    employees[k] = {
      nome: v.nome,
      manha: {
        ...v.manha,
        tkm: safeDiv(v.manha.vNF, v.manha.cupons),
        pa: safeDiv(v.manha.itens, v.manha.cupons),
      },
      tarde: {
        ...v.tarde,
        tkm: safeDiv(v.tarde.vNF, v.tarde.cupons),
        pa: safeDiv(v.tarde.itens, v.tarde.cupons),
      },
      noite: {
        ...v.noite,
        tkm: safeDiv(v.noite.vNF, v.noite.cupons),
        pa: safeDiv(v.noite.itens, v.noite.cupons),
      },
      total: {
        ...v.total,
        tkm: safeDiv(v.total.vNF, v.total.cupons),
        pa: safeDiv(v.total.itens, v.total.cupons),
      },
    };
  }

  return {
    datesCount: targetDates.size,
    datesList: Array.from(targetDates).sort(),
    totalSalesCount,
    shifts: { manha, tarde, noite },
    total,
    employees,
  };
}

/**
 * Compare Period A against Period B
 */
export function comparePeriods(
  periodA: PeriodShiftAggregation,
  periodB: PeriodShiftAggregation
): ShiftComparisonResult {
  const compareShift = (sKey: "manha" | "tarde" | "noite") => {
    const sA = periodA.shifts[sKey];
    const sB = periodB.shifts[sKey];
    return {
      vNF: computeVariation(sA.vNF, sB.vNF),
      cupons: computeVariation(sA.cupons, sB.cupons),
      tkm: computeVariation(sA.tkm, sB.tkm),
      pa: computeVariation(sA.pa, sB.pa),
      itens: computeVariation(sA.itens, sB.itens),
    };
  };

  const total = {
    vNF: computeVariation(periodA.total.vNF, periodB.total.vNF),
    cupons: computeVariation(periodA.total.cupons, periodB.total.cupons),
    tkm: computeVariation(periodA.total.tkm, periodB.total.tkm),
    pa: computeVariation(periodA.total.pa, periodB.total.pa),
    itens: computeVariation(periodA.total.itens, periodB.total.itens),
  };

  // Compare all employees present in either A or B
  const allEmpNames = Array.from(
    new Set([...Object.keys(periodA.employees), ...Object.keys(periodB.employees)])
  );

  const empComparison = allEmpNames.map((nome) => {
    const empA = periodA.employees[nome] || {
      manha: { cupons: 0, vNF: 0, itens: 0, tkm: 0, pa: 0 },
      tarde: { cupons: 0, vNF: 0, itens: 0, tkm: 0, pa: 0 },
      noite: { cupons: 0, vNF: 0, itens: 0, tkm: 0, pa: 0 },
      total: { cupons: 0, vNF: 0, itens: 0, tkm: 0, pa: 0 },
    };
    const empB = periodB.employees[nome] || {
      manha: { cupons: 0, vNF: 0, itens: 0, tkm: 0, pa: 0 },
      tarde: { cupons: 0, vNF: 0, itens: 0, tkm: 0, pa: 0 },
      noite: { cupons: 0, vNF: 0, itens: 0, tkm: 0, pa: 0 },
      total: { cupons: 0, vNF: 0, itens: 0, tkm: 0, pa: 0 },
    };

    const compShift = (sKey: "manha" | "tarde" | "noite") => ({
      vNF: computeVariation(empA[sKey].vNF, empB[sKey].vNF),
      cupons: computeVariation(empA[sKey].cupons, empB[sKey].cupons),
      tkm: computeVariation(empA[sKey].tkm, empB[sKey].tkm),
      pa: computeVariation(empA[sKey].pa, empB[sKey].pa),
    });

    return {
      nome,
      totalVNF: computeVariation(empA.total.vNF, empB.total.vNF),
      totalCupons: computeVariation(empA.total.cupons, empB.total.cupons),
      totalTkm: computeVariation(empA.total.tkm, empB.total.tkm),
      totalPa: computeVariation(empA.total.pa, empB.total.pa),
      byShift: {
        manha: compShift("manha"),
        tarde: compShift("tarde"),
        noite: compShift("noite"),
      },
    };
  });

  // Sort employees by highest total vNF in Period A
  empComparison.sort((a, b) => b.totalVNF.valA - a.totalVNF.valA);

  return {
    periodA,
    periodB,
    shifts: {
      manha: compareShift("manha"),
      tarde: compareShift("tarde"),
      noite: compareShift("noite"),
    },
    total,
    employeeComparison: empComparison,
  };
}
