import { calculateImpact } from './projectModel';

function fileEvidence(project, path, limit = 3) {
  const file = project.byPath[path];
  if (!file) return [];
  const ev = [];
  file.lines.forEach((line, index) => {
    if (ev.length >= limit) return;
    if (/^\s*(import|export|from|require|use)\b/.test(line)) {
      ev.push([file.path, index + 1, line.trim().slice(0, 160)]);
    }
  });
  if (!ev.length && file.lines.length) {
    ev.push([file.path, 1, file.lines[0].trim().slice(0, 160)]);
  }
  return ev;
}

function mostConnectedFile(project) {
  const degree = {};
  project.edges.forEach(([from, to]) => {
    degree[from] = (degree[from] || 0) + 1;
    degree[to] = (degree[to] || 0) + 1;
  });
  const ranked = Object.keys(degree).sort((a, b) => {
    if (degree[b] !== degree[a]) return degree[b] - degree[a];
    return a.localeCompare(b);
  });
  return ranked.length ? { path: ranked[0], degree: degree[ranked[0]] } : null;
}

/**
 * Builds the insights that only exist because the project was uploaded:
 * architecture, hotspots, risks, coverage and configuration.
 */
export function buildProjectInsights(project) {
  if (!project || project.source !== 'upload') return [];

  const insights = [];
  const summary = project.summary || {};

  insights.push({
    id: 'architecture',
    title: 'What this project is',
    why: summary.headline || project.name + ' was read from the uploaded archive.',
    conf: 8,
    ev: (summary.entryPoints || []).slice(0, 2).flatMap((path) => fileEvidence(project, path, 2)),
    unk: 'The archive was read, not run. Nothing here is confirmed by executing the code.',
    tests: []
  });

  const hotspot = mostConnectedFile(project);
  if (hotspot) {
    const impact = calculateImpact(project, { [hotspot.path]: true });
    insights.push({
      id: 'hotspot',
      title: 'The file that carries the most weight',
      why:
        hotspot.path +
        ' takes part in ' +
        hotspot.degree +
        ' internal connections' +
        (impact.affectedList.length
          ? ', and a change to it reaches ' +
            impact.affectedList.length +
            (impact.affectedList.length === 1 ? ' other file' : ' other files') +
            ' through the import graph.'
          : ', but nothing imports it, so a change to it stays local.'),
      conf: 7,
      ev: fileEvidence(project, hotspot.path, 3),
      unk: 'The graph is built from import statements only. Dynamic imports and reflection are not visible.',
      tests: [
        'Retest ' +
          impact.affectedList
            .slice(0, 2)
            .map((item) => item.path)
            .join(' and ') +
          ' after changing ' +
          hotspot.path +
          '.'
      ].concat(impact.affectedList.length ? [] : ['Add a test for ' + hotspot.path + ', nothing covers it today.'])
    });
  }

  const risk = project.risks[0];
  if (risk) {
    insights.push({
      id: 'risk',
      title: 'The first place to look when it breaks',
      why:
        risk.kind +
        ' in ' +
        risk.path +
        ' on line ' +
        risk.line +
        '. ' +
        risk.reason,
      conf: 6,
      ev: [[risk.path, risk.line, risk.snippet]],
      unk: 'A pattern match found this spot. Whether it is the actual cause of a failure needs a reproduction.',
      tests: ['Write a test that exercises ' + risk.path + ' around line ' + risk.line + '.']
    });
  }

  if (summary.testCount === 0) {
    insights.push({
      id: 'tests',
      title: 'No automated coverage came with it',
      why:
        'No test files were found in the upload, so every fix has to be verified by hand until a test suite exists.',
      conf: 9,
      ev: [],
      unk: 'Tests can live outside the archive, in another repository or in a CI pipeline.',
      tests: ['Add one test for the entry point and one for the most connected file.']
    });
  }

  if (summary.envVars && summary.envVars.length) {
    const hasExample = project.files.some((file) =>
      /\.env\.example$|\.env\.sample$|env\.example/i.test(file.path)
    );
    insights.push({
      id: 'config',
      title: 'Configuration this code expects from the environment',
      why:
        'The code reads ' +
        summary.envVars.length +
        ' environment variable(s): ' +
        summary.envVars.slice(0, 6).join(', ') +
        (hasExample ? '. An example file is included.' : ', and no example file is included.'),
      conf: 8,
      ev: [],
      unk: 'The values of those variables are not in the archive, only the names that the code reads.',
      tests: ['Start the app with one variable missing and check that it fails with a clear message.']
    });
  }

  return insights;
}
