import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';

export function RoutesView({ state }: { state: GuiState; navigate: (v: View) => void }) {
  return <h1 className="text-xl font-semibold">Routes — {state.routes.length}</h1>;
}
