import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';

export function Overview({ state }: { state: GuiState; navigate: (v: View) => void }) {
  return <h1 className="text-xl font-semibold">Overview — {state.routes.length} routes</h1>;
}
