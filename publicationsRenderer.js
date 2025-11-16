/**
 * Publications Renderer
 * Renders parsed BibTeX JSON entries as HTML grouped by year
 */

class PublicationsRenderer {
    constructor(entries) {
        this.entries = entries || [];
    }

    /**
     * Format author names - show first two authors, then "et al."
     */
    formatAuthors(authors) {
        if (!authors) return '';

        const authorList = authors.split(' and ').map(author => author.trim());

        if (authorList.length === 1) {
            return authorList[0];
        } else if (authorList.length === 2) {
            return `${authorList[0]} and ${authorList[1]}`;
        } else {
            return `${authorList[0]}, ${authorList[1]}, et al.`;
        }
    }

    /**
     * Group entries by year
     */
    groupByYear() {
        const grouped = {};

        this.entries.forEach(entry => {
            const tags = entry.entryTags || {};
            const year = tags.year || 'Unknown';

            if (!grouped[year]) {
                grouped[year] = [];
            }
            grouped[year].push(entry);
        });

        return grouped;
    }

    /**
     * Render a single publication entry
     */
    renderEntry(entry) {
        const tags = entry.entryTags || {};
        let html = '<div class="publication-entry">';

        // Title
        if (tags.title) {
            let title = tags.title.replace(/\{|\}/g, '');
            html += `<div class="pub-title">${title}</div>`;
        }

        // Authors
        if (tags.author) {
            const authors = this.formatAuthors(tags.author);
            html += `<div class="pub-authors">${authors}</div>`;
        }

        // Venue information
        let venue = '';
        if (tags.booktitle) {
            venue = tags.booktitle;
        } else if (tags.journal) {
            venue = tags.journal;
        }

        if (venue) {
            html += `<div class="pub-venue">${venue}`;

            if (tags.volume) {
                html += `, Volume ${tags.volume}`;
            }
            if (tags.number) {
                html += `, Number ${tags.number}`;
            }
            if (tags.pages) {
                html += `, Pages ${tags.pages}`;
            }
            if (tags.year) {
                html += `, ${tags.year}`;
            }

            html += '</div>';
        } else if (tags.year) {
            html += `<div class="pub-venue">${tags.year}</div>`;
        }

        // Links
        const links = [];

        if (tags.pdf) {
            const pdfPath = tags.pdf.replace(/"/g, '');
            links.push(`<a href="${pdfPath}" target="_blank">PDF</a>`);
        }

        if (tags.doi) {
            links.push(`<a href="https://doi.org/${tags.doi}" target="_blank">DOI</a>`);
        }

        if (tags.url) {
            links.push(`<a href="${tags.url}" target="_blank">URL</a>`);
        }

        if (links.length > 0) {
            html += `<div class="pub-links">[${links.join('] [')}]</div>`;
        }

        html += '</div>';
        return html;
    }

    /**
     * Render all entries grouped by year into a container
     */
    renderToContainer(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        if (this.entries.length === 0) {
            container.innerHTML = '<p>No publications found.</p>';
            return;
        }

        const grouped = this.groupByYear();
        const years = Object.keys(grouped).sort((a, b) => {
            // Sort years descending, with 'Unknown' at the end
            if (a === 'Unknown') return 1;
            if (b === 'Unknown') return -1;
            return parseInt(b) - parseInt(a);
        });

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
        console.log(`Rendered ${this.entries.length} publications across ${years.length} years`);
    }
}
