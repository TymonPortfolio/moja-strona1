import { NextRequest, NextResponse } from "next/server";
import { deleteProjectFile, readProjectFile, writeProjectFile } from "@/lib/storage";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
	const url = new URL(req.url);
	const file = url.searchParams.get("path");
	if (!file) return NextResponse.json({ error: "Missing path" }, { status: 400 });
	try {
		const content = await readProjectFile(params.id, file);
		const ab = new ArrayBuffer(content.length);
		new Uint8Array(ab).set(content);
		return new NextResponse(ab);
	} catch {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
	const url = new URL(req.url);
	const file = url.searchParams.get("path");
	if (!file) return NextResponse.json({ error: "Missing path" }, { status: 400 });
	const content = await req.arrayBuffer();
	await writeProjectFile(params.id, file, Buffer.from(content));
	return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
	const url = new URL(req.url);
	const file = url.searchParams.get("path");
	if (!file) return NextResponse.json({ error: "Missing path" }, { status: 400 });
	await deleteProjectFile(params.id, file);
	return NextResponse.json({ ok: true });
}