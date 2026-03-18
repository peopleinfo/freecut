import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Keep the current app entry flow on the projects page.
    throw redirect({ to: "/projects" });
  },
  component: () => null,
});
