/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Extension,
  Resolver,
  Tokenizer,
  State,
  Token,
  Event,
} from 'micromark-util-types';

import { splice } from 'micromark-util-chunked';
import { classifyCharacter } from 'micromark-util-classify-character';
import { resolveAll } from 'micromark-util-resolve-all';

import { HtmlExtension } from 'micromark-util-types';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    spoilerSequence: 'spoilerSequence';
    spoiler: 'spoiler';
    spoilerText: 'spoilerText';
    spoilerSequenceTemporary: 'spoilerSequenceTemporary';
    redditSequenceTemporary: 'redditSequenceTemporary';
  }
}

export const spoilersHtml: HtmlExtension = {
  enter: {
    spoiler(this: any) {
      return this.tag('<span class="spoiler">');
    },
  },
  exit: {
    spoiler(this: any) {
      return this.tag('</span>');
    },
  },
};

const PIPE = 124; // |
const LT = 60; // <
const GT = 62; // >
const BANG = 33; // !

export const spoilersSyntax = function (): Extension {
  // Take events and resolve mark.
  const resolveAllSpoilers: Resolver = function (events, context) {
    let index = -1;
    let spoiler: Token;
    let text: Token;
    let open: number;
    let nextEvents: Event[];

    // Walk through all events.
    while (++index < events.length) {
      for (const spoilerType of [
        'spoilerSequenceTemporary',
        'redditSequenceTemporary',
      ]) {
        const event = events[index];
        // Find a token that can close.
        if (
          event &&
          event[0] === 'enter' &&
          event[1].type === spoilerType &&
          event[1]._close
        ) {
          open = index;

          // Now walk back to find an opener.
          while (open--) {
            const event_open = events[open];
            // Find a token that can open the closer.
            if (
              event_open &&
              event_open[0] === 'exit' &&
              event_open[1].type === spoilerType &&
              event_open[1]._open &&
              // If the sizes are the same:
              event[1].end.offset - event[1].start.offset ===
                event_open[1].end.offset - event_open[1].start.offset
            ) {
              event[1].type = 'spoilerSequence';
              event_open[1].type = 'spoilerSequence';

              spoiler = {
                type: 'spoiler',
                start: Object.assign({}, event_open[1].start),
                end: Object.assign({}, event[1].end),
              };

              text = {
                type: 'spoilerText',
                start: Object.assign({}, event_open[1].end),
                end: Object.assign({}, event[1].start),
              };

              // Opening.
              nextEvents = [
                ['enter', spoiler, context],
                ['enter', event_open[1], context],
                ['exit', event_open[1], context],
                ['enter', text, context],
              ];

              // Between.
              splice(
                nextEvents,
                nextEvents.length,
                0,
                resolveAll(
                  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                  context.parser.constructs.insideSpan.null || [],
                  events.slice(open + 1, index),
                  context
                )
              );

              // Closing.
              splice(nextEvents, nextEvents.length, 0, [
                ['exit', text, context],
                ['enter', event[1], context],
                ['exit', event[1], context],
                ['exit', spoiler, context],
              ]);

              splice(events, open - 1, index - open + 3, nextEvents);

              index = open + nextEvents.length - 2;
              break;
            }
          }
        }
      }
    }

    index = -1;

    while (++index < events.length) {
      const event = events[index];
      if (
        event &&
        (event[1].type === 'spoilerSequenceTemporary' ||
          event[1].type === 'redditSequenceTemporary')
      ) {
        event[1].type = 'data';
      }
    }

    return events;
  };

  const tokenizeDiscord: Tokenizer = function (effects, ok, nok) {
    const previous = this.previous;
    const events = this.events;
    let size = 0;

    const more: State = function (code) {
      const before = classifyCharacter(previous);

      if (code === PIPE) {
        // If this is the third marker, exit.
        if (size > 1) return nok(code);
        effects.consume(code);
        size++;
        return more;
      }

      if (size < 2) return nok(code);
      const token = effects.exit('spoilerSequenceTemporary');
      const after = classifyCharacter(code);
      token._open = Boolean(before); // before is whitespace or punctuation
      token._close = Boolean(after); // after is whitespace or punctuation
      return ok(code);
    };

    const start: State = function (code) {
      const lastEv = events[events.length - 1];
      if (
        code !== PIPE ||
        (previous === PIPE && lastEv && lastEv[1].type !== 'characterEscape')
      ) {
        return nok(code);
      }

      effects.enter('spoilerSequenceTemporary');
      return more(code);
    };

    return start;
  };

  const tokenizeRedditOpen: Tokenizer = function (effects, ok, nok) {
    const previous = this.previous;
    const before = classifyCharacter(previous);
    const events = this.events;

    const more: State = function (code) {
      if (code !== BANG) {
        return nok(code);
      }
      effects.consume(code);
      const token = effects.exit('redditSequenceTemporary');
      token._open = Boolean(before);
      token._close = false;
      return ok(code);
    };

    const start: State = function (code) {
      const lastEv = events[events.length - 1];
      if (
        code !== GT ||
        (previous === GT && lastEv && lastEv[1].type !== 'characterEscape')
      ) {
        return nok(code);
      }

      effects.enter('redditSequenceTemporary');
      effects.consume(code);
      return more;
    };

    return start;
  };

  const tokenizeRedditClose: Tokenizer = function (effects, ok, nok) {
    const previous = this.previous;
    const events = this.events;

    const more: State = function (code) {
      if (code !== LT) {
        return nok(code);
      }
      effects.consume(code);
      return finalize;
    };

    const finalize: State = function (code) {
      const token = effects.exit('redditSequenceTemporary');
      const after = classifyCharacter(code);
      token._open = false;
      token._close = Boolean(after);
      return ok(code);
    };

    const start: State = function (code) {
      const lastEv = events[events.length - 1];
      if (
        code !== BANG ||
        (previous === BANG && lastEv && lastEv[1].type !== 'characterEscape')
      ) {
        return nok(code);
      }

      effects.enter('redditSequenceTemporary');
      effects.consume(code);
      return more;
    };

    return start;
  };

  const discordTokenizer = {
    tokenize: tokenizeDiscord,
    resolveAll: resolveAllSpoilers,
  };

  const redditOpenTokenizer = {
    tokenize: tokenizeRedditOpen,
    resolveAll: resolveAllSpoilers,
  };

  const redditCloseTokenizer = {
    tokenize: tokenizeRedditClose,
    resolveAll: resolveAllSpoilers,
  };

  return {
    disable: { null: ['blockQuote', 'labelStartImage'] },
    text: {
      [PIPE]: discordTokenizer,
      [GT]: redditOpenTokenizer,
      [BANG]: redditCloseTokenizer,
    },
    insideSpan: {
      null: [discordTokenizer, redditOpenTokenizer, redditCloseTokenizer],
    },
    attentionMarkers: { null: [PIPE] },
  };
};
