import { create } from "zustand";
import { devtools } from "zustand/middleware";

type AdminUiState = {
  selectedProjectId: string | null;
  isEditingHomepage: boolean;
  /** Resource id ("site" or a projectId) -> has unsaved changes. */
  dirtyResources: Record<string, boolean>;
  selectProject: (projectId: string | null) => void;
  setEditingHomepage: (editing: boolean) => void;
  setDirty: (resource: string, dirty: boolean) => void;
};

export const useAdminUiStore = create<AdminUiState>()(
  devtools(
    (set) => ({
      selectedProjectId: null,
      isEditingHomepage: false,
      dirtyResources: {},
      selectProject: (projectId) =>
        set(
          { selectedProjectId: projectId, isEditingHomepage: false },
          false,
          "admin-ui/select-project",
        ),
      setEditingHomepage: (editing) =>
        set(
          { isEditingHomepage: editing, selectedProjectId: null },
          false,
          "admin-ui/edit-homepage",
        ),
      setDirty: (resource, dirty) =>
        set(
          (state) => ({
            dirtyResources: { ...state.dirtyResources, [resource]: dirty },
          }),
          false,
          "admin-ui/set-dirty",
        ),
    }),
    { name: "admin-ui-store", enabled: process.env.NODE_ENV === "development" },
  ),
);

export function selectHasUnsavedChanges(state: AdminUiState): boolean {
  return Object.values(state.dirtyResources).some(Boolean);
}
