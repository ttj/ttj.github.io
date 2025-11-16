/**
 * Custom BibTeX Parser for JavaScript
 * Parses BibTeX files with robust brace-counting
 */

class BibtexParser {
    constructor() {
        this.entries = [];
    }

    /**
     * Parse a BibTeX string
     */
    parse(bibtexString) {
        this.entries = [];

        // Remove comments (lines starting with %)
        const cleanedString = bibtexString.replace(/%[^\n]*/g, '');

        // Find all entry starts
        const entryStarts = [];
        const entryStartRegex = /@(\w+)\{([^,]+),/g;
        let match;

        while ((match = entryStartRegex.exec(cleanedString)) !== null) {
            if (match[1].toLowerCase() !== 'string') {
                entryStarts.push({
                    index: match.index,
                    type: match[1],
                    key: match[2].trim(),
                    afterComma: match.index + match[0].length
                });
            }
        }

        // For each entry, find its closing brace by counting braces
        for (const start of entryStarts) {
            // Find the opening brace of the entry
            const openBraceIndex = cleanedString.indexOf('{', start.index);
            let braceCount = 1;
            let i = openBraceIndex + 1;

            // Count braces to find the matching closing brace
            while (i < cleanedString.length && braceCount > 0) {
                if (cleanedString[i] === '{') {
                    braceCount++;
                } else if (cleanedString[i] === '}') {
                    braceCount--;
                }
                i++;
            }

            if (braceCount === 0) {
                // Extract fields string (everything after the key and comma, before closing brace)
                const fieldsString = cleanedString.substring(start.afterComma, i - 1);

                const entry = {
                    citationKey: start.key,
                    entryType: start.type.toUpperCase(),
                    entryTags: this.parseFields(fieldsString)
                };

                this.entries.push(entry);
            }
        }

        return this.entries;
    }

    /**
     * Parse fields within a BibTeX entry
     */
    parseFields(fieldsString) {
        const fields = {};
        // Updated regex to better handle nested braces and quoted values
        const fieldRegex = /(\w+)\s*=\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|(\w+)\s*=\s*"([^"]*)"|(\w+)\s*=\s*([^,\s{}]+)/g;
        let match;

        while ((match = fieldRegex.exec(fieldsString)) !== null) {
            const fieldName = (match[1] || match[3] || match[5]);
            const fieldValue = (match[2] || match[4] || match[6]);
            if (fieldValue !== undefined && fieldName) {
                const trimmedValue = fieldValue.trim();
                // Only add non-empty values
                if (trimmedValue !== '') {
                    fields[fieldName.toLowerCase()] = trimmedValue;
                }
            }
        }

        return fields;
    }
}

// Make it compatible with both browser and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        toJSON: function(bibtexString) {
            const parser = new BibtexParser();
            return parser.parse(bibtexString);
        }
    };
}
