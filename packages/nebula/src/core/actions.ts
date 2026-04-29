export type NebulaActionType =
  | 'navigate'
  | 'mutation'
  | 'state_update'
  | 'toast';

export interface NebulaAction {
  id: string;
  trigger: 'onClick' | 'onSubmit' | 'onHover';
  type: NebulaActionType;
  payload: Record<string, any>;
}
