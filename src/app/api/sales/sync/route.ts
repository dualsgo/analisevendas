export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(request: Request) {
    try {
        const { sales, links } = await request.json();

        if (!sales || !Array.isArray(sales)) {
            return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db();

        // 1. Sync Sales (Upsert by chave)
        if (sales.length > 0) {
            const salesCollection = db.collection("sales");

            // Use bulkWrite for efficiency
            const operations = sales.map((sale: any) => ({
                updateOne: {
                    filter: { chave: sale.chave },
                    update: { $set: sale },
                    upsert: true,
                },
            }));

            await salesCollection.bulkWrite(operations);
        }

        // 2. Sync Links (Upsert by specific combined ID if possible, or just insert)
        if (links && Array.isArray(links) && links.length > 0) {
            const linksCollection = db.collection("links");
            const linkOperations = links.map((link: any) => ({
                updateOne: {
                    filter: { chave_entrada: link.chave_entrada, chave_saida: link.chave_saida },
                    update: { $set: link },
                    upsert: true,
                },
            }));

            await linksCollection.bulkWrite(linkOperations);
        }

        return NextResponse.json({ success: true, count: sales.length });
    } catch (error: any) {
        console.error("Critical Sync Error:", {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        return NextResponse.json({
            error: "Erro no Servidor ao Sincronizar",
            details: error.message
        }, { status: 500 });
    }
}
