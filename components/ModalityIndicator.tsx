import type { Modality } from "@/lib/types";

const META: Record<Modality, { label: string; icon: string }> = {
  voice: { label: "Voice call", icon: "▮ ▮▮▮ ▮" },
  "sms-low-literacy": { label: "SMS · plain", icon: "···" },
  "asl-video": { label: "ASL video relay", icon: "▶︎" },
  "voice-translated": { label: "Voice · translated", icon: "▮ ⇄ ▮" },
  tty: { label: "TTY", icon: "= =" },
};

export function ModalityIndicator({
  modality,
  language,
}: {
  modality: Modality;
  language?: string;
}) {
  const m = META[modality];
  return (
    <span className="inline-flex items-center gap-2 text-eyebrow">
      <span aria-hidden className="font-mono text-foreground/70">
        {m.icon}
      </span>
      <span>
        {m.label}
        {language && language !== "English" ? ` · ${language}` : ""}
      </span>
    </span>
  );
}
