import { useAuth } from "../../context/useAuth";
import ModuleLocked from "./ModuleLocked";

/**
 * Renders `children` only when the module is enabled for the current center;
 * otherwise shows the locked page (no crash, no blank screen). Core/unknown
 * modules and platform users always pass.
 *
 * Staff use `hasModule` (role exemptions apply); a Student is still gated by
 * the center's bought modules via `hasCenterModule`, so deep-linking into a
 * disabled student-portal section shows the locked page instead of the data.
 */
export default function ModuleGuard({ moduleKey, children }) {
  const { hasModule, hasCenterModule, modulesLoaded, role } = useAuth();

  // Wait for the module list before deciding, so a refresh doesn't flash the
  // locked page before the sidebar settles.
  if (!modulesLoaded) return children;

  const allowed =
    role === "Student" ? hasCenterModule(moduleKey) : hasModule(moduleKey);

  if (allowed) return children;

  return <ModuleLocked moduleKey={moduleKey} />;
}
