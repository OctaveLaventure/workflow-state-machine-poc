import {
  ConditionValidator,
  Context,
  Event,
  SideEffect,
  State,
  StateDefinition,
  Transition,
} from './types';

export class WorkflowDefinition<TContext extends Context = Context> {
  private states: Map<State, StateDefinition<TContext>> = new Map();
  private transitions: Transition<TContext>[] = [];
  private initialState: State;

  constructor(initialState: State) {
    this.initialState = initialState;
    this.addState(initialState);
  }

  addState(name: State, definition?: Omit<StateDefinition<TContext>, 'name'>) {
    this.states.set(name, { name, ...definition });
    return this;
  }

  addTransition(
    from: State,
    to: State,
    event: Event,
    options?: {
      conditions?: ConditionValidator<TContext>[];
      onTransition?: SideEffect<TContext>[];
    }
  ) {
    // Ensure states exist
    if (!this.states.has(from)) this.addState(from);
    if (!this.states.has(to)) this.addState(to);

    this.transitions.push({
      from,
      to,
      event,
      conditions: options?.conditions || [],
      onTransition: options?.onTransition || [],
    });
    return this;
  }

  public getInitialState(): State {
    return this.initialState;
  }

  public getTransition(
    currentState: State,
    event: Event
  ): Transition<TContext> | undefined {
    return this.transitions.find(
      (t) => t.from === currentState && t.event === event
    );
  }

  public getTransitions(currentState: State): Transition<TContext>[] {
    return this.transitions.filter((t) => t.from === currentState);
  }

  public getStateDefinition(
    state: State
  ): StateDefinition<TContext> | undefined {
    return this.states.get(state);
  }
}
