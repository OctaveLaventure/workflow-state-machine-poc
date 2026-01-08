import { ActionConfig, ConditionConfig, WorkflowSchema } from '../entities/WorkflowSchema';
import { ActionRegistry } from './ActionRegistry';
import { ConditionValidator, Context, SideEffect } from './types';
import { WorkflowDefinition } from './WorkflowDefinition';
import { WorkflowInstance } from './WorkflowInstance';

export class WorkflowFactory {
  // Helper to access nested properties: "user.role" -> ctx.user.role
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  // Helper to convert ConditionConfig[] -> ConditionValidator[]
  private static createConditions<TContext extends Context>(configs?: ConditionConfig[]): ConditionValidator<TContext>[] {
    if (!configs || configs.length === 0) return [];

    return configs.map((config) => {
      return (ctx: TContext) => {
        const actualValue = this.getNestedValue(ctx, config.field);

        switch (config.operator) {
          case 'eq': return actualValue == config.value;
          case 'neq': return actualValue != config.value;
          case 'gt': return actualValue > config.value;
          case 'gte': return actualValue >= config.value;
          case 'lt': return actualValue < config.value;
          case 'lte': return actualValue <= config.value;
          case 'contains': 
             return Array.isArray(actualValue) 
               ? actualValue.includes(config.value)
               : String(actualValue).includes(String(config.value));
          default:
             console.warn(`Unknown operator '${config.operator}'`);
             return false;
        }
      };
    });
  }

  // Helper to convert ActionConfig[] -> SideEffect[]
  private static createSideEffects<TContext extends Context>(configs?: ActionConfig[]): SideEffect<TContext>[] {
    if (!configs || configs.length === 0) return [];

    return configs.map((config) => {
      const actionFn = ActionRegistry[config.type];
      if (!actionFn) {
        console.warn(`Action type '${config.type}' not found in registry.`);
        return async () => {};
      }

      return async (ctx: TContext) => {
        if (config.mode === 'async') {
          // Fire and forget
          Promise.resolve(actionFn(ctx, config.params)).catch((err: any) =>
            console.error(`Async action '${config.type}' failed`, err)
          );
        } else {
          // Await completion
          await actionFn(ctx, config.params);
        }
      };
    });
  }

  static createDefinition<TContext extends Context>(schema: WorkflowSchema): WorkflowDefinition<TContext> {
    const definition = new WorkflowDefinition<TContext>(schema.initialState);

    schema.states.forEach((state) => {
      definition.addState(state.name, {
        onEnter: this.createSideEffects<TContext>(state.onEnter),
        onExit: this.createSideEffects<TContext>(state.onExit),
      });
    });

    schema.transitions.forEach((t) => {
      definition.addTransition(t.from, t.to, t.event, {
        conditions: this.createConditions<TContext>(t.conditions),
        onTransition: this.createSideEffects<TContext>(t.actions),
      });
    });

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
