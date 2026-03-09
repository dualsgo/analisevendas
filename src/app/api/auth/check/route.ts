
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { key } = await request.json();
        const secret = process.env.APP_SECRET_KEY;

        if (!secret) {
            return NextResponse.json({ error: "Server secret not configured" }, { status: 500 });
        }

        if (key === secret) {
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
