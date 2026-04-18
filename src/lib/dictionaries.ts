const dictionaries: { [key: string]: () => Promise<any> } = {
  en: () => import('@/dictionaries/en').then((module) => module.default),
  fr: () => import('@/dictionaries/fr').then((module) => module.default),
  es: () => import('@/dictionaries/es').then((module) => module.default),
};

export const getDictionary = async (locale: string) => {
    const loader = dictionaries[locale] || dictionaries.fr;
    return loader();
};

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
