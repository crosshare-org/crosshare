/** @jsx jsx */
import { jsx } from '@emotion/core';

import { RouteComponentProps } from "@reach/router";
import Container from 'react-bootstrap/Container'

export const Footer = (_: RouteComponentProps) => {
  return (
    <footer css={{
      position: 'absolute',
      bottom: 0,
      width: '100%',
      height: '30px',
      lineHeight: '30px',
      backgroundColor: '#ddd',
      textAlign: 'center',
    }}>
    <Container fluid>
    &copy; 2020 Michael Dirolf &ndash; All Rights Reserved
    </Container>
    </footer>
  );
}
