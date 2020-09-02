import { render } from '../lib/testingUtils';

import { Markdown } from '../components/Markdown';
import { Direction } from '../lib/types';

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

test('clueMap rendering', () => {
  const clueMap = new Map<string, [number, Direction, string]>([
    ['BAM', [2, 1, 'here is the clue?']],
    ['12ACLUE1', [45, 0, 'Well now']],
  ]);

  let r = render(<Markdown text='before ||baz BOOM foo BAM >! not! !< fooey|| with >!after!< text' />, {});
  expect(r.container).toMatchSnapshot();

  r = render(<Markdown clueMap={clueMap} text='before ||baz BOOM foo BAM >! not! !< fooey|| with >!after!< text' />, {});
  expect(r.container).toMatchSnapshot();

  r = render(<Markdown clueMap={clueMap} text='12ACLUE1 BAM' />, {});
  expect(r.container).toMatchSnapshot();

  r = render(<Markdown clueMap={clueMap} text='||BAM||' />, {});
  expect(r.container).toMatchSnapshot();

  r = render(<Markdown clueMap={clueMap} text={'You got it!! Glad the clues pointed you in the right direction. That\'s what they\'re there for. Also, it was Brian\'s suggestion to include >! BAM !< which I think is such an awesome addition. Cheers!'} />, {});
  expect(r.container).toMatchSnapshot();
});
