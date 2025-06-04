
export type IconName = 'explorer' | 'instagram' | 'premiere' | 'typescript' | 'whatsapp' | 'docker' | 'imdb';

export const ICON_NAMES: IconName[] = ['explorer', 'instagram', 'premiere', 'typescript', 'whatsapp', 'docker', 'imdb'];

export const ICON_PREFIX = 'icono';

export function getIconClass(iconName: IconName): string {
    return `${ICON_PREFIX}-${iconName}`;
}
