import { GetServerSideProps, GetStaticProps } from 'next';

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
    ssp.revalidate = 60 * 60;
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
