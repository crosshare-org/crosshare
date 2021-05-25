import { AuthProps, requiresAuth } from '../components/AuthContext';
import Head from 'next/head';
import { DefaultTopBar } from '../components/TopBar';
import { CreateShareSection } from '../components/CreateShareSection';

export const DashboardPage = ({ user, constructorPage }: AuthProps) => {
  return (
    <>
      <Head>
        <title>Constructor Dashboard | Crosshare</title>
        <meta name="robots" content="noindex" />
      </Head>
      <DefaultTopBar dashboardSelected />
      <div css={{ margin: '1em' }}>
        <CreateShareSection halfWidth={false} />
      </div>
    </>
  );
};

export default requiresAuth(DashboardPage);
