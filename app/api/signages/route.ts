import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    module: "signages",
    message: "Signages API working",
  });
}

