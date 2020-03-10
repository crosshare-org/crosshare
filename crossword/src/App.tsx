import * as React from 'react';

import { Router, RouteComponentProps, Link } from "@reach/router";

import { PuzzleLoader } from './Puzzle';
// import {PuzzleBuilder} from './PuzzleBuilder';
import { Page, SquareTest } from './Page';

const NotFound = (_: RouteComponentProps) => {
  return <Page> not found :(</Page>;
}

const TermsOfService = (_: RouteComponentProps) => {
  return (
    <Page>
      <h2>Crosshare Terms of Service</h2>
      <p>1. Terms</p>
      <p>By accessing the website at https://crosshare.org, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site. The materials contained in this website are protected by applicable copyright and trademark law.</p>
      <p>2. Use License</p>
      <p>Permission is granted to temporarily download one copy of the materials (information or software) on Crosshare's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
      <p>- modify or copy the materials;</p>
      <p>- use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</p>
      <p>- attempt to decompile or reverse engineer any software contained on Crosshare's website;</p>
      <p>- remove any copyright or other proprietary notations from the materials; or</p>
      <p>- transfer the materials to another person or "mirror" the materials on any other server.</p>
      <p>This license shall automatically terminate if you violate any of these restrictions and may be terminated by Crosshare at any time. Upon terminating your viewing of these materials or upon the termination of this license, you must destroy any downloaded materials in your possession whether in electronic or printed format.</p>
      <p>3. Disclaimer</p>
      <p>The materials on Crosshare's website are provided on an 'as is' basis. Crosshare makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
      <p>Further, Crosshare does not warrant or make any representations concerning the accuracy, likely results, or reliability of the use of the materials on its website or otherwise relating to such materials or on any sites linked to this site.</p>
      <p>4. Limitations</p>
      <p>In no event shall Crosshare or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Crosshare's website, even if Crosshare or a Crosshare authorized representative has been notified orally or in writing of the possibility of such damage. Because some jurisdictions do not allow limitations on implied warranties, or limitations of liability for consequential or incidental damages, these limitations may not apply to you.</p>
      <p>5. Accuracy of materials</p>
      <p>The materials appearing on Crosshare's website could include technical, typographical, or photographic errors. Crosshare does not warrant that any of the materials on its website are accurate, complete or current. Crosshare may make changes to the materials contained on its website at any time without notice. However Crosshare does not make any commitment to update the materials.</p>
      <p>6. Links</p>
      <p>Crosshare has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Crosshare of the site. Use of any such linked website is at the user's own risk.</p>
      <p>7. Modifications</p>
      <p>Crosshare may revise these terms of service for its website at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.</p>
      <p>8. Governing Law</p>
      <p>These terms and conditions are governed by and construed in accordance with the laws of New York and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.</p>
    </Page>
  );
}

const PrivacyPolicy = (_: RouteComponentProps) => {
  return (
    <Page>
      <h2>Privacy Policy</h2>
      <p>Your privacy is important to us. It is Crosshare's policy to respect your privacy regarding any information we may collect from you across our website, https://crosshare.org, and other sites we own and operate.</p>
      <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.</p>
      <p>We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we’ll protect within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification.</p>
      <p>We don’t share any personally identifying information publicly or with third-parties, except when required to by law.</p>
      <p>Our website may link to external sites that are not operated by us. Please be aware that we have no control over the content and practices of these sites, and cannot accept responsibility or liability for their respective privacy policies.</p>
      <p>You are free to refuse our request for your personal information, with the understanding that we may be unable to provide you with some of your desired services.</p>
      <p>Your continued use of our website will be regarded as acceptance of our practices around privacy and personal information. If you have any questions about how we handle user data and personal information, feel free to contact us.</p>
      <p>This policy is effective as of 10 March 2020.</p>
    </Page>
  );
}

const Home = (_: RouteComponentProps) => {
  return <Page>CROSSHARE is a not-for-profit community for crossword constructors. <Link to="/construct">Create a new crossword</Link></Page>;
}

/*const firebaseConfig = {
  apiKey: "AIzaSyBrmmBf91peVT5T_Z7N3z9oizsPH5u2pUc",
  authDomain: "mdcrosshare.firebaseapp.com",
  databaseURL: "https://mdcrosshare.firebaseio.com",
  projectId: "mdcrosshare",
  storageBucket: "mdcrosshare.appspot.com",
  messagingSenderId: "603173482014",
  appId: "1:603173482014:web:98d7d820731b7c5eaa080f",
  measurementId: "G-LTLN7Z4XBS"
};*/

const App = () => {
  return (
    <Router>
      <Home path="/" />
      <PuzzleLoader path="/crosswords/:crosswordId" />
      <SquareTest path="/square" />
      <TermsOfService path="/tos" />
      <PrivacyPolicy path="/privacy" />
      <NotFound default />
    </Router>
  );
}

export default App;
