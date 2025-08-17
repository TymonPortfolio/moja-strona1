import { NextRequest, NextResponse } from "next/server";
import { readProjectFile } from "@/lib/storage";
import path from "path";

export async function GET(
	req: NextRequest,
	{ params }: { params: { id: string; slug?: string[] } }
) {
	const { id, slug } = params;
	const relPath = (slug && slug.length > 0 ? slug.join("/") : "index.html").replace(/^\/+/, "");
	try {
		const content = await readProjectFile(id, relPath);
		const ext = path.extname(relPath).toLowerCase();
		const mime = ext === ".html" ? "text/html; charset=utf-8"
			: ext === ".css" ? "text/css; charset=utf-8"
			: ext === ".js" ? "text/javascript; charset=utf-8"
			: ext === ".json" ? "application/json; charset=utf-8"
			: ext === ".svg" ? "image/svg+xml"
			: "application/octet-stream";
		const ab = new ArrayBuffer(content.length);
		new Uint8Array(ab).set(content);
		return new NextResponse(ab, { headers: { "content-type": mime } });
	} catch {
		// fallback do index.html dla SPA
		try {
			const indexContent = await readProjectFile(id, "index.html");
			const abIndex = new ArrayBuffer(indexContent.length);
			new Uint8Array(abIndex).set(indexContent);
			return new NextResponse(abIndex, { headers: { "content-type": "text/html; charset=utf-8" } });
		} catch {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
	}
}