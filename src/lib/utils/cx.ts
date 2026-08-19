export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function selectionClassName(selected: boolean, hasSelection: boolean): string {
  return cx(selected && 'selected', hasSelection && !selected && 'dimmed');
}
