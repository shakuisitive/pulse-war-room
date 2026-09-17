export type ParsedPostMortemDraft = {
  summary: string;
  timelineNarrative: string;
  rootCause: string;
  contributingFactors: string;
  lessonsLearned: string;
};

const SECTION_ALIASES: Record<keyof ParsedPostMortemDraft, RegExp[]> = {
  summary: [/executive summary/i, /^summary$/i, /^overview$/i],
  timelineNarrative: [/detailed timeline/i, /^timeline$/i, /timeline narrative/i],
  rootCause: [/root cause/i],
  contributingFactors: [/contributing factors/i],
  lessonsLearned: [/lessons learned/i, /action items/i],
};

function matchSection(header: string): keyof ParsedPostMortemDraft | null {
  const normalized = header.trim();

  for (const [key, patterns] of Object.entries(SECTION_ALIASES) as Array<
    [keyof ParsedPostMortemDraft, RegExp[]]
  >) {
    if (patterns.some((pattern) => pattern.test(normalized))) {
      return key;
    }
  }

  return null;
}

export function parsePostMortemDraft(draft: string): ParsedPostMortemDraft {
  const result: ParsedPostMortemDraft = {
    summary: "",
    timelineNarrative: "",
    rootCause: "",
    contributingFactors: "",
    lessonsLearned: "",
  };

  const lines = draft.split(/\r?\n/);
  let current: keyof ParsedPostMortemDraft | null = null;
  const buffers: Record<keyof ParsedPostMortemDraft, string[]> = {
    summary: [],
    timelineNarrative: [],
    rootCause: [],
    contributingFactors: [],
    lessonsLearned: [],
  };

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,3}\s+(.+)$/);

    if (headerMatch) {
      current = matchSection(headerMatch[1] ?? "");
      continue;
    }

    if (current) {
      buffers[current].push(line);
    } else if (!result.summary && line.trim()) {
      buffers.summary.push(line);
    }
  }

  for (const key of Object.keys(result) as Array<keyof ParsedPostMortemDraft>) {
    result[key] = buffers[key].join("\n").trim();
  }

  if (!result.summary && draft.trim()) {
    result.summary = draft.trim().slice(0, 2000);
  }

  return result;
}
