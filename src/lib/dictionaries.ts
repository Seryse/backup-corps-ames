import 'server-only';

const dictionaries: { [key: string]: () => Promise<any> } = {
  en: () => import('@/dictionaries/en.json').then((module) => module.default),
  fr: () => import('@/dictionaries/fr.json').then((module) => module.default),
  es: () => import('@/dictionaries/es.json').then((module) => module.default),
};

export const getDictionary = async (locale: string) => {
    const loader = dictionaries[locale] || dictionaries.fr;
    return loader();
};

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
