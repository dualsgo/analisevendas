"use client";

export interface EscalaItem {
  colaborador: string;
  data: string; // YYYY-MM-DD
  posicao: string; // P1, P2, P3, DIG, ESTQ, FOLGA, etc.
}

export interface EscalaStore {
  exportedAt?: string;
  importedAt: string;
  filename?: string;
  escalas: EscalaItem[];
  aliases: Record<string, string>; // Maps sales vendor name -> schedule vendor name (or vice versa)
}

export interface PositionGoalConfig {
  P1: number;
  P2: number;
  P3: number;
  DIG: number;
  DEFAULT: number;
}

export const DEFAULT_POSITION_METAS: PositionGoalConfig = {
  P1: 1.60,
  P2: 1.55,
  P3: 1.80,
  DIG: 1.75,
  DEFAULT: 1.75
};

export const POSITION_NAMES: Record<string, string> = {
  P1: "P1 — Caixa",
  P2: "P2 — Porta",
  P3: "P3 — Salão",
  DIG: "DIG — Digital / Retirada",
  DEFAULT: "Geral / Padrão"
};

const LOCAL_STORAGE_KEY = "analisevendas_escala_store";
const METAS_LOCAL_STORAGE_KEY = "analisevendas_escala_metas";

export function loadSavedPositionMetas(): PositionGoalConfig {
  if (typeof window === "undefined") return DEFAULT_POSITION_METAS;
  try {
    const raw = localStorage.getItem(METAS_LOCAL_STORAGE_KEY);
    if (!raw) return DEFAULT_POSITION_METAS;
    return { ...DEFAULT_POSITION_METAS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_POSITION_METAS;
  }
}

export function savePositionMetas(metas: PositionGoalConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(METAS_LOCAL_STORAGE_KEY, JSON.stringify(metas));
  } catch (e) {
    console.error("Failed to save position metas", e);
  }
}

/**
 * Normalizes vendor/collaborator name for case and whitespace insensitive comparison
 */
export function normalizeName(name: string): string {
  if (!name) return "";
  return name.trim().toUpperCase().replace(/\s+/g, " ");
}

/**
 * Parses imported JSON from rhescala. Supports:
 * 1. Dedicated export format `{ system: "rhescala", escalas: [...] }`
 * 2. Flat array format `[ { colaborador, data, posicao } ]`
 * 3. Full rhescala backup JSON `{ employees: [...] }`
 */
export function parseEscalaJson(jsonContent: string): { escalas: EscalaItem[]; exportedAt?: string } {
  const parsed = JSON.parse(jsonContent);
  const escalas: EscalaItem[] = [];
  let exportedAt: string | undefined = undefined;

  if (parsed.exportedAt) {
    exportedAt = parsed.exportedAt;
  }

  // Format 1: Dedicated export format
  if (parsed.escalas && Array.isArray(parsed.escalas)) {
    parsed.escalas.forEach((item: any) => {
      if (item && item.colaborador && item.data && item.posicao) {
        escalas.push({
          colaborador: String(item.colaborador).trim(),
          data: String(item.data).trim(),
          posicao: String(item.posicao).trim().toUpperCase()
        });
      }
    });
    return { escalas, exportedAt };
  }

  // Format 2: Direct array format
  if (Array.isArray(parsed)) {
    parsed.forEach((item: any) => {
      if (item && item.colaborador && item.data && item.posicao) {
        escalas.push({
          colaborador: String(item.colaborador).trim(),
          data: String(item.data).trim(),
          posicao: String(item.posicao).trim().toUpperCase()
        });
      }
    });
    return { escalas, exportedAt };
  }

  // Format 3: Full rhescala backup format ({ employees: [...] })
  if (parsed.employees && Array.isArray(parsed.employees)) {
    parsed.employees.forEach((emp: any) => {
      if (!emp || !emp.name || emp.status === 'inactive' || emp.isHidden) return;

      const empName = String(emp.name).trim();
      const keysSet = new Set<string>();

      if (emp.shifts) Object.keys(emp.shifts).forEach(k => keysSet.add(k));
      if (emp.tacticalPositions) Object.keys(emp.tacticalPositions).forEach(k => keysSet.add(k));

      keysSet.forEach(mKey => {
        const parts = mKey.split('-');
        if (parts.length !== 2) return;

        const shiftsArr = emp.shifts?.[mKey] || [];
        const tactArr = emp.tacticalPositions?.[mKey] || [];
        const maxDays = Math.max(shiftsArr.length, tactArr.length);

        for (let d = 1; d <= maxDays; d++) {
          const idx = d - 1;
          const dayStr = String(d).padStart(2, '0');
          const fullDate = `${mKey}-${dayStr}`;

          const tactPos = tactArr[idx];
          const shiftVal = shiftsArr[idx];

          let pos = (tactPos && typeof tactPos === 'string' && tactPos.trim()) 
            ? tactPos.trim().toUpperCase() 
            : (shiftVal && typeof shiftVal === 'string' && shiftVal.trim() ? shiftVal.trim().toUpperCase() : 'NONE');

          escalas.push({
            colaborador: empName,
            data: fullDate,
            posicao: pos
          });
        }
      });
    });

    return { escalas, exportedAt: new Date().toISOString() };
  }

  throw new Error("Formato de arquivo inválido. Certifique-se de exportar o arquivo JSON do RH Escala.");
}

/**
 * Load saved schedule store from localStorage
 */
export function loadSavedEscalaStore(): EscalaStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load saved escala store", e);
    return null;
  }
}

/**
 * Save schedule store to localStorage
 */
export function saveEscalaStore(store: EscalaStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error("Failed to save escala store to localStorage", e);
  }
}

/**
 * Clear saved schedule store from localStorage
 */
export function clearEscalaStore(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_STORAGE_KEY);
}

/**
 * Helper to find position for collaborator and date (taking aliases and name variations into account)
 */
export function getPosicaoForColaboradorAndDate(
  escalas: EscalaItem[],
  colabName: string,
  dateStr: string,
  aliases: Record<string, string> = {}
): string | null {
  if (!escalas || escalas.length === 0 || !colabName || !dateStr) return null;

  const normTargetColab = normalizeName(colabName);
  const aliasMappedName = aliases[colabName] || aliases[normTargetColab];
  const targetNameToMatch = aliasMappedName ? normalizeName(aliasMappedName) : normTargetColab;

  const match = escalas.find(e => {
    if (e.data !== dateStr) return false;
    const normName = normalizeName(e.colaborador);
    if (normName === targetNameToMatch) return true;
    
    // Fuzzy check for first name matching if exact match fails
    const targetFirst = targetNameToMatch.split(" ")[0];
    const itemFirst = normName.split(" ")[0];
    return targetFirst && itemFirst && targetFirst === itemFirst && targetFirst.length >= 3;
  });

  return match ? match.posicao : null;
}
