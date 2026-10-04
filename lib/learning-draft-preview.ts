export type DraftPreview = { title: string | null; html: string | null; text: string | null };

/** Extract only known display fields. HTML must still pass through LearningContent sanitization. */
export function learningDraftPreview(payloadJson: string): DraftPreview {
  const empty: DraftPreview = { title: null, html: null, text: null };
  try {
    const data: unknown = JSON.parse(payloadJson);
    if (!data || typeof data !== "object" || Array.isArray(data)) return empty;
    const fields = data as Record<string, unknown>;
    const string = (keys: string[]) => {
      for (const key of keys) if (typeof fields[key] === "string" && fields[key].trim()) return fields[key] as string;
      return null;
    };
    return { title: string(["title", "question", "front"]), html: string(["answerHtml"]), text: string(["answer", "content", "back", "sampleAnswer"]) };
  } catch { return empty; }
}
