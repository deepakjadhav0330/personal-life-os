interface PromptPreviewProps {
  prompt: string;
}

export function PromptPreview({ prompt }: PromptPreviewProps) {
  const charCount = prompt.length;

  return (
    <div className="flex flex-col gap-2">
      {/* Info banner */}
      <div className="glass-1 rounded-input px-3 py-2 text-[11px] text-content-muted border border-white/[0.06]">
        This is exactly what will be copied. Review it before proceeding — no data has been shared yet.
      </div>

      {/* Scrollable prompt text */}
      <div className="glass-1 rounded-card border border-white/[0.06] overflow-hidden">
        <pre className="p-4 text-[11px] text-content-secondary font-mono leading-relaxed overflow-auto max-h-72 whitespace-pre-wrap break-words">
          {prompt}
        </pre>
      </div>

      {/* Character count */}
      <p className="text-[10px] text-content-muted text-right">
        {charCount.toLocaleString()} characters
      </p>
    </div>
  );
}
