import { Context, Event, MachineDefinition, State } from './types';

export class StateMachine<TContext extends Context = Context> {
  protected definition: MachineDefinition<TContext>;
  protected currentState: State;
  protected context: TContext;

  constructor(
    definition: MachineDefinition<TContext>,
    initialState: State | undefined,
    context: TContext
  ) {
    this.definition = definition;
    this.context = context;
    this.currentState = initialState || definition.getInitialState();
  }

  public getCurrentState(): State {
    return this.currentState;
  }

  public getContext(): TContext {
    return this.context;
  }

  public async trigger(event: Event): Promise<boolean> {
    const transition = this.definition.getTransition(this.currentState, event);

    if (!transition) {
      console.warn(
        `No transition found from state '${this.currentState}' on event '${event}'`
      );
      return false;
    }

    // Check conditions
    if (transition.conditions) {
      for (const condition of transition.conditions) {
        const isValid = await condition(this.context);
        if (!isValid) {
          console.error(`Condition failed for transition '${event}'`);
          return false;
        }
      }
    }

    // Execute onExit of current state
    const currentStateDef = this.definition.getStateDefinition(this.currentState);
    if (currentStateDef?.onExit) {
      for (const hook of currentStateDef.onExit) {
        await hook(this.context);
      }
    }

    // Execute transition side effects
    if (transition.onTransition) {
      for (const effect of transition.onTransition) {
        await effect(this.context);
      }
    }

    // Update state
    const previousState = this.currentState;
    this.currentState = transition.to;

    // Execute onEnter of new state
    const newStateDef = this.definition.getStateDefinition(this.currentState);
    if (newStateDef?.onEnter) {
      for (const hook of newStateDef.onEnter) {
        await hook(this.context);
      }
    }

    console.log(
      `Transitioned from '${previousState}' to '${this.currentState}' on event '${event}'`
    );
    return true;
  }
}
