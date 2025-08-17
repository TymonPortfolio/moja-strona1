import { NextRequest, NextResponse } from "next/server";
import { listProjectFiles } from "@/lib/storage";

export async function GET(
	_req: NextRequest,
	{ params }: { params: { id: string } }
) {
	const { id } = params;
	const files = await listProjectFiles(id);
	return NextResponse.json({ files });
}