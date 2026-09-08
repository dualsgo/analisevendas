import { parseISO, format, getDay, getHours } from "date-fns";

function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const holidayCache = new Map<number, Set<string>>();

export function getBrazilianHolidays(year: number): Set<string> {
  if (holidayCache.has(year)) {
    return holidayCache.get(year)!;
  }

  const yStr = String(year);
  const holidays = new Set<string>([
    `${yStr}-01-01`, // Confraternização Universal
    `${yStr}-04-21`, // Tiradentes
    `${yStr}-05-01`, // Dia do Trabalhador
    `${yStr}-09-07`, // Independência do Brasil
    `${yStr}-10-12`, // Nossa Senhora Aparecida
    `${yStr}-11-02`, // Finados
    `${yStr}-11-15`, // Proclamação da República
    `${yStr}-11-20`, // Dia Nacional de Zumbi e da Consciência Negra
    `${yStr}-12-25`, // Natal
  ]);

  const easter = getEaster(year);
  const addDays = (d: Date, days: number): string => {
    const res = new Date(d.getTime());
    res.setUTCDate(res.getUTCDate() + days);
    return res.toISOString().slice(0, 10);
  };

  holidays.add(addDays(easter, -47)); // Terça-feira de Carnaval
  holidays.add(addDays(easter, -2));  // Sexta-feira Santa
  holidays.add(addDays(easter, 60));  // Corpus Christi

  holidayCache.set(year, holidays);
  return holidays;
}

/**
 * Checks if a given Date or date string (YYYY-MM-DD or ISO) is a Sunday or a Brazilian national holiday.
 */
export function isSundayOrHoliday(input: Date | string): boolean {
  if (!input) return false;

  let d: Date;
  let dateKey: string;

  if (typeof input === "string") {
    // If format is YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      dateKey = input;
      const parts = input.split("-").map(Number);
      // Construct local date at noon to avoid midnight timezone jumps
      d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    } else {
      d = parseISO(input);
      dateKey = format(d, "yyyy-MM-dd");
    }
  } else {
    d = input;
    dateKey = format(d, "yyyy-MM-dd");
  }

  if (isNaN(d.getTime())) return false;

  // 0 is Sunday in JS / date-fns getDay()
  if (getDay(d) === 0) return true;

  const year = d.getFullYear();
  return getBrazilianHolidays(year).has(dateKey);
}

export type ShiftKey = "manha" | "tarde" | "noite";

/**
 * Escala de turnos:
 *
 * Segunda a Sábado (10h00 às 22h00 - 12h totais / 240 min cada turno):
 * - Manhã: 10h00 às 14h00 (< 14:00)
 * - Tarde: 14h00 às 18h00 (>= 14:00 && < 18:00)
 * - Noite: 18h00 às 22h00 (>= 18:00)
 *
 * Domingos e Feriados (12h00 às 21h00 - 9h totais / 180 min cada turno):
 * - Manhã: 12h00 às 15h00 (< 15:00)
 * - Tarde: 15h00 às 18h00 (>= 15:00 && < 18:00)
 * - Noite: 18h00 às 21h00 (>= 18:00)
 */
export function getShiftForDate(dateInput: Date | string): ShiftKey {
  const d = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
  const isSpecial = isSundayOrHoliday(d);
  const h = getHours(d);

  if (isSpecial) {
    if (h < 15) return "manha";
    if (h < 18) return "tarde";
    return "noite";
  } else {
    if (h < 14) return "manha";
    if (h < 18) return "tarde";
    return "noite";
  }
}

export function getShiftLabels(mode: "consolidated" | "weekday" | "sunday_holiday" = "consolidated"): {
  manha: string;
  tarde: string;
  noite: string;
} {
  if (mode === "sunday_holiday") {
    return {
      manha: "Manhã (12h às 15h)",
      tarde: "Tarde (15h às 18h)",
      noite: "Noite (18h às 21h)",
    };
  }

  if (mode === "weekday") {
    return {
      manha: "Manhã (10h às 14h)",
      tarde: "Tarde (14h às 18h)",
      noite: "Noite (18h às 22h)",
    };
  }

  // Consolidated / General view
  return {
    manha: "Manhã (10h às 14h | Dom/Fer: 12h às 15h)",
    tarde: "Tarde (14h às 18h | Dom/Fer: 15h às 18h)",
    noite: "Noite (18h às 22h | Dom/Fer: 18h às 21h)",
  };
}

