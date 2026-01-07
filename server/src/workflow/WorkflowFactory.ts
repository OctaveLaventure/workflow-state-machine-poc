import { Draft } from '../entities/Draft';
import { WorkflowSchema, workflowSchemas } from '../entities/WorkflowSchema';
import { WorkflowDefinition } from './WorkflowDefinition';
import { WorkflowInstance } from './WorkflowInstance';
import { DraftContext, draftWorkflow } from './definitions/DraftWorkflow';

export class WorkflowFactory {
  static createDefinition(schema: WorkflowSchema): WorkflowDefinition<DraftContext> {
    const definition = new WorkflowDefinition<DraftContext>(schema.initialState);
    schema.states.forEach((state) => definition.addState(state));
    schema.transitions.forEach((t) => definition.addTransition(t.from, t.to, t.event));
    return definition;
  }

  static createInstance(draft: Draft): WorkflowInstance<DraftContext> {
    const context: DraftContext = { draft };
    
    let definition = draftWorkflow;
    if (draft.workflowId) {
      const schema = workflowSchemas.get(draft.workflowId);
      if (schema) {
        definition = this.createDefinition(schema);
      }
    }

    // We initialize the workflow with the draft's current status
    return new WorkflowInstance(definition, draft.status, context);
  }
}
