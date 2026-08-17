import type { SearchableRegion, TextToken } from "../types.ts";

const WORD_CHARACTER = /[\p{L}\p{N}\p{M}]/u;

export default function tokenize(source: string, region: SearchableRegion): TextToken[] {
	const tokens: TextToken[] = [];

	let tokenStart: number | undefined;
	let index = region.start;

	while (index < region.end) {
		const codePoint = source.codePointAt(index);

		if (codePoint === undefined) {
			break;
		}

		const character = String.fromCodePoint(codePoint);
		const characterLength = character.length;

		if (isWordCharacter(character)) {
			tokenStart ??= index;
		} else if (
			isApostrophe(character) &&
			tokenStart !== undefined &&
			nextCharacterIsWord(source, index + characterLength, region.end)
		) {
			// keep apostrophes surrounded by word chars as part of the token, e.g. "Euler's"
		} else if (tokenStart !== undefined) {
			tokens.push(createToken(source, tokenStart, index));
			tokenStart = undefined;
		}

		index += characterLength;
	}

	if (tokenStart !== undefined) {
		tokens.push(createToken(source, tokenStart, region.end));
	}

	return tokens;
}

function createToken(source: string, start: number, end: number): TextToken {
	const value = source.slice(start, end);

	return {
		value,
		normalized: normalizeToken(value),
		start,
		end,
	};
}

function normalizeToken(value: string): string {
	return value.normalize().replaceAll("\u2019", "'").toLocaleLowerCase();
}

function isWordCharacter(character: string): boolean {
	return WORD_CHARACTER.test(character);
}

function isApostrophe(character: string): boolean {
	return character === "'" || character === "\u2019";
}

function nextCharacterIsWord(source: string, index: number, regionEnd: number): boolean {
	if (index >= regionEnd) {
		return false;
	}

	const codePoint = source.codePointAt(index);

	if (codePoint === undefined) {
		return false;
	}

	return isWordCharacter(String.fromCodePoint(codePoint));
}
