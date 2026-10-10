/** HTTP destination and owner definition used to validate a file-field upload. */
export interface FileUploadContext {
  endpoint: string
  target: Record<string, unknown>
}

export function targetForFileUpload(
  context: FileUploadContext,
  fieldPath: string[],
): Record<string, unknown> {
  return { ...context.target, field_path: fieldPath }
}
