// Harvest the original Qatar Airways autocomplete results, exactly as rendered.
// Run in the console on https://www.qatarairways.com/ar-qa/homepage.html
// Produces window.__QA_HARVEST = { query: [ "CODE|city label|station name", ... ] }
(async function () {
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function findInput() {
    var el = document.getElementById('mat-input-4');
    if (el) return el;
    var cands = document.querySelectorAll('input[role="combobox"]');
    for (var i = 0; i < cands.length; i++) {
      var a = (cands[i].getAttribute('aria-label') || '') + (cands[i].placeholder || '');
      if (a.indexOf('من') >= 0) return cands[i];
    }
    return cands[0] || null;
  }

  function readOptions() {
    var nodes = document.querySelectorAll('mat-option, [role="option"]');
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var txt = (nodes[i].innerText || '').replace(/\u200e|\u200f/g, '').trim();
      if (!txt) continue;
      var lines = txt.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      // Rendered as: "City, Country" / "Station name" / "CODE" (order varies in RTL)
      var code = '';
      for (var j = lines.length - 1; j >= 0; j--) {
        if (/^[A-Z]{3}$/.test(lines[j])) { code = lines[j]; lines.splice(j, 1); break; }
      }
      out.push(code + '|' + lines.join('|'));
    }
    return out;
  }

  var input = findInput();
  if (!input) { window.__QA_HARVEST_ERR = 'no input found'; return 'no input'; }

  var queries = window.__QA_QUERIES;
  var res = {};
  for (var q = 0; q < queries.length; q++) {
    var query = queries[q];
    // Clear then type, dispatching the events Angular Material listens for.
    input.focus();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(120);
    input.value = query;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: query.slice(-1) }));
    await sleep(1100);
    var opts = readOptions();
    // Scroll the panel to pull in any virtualised rows.
    var panel = document.querySelector('.mat-mdc-autocomplete-panel, .mat-autocomplete-panel');
    if (panel) {
      var guard = 0;
      while (guard++ < 40) {
        var before = panel.scrollTop;
        panel.scrollTop = panel.scrollTop + panel.clientHeight;
        await sleep(160);
        var more = readOptions();
        if (more.length > opts.length) opts = more;
        if (panel.scrollTop === before) break;
      }
    }
    res[query] = opts;
  }
  window.__QA_HARVEST = res;
  return Object.keys(res).map(function (k) { return k + '=' + res[k].length; }).join(' ');
})();
