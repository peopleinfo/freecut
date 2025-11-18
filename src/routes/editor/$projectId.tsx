import { createFileRoute } from '@tanstack/react-router';
import { Editor } from '@/features/editor/components/editor';
import { getProject } from '@/lib/storage/indexeddb';
import { cleanupBlobUrls } from '@/features/preview/utils/media-resolver';

export const Route = createFileRoute('/editor/$projectId')({
  component: EditorPage,
  loader: async ({ params }) => {
    const project = await getProject(params.projectId);

    if (!project) {
      throw new Error(`Project not found: ${params.projectId}`);
    }

    return {
      project: {
        id: project.id,
        name: project.name,
        width: project.metadata.width,
        height: project.metadata.height,
        fps: project.metadata.fps,
        timeline: project.timeline,
      },
    };
  },
});

function EditorPage() {
  const { projectId } = Route.useParams();
  const { project } = Route.useLoaderData();

  return <Editor projectId={projectId} project={project} />;
}
