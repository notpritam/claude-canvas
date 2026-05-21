import { useState } from "react";
import { useDiagramStore } from "../../stores/diagramStore";
import { api } from "../../lib/api";

export function SaveTemplateModal({ onClose }: { onClose: () => void }) {
  const diagram = useDiagramStore((s) => s.diagram);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!diagram) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.saveTemplate({
        slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
        name: name.trim(),
        description: description.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        diagram,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        onSubmit={submit}
        className="bg-canvas-panel border border-canvas-line rounded-lg p-5 w-[420px] space-y-3"
      >
        <h2 className="text-sm font-medium text-gray-100">Save as template</h2>
        <label className="block">
          <span className="text-xs text-gray-500">Slug</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auth-flow"
            required
            className="w-full mt-1 px-2 py-1.5 bg-canvas-bg border border-canvas-line rounded text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Auth flow with JWT"
            required
            className="w-full mt-1 px-2 py-1.5 bg-canvas-bg border border-canvas-line rounded text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Request/response between client and auth server"
            rows={3}
            className="w-full mt-1 px-2 py-1.5 bg-canvas-bg border border-canvas-line rounded text-sm resize-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">Tags (comma-separated)</span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="auth, request-response, sequence"
            className="w-full mt-1 px-2 py-1.5 bg-canvas-bg border border-canvas-line rounded text-sm"
          />
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded"
          >
            {submitting ? "Saving…" : "Save template"}
          </button>
        </div>
      </form>
    </div>
  );
}
