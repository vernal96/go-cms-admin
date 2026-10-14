/** HTTP destination and owner definition used to validate a media-field upload. */
export interface FileUploadContext {
  endpoint: string
  target?: Record<string, unknown>
}

export function targetForFileUpload(
  context: FileUploadContext,
  fieldPath: string[],
): Record<string, unknown> | undefined {
  return context.target ? { ...context.target, field_path: fieldPath } : undefined
}
