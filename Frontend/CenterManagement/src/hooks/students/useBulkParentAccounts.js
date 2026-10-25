import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { groupsService } from "../../services/groupsService";
import { studentsService } from "../../services/studentService";
import { useDebounce } from "./useDebounce";

/**
 * Drives the standalone "إنشاء حسابات أولياء الأمور" page: the filters, the
 * groups they can be applied to, and the bulk run itself.
 */
export function useBulkParentAccounts() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("true");
  const [skipAlreadyLinked, setSkipAlreadyLinked] = useState(false);

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");

  const resetFilters = () => {
    setSearch("");
    setGroup("");
    setStatus("true");
    setSkipAlreadyLinked(false);
  };

  const loadGroups = useCallback(async () => {
    try {
      setLoadingGroups(true);
      const result = await groupsService.getAllGroups();
      setGroups(result.data || []);
    } catch (err) {
      console.error(err);
      toast.error("فشل في تحميل المجموعات");
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  /**
   * Runs the bulk creation and keeps the three result buckets (created /
   * linked / skipped) for the report and the export.
   */
  const run = useCallback(async () => {
    try {
      setRunning(true);

      const response = await studentsService.bulkCreateParentAccounts({
        groupId: group || null,
        isActive: status === "" ? null : status === "true",
        search: debouncedSearch || null,
        skipAlreadyLinked,
      });

      if (response?.succeeded === false) {
        toast.error(response?.message || "تعذّر إنشاء الحسابات");
        return null;
      }

      const data = {
        created: response?.data?.created ?? [],
        linked: response?.data?.linked ?? [],
        skipped: response?.data?.skipped ?? [],
      };

      setResult(data);
      setMessage(response?.message || "");

      if (!data.created.length && !data.linked.length && !data.skipped.length) {
        toast("لا يوجد طلاب مطابقون للفلتر المختار");
      }

      return data;
    } catch (err) {
      toast.error(err?.response?.data?.message || "تعذّر إنشاء الحسابات");
      return null;
    } finally {
      setRunning(false);
    }
  }, [group, status, debouncedSearch, skipAlreadyLinked]);

  const clearResult = useCallback(() => {
    setResult(null);
    setMessage("");
  }, []);

  return {
    // filters
    search,
    setSearch,
    group,
    setGroup,
    status,
    setStatus,
    skipAlreadyLinked,
    setSkipAlreadyLinked,
    resetFilters,
    // data
    groups,
    loadingGroups,
    // run
    running,
    run,
    result,
    message,
    clearResult,
  };
}
