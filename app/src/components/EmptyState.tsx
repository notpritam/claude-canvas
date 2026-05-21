export function EmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 mx-auto rounded-full bg-canvas-panel border border-canvas-line flex items-center justify-center mb-4">
          <span className="text-gray-500 text-xl">◇</span>
        </div>
        <p className="text-gray-500 text-sm">
          No diagram selected. Use <code className="text-gray-300">/visualize</code> in Claude Code to render one.
        </p>
      </div>
    </div>
  );
}
