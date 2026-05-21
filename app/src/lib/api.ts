import type { Diagram, DiagramPreview, TemplateEntry } from "../types";

async function jsonRequest<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  listDiagrams: () => jsonRequest<DiagramPreview[]>("/api/diagrams"),
  loadDiagram: (id: string) => jsonRequest<Diagram>(`/api/diagrams/${encodeURIComponent(id)}`),
  saveDiagram: (diagram: Diagram) =>
    jsonRequest<{ ok: true; diagram: Diagram }>("/api/save", {
      method: "POST",
      body: JSON.stringify(diagram),
    }),
  listTemplates: () => jsonRequest<TemplateEntry[]>("/api/templates"),
  saveTemplate: (payload: {
    slug: string;
    name: string;
    description: string;
    tags: string[];
    diagram: Diagram;
  }) =>
    jsonRequest<TemplateEntry>("/api/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
