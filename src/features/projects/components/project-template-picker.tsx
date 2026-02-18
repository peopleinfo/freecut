import { PROJECT_TEMPLATES, getAspectRatio, type ProjectTemplate } from '../utils/validation';

interface ProjectTemplatePickerProps {
  onSelectTemplate: (template: ProjectTemplate) => void;
  selectedTemplateId?: string;
}

export function ProjectTemplatePicker({
  onSelectTemplate,
  selectedTemplateId,
}: ProjectTemplatePickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {PROJECT_TEMPLATES.map((template) => {
        const isSelected = selectedTemplateId === template.id;
        const aspectRatio = getAspectRatio(template.width, template.height);
        const resolution = `${template.width}×${template.height}`;

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelectTemplate(template)}
            className={`group relative flex flex-col gap-3 p-4 panel-bg border rounded-lg transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 ${
              isSelected
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border'
            }`}
          >
            {/* Silhouette Container */}
            <div className="relative h-24 bg-secondary/30 rounded overflow-hidden flex items-center justify-center">
              {/* Aspect Ratio Silhouette */}
              <div
                className={`bg-primary/20 border-2 border-dashed rounded-sm ${
                  isSelected ? 'border-primary' : 'border-primary/40'
                }`}
                style={{
                  aspectRatio: `${template.width} / ${template.height}`,
                  height: '100%',
                  maxWidth: '100%',
                }}
              />
            </div>

            {/* Template Info */}
            <div className="flex-1 text-left">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {template.platform}
              </p>
              <h3 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors mt-1">
                {template.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-2">
                {resolution}
                <span className="mx-1">•</span>
                {aspectRatio}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
