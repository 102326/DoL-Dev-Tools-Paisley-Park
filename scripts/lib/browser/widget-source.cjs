// Generated from widget-source.cts by TypeScript 6.0.2; source-lf-sha256=2af5845e26b43bfa6323bebe8e43f5b3f60ad57a3f0a77430b795eaefbd85f25
"use strict";
function loadedWidget(name, limit) {
    const passages = window.SugarCube?.Story?.getAllWidget?.();
    if (!Array.isArray(passages))
        return { error: 'widget-story-unavailable' };
    const opening = /<<widget\s+(['"])([A-Za-z][A-Za-z0-9_-]*)\1\s*>>/g;
    let found;
    let count = 0;
    for (const passage of passages) {
        const text = passage?.text;
        if (typeof text !== 'string')
            continue;
        opening.lastIndex = 0;
        let match;
        while ((match = opening.exec(text))) {
            if (match[2] !== name)
                continue;
            count++;
            const end = text.indexOf('<</widget>>', opening.lastIndex);
            if (end < 0)
                return { error: 'widget-body-unclosed' };
            if (count === 1) {
                const body = text.slice(opening.lastIndex, end);
                found = body.length <= limit ? { body, passage: passage.title } : { error: 'widget-source-too-large' };
            }
        }
    }
    if (count !== 1)
        return { error: count ? 'widget-source-ambiguous' : 'widget-source-missing' };
    return found;
}
const widget = { loadedWidget };
module.exports = widget;
