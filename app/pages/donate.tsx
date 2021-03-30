import Head from 'next/head';
import { Button } from '../components/Buttons';
import { ContactLinks } from '../components/ContactLinks';
import { Emoji } from '../components/Emoji';
import { DefaultTopBar } from '../components/TopBar';

export default function DonatePage() {
  return (
    <>
      <Head>
        <title>Donate | Crosshare Crossword Constructor and Puzzles</title>
      </Head>
      <DefaultTopBar />
      <div css={{ margin: '1em' }}>
        <h2>Contribute to Crosshare</h2>
        <p>
          Crosshare will always be <b>free</b> and <b>ad-free</b>. Your donation
          supports the continued development and hosting costs associated with
          running the site. Thank you!
        </p>
        <p>
          <form
            action="https://www.paypal.com/donate"
            method="post"
            target="_top"
          >
            <input
              type="hidden"
              name="hosted_button_id"
              value="4JV5YY5RJ4FAY"
            />
            <Button type="submit" text="Donate (via credit card / paypal)" />
          </form>
        </p>
        <p>
          We&apos;ll add your name to the list below - please comment with your
          donation if you&apos;d like to remain anonymous or use a specific
          name/message. Include your Crosshare username if you&apos;d like us to
          link to your page.
        </p>
        <p>
          <i>
            If you&apos;d like to donate but not via paypal, please contact us
            via <ContactLinks />.
          </i>
        </p>
        <p>
          Crosshare is run as a non-profit, but is not officially a 501c3 (yet).
          If you&apos;re able and willing to help us through the process of
          registering as a non-profit please get in touch!
        </p>
        <h2>
          Our Contributors <Emoji symbol="🥰" />
        </h2>
        <p>
          <i>
            Monthly contributions and contributions of $100 or more are in bold
          </i>
        </p>
        <ul>
          <li>
            <b>
              <a href="/pchow13">Philip Chow</a>
            </b>
          </li>
        </ul>
      </div>
    </>
  );
}
