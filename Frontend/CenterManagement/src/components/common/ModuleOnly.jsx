import { useAuth } from "../../context/useAuth";

/**
 * Renders `children` only when the module is enabled for the current center,
 * otherwise renders nothing. Unlike ModuleGuard this is meant for inline
 * affordances (an action button, a link) that must simply disappear — never a
 * full-page lock.
 */
export default function ModuleOnly({ moduleKey, children }) {
  const { hasModule } = useAuth();
  if (!hasModule(moduleKey)) return null;
  return children;
}
