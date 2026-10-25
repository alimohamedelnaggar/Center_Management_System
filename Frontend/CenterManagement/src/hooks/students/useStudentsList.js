import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { groupsService } from "../../services/groupsService";
import { connection, startConnection } from "../../services/signalr/studentHub";
import { studentsService } from "../../services/studentService";
import { useDebounce } from "./useDebounce";

const PAGE_SIZE = 10;


export function useStudentsList() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [group, setGroup] = useState("");
  const [status, setStatus] = useState(null);
  const [page, setPage] = useState(1);

  const [students, setStudents] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const [studentStats, setStudentStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    inactiveStudents: 0,
    newStudentsThisMonth: 0,
  });

  const [loadingStats, setLoadingStats] = useState(true);

  const resetFilters = () => {
    setSearch("");
    setGroup("");
    setStatus(null);
    setPage(1);
  };

  const loadGroups = useCallback(async () => {
    try {
      const result = await groupsService.getAllGroups();
      setGroups(result.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadStudents = useCallback(
    async (pageIndex = 1) => {
      try {
        setLoading(true);
        const result = await studentsService.getAllPaged({
          pageIndex,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
          groupId: group || null,
          isActive: status,
        });
        setStudents(result.data);
      } catch (err) {
         toast.error("فشل في تحميل بيانات الطلاب");
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, group, status],
  );
  const loadStudentStats = useCallback(async () => {
    try {
      setLoadingStats(true);

      const result = await studentsService.getStats();
      if (result?.succeeded) {
        setStudentStats(result.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("فشل في تحميل إحصائيات الطلاب");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, group, status]);

  useEffect(() => {
    loadStudents(page);
  }, [page, loadStudents]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    loadStudentStats();
  }, [loadStudentStats]);

  // Live updates via SignalR.
  useEffect(() => {
    startConnection();

    connection.on("StudentAdded", (student) => {
      setStudents((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: [student, ...prev.items],
          totalCount: prev.totalCount + 1,
        };
      });
      loadStudentStats();
    });

    connection.on("StudentUpdated", (student) => {
      setStudents((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((s) => (s.id === student.id ? student : s)),
        };
      });
    });

    connection.on("StudentStatusChanged", (studentId) => {
      setStudents((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((student) =>
            student.id === studentId
              ? { ...student, isActive: !student.isActive }
              : student,
          ),
        };
      });
      loadStudentStats();
    });

    return () => {
      connection.off("StudentAdded");
      connection.off("StudentUpdated");
      connection.off("StudentStatusChanged");
    };
  }, []);

  const handlePageChange = (newPage) => {
    if (!students || newPage < 1 || newPage > students.totalPages) return;
    setPage(newPage);
  };

  return {
    // filters
    search,
    setSearch,
    group,
    setGroup,
    status,
    setStatus,
    resetFilters,
    // pagination
    page,
    handlePageChange,
    // data
    students,
    setStudents,
    groups,
    loading,
    loadStudents,
    // stats
    studentStats,
    loadingStats,
    loadStudentStats,
  };
}
