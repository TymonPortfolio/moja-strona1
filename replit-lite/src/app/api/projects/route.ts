import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/storage";

export async function GET() {
	const projects = await listProjects();
	return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
	const body = await req.json().catch(() => ({}));
	const name = typeof body?.name === "string" ? body.name : undefined;
	const templateKey = typeof body?.templateKey === "string" ? body.templateKey : undefined;
	const project = await createProject({ name, templateKey });
	return NextResponse.json({ project }, { status: 201 });
}