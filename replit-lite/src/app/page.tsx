"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
	const [projects, setProjects] = useState<Array<{ id: string; name: string; updatedAt: string }>>([]);
	const [creating, setCreating] = useState(false);
	const [name, setName] = useState("");

	async function refresh() {
		const res = await fetch("/api/projects");
		const data = await res.json();
		setProjects(data.projects || []);
	}

	useEffect(() => {
		refresh();
	}, []);

	async function create() {
		setCreating(true);
		const res = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
		setCreating(false);
		if (res.ok) {
			setName("");
			await refresh();
		}
	}

	return (
		<div className="min-h-screen p-6">
			<h1 className="text-2xl font-semibold mb-4">Replit Lite</h1>
			<div className="flex gap-2 mb-6">
				<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nazwa projektu (opcjonalnie)" className="border px-3 py-2 rounded w-80" />
				<button onClick={create} disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Nowy projekt</button>
			</div>
			<ul className="space-y-2">
				{projects.map((p) => (
					<li key={p.id} className="border rounded p-3 flex items-center">
						<div className="flex-1">
							<div className="font-medium">{p.name}</div>
							<div className="text-xs text-gray-500">Ostatnia aktualizacja: {new Date(p.updatedAt).toLocaleString()}</div>
						</div>
						<div className="flex gap-2">
							<Link className="px-3 py-1 rounded border" href={`/editor/${p.id}`}>Edytuj</Link>
							<Link className="px-3 py-1 rounded border" href={`/view/${p.id}/`} target="_blank">Podgląd</Link>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
