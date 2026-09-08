"use client";

import React, { useMemo } from "react";
import { PeriodFilterConfig } from "@/lib/shift-comparison";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  ArrowRightLeft, 
  RotateCcw, 
  CalendarDays, 
  Check, 
  Sparkles, 
  ChevronDown,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ShiftComparisonSelectorProps {
  allDates: string[];
  configA: PeriodFilterConfig;
  configB: PeriodFilterConfig;
  onChangeA: (config: PeriodFilterConfig) => void;
  onChangeB: (config: PeriodFilterConfig) => void;
  resolvedDatesA: string[];
  resolvedDatesB: string[];
  onSwap: () => void;
  onReset: () => void;
}

const WEEKDAY_NAMES = [
  { day: 0, short: "Dom", full: "Domingo" },
  { day: 1, short: "Seg", full: "Segunda-feira" },
  { day: 2, short: "Ter", full: "Terça-feira" },
  { day: 3, short: "Qua", full: "Quarta-feira" },
  { day: 4, short: "Qui", full: "Quinta-feira" },
  { day: 5, short: "Sex", full: "Sexta-feira" },
  { day: 6, short: "Sáb", full: "Sábado" },
];

export function ShiftComparisonSelector({
  allDates,
  configA,
  configB,
  onChangeA,
  onChangeB,
  resolvedDatesA,
  resolvedDatesB,
  onSwap,
  onReset,
}: ShiftComparisonSelectorProps) {
  // Extract available distinct months (YYYY-MM)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    allDates.forEach((d) => {
      if (d.length >= 7) {
        monthsSet.add(d.substring(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [allDates]);

  // Quick Preset Helper
  const applyPreset = (presetType: "saturdays" | "sundays" | "weekends" | "weekdays" | "months") => {
    if (availableMonths.length >= 2) {
      const latestMonth = availableMonths[0];
      const prevMonth = availableMonths[1];

      if (presetType === "saturdays") {
        onChangeA({
          ...configA,
          month: latestMonth,
          weekdays: [6],
          useCustomDays: false,
          label: "Sábados de " + format(parseISO(`${latestMonth}-01`), "MMMM/yy", { locale: ptBR }),
        });
        onChangeB({
          ...configB,
          month: prevMonth,
          weekdays: [6],
          useCustomDays: false,
          label: "Sábados de " + format(parseISO(`${prevMonth}-01`), "MMMM/yy", { locale: ptBR }),
        });
      } else if (presetType === "sundays") {
        onChangeA({
          ...configA,
          month: latestMonth,
          weekdays: [0],
          useCustomDays: false,
          label: "Domingos de " + format(parseISO(`${latestMonth}-01`), "MMMM/yy", { locale: ptBR }),
        });
        onChangeB({
          ...configB,
          month: prevMonth,
          weekdays: [0],
          useCustomDays: false,
          label: "Domingos de " + format(parseISO(`${prevMonth}-01`), "MMMM/yy", { locale: ptBR }),
        });
      } else if (presetType === "weekends") {
        onChangeA({
          ...configA,
          month: latestMonth,
          weekdays: [0, 6],
          useCustomDays: false,
          label: "Fins de Semana (" + format(parseISO(`${latestMonth}-01`), "MMMM", { locale: ptBR }) + ")",
        });
        onChangeB({
          ...configB,
          month: prevMonth,
          weekdays: [0, 6],
          useCustomDays: false,
          label: "Fins de Semana (" + format(parseISO(`${prevMonth}-01`), "MMMM", { locale: ptBR }) + ")",
        });
      } else if (presetType === "weekdays") {
        onChangeA({
          ...configA,
          month: latestMonth,
          weekdays: [1, 2, 3, 4, 5],
          useCustomDays: false,
          label: "Dias Úteis (" + format(parseISO(`${latestMonth}-01`), "MMMM", { locale: ptBR }) + ")",
        });
        onChangeB({
          ...configB,
          month: latestMonth,
          weekdays: [0, 6],
          useCustomDays: false,
          label: "Fins de Semana (" + format(parseISO(`${latestMonth}-01`), "MMMM", { locale: ptBR }) + ")",
        });
      } else if (presetType === "months") {
        onChangeA({
          ...configA,
          month: latestMonth,
          weekdays: [],
          useCustomDays: false,
          label: format(parseISO(`${latestMonth}-01`), "MMMM/yyyy", { locale: ptBR }),
        });
        onChangeB({
          ...configB,
          month: prevMonth,
          weekdays: [],
          useCustomDays: false,
          label: format(parseISO(`${prevMonth}-01`), "MMMM/yyyy", { locale: ptBR }),
        });
      }
    } else {
      // Single month scenario
      const m = availableMonths[0] || "all";
      if (presetType === "weekdays") {
        onChangeA({
          ...configA,
          month: m,
          weekdays: [1, 2, 3, 4, 5],
          useCustomDays: false,
          label: "Segunda a Sexta",
        });
        onChangeB({
          ...configB,
          month: m,
          weekdays: [0, 6],
          useCustomDays: false,
          label: "Sábado e Domingo",
        });
      } else if (presetType === "saturdays") {
        onChangeA({
          ...configA,
          month: m,
          weekdays: [6],
          useCustomDays: false,
          label: "Sábados",
        });
        onChangeB({
          ...configB,
          month: m,
          weekdays: [0],
          useCustomDays: false,
          label: "Domingos",
        });
      }
    }
  };

  const renderPeriodPanel = (
    config: PeriodFilterConfig,
    onChange: (c: PeriodFilterConfig) => void,
    resolvedDates: string[],
    theme: "indigo" | "violet"
  ) => {
    const isIndigo = theme === "indigo";
    const bgHeader = isIndigo ? "bg-indigo-900 text-white" : "bg-violet-900 text-white";
    const borderAccent = isIndigo ? "border-indigo-200" : "border-violet-200";
    const badgeColor = isIndigo
      ? "bg-indigo-100 text-indigo-800 border-indigo-200"
      : "bg-violet-100 text-violet-800 border-violet-200";

    const toggleWeekday = (dayNum: number) => {
      const exists = config.weekdays.includes(dayNum);
      let nextWeekdays: number[];
      if (exists) {
        nextWeekdays = config.weekdays.filter((d) => d !== dayNum);
      } else {
        nextWeekdays = [...config.weekdays, dayNum].sort();
      }
      onChange({
        ...config,
        weekdays: nextWeekdays,
        useCustomDays: false,
      });
    };

    const setAllWeekdays = (days: number[]) => {
      onChange({
        ...config,
        weekdays: days,
        useCustomDays: false,
      });
    };

    const toggleCustomDay = (dateStr: string) => {
      const current = new Set(config.specificDates || resolvedDates);
      if (current.has(dateStr)) {
        current.delete(dateStr);
      } else {
        current.add(dateStr);
      }
      onChange({
        ...config,
        useCustomDays: true,
        specificDates: Array.from(current),
      });
    };

    return (
      <div className={cn("bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all", borderAccent)}>
        {/* Header do Painel */}
        <div className={cn("p-4 flex items-center justify-between", bgHeader)}>
          <div className="flex items-center gap-2.5">
            <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs", isIndigo ? "bg-indigo-500 text-white" : "bg-violet-500 text-white")}>
              {config.id}
            </span>
            <div>
              <h4 className="font-black text-sm uppercase tracking-tight">
                {config.id === "A" ? "Período A (Base Atual)" : "Período B (Comparado / Anterior)"}
              </h4>
              <p className="text-[11px] opacity-80 font-medium">
                {resolvedDates.length} {resolvedDates.length === 1 ? "dia selecionado" : "dias selecionados"}
              </p>
            </div>
          </div>

          <Badge className={cn("text-[10px] font-black uppercase shadow-none", badgeColor)}>
            Bloco {config.id}
          </Badge>
        </div>

        {/* Conteúdo de Configuração */}
        <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Seletor de Mês */}
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Mês de Referência:
              </label>
              <div className="relative">
                <select
                  value={config.month}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      month: e.target.value,
                      useCustomDays: false,
                      specificDates: undefined,
                    })
                  }
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">Todos os Meses ({allDates.length} dias totais)</option>
                  {availableMonths.map((m) => {
                    let labelMonth = m;
                    try {
                      labelMonth = format(parseISO(`${m}-01`), "MMMM 'de' yyyy", { locale: ptBR });
                      labelMonth = labelMonth.charAt(0).toUpperCase() + labelMonth.slice(1);
                    } catch {}
                    return (
                      <option key={m} value={m}>
                        {labelMonth}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Dias da Semana */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  Dias da Semana:
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setAllWeekdays([])}
                    className="text-[10px] font-bold text-indigo-600 hover:underline px-1"
                  >
                    Todos
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setAllWeekdays([6])}
                    className="text-[10px] font-bold text-indigo-600 hover:underline px-1"
                  >
                    Só Sáb
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setAllWeekdays([0])}
                    className="text-[10px] font-bold text-indigo-600 hover:underline px-1"
                  >
                    Só Dom
                  </button>
                </div>
              </div>

              {/* Botões dos 7 dias */}
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_NAMES.map(({ day, short }) => {
                  const isSelected =
                    config.weekdays.length === 0 || config.weekdays.includes(day);
                  const isExplicitSingle =
                    config.weekdays.length > 0 && config.weekdays.includes(day);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWeekday(day)}
                      title={WEEKDAY_NAMES[day].full}
                      className={cn(
                        "py-1.5 px-0.5 rounded-lg text-xs font-black transition-all border text-center flex flex-col items-center justify-center",
                        config.weekdays.length === 0
                          ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                          : isExplicitSingle
                          ? isIndigo
                            ? "bg-indigo-600 border-indigo-700 text-white shadow-sm"
                            : "bg-violet-600 border-violet-700 text-white shadow-sm"
                          : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100 opacity-60"
                      )}
                    >
                      <span>{short}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                {config.weekdays.length === 0
                  ? "Todos os dias da semana incluídos."
                  : config.weekdays.map((d) => WEEKDAY_NAMES[d].short).join(", ") + " selecionados."}
              </p>
            </div>

            {/* Alternar seleção de dias avulsos */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...config,
                      useCustomDays: !config.useCustomDays,
                      specificDates: !config.useCustomDays ? resolvedDates : undefined,
                    })
                  }
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>{config.useCustomDays ? "Ocultar dias avulsos" : "Personalizar dias avulsos"}</span>
                </button>
                {config.useCustomDays && (
                  <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Modo Manual Ativo
                  </span>
                )}
              </div>

              {/* Lista compacta de dias avulsos caso ativada */}
              {config.useCustomDays && (
                <div className="mt-2.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">
                    Clique para incluir ou excluir datas específicas:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {allDates
                      .filter((d) => (config.month === "all" ? true : d.startsWith(config.month)))
                      .map((dateStr) => {
                        const isChecked = (config.specificDates || resolvedDates).includes(dateStr);
                        return (
                          <button
                            key={dateStr}
                            type="button"
                            onClick={() => toggleCustomDay(dateStr)}
                            className={cn(
                              "text-[10px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1",
                              isChecked
                                ? isIndigo
                                  ? "bg-indigo-600 border-indigo-700 text-white"
                                  : "bg-violet-600 border-violet-700 text-white"
                                : "bg-white border-slate-200 text-slate-400 line-through opacity-60"
                            )}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5" />}
                            <span>{format(parseISO(dateStr), "dd/MM (EEE)", { locale: ptBR })}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rodapé do Painel com Resumo das Datas */}
          <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 -mx-4 -mb-4 p-3 rounded-b-2xl">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-500">Dias filtrados:</span>
              <span className="font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                {resolvedDates.length} dias
              </span>
            </div>
            {resolvedDates.length > 0 ? (
              <p className="text-[10px] text-slate-500 font-medium mt-1 truncate">
                {resolvedDates[0]} até {resolvedDates[resolvedDates.length - 1]}
              </p>
            ) : (
              <p className="text-[10px] text-rose-500 font-bold mt-1">
                Nenhum dia corresponde aos critérios do Período {config.id}.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
      {/* Header com Presets Globais e Ações */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
              Configurador de Comparação Avançada
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Defina os filtros de data para o Período A e B e compare o impacto nos turnos
          </p>
        </div>

        {/* Atalhos Rápidos (Presets) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset("saturdays")}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition-all shadow-2xs"
          >
            Sábados (A vs B)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("sundays")}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition-all shadow-2xs"
          >
            Domingos (A vs B)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("weekends")}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition-all shadow-2xs"
          >
            Finais de Semana
          </button>
          <button
            type="button"
            onClick={() => applyPreset("weekdays")}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition-all shadow-2xs"
          >
            Dias Úteis vs Fim de Semana
          </button>
          {availableMonths.length >= 2 && (
            <button
              type="button"
              onClick={() => applyPreset("months")}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition-all shadow-2xs"
            >
              Mês Completo (A vs B)
            </button>
          )}

          {/* Botão Trocar A e B */}
          <button
            type="button"
            onClick={onSwap}
            title="Inverter Período A e Período B"
            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-black rounded-lg border border-indigo-200 transition-all ml-1 flex items-center gap-1"
          >
            <ArrowRightLeft className="w-3 h-3" />
            <span>Inverter</span>
          </button>

          {/* Botão Reset */}
          <button
            type="button"
            onClick={onReset}
            title="Redefinir filtros de comparação"
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid com Painel A e Painel B */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderPeriodPanel(configA, onChangeA, resolvedDatesA, "indigo")}
        {renderPeriodPanel(configB, onChangeB, resolvedDatesB, "violet")}
      </div>
    </div>
  );
}
