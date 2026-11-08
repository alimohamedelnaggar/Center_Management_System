import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import { MODULES } from "../constants/modules";
import { messageTemplateService } from "../services/messageTemplateService";

const LOAD_ERROR = "تعذر تحميل قوالب الرسائل";

/**
 * Turns the backend list into the `{ key: body }` map the WhatsApp link
 * builders expect.
 */
export function buildTemplateBodyMap(templates) {
  const map = {};

  for (const template of templates || []) {
    if (template?.key && typeof template.body === "string") {
      map[template.key] = template.body;
    }
  }

  return map;
}

/**
 * Loads the center's WhatsApp templates from the backend.
 *
 * Every WhatsApp screen uses this hook, so all of them build their message from
 * the same saved body — editing a template changes the attendance, exam-result
 * and overdue reminders at once.
 */
export function useMessageTemplates({ enabled = true } = {}) {
  const { accessToken, hasModule } = useAuth();

  // The endpoints are module-gated, so a center without WhatsApp must not fire
  // a request from a page that merely contains a WhatsApp button. When the
  // module list has not loaded yet `hasModule` fails open (same as the UI).
  const moduleEnabled =
    typeof hasModule === "function" ? hasModule(MODULES.WHATSAPP) : true;
  const allowed = enabled && moduleEnabled && Boolean(accessToken);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const activeRef = useRef(true);

  const load = useCallback(async () => {
    if (!allowed) return [];

    setLoading(true);
    setError(null);

    try {
      const response = await messageTemplateService.list();

      if (response?.succeeded === false) {
        if (activeRef.current) setError(response?.message || LOAD_ERROR);
        return [];
      }

      const items = Array.isArray(response?.data) ? response.data : [];

      if (activeRef.current) setTemplates(items);
      return items;
    } catch (err) {
      if (activeRef.current) {
        setError(err?.response?.data?.message || LOAD_ERROR);
      }
      return [];
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    activeRef.current = true;
    load();

    return () => {
      activeRef.current = false;
    };
  }, [load]);

  const bodies = useMemo(() => buildTemplateBodyMap(templates), [templates]);

  return {
    templates,
    bodies,
    loading,
    error,
    reload: load,
    setTemplates,
  };
}
