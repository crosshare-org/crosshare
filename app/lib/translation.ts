import { GetServerSideProps, GetStaticProps } from 'next';

export function withTranslation(gssp: GetServerSideProps): GetServerSideProps {
  return async (ctx) => {
    const ssp = await gssp(ctx);
    const locale = ctx.locale;
    if (!locale) {
      return ssp;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const translation =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (await import(`../locales/${ctx.locale}/messages`)).messages;
    if ('props' in ssp) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return { ...ssp, props: { ...(await ssp.props), translation } };
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const translation =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (await import(`../locales/${ctx.locale}/messages`)).messages;
    if ('props' in ssp) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return { ...ssp, props: { ...ssp.props, translation } };
    }
    return ssp;
  };
}
