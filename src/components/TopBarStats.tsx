import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Ban, 
  FileText 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileStats {
  total: number;
  entradas: number;
  saidas: number;
  canceladas: number;
}

interface TopBarStatsProps {
  stats: FileStats;
}

function StatItem({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2">
      <Icon className={cn("w-3.5 h-3.5", color)} />
      <span className={cn("text-xs font-extrabold font-headline", color)}>{value}</span>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

export function TopBarStats({ stats }: TopBarStatsProps) {
  return (
    <div className="hidden lg:flex items-center gap-2 bg-slate-100/70 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-slate-200/80 shadow-2xs mx-4">
      <StatItem icon={ArrowUpRight} label="Saídas" value={stats.saidas} color="text-emerald-600" />
      <div className="w-px h-3.5 bg-slate-200" />
      <StatItem icon={ArrowDownLeft} label="Entradas" value={stats.entradas} color="text-blue-600" />
      <div className="w-px h-3.5 bg-slate-200" />
      <StatItem icon={Ban} label="Canceladas" value={stats.canceladas} color="text-rose-500" />
      <div className="w-px h-3.5 bg-slate-200" />
      <div className="flex items-center gap-1.5 px-2 text-indigo-700">
         <FileText className="w-3.5 h-3.5 text-indigo-600" />
         <span className="text-xs font-extrabold font-headline">{stats.total} <span className="text-[10px] font-bold text-slate-500 uppercase">Total</span></span>
      </div>
    </div>
  );
}
