"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import Link from "next/link";

type FileNode = {
	path: string;
	isDirectory: boolean;
	size: number;
};

function fileNameFromPath(p: string) {
	const parts = p.split("/");
	return parts[parts.length - 1] || p;
}

function isTextFile(pathname: string) {
	return /(\.(js|ts|jsx|tsx|json|css|html|md)|Dockerfile|\.env)/i.test(pathname);
}

export default function ProjectEditorPage({ params }: { params: { id: string } }) {
	const projectId = params.id;
	const [files, setFiles] = useState<FileNode[]>([]);
	const [currentPath, setCurrentPath] = useState<string>("index.html");
	const [value, setValue] = useState<string>("");
	const [status, setStatus] = useState<string>("");
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const iframeRef = useRef<HTMLIFrameElement | null>(null);

	useEffect(() => {
		fetch(`/api/projects/${projectId}/files`).then(r => r.json()).then((d) => setFiles(d.files));
	}, [projectId]);

	useEffect(() => {
		if (!currentPath) return;
		fetch(`/api/projects/${projectId}/file?path=${encodeURIComponent(currentPath)}`).then(async (r) => {
			if (!r.ok) {
				setValue("");
				return;
			}
			const contentType = r.headers.get("content-type") || "";
			if (contentType.includes("application/json") && !isTextFile(currentPath)) {
				const buf = await r.arrayBuffer();
				setValue(new TextDecoder().decode(buf));
				return;
			}
			const text = await r.text();
			setValue(text);
		});
	}, [projectId, currentPath]);

	const language = useMemo(() => {
		if (currentPath.endsWith(".ts")) return "typescript";
		if (currentPath.endsWith(".tsx")) return "typescript";
		if (currentPath.endsWith(".js")) return "javascript";
		if (currentPath.endsWith(".jsx")) return "javascript";
		if (currentPath.endsWith(".css")) return "css";
		if (currentPath.endsWith(".json")) return "json";
		if (currentPath.endsWith(".html")) return "html";
		return "plaintext";
	}, [currentPath]);

	async function save() {
		setIsSaving(true);
		setStatus("Zapisywanie...");
		try {
			const res = await fetch(`/api/projects/${projectId}/file?path=${encodeURIComponent(currentPath)}`, {
				method: "PUT",
				body: new TextEncoder().encode(value)
			});
			if (!res.ok) throw new Error("Save failed");
			setStatus("Zapisano");
			// odśwież live preview
			if (iframeRef.current) {
				iframeRef.current.src = `/view/${projectId}/${encodeURIComponent(currentPath === "index.html" ? "" : currentPath)}`.replace(/\/+$/, "");
			}
		} catch {
			setStatus("Błąd zapisu");
		} finally {
			setIsSaving(false);
			setTimeout(() => setStatus(""), 1200);
		}
	}

	useEffect(() => {
		// Ustaw początkowy podgląd
		if (iframeRef.current) {
			iframeRef.current.src = `/view/${projectId}/`;
		}
	}, [projectId]);

	return (
		<div className="h-screen w-screen grid grid-rows-[56px_1fr]">
			<header className="h-14 border-b flex items-center px-4 gap-3">
				<Link className="text-sm text-blue-600" href="/">Replit Lite</Link>
				<div className="text-sm text-gray-500">Projekt: {projectId}</div>
				<div className="ml-auto flex items-center gap-2">
					<button onClick={save} disabled={isSaving} className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50">Zapisz</button>
					<span className="text-xs text-gray-500">{status}</span>
				</div>
			</header>
			<div className="grid grid-cols-[300px_1fr_40%] min-h-0">
				<aside className="border-r min-h-0 overflow-auto p-2">
					<div className="text-xs uppercase text-gray-500 mb-2">Pliki</div>
					<ul className="text-sm">
						{files.filter(f => !f.isDirectory).map((f) => (
							<li key={f.path}>
								<button onClick={() => setCurrentPath(f.path)} className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${currentPath === f.path ? "bg-gray-200" : ""}`}>
									{fileNameFromPath(f.path)}
								</button>
							</li>
						))}
					</ul>
				</aside>
				<section className="min-h-0 min-w-0">
					<Editor
						height="100%"
						language={language}
						value={value}
						onChange={(v) => setValue(v ?? "")}
						options={{ fontSize: 14, minimap: { enabled: false }, automaticLayout: true, scrollBeyondLastLine: false }}
					/>
				</section>
				<aside className="border-l min-h-0">
					<iframe ref={iframeRef} title="preview" className="w-full h-full bg-white" />
				</aside>
			</div>
		</div>
	);
}