import { StateMachine } from './StateMachine';
import { Context, Event, State } from './types';

export interface TransitionRecord {
  from: State;
  to: State;
  event: Event;
  date: Date;
}

export class WorkflowInstance<TContext extends Context = Context> extends StateMachine<TContext> {
  private history: TransitionRecord[] = [];

  public async trigger(event: Event): Promise<boolean> {
    const from = this.currentState;
    const success = await super.trigger(event);

    if (success) {
      this.history.push({
        from,
        to: this.currentState,
        event,
        date: new Date(),
      });
    }
    return success;
  }

  public getHistory(): TransitionRecord[] {
    return this.history;
  }

  public canTransition(event: Event): boolean {
    const transition = this.definition.getTransition(this.currentState, event);
    return !!transition;
  }

  public async saveState(): Promise<void> {
    console.log(`[WorkflowInstance] Persisting state '${this.currentState}' for context`, this.context);
    // save to elastic
  }
}
