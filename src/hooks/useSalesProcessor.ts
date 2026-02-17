import { useState, useEffect, useMemo } from "react";
import { DetailedSaleRow, VinculoTroca, UploadHistoryItem } from "@/lib/types";
import { detectingAdicionaisSuspeitos, vincularTrocas } from "@/lib/analysis-utils"; // Adjust import if needed
// Note: original page.tsx imported detectingAdicionaisSuspeitos as detectingAdicionaisSuspeitos? No, it was detectingAdicionaisSuspeitos.
// Let me double check usage in page.tsx: import { detectarAdicionaisSuspeitos, vincularTrocas } from "@/lib/analysis-utils";
// Wait, detectingAdicionaisSuspeitos vs detectarAdicionaisSuspeitos. I should use what's in page.tsx.
// page.tsx line 9: import { detectarAdicionaisSuspeitos, vincularTrocas } from "@/lib/analysis-utils";

import { detectarAdicionaisSuspeitos, vincularTrocas as vincularTrocasUtils } from "@/lib/analysis-utils";
import { format, parseISO, min, max } from "date-fns";

type ProcessingStatus = "idle" | "processing" | "analyzed" | "success";

export function useSalesProcessor() {
    const [parsedRows, setParsedRows] = useState<DetailedSaleRow[]>([]);
    const [vinculos, setVinculos] = useState<VinculoTroca[]>([]);
    const [status, setStatus] = useState<ProcessingStatus>("idle");
    const [history, setHistory] = useState<UploadHistoryItem[]>([]);

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
            sessionStorage.setItem("ri_happy_current_session", JSON.stringify({
                rows: parsedRows,
                links: vinculos,
                currentStatus: status
            }));
        } else if (status === "idle") {
            sessionStorage.removeItem("ri_happy_current_session");
        }
    }, [parsedRows, vinculos, status]);

    const processData = (rows: DetailedSaleRow[]) => {
        setStatus("processing");

        // Using a tiny timeout just to allow UI to update to "processing" state before heavy lifting
        // But removing the long 1500ms delay.
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
                setStatus("idle"); // or error state
                alert("Ocorreu um erro ao processar os arquivos.");
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
        localStorage.setItem("ri_happy_upload_history", JSON.stringify(updatedHistory));
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
        const processedRows = detectarAdicionaisSuspeitos(item.data);
        setParsedRows(item.data); // item.data might already be processed if saved that way, but reprocessing ensures consistency
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
