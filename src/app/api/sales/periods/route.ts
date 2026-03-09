export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db();

        // Aggregate unique months and years from dhEmi
        const periods = await db.collection("sales").aggregate([
            {
                $project: {
                    year: { $substr: ["$dhEmi", 0, 4] },
                    month: { $substr: ["$dhEmi", 5, 2] }
                }
            },
            {
                $group: {
                    _id: { year: "$year", month: "$month" }
                }
            },
            {
                $sort: { "_id.year": -1, "_id.month": -1 }
            }
        ]).toArray();

        return NextResponse.json({
            periods: periods.map(p => ({
                year: p._id.year,
                month: p._id.month
            })).filter(p => p.year && p.month)
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
