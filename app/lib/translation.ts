import type { I18n } from '@lingui/core';
import { en, es } from 'make-plural/plurals';

import { messages as enMessages } from '../locales/en/messages';
import { messages as esMessages } from '../locales/es/messages';
import { messages as pseudoMessages } from '../locales/pseudo/messages';
import { GetServerSideProps } from 'next';

const localeMap: Record<string, Partial<typeof enMessages>> = {
  en: enMessages,
  es: esMessages,
  pseudo: pseudoMessages,
};

export function initTranslation(i18n: I18n): void {
  i18n.loadLocaleData({
    en: { plurals: en },
    es: { plurals: es },
    pseudo: { plurals: en },
  });
}

export function withTranslation(gssp: GetServerSideProps): GetServerSideProps {
  return async (ctx) => {
    const translation = (ctx.locale && localeMap[ctx.locale]) || null;
    const ssp = await gssp(ctx);
    if ('props' in ssp) {
      return { ...ssp, props: { ...ssp.props, translation } };
    }
    return ssp;
  };
}
