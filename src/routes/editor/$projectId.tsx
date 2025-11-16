import { createFileRoute } from '@tanstack/react-router';
import { Editor } from '@/features/editor/components/editor';

export const Route = createFileRoute('/editor/$projectId')({
  component: EditorPage,
  loader: async ({ params }) => {
    // TODO: Load project data for editor
    return {
      project: {
        id: params.projectId,
        name: 'Summer Vacation 2024',
        width: 1920,
        height: 1080,
        fps: 30,
      },
    };
  },
});

function EditorPage() {
  const { projectId } = Route.useParams();
  const { project } = Route.useLoaderData();

  return <Editor projectId={projectId} project={project} />;
}
