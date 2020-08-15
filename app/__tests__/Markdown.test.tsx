import { render } from '../lib/testingUtils';

import { Markdown } from '../components/Markdown';

test('spoiler text rendering', () => {
  let r = render(<Markdown text='foo bar >!baz' />, {});
  expect(r.container).toMatchSnapshot();

  r = render(<Markdown text='foo bar >!baz!<' />, {});
  expect(r.container).toMatchSnapshot();

  r = render(<Markdown text='>!baz foo bam ! >> fooey!<' />, {});
  expect(r.container).toMatchSnapshot();

  r = render(<Markdown text='>!baz foo bam ! >> fooey!< with after text' />, {});
  expect(r.container).toMatchSnapshot();

  r = render(<Markdown text='before ||baz foo bam >! fooey|| with after text' />, {});
  expect(r.container).toMatchSnapshot();

  r = render(<Markdown text='before >!baz foo bam || fooey!< with after text' />, {});
  expect(r.container).toMatchSnapshot();

  r = render(<Markdown text='before >!baz foo bam || fooey!< with ||after|| text' />, {});
  expect(r.container).toMatchSnapshot();

  r = render(<Markdown text='before ||baz foo bam >! not! !< fooey|| with >!after!< text' />, {});
  expect(r.container).toMatchSnapshot();

  r = render(<Markdown text={'before ||baz foo bam \n\n>! not! !< fooey|| with >!after!< text'} />, {});
  expect(r.container).toMatchSnapshot();

  r = render(<Markdown text={'before baz foo bam \n\n>! not! !< fooey|| with >!after!< text'} />, {});
  expect(r.container).toMatchSnapshot();
});
