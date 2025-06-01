
export type IconName = 'docker' | 'imdb' | 'instagram' | 'microsoft-explorer' | 'premiere' | 'typescript' | 'whatsapp';

export const ICON_NAMES: IconName[] = ['docker', 'imdb', 'instagram', 'microsoft-explorer', 'premiere', 'typescript', 'whatsapp'];

export const ICON_PREFIX = 'test';

export function getIconClass(iconName: IconName): string {
    return `${ICON_PREFIX}-${iconName}`;
}
