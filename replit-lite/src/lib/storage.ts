import { promises as fs } from "fs";
import path from "path";
import { customAlphabet } from "nanoid";

export type ProjectMeta = {
  id: string;
  name: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type FileEntry = {
  path: string; // relative within project
  isDirectory: boolean;
  size: number;
};

const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const generateId = customAlphabet(ID_ALPHABET, 10);

export const DATA_ROOT = path.join(process.cwd(), "data", "projects");

function getProjectDir(projectId: string): string {
  return path.join(DATA_ROOT, projectId);
}

function getProjectMetaPath(projectId: string): string {
  return path.join(getProjectDir(projectId), "project.json");
}

function getFilesRoot(projectId: string): string {
  return path.join(getProjectDir(projectId), "files");
}

export async function ensureDataRoot(): Promise<void> {
  await fs.mkdir(DATA_ROOT, { recursive: true });
}

export function sanitizeRelativePath(relativePath: string): string {
  const normalized = path.posix.normalize(relativePath.replace(/\\/g, "/"));
  if (normalized.startsWith("..")) {
    throw new Error("Invalid path: path traversal is not allowed");
  }
  return normalized.replace(/^\/+/, "");
}

export function resolveProjectFilePath(projectId: string, relativePath: string): string {
  const safeRel = sanitizeRelativePath(relativePath);
  return path.join(getFilesRoot(projectId), safeRel);
}

export async function listProjects(): Promise<ProjectMeta[]> {
  await ensureDataRoot();
  let entries: string[] = [];
  try {
    entries = await fs.readdir(DATA_ROOT);
  } catch {
    return [];
  }
  const projects: ProjectMeta[] = [];
  for (const entry of entries) {
    const dir = path.join(DATA_ROOT, entry);
    try {
      const stat = await fs.stat(dir);
      if (!stat.isDirectory()) continue;
      const metaPath = getProjectMetaPath(entry);
      const metaRaw = await fs.readFile(metaPath, "utf8").catch(() => "");
      if (metaRaw) {
        const meta = JSON.parse(metaRaw) as ProjectMeta;
        projects.push(meta);
      }
    } catch {
      // ignore broken entries
    }
  }
  // sort by updatedAt desc
  projects.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return projects;
}

export async function readProjectMeta(projectId: string): Promise<ProjectMeta | null> {
  try {
    const raw = await fs.readFile(getProjectMetaPath(projectId), "utf8");
    return JSON.parse(raw) as ProjectMeta;
  } catch {
    return null;
  }
}

export async function writeProjectMeta(meta: ProjectMeta): Promise<void> {
  await ensureDataRoot();
  await fs.mkdir(getProjectDir(meta.id), { recursive: true });
  await fs.writeFile(getProjectMetaPath(meta.id), JSON.stringify(meta, null, 2), "utf8");
}

export async function deleteProject(projectId: string): Promise<void> {
  await fs.rm(getProjectDir(projectId), { recursive: true, force: true });
}

export const templates: Record<string, { name: string; files: Record<string, string> }> = {
  basic: {
    name: "Prosty HTML",
    files: {
      "index.html": `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Moja strona</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <h1>Witaj w Replit Lite</h1>
    <p>Edytuj ten plik w edytorze obok i zapisz, aby zobaczyć zmiany.</p>
    <button id="btn">Kliknij mnie</button>
    <script src="/script.js"></script>
  </body>
</html>`,
      "style.css": `body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;line-height:1.5;padding:2rem;background:#0b1020;color:#e6e9ef}h1{color:#8aadf4}button{background:#8bd5ca;color:#0b1020;border:none;padding:.6rem 1rem;border-radius:8px;cursor:pointer}button:hover{opacity:.9}`,
      "script.js": `document.getElementById('btn')?.addEventListener('click',()=>{alert('Działa!')});`
    }
  }
};

export async function createProject(options?: { name?: string; templateKey?: string }): Promise<ProjectMeta> {
  await ensureDataRoot();
  const id = generateId();
  const now = new Date().toISOString();
  const name = options?.name?.trim() || `Projekt ${id}`;
  const meta: ProjectMeta = { id, name, createdAt: now, updatedAt: now };
  const filesDir = getFilesRoot(id);
  await fs.mkdir(filesDir, { recursive: true });
  await writeProjectMeta(meta);
  const templateKey = options?.templateKey || "basic";
  const template = templates[templateKey] || templates.basic;
  // Write template files
  for (const [rel, content] of Object.entries(template.files)) {
    const full = path.join(filesDir, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, "utf8");
  }
  return meta;
}

export async function updateProjectUpdatedAt(projectId: string): Promise<void> {
  const meta = await readProjectMeta(projectId);
  if (!meta) return;
  meta.updatedAt = new Date().toISOString();
  await writeProjectMeta(meta);
}

async function listFilesRecursive(dir: string, baseDir: string): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relPath = path.relative(baseDir, fullPath);
    if (item.isDirectory()) {
      entries.push({ path: relPath, isDirectory: true, size: 0 });
      const children = await listFilesRecursive(fullPath, baseDir);
      entries.push(...children);
    } else if (item.isFile()) {
      const stat = await fs.stat(fullPath);
      entries.push({ path: relPath, isDirectory: false, size: stat.size });
    }
  }
  return entries;
}

export async function listProjectFiles(projectId: string): Promise<FileEntry[]> {
  const root = getFilesRoot(projectId);
  try {
    await fs.access(root);
  } catch {
    return [];
  }
  return listFilesRecursive(root, root);
}

export async function readProjectFile(projectId: string, relativePath: string): Promise<Buffer> {
  const fullPath = resolveProjectFilePath(projectId, relativePath);
  return fs.readFile(fullPath);
}

export async function writeProjectFile(projectId: string, relativePath: string, content: string | Buffer): Promise<void> {
  const fullPath = resolveProjectFilePath(projectId, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content);
  await updateProjectUpdatedAt(projectId);
}

export async function deleteProjectFile(projectId: string, relativePath: string): Promise<void> {
  const fullPath = resolveProjectFilePath(projectId, relativePath);
  await fs.rm(fullPath, { force: true, recursive: false });
  await updateProjectUpdatedAt(projectId);
}