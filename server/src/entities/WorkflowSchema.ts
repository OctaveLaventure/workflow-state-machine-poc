export interface SerializedTransition {
  from: string;
  to: string;
  event: string;
}

export interface WorkflowSchema {
  id: string;
  name: string;
  initialState: string;
  states: string[];
  transitions: SerializedTransition[];
}

// Mock database
export const workflowSchemas: Map<string, WorkflowSchema> = new Map();

export const saveWorkflowSchema = (schema: Omit<WorkflowSchema, 'id'>): WorkflowSchema => {
  const id = Math.random().toString(36).substring(7);
  const newSchema = { ...schema, id };
  workflowSchemas.set(id, newSchema);
  return newSchema;
};
