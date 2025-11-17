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

        // Remove comments (lines starting with % or #)
        let cleanedString = bibtexString.replace(/%[^\n]*/g, '');
        // Also remove lines that start with # (after optional whitespace)
        cleanedString = cleanedString.replace(/^[ \t]*#[^\n]*/gm, '');

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
                    type: start.type.toLowerCase(),
                    key: start.key,
                    fields: this.parseFields(fieldsString)
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
        const fieldRegex = /(\w+)\s*=\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|(\w+)\s*=\s*"([^"]*)"|(\w+)\s*=\s*([^,\s]+)/g;
        let match;

        while ((match = fieldRegex.exec(fieldsString)) !== null) {
            const fieldName = (match[1] || match[3] || match[5]).toLowerCase();
            const fieldValue = (match[2] || match[4] || match[6]);
            if (fieldValue !== undefined) {
                fields[fieldName] = fieldValue.trim();
            }
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
            links.push(`<a href="https://doi.org/${fields.doi}" target="_blank">DOI</a>`);
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

        // Add controls
        let html = '<div class="publications-controls">';
        html += '<button id="expand-all-btn">Expand All Years</button>';
        html += '<button id="collapse-all-btn">Collapse All Years</button>';
        html += '</div>';

        // Render each year group
        years.forEach((year, index) => {
            // Only show first 2 years by default (collapsed state for others)
            const isCollapsed = index >= 2;
            const yearClass = isCollapsed ? 'pub-year collapsed' : 'pub-year';
            const groupClass = isCollapsed ? 'pub-year-group collapsed' : 'pub-year-group';

            html += `<h3 class="${yearClass}" data-year="${year}">${year}</h3>`;
            html += `<div class="${groupClass}" data-year="${year}">`;

            grouped[year].forEach(entry => {
                html += this.renderEntry(entry);
            });

            html += '</div>';
        });

        container.innerHTML = html;

        // Add event listeners for collapsing/expanding
        this.addYearToggleListeners();
    }

    /**
     * Add event listeners for year toggling
     */
    addYearToggleListeners() {
        // Toggle individual years
        document.querySelectorAll('.pub-year').forEach(yearHeader => {
            yearHeader.addEventListener('click', function() {
                const year = this.getAttribute('data-year');
                const group = document.querySelector(`.pub-year-group[data-year="${year}"]`);

                this.classList.toggle('collapsed');
                group.classList.toggle('collapsed');
            });
        });

        // Expand all button
        const expandBtn = document.getElementById('expand-all-btn');
        if (expandBtn) {
            expandBtn.addEventListener('click', function() {
                document.querySelectorAll('.pub-year').forEach(el => el.classList.remove('collapsed'));
                document.querySelectorAll('.pub-year-group').forEach(el => el.classList.remove('collapsed'));
            });
        }

        // Collapse all button
        const collapseBtn = document.getElementById('collapse-all-btn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', function() {
                document.querySelectorAll('.pub-year').forEach(el => el.classList.add('collapsed'));
                document.querySelectorAll('.pub-year-group').forEach(el => el.classList.add('collapsed'));
            });
        }
    }
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BibtexParser;
}
