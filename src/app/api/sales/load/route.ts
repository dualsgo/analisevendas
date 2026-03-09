
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const year = searchParams.get("year");
        const month = searchParams.get("month");

        if (!year || !month) {
            return NextResponse.json({ error: "Year and month required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db();

        // Regex for matching dates in dd/mm/yy or yyyy-mm-dd (depends on how dhEmi is stored)
        // DetailedSaleRow dhEmi is ISO but we might want to match by year-month
        const prefix = `${year}-${month.padStart(2, '0')}`;

        const sales = await db.collection("sales").find({
            dhEmi: { $regex: new RegExp(`^${prefix}`) }
        }).toArray();

        const saleKeys = sales.map(s => s.chave);

        const links = await db.collection("links").find({
            $or: [
                { chave_entrada: { $in: saleKeys } },
                { chave_saida: { $in: saleKeys } }
            ]
        }).toArray();

        return NextResponse.json({ sales, links });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
