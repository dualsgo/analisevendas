import { useState, useEffect, useMemo } from "react";
import { DetailedSaleRow, VinculoTroca, UploadHistoryItem } from "@/lib/types";
import { detectarAdicionaisSuspeitos, vincularTrocas as vincularTrocasUtils } from "@/lib/analysis-utils";
import { format, parseISO, min, max } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type ProcessingStatus = "idle" | "processing" | "analyzed" | "success";

export function useSalesProcessor() {
    const [parsedRows, setParsedRows] = useState<DetailedSaleRow[]>([]);
    const [vinculos, setVinculos] = useState<VinculoTroca[]>([]);
    const [status, setStatus] = useState<ProcessingStatus>("idle");
    const [history, setHistory] = useState<UploadHistoryItem[]>([]);
    const { toast } = useToast();

    // Load history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("ri_happy_upload_history");
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch (e) {
                console.error("Erro ao carregar histórico");
            }
        }
    }, []);

    // Session persistence: Load current session from sessionStorage
    useEffect(() => {
        const sessionData = sessionStorage.getItem("ri_happy_current_session");
        if (sessionData) {
            try {
                const { rows, links, currentStatus } = JSON.parse(sessionData);
                if (rows && rows.length > 0) {
                    setParsedRows(rows);
                    setVinculos(links || []);
                    setStatus(currentStatus || "success");
                }
            } catch (e) {
                console.error("Erro ao recuperar sessão");
            }
        }
    }, []);

    // Save to sessionStorage whenever state changes significantly
    useEffect(() => {
        if (status === "success" || status === "analyzed") {
            try {
                sessionStorage.setItem("ri_happy_current_session", JSON.stringify({
                    rows: parsedRows,
                    links: vinculos,
                    currentStatus: status
                }));
            } catch (e) {
                console.warn("Session storage quota exceeded - active session not saved");
            }
        } else if (status === "idle") {
            sessionStorage.removeItem("ri_happy_current_session");
        }
    }, [parsedRows, vinculos, status]);

    const processData = (rows: DetailedSaleRow[]) => {
        setStatus("processing");

        setTimeout(() => {
            try {
                const withSuspects = detectarAdicionaisSuspeitos(rows);
                const exchangeLinks = vincularTrocasUtils(withSuspects);

                setParsedRows(withSuspects);
                setVinculos(exchangeLinks || []);

                // Save to history
                addToHistory(withSuspects);

                setStatus("analyzed");
            } catch (error) {
                console.error("Erro ao processar dados:", error);
                setStatus("idle");
                toast({
                    title: "Erro no processamento",
                    description: "Não foi possível analisar os arquivos XML selecionados.",
                    variant: "destructive",
                });
            }
        }, 100);
    };

    const addToHistory = (rows: DetailedSaleRow[]) => {
        const saidas = rows.filter(r => r.tpNF === 1 && !r.is_cancelada);
        const dates = saidas.map(r => parseISO(r.dhEmi)).filter(d => !isNaN(d.getTime()));
        const periodStr = dates.length > 0 ?
            `${format(min(dates), "dd/MM/yy")} - ${format(max(dates), "dd/MM/yy")}` :
            "Período Indefinido";

        const newItem: UploadHistoryItem = {
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            periodo: periodStr,
            totalNotas: rows.length,
            valorTotal: saidas.reduce((acc, r) => acc + parseFloat(r.vNF), 0),
            data: rows
        };

        const updatedHistory = [newItem, ...history].slice(0, 5);
        setHistory(updatedHistory);
        
        // Strategy to handle QuotaExceededError in localStorage
        const attemptSave = (list: UploadHistoryItem[]) => {
            try {
                localStorage.setItem("ri_happy_upload_history", JSON.stringify(list));
                return true;
            } catch (e) {
                return false;
            }
        };

        if (!attemptSave(updatedHistory)) {
            // Plan B: Save only the most recent with full data, and others as metadata only
            const lightHistory = updatedHistory.map((item, idx) => 
                idx === 0 ? item : { ...item, data: [] }
            );
            
            if (!attemptSave(lightHistory)) {
                // Plan C: All items as metadata only (reopening will require re-upload)
                const metadataOnly = updatedHistory.map(item => ({ ...item, data: [] }));
                attemptSave(metadataOnly);
                console.warn("LocalStorage quota reached. History items saved as metadata only.");
            }
        }
    };

    const confirmDashboard = () => {
        setStatus("success");
    };

    const reset = () => {
        setParsedRows([]);
        setVinculos([]);
        setStatus("idle");
        sessionStorage.removeItem("ri_happy_current_session");
    };

    const reopenHistory = (item: UploadHistoryItem) => {
        if (!item.data || item.data.length === 0) {
            toast({
                title: "Dados não disponíveis",
                description: "O limite de armazenamento do navegador foi atingido e os detalhes deste upload não puderam ser recuperados. Por favor, anexe os arquivos novamente.",
                variant: "destructive"
            });
            return;
        }
        
        const processedRows = detectarAdicionaisSuspeitos(item.data);
        setParsedRows(item.data);
        setVinculos(vincularTrocasUtils(processedRows));
        setStatus("success");
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem("ri_happy_upload_history");
    };

    const fileStats = useMemo(() => {
        const total = parsedRows.length;
        const entradas = parsedRows.filter(r => (r.tpNF === 0 || r.is_devolucao) && !r.is_cancelada).length;
        const saidas = parsedRows.filter(r => r.tpNF === 1 && !r.is_devolucao && !r.is_cancelada).length;
        const canceladas = parsedRows.filter(r => r.is_cancelada).length;

        return { total, entradas, saidas, canceladas };
    }, [parsedRows]);

    return {
        parsedRows,
        vinculos,
        status,
        history,
        fileStats,
        processData,
        confirmDashboard,
        reset,
        reopenHistory,
        clearHistory
    };
}
