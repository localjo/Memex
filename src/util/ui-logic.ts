import fromPairs from 'lodash/fromPairs'
import { UILogic } from 'ui-logic-core'
import { UIElement } from 'ui-logic-react'

export type EventProcessor<Dependencies> = (
    args: EventProcessorArgs<Dependencies>,
) => EventProcessorResult
export interface EventProcessorArgs<Dependencies> {
    state: any
    event: { type: string; [key: string]: any }
    dependencies: Dependencies
}
export interface EventProcessorResult {
    updateState?: StateUpdates
    dispatch?: EventDispatch | EventDispatch[]
    actions?: EventDispatch | EventDispatch[]
}
export interface StateUpdates {
    [key: string]: any
}
export interface EventDispatch {
    type: string
    args?: { [key: string]: any }
}
export interface ActionMap {
    [key: string]: () => any
}

export function compositeEventProcessor<Dependencies = null>(processors: {
    [type: string]: EventProcessor<Dependencies>
}): EventProcessor<Dependencies> {
    return (args: EventProcessorArgs<Dependencies>) => {
        const processor = processors[args.event.type]
        if (!processor) {
            throw new Error(
                `No event processor found for event ${args.event.type}`,
            )
        }
        return processor(args)
    }
}

export function handleEvent<Dependencies = null>({
    eventProcessor,
    state,
    setState,
    props,
    event,
    dependencies,
    actions,
}: {
    eventProcessor: EventProcessor<Dependencies>
    state: { [key: string]: any }
    setState: (...args: any[]) => void
    props: { [prop: string]: any }
    event: EventDispatch
    dependencies: Dependencies
    actions: ActionMap
}) {
    const result = eventProcessor({ state, event, dependencies })
    if (result.updateState) {
        setState(result.updateState)
    }
    if (result.dispatch) {
        _doDispatch(props, result.dispatch, 'event')
    }
    if (result.actions) {
        _doDispatch(actions, result.actions, 'action')
    }
}

export function reactEventHandler<Dependencies extends object = null>(
    component,
    eventProcessor,
    {
        actions = {},
        dependencies = null,
    }: { actions?: ActionMap; dependencies?: Dependencies } = {},
) {
    return event => {
        handleEvent({
            eventProcessor,
            state: component.state,
            props: component.props,
            setState: component.setState.bind(component),
            event,
            actions,
            dependencies,
        })
    }
}

export function _doDispatch(
    handlers,
    dispatch: EventDispatch | EventDispatch[],
    type: string,
) {
    if (!(dispatch instanceof Array)) {
        dispatch = [dispatch]
    }

    for (const dispatched of dispatch) {
        const handler = handlers[dispatched.type]
        if (!handler) {
            console.error(
                `Dispatched ${type} without handler: ${dispatched.type}`,
            )
        }
        const args = dispatched.args ? Object.values(dispatched.args) : []
        handler(...args)
    }
}

export function fakeState(initial) {
    const state = { ...initial }
    const setState = updates => {
        Object.assign(state, updates)
    }
    return { state, setState }
}

export function fakeEventProps(eventNames) {
    const events = { log: [] }
    const props = fromPairs(
        eventNames.map(eventName => [
            eventName,
            (...args) => events.log.push({ event: eventName, args }),
        ]),
    )
    return { events, props }
}

export function setupUiLogicTest({
    inititalState,
    eventNames,
    eventProcessor,
}) {
    const { state, setState } = fakeState(inititalState)
    const { props, events } = fakeEventProps(eventNames)
    const trigger = reactEventHandler(
        { props, state, setState },
        eventProcessor,
    )
    return { state, setState, props, events, trigger }
}

// New

export abstract class StatefulUIElement<Props, State, Event> extends UIElement<
    Props,
    State,
    Event
> {
    constructor(props: Props, logic: UILogic<State, Event>) {
        super(props, { logic })
    }
}

export abstract class NavigationScreen<
    Props,
    State,
    Event
> extends StatefulUIElement<Props, State, Event> {
    constructor(props: Props, options: { logic: UILogic<State, Event> }) {
        super(props, options.logic)
    }
}
