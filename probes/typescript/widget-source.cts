interface StoryWindow {SugarCube?:{Story?:{getAllWidget?():unknown}}}
interface PassageView {text?:unknown;title?:unknown}
function loadedWidget(name:string, limit:number) {
  const passages = (window as unknown as StoryWindow).SugarCube?.Story?.getAllWidget?.();
  if (!Array.isArray(passages)) return { error: 'widget-story-unavailable' };
  const opening = /<<widget\s+(['"])([A-Za-z][A-Za-z0-9_-]*)\1\s*>>/g;
  let found:{body:string;passage:unknown}|{error:string}|undefined;
  let count = 0;
  for (const passage of passages) {
    const text = (passage as PassageView|null|undefined)?.text;
    if (typeof text !== 'string') continue;
    opening.lastIndex = 0;
    let match;
    while ((match = opening.exec(text))) {
      if (match[2] !== name) continue;
      count++;
      const end = text.indexOf('<</widget>>', opening.lastIndex);
      if (end < 0) return { error: 'widget-body-unclosed' };
      if (count === 1) {
        const body = text.slice(opening.lastIndex, end);
        found = body.length <= limit ? { body, passage: (passage as PassageView).title } : { error: 'widget-source-too-large' };
      }
    }
  }
  if (count !== 1) return { error: count ? 'widget-source-ambiguous' : 'widget-source-missing' };
  return found;
}
const widget={loadedWidget};
export = widget;
