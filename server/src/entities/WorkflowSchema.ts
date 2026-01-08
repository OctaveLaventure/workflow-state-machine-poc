export interface ActionConfig {
  type: string;
  params?: any;
  mode: 'sync' | 'async';
}

export interface ConditionConfig {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value: any;
}

export interface SerializedState {
  name: string;
  onEnter?: ActionConfig[];
  onExit?: ActionConfig[];
}

export interface SerializedTransition {
  from: string;
  to: string;
  event: string;
  actions?: ActionConfig[];
  conditions?: ConditionConfig[];
}

export interface WorkflowSchema {
  id: string;
  name: string;
  initialState: string;
  states: SerializedState[];
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
