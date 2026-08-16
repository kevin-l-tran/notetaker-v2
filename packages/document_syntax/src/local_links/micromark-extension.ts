import { codes, types } from "micromark-util-symbol";
import type {
	Code,
	Construct,
	Event,
	Extension,
	Resolver,
	State,
	Token,
	Tokenizer,
} from "micromark-util-types";

import { localLinkTokens } from "./tokens.ts";

const tokenizelocalLink: Tokenizer = (effects, ok, nok) => {
	function start(code: Code): State | undefined {
		if (code !== codes.leftSquareBracket) {
			return nok(code);
		}

		effects.enter(localLinkTokens.link);
		effects.enter(localLinkTokens.marker);

		effects.consume(code);

		return secondOpeningBracket;
	}

	function secondOpeningBracket(code: Code): State | undefined {
		if (code !== codes.leftSquareBracket) {
			return nok(code);
		}

		effects.consume(code);

		return optionalModifier;
	}

	function optionalModifier(code: Code): State | undefined {
		if (code === codes.exclamationMark || code === codes.tilde) {
			effects.consume(code);
			effects.exit(localLinkTokens.marker);
			effects.enter(localLinkTokens.label);
			return labelStart;
		}

		effects.exit(localLinkTokens.marker);
		effects.enter(localLinkTokens.label);

		return labelStart(code);
	}

	function labelStart(code: Code): State | undefined {
		if (isEnd(code) || code === codes.verticalBar) {
			return nok(code);
		}

		return label(code);
	}

	function labelEscape(code: Code): State | undefined {
		if (isEnd(code)) {
			return nok(code);
		}

		effects.consume(code);

		return label;
	}

	function label(code: Code): State | undefined {
		if (isEnd(code)) {
			return nok(code);
		}

		if (code === codes.backslash) {
			effects.consume(code);
			return labelEscape;
		} else if (code === codes.verticalBar) {
			effects.exit(localLinkTokens.label);

			effects.enter(localLinkTokens.marker);
			effects.consume(code);
			effects.exit(localLinkTokens.marker);

			effects.enter(localLinkTokens.target);

			return targetStart;
		}

		effects.consume(code);

		return label;
	}

	function targetStart(code: Code): State | undefined {
		if (isEnd(code) || code === codes.rightSquareBracket || code === codes.verticalBar) {
			return nok(code);
		}

		return target(code);
	}

	function targetEscape(code: Code): State | undefined {
		if (isEnd(code)) {
			return nok(code);
		}

		effects.consume(code);

		return target;
	}

	function target(code: Code): State | undefined {
		if (isEnd(code) || code === codes.verticalBar) {
			return nok(code);
		}

		if (code === codes.backslash) {
			effects.consume(code);
			return targetEscape;
		} else if (code === codes.rightSquareBracket) {
			effects.exit(localLinkTokens.target);

			effects.enter(localLinkTokens.marker);
			effects.consume(code);

			return secondClosingBracket;
		}

		effects.consume(code);

		return target;
	}

	function secondClosingBracket(code: Code): State | undefined {
		if (code !== codes.rightSquareBracket) {
			return nok(code);
		}

		effects.consume(code);

		effects.exit(localLinkTokens.marker);
		effects.exit(localLinkTokens.link);

		return ok;
	}

	return start;
};

const resolveLocalLinksInMedia: Resolver = (events) => {
	const resolved: Event[] = [];

	let mediaDepth = 0;
	let index = 0;

	while (index < events.length) {
		const event = events[index];
		if (event === undefined) throw "Expected event to be defined";

		const direction = event[0];
		const token = event[1];

		if (direction === "enter" && token.type === localLinkTokens.link && mediaDepth > 0) {
			let endIndex = index + 1;
			let innerEvent = events[endIndex];

			do {
				innerEvent = events[endIndex];
				if (innerEvent === undefined) throw "Expected event to be defined";

				endIndex++;
			} while (endIndex < events.length && !(innerEvent[0] === "exit" && innerEvent[1] === token));

			index = endIndex;

			const dataToken: Token = {
				type: types.data,
				start: { ...token.start },
				end: { ...token.end },
			};

			resolved.push(["enter", dataToken, event[2]], ["exit", dataToken, event[2]]);

			continue;
		}

		if (direction === "enter" && (token.type === types.link || token.type === types.image)) {
			mediaDepth++;
		} else if (direction === "exit" && (token.type === types.link || token.type === types.image)) {
			mediaDepth--;
		}

		resolved.push(event);

		index++;
	}

	// resolver must mutate the original events array to persist changes
	events.splice(0);
	for (const e of resolved) {
		events.push(e);
	}

	return events;
};

function isEnd(code: Code): boolean {
	return (
		code === codes.eof ||
		code === codes.carriageReturn ||
		code === codes.lineFeed ||
		code === codes.carriageReturnLineFeed
	);
}

const localLinkConstruct: Construct = {
	name: "localLink",
	tokenize: tokenizelocalLink,
	resolveAll: resolveLocalLinksInMedia,
};

export function localLinkSyntax(): Extension {
	return {
		text: {
			[codes.leftSquareBracket]: localLinkConstruct,
		},
	};
}
