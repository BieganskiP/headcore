import type { GuiState } from '../lib/types';
import type { View } from '../lib/router';

export function InspectorView({ route }: { state: GuiState; route?: string; navigate: (v: View) => void }) {
  return <h1 className="text-xl font-semibold">Inspector {route ?? ''}</h1>;
}
