import { CourseDetailScreen } from "@/components/screens/CourseDetailScreen";

export default async function DemoCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseDetailScreen courseId={id} />;
}
