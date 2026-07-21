import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';

export function ComponentsView({ state }: { state: GuiState; selected?: string; navigate: (v: View) => void }) {
  return <h1 className="text-xl font-semibold">Components — {state.registry.length} in registry</h1>;
}
