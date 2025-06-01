
export type IconName = 'instagram' | 'microsoft-explorer' | 'premiere' | 'typescript' | 'whatsapp';

export const ICON_NAMES: IconName[] = ['instagram', 'microsoft-explorer', 'premiere', 'typescript', 'whatsapp'];

export const ICON_PREFIX = 'icon';

export function getIconClass(iconName: IconName): string {
    return `${ICON_PREFIX}-${iconName}`;
}
