/**
 * BibTeX Parser for JavaScript
 * Parses BibTeX files and renders publications
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

        // Remove @STRING definitions and comments
        const cleanedString = bibtexString
            .replace(/@STRING\{[^}]+\}/g, '')
            .replace(/%[^\n]*/g, '');

        // Match all BibTeX entries - improved regex to handle all formats
        const entryRegex = /@(\w+)\{([^,]+),\s*([\s\S]*?)\n\}/gm;
        let match;

        while ((match = entryRegex.exec(cleanedString)) !== null) {
            const [, type, key, fields] = match;

            if (type.toLowerCase() === 'string') continue;

            const entry = {
                type: type.toLowerCase(),
                key: key.trim(),
                fields: this.parseFields(fields)
            };

            this.entries.push(entry);
        }

        return this.entries;
    }

    /**
     * Parse fields within a BibTeX entry
     */
    parseFields(fieldsString) {
        const fields = {};

        // Split by lines and process each field
        const lines = fieldsString.split('\n');
        let currentField = '';
        let currentValue = '';
        let inValue = false;
        let braceDepth = 0;
        let quoteOpen = false;

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            // Check if this is a new field assignment
            const fieldMatch = line.match(/^(\w+)\s*=\s*(.*)$/);

            if (fieldMatch && !inValue) {
                // Save previous field if exists
                if (currentField) {
                    fields[currentField.toLowerCase()] = currentValue.trim();
                }

                currentField = fieldMatch[1];
                let value = fieldMatch[2];

                // Check what type of value this is
                if (value.startsWith('{')) {
                    inValue = true;
                    braceDepth = 1;
                    currentValue = value.substring(1);

                    // Count braces in the rest of the line
                    for (let char of currentValue) {
                        if (char === '{') braceDepth++;
                        if (char === '}') braceDepth--;
                    }

                    if (braceDepth === 0) {
                        currentValue = currentValue.substring(0, currentValue.lastIndexOf('}'));
                        inValue = false;
                    }
                } else if (value.startsWith('"')) {
                    inValue = true;
                    quoteOpen = true;
                    currentValue = value.substring(1);

                    if (currentValue.includes('"')) {
                        currentValue = currentValue.substring(0, currentValue.indexOf('"'));
                        inValue = false;
                        quoteOpen = false;
                    }
                } else {
                    // Bare value (like month=feb or doi={...})
                    currentValue = value.replace(/,$/, '').trim();
                    inValue = false;
                }
            } else if (inValue) {
                // Continue collecting multi-line value
                if (quoteOpen) {
                    currentValue += '\n' + line;
                    if (line.includes('"')) {
                        currentValue = currentValue.substring(0, currentValue.indexOf('"'));
                        inValue = false;
                        quoteOpen = false;
                    }
                } else {
                    // Handle braces
                    for (let char of line) {
                        if (char === '{') braceDepth++;
                        if (char === '}') braceDepth--;
                    }

                    if (braceDepth > 0) {
                        currentValue += '\n' + line;
                    } else {
                        currentValue += '\n' + line.substring(0, line.lastIndexOf('}'));
                        inValue = false;
                    }
                }
            }
        }

        // Save the last field
        if (currentField) {
            fields[currentField.toLowerCase()] = currentValue.trim();
        }

        return fields;
    }

    /**
     * Format author names
     */
    formatAuthors(authors) {
        if (!authors) return '';

        const authorList = authors.split(' and ').map(author => author.trim());

        if (authorList.length === 1) {
            return authorList[0];
        } else if (authorList.length === 2) {
            return `${authorList[0]} and ${authorList[1]}`;
        } else if (authorList.length > 2) {
            return `${authorList[0]}, ${authorList[1]}, et al.`;
        }

        return authors;
    }

    /**
     * Get entries sorted by year (descending)
     */
    getEntriesByYear() {
        const sorted = [...this.entries].sort((a, b) => {
            const yearA = parseInt(a.fields.year) || 0;
            const yearB = parseInt(b.fields.year) || 0;
            return yearB - yearA;
        });

        return sorted;
    }

    /**
     * Group entries by year
     */
    groupByYear() {
        const grouped = {};

        this.entries.forEach(entry => {
            const year = entry.fields.year || 'Unknown';
            if (!grouped[year]) {
                grouped[year] = [];
            }
            grouped[year].push(entry);
        });

        return grouped;
    }

    /**
     * Render a single entry as HTML
     */
    renderEntry(entry) {
        const { fields } = entry;
        let html = '<div class="publication-entry">';

        // Title
        if (fields.title) {
            let title = fields.title.replace(/\{|\}/g, '');

            // Check if title contains HTML (link)
            if (title.includes('<a href')) {
                html += `<div class="pub-title">${title}</div>`;
            } else {
                html += `<div class="pub-title">${title}</div>`;
            }
        }

        // Authors
        if (fields.author) {
            const authors = this.formatAuthors(fields.author);
            html += `<div class="pub-authors">${authors}</div>`;
        }

        // Venue information
        let venue = '';
        if (fields.booktitle) {
            venue = fields.booktitle;
        } else if (fields.journal) {
            venue = fields.journal;
        }

        if (venue) {
            html += `<div class="pub-venue">${venue}`;

            if (fields.volume) {
                html += `, Volume ${fields.volume}`;
            }
            if (fields.number) {
                html += `, Number ${fields.number}`;
            }
            if (fields.pages) {
                html += `, Pages ${fields.pages}`;
            }
            if (fields.year) {
                html += `, ${fields.year}`;
            }

            html += '</div>';
        } else if (fields.year) {
            html += `<div class="pub-venue">${fields.year}</div>`;
        }

        // Links
        const links = [];

        if (fields.pdf) {
            const pdfPath = fields.pdf.replace(/"/g, '');
            links.push(`<a href="${pdfPath}" target="_blank">PDF</a>`);
        }

        if (fields.doi) {
            const doi = fields.doi.replace(/\{|\}/g, '').trim();
            if (doi) {
                links.push(`<a href="https://doi.org/${doi}" target="_blank">DOI</a>`);
            }
        }

        if (fields.url) {
            links.push(`<a href="${fields.url}" target="_blank">URL</a>`);
        }

        if (links.length > 0) {
            html += `<div class="pub-links">[${links.join('] [')}]</div>`;
        }

        html += '</div>';
        return html;
    }

    /**
     * Render all entries grouped by year
     */
    renderByYear(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const grouped = this.groupByYear();
        const years = Object.keys(grouped).sort((a, b) => b - a);

        let html = '';
        years.forEach(year => {
            html += `<h3 class="pub-year">${year}</h3>`;
            html += '<div class="pub-year-group">';

            grouped[year].forEach(entry => {
                html += this.renderEntry(entry);
            });

            html += '</div>';
        });

        container.innerHTML = html;
    }
}
