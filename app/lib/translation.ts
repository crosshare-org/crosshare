import type { I18n } from '@lingui/core';
import { en, es } from 'make-plural/plurals';
import { GetServerSideProps, GetStaticProps } from 'next';

export function initTranslation(i18n: I18n): void {
  i18n.loadLocaleData({
    en: { plurals: en },
    es: { plurals: es },
    pseudo: { plurals: en },
  });
}

export function withTranslation(gssp: GetServerSideProps): GetServerSideProps {
  return async (ctx) => {
    const ssp = await gssp(ctx);
    const locale = ctx.locale;
    if (!locale) {
      return ssp;
    }
    const translation = (await import(`../locales/${ctx.locale}/messages`))
      .messages;
    if ('props' in ssp) {
      return { ...ssp, props: { ...ssp.props, translation } };
    }
    return ssp;
  };
}

export function withStaticTranslation(gsp: GetStaticProps): GetStaticProps {
  return async (ctx) => {
    const ssp = await gsp(ctx);
    const locale = ctx.locale;
    if (!locale) {
      return ssp;
    }
    const translation = (await import(`../locales/${ctx.locale}/messages`))
      .messages;
    if ('props' in ssp) {
      return { ...ssp, props: { ...ssp.props, translation } };
    }
    return ssp;
  };
}
