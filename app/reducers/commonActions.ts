import { Key } from '../lib/types';

export interface PuzzleAction {
  type: string;
}

export interface KeypressAction extends PuzzleAction {
  type: 'KEYPRESS';
  key: Key;
}
export function isKeypressAction(
  action: PuzzleAction
): action is KeypressAction {
  return action.type === 'KEYPRESS';
}
