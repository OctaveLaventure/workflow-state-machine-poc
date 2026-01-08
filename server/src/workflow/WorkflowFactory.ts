import { WorkflowSchema } from '../entities/WorkflowSchema';
import { Context } from './types';
import { WorkflowDefinition } from './WorkflowDefinition';
import { WorkflowInstance } from './WorkflowInstance';

export class WorkflowFactory {
  static createDefinition<TContext extends Context>(schema: WorkflowSchema): WorkflowDefinition<TContext> {
    const definition = new WorkflowDefinition<TContext>(schema.initialState);
    schema.states.forEach((state) => definition.addState(state));
    schema.transitions.forEach((t) => definition.addTransition(t.from, t.to, t.event));
    return definition;
  }

  static createInstance<TContext extends Context>(
    schema: WorkflowSchema | undefined,
    defaultDefinition: WorkflowDefinition<TContext> | undefined,
    currentState: string,
    context: TContext
  ): WorkflowInstance<TContext> {
    let definition = defaultDefinition;

    if (schema) {
      definition = this.createDefinition<TContext>(schema);
    }

    if (!definition) {
      throw new Error('No workflow definition provided');
    }

    return new WorkflowInstance(definition, currentState, context);
  }
}
