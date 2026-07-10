import { NextResponse } from "next/server";
import { getServerNavbarAuthState, guestNavbarState } from "@/lib/auth/navbar-state";

const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store",
    Pragma: "no-cache",
    Expires: "0",
};

export async function GET() {
    try {
        const state = await getServerNavbarAuthState();
        return NextResponse.json(state, {
            headers: noStoreHeaders,
        });
    } catch {
        return NextResponse.json(guestNavbarState, {
            headers: noStoreHeaders,
        });
    }
}
