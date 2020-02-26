/** @jsx jsx */
import { jsx } from '@emotion/core';

import {FOOTER_HEIGHT} from './style';
import { RouteComponentProps } from "@reach/router";
import Container from 'react-bootstrap/Container'

export const Footer = (_: RouteComponentProps) => {
  return (
    <footer css={{
      position: 'absolute',
      bottom: 0,
      width: '100%',
      height: FOOTER_HEIGHT,
      lineHeight: FOOTER_HEIGHT,
      textAlign: 'center',
    }}>
    <Container fluid>
    &copy; 2020 &ndash; All Rights Reserved
    </Container>
    </footer>
  );
}
