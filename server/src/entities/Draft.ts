export interface Draft {
  id: string;
  title: string;
  content: string;
  status: string; // This corresponds to the workflow state
}

// Mock database
export const drafts: Map<string, Draft> = new Map();

export const createDraft = (title: string, content: string): Draft => {
  const id = Math.random().toString(36).substring(7);
  const draft: Draft = {
    id,
    title,
    content,
    status: 'CREATED', // Initial state
  };
  drafts.set(id, draft);
  return draft;
};
