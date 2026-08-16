import { codes } from "micromark-util-symbol";
import type { Code, Construct, Extension, State, Tokenizer } from "micromark-util-types";

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

	function label(code: Code): State | undefined {
		if (isEnd(code)) {
			return nok(code);
		}

		if (code === codes.verticalBar) {
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

	function target(code: Code): State | undefined {
		if (isEnd(code) || code === codes.verticalBar) {
			return nok(code);
		}

		if (code === codes.rightSquareBracket) {
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
};

export function localLinkSyntax(): Extension {
	return {
		text: {
			[codes.leftSquareBracket]: localLinkConstruct,
		},
	};
}
