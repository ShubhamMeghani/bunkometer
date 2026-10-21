import { notFound } from "next/navigation";
import { CourseDetailScreen } from "@/components/screens/CourseDetailScreen";
import { getAppData } from "@/lib/server/app-data";

/** A course that doesn't exist or isn't the user's answers 404 (SPEC R3). */
export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAppData();
  if (!data.snapshot?.courses.some((c) => c.id === id)) notFound();
  return <CourseDetailScreen courseId={id} />;
}
