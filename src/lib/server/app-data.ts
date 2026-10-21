import "server-only";
import { cache } from "react";
import { listSemesters, loadSnapshot, setActiveSemester } from "@/lib/db/repo";
import { getToday, requireUser } from "./session";

export interface SemesterListItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

/** Everything a signed-in screen needs, loaded once per request. */
export const getAppData = cache(async () => {
  const user = await requireUser();
  const [today, semesterList] = await Promise.all([getToday(), listSemesters(user.id)]);
  let activeId = user.activeSemesterId;
  if (!activeId && semesterList.length > 0) {
    activeId = semesterList[0].id;
    await setActiveSemester(user.id, activeId);
  }
  const snapshot = activeId ? await loadSnapshot(user.id, activeId) : null;
  return {
    user: { id: user.id, name: user.name, email: user.email },
    today,
    semesters: semesterList as SemesterListItem[],
    snapshot,
  };
});
