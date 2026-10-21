export const FAILURE_PRESETS = [
  {
    n: "TypeError",
    re: /format\.ts|reading ['"]total/i,
    log: "TypeError: Cannot read properties of undefined (reading 'total')\n    at formatAmount (src/utils/format.ts:12)\n    at createInvoice (src/billing/invoice.ts:41)",
    files: [
      ["src/utils/format.ts", 12, "Stack frame where the error is thrown"],
      ["src/billing/invoice.ts", 41, "Caller passes a value that can be undefined"],
      ["src/db/client.ts", null, "Source of the query result used by the caller"]
    ],
    causes: [
      "The invoice query returned no rows, so rows[0] is undefined.",
      "formatAmount does not guard against a missing invoice."
    ],
    steps: [
      "Log row.rows.length before formatAmount is called.",
      "Check whether the order id from the request exists in the invoices table.",
      "Add a guard or a clear not-found error, then rerun."
    ],
    why: "The error is thrown inside formatAmount, but the value comes from createInvoice. That function reads the first query row without checking that one exists.",
    conf: 7,
    ev: [
      ["src/utils/format.ts", 12, "return sym + inv.total.toFixed(2);"],
      ["src/billing/invoice.ts", 40, "const invoice = row.rows[0];"]
    ],
    unk: "The log does not show the order id or the query result, so an empty result is likely but not confirmed.",
    tests: [
      "createInvoice with an unknown order id returns a not-found error.",
      "formatAmount with undefined input fails with a clear message.",
      "Checkout shows an error state when the invoice request fails."
    ]
  },
  {
    n: "JWT expired",
    re: /jwt|token\.ts/i,
    log: "JsonWebTokenError: jwt expired\n    at verifyToken (src/auth/token.ts:23)\n    at requireSession (src/auth/session.ts:15)",
    files: [
      ["src/auth/token.ts", 23, "Stack frame where verification fails"],
      ["src/auth/session.ts", 15, "Passes the cookie value to verifyToken"],
      ["src/api/routes.ts", 4, "Route that requires a session"]
    ],
    causes: [
      "The session cookie holds a token past its expiry time.",
      "Server and client clocks differ, so a fresh token looks expired."
    ],
    steps: [
      "Decode the token and compare exp with the current server time.",
      "Check how long tokens live and whether they are refreshed.",
      "Handle the expiry error with a 401 and a re-login prompt."
    ],
    why: "verifyToken calls jwt.verify, which throws when the exp claim has passed. requireSession does not catch it, so the request fails.",
    conf: 8,
    ev: [
      ["src/auth/token.ts", 23, "return jwt.verify(token, secret);"],
      ["src/auth/session.ts", 15, "return verifyToken(token);"]
    ],
    unk: "The token payload and server time are not in the log, so clock drift cannot be ruled out.",
    tests: [
      "verifyToken with an expired token throws the expiry error.",
      "requireSession returns 401 instead of a server error on expiry.",
      "A token near its expiry still passes."
    ]
  },
  {
    n: "DB refused",
    re: /ECONNREFUSED|db\/client/i,
    log: "Error: connect ECONNREFUSED 127.0.0.1:5432\n    at connect (src/db/client.ts:9)",
    files: [
      ["src/db/client.ts", 9, "Stack frame where the connection fails"],
      ["src/billing/invoice.ts", null, "Imports the client and runs queries"],
      ["src/auth/session.ts", null, "Imports the client for session lookups"]
    ],
    causes: [
      "The database is not running on that host and port.",
      "DB_HOST is unset, so the default 127.0.0.1 is used."
    ],
    steps: [
      "Confirm the database process is running and listening on 5432.",
      "Print DB_HOST in the environment where the app starts.",
      "Try connecting with a database client from the same machine."
    ],
    why: "The pool connects to the default local host when DB_HOST is missing. A refused connection means nothing is listening at that address.",
    conf: 9,
    ev: [
      ["src/db/client.ts", 6, "host: process.env.DB_HOST ?? '127.0.0.1',"],
      ["src/db/client.ts", 9, "export const connect = () => pool.connect();"]
    ],
    unk: "Deployment settings are outside the uploaded code, so the real DB_HOST value is unknown.",
    tests: [
      "connect fails with a clear message when the database is down.",
      "Config loads DB_HOST from the environment.",
      "Invoice and session code surface a database error, not a crash."
    ]
  }
];

const ERROR_HINTS = [
  {
    re: /cannot read propert|of undefined|is not an object|is not a function/i,
    name: 'TypeError',
    cause: 'A value was used before it was defined, or a property was read from something that is not there.',
    steps: [
      'Log the value that is read one line before the failing access.',
      'Check whether the lookup that produced it can return nothing.',
      'Add a guard that returns a clear error instead of crashing.'
    ]
  },
  {
    re: /is not defined|is not declared|unboundlocalname|nameerror/i,
    name: 'ReferenceError',
    cause: 'A name is used in a scope where it was never declared or imported.',
    steps: [
      'Check the import at the top of the file that failed.',
      'Confirm the name is spelled the same way in both places.',
      'Rebuild once the import is fixed.'
    ]
  },
  {
    re: /syntaxerror|unexpected token|unexpected identifier|invalid or unexpected/i,
    name: 'SyntaxError',
    cause: 'The file does not parse, so nothing after it can run.',
    steps: [
      'Run the project formatter or parser on the file named in the trace.',
      'Look for a missing bracket, comma or quote near the reported line.',
      'Re-run the build once the file parses.'
    ]
  },
  {
    re: /econnrefused|econnreset|ehostunreach|eaddrinuse|enotfound/i,
    name: 'ConnectionError',
    cause: 'The app tried to reach a service that was not listening on that address.',
    steps: [
      'Check that the service is running and the address and port are right.',
      'Print the host and port the app actually uses.',
      'Try the same connection from a terminal on the same machine.'
    ]
  },
  {
    re: /etimedout|timeout|timed out|deadline exceeded/i,
    name: 'Timeout',
    cause: 'A call took longer than the timeout allows.',
    steps: [
      'Measure how long the slow call takes.',
      'Raise the timeout only after the slow part is understood.',
      'Add a retry with backoff for calls that fail this way.'
    ]
  },
  {
    re: /module not found|cannot find module|modulenotfounderror|no such file or directory|enoent/i,
    name: 'MissingModule',
    cause: 'A file or package the code needs is not present in the upload.',
    steps: [
      'Confirm the file exists at the path the code expects.',
      'Check that the dependency is declared in the manifest.',
      'Install the missing dependency and run the command again.'
    ]
  },
  {
    re: /jwt|token.*expired|signature has expired|unauthorized|forbidden/i,
    name: 'AuthError',
    cause: 'A credential was rejected, so the request was never allowed through.',
    steps: [
      'Compare the token expiry with the server clock.',
      'Check how tokens are refreshed when they expire.',
      'Return a clear 401 instead of letting the error escape.'
    ]
  },
  {
    re: /unhandled|unhandledpromiserejection|panic|fatal error/i,
    name: 'UnhandledError',
    cause: 'An error escaped a handler that was supposed to catch it.',
    steps: [
      'Find the nearest try or catch around the frame in the trace.',
      'Decide whether the error should be handled or rethrown.',
      'Add a catch that records the error and returns a safe response.'
    ]
  }
];

export function findProjectFile(project, path) {
  if (!path) return null;
  if (project.byPath[path]) return project.byPath[path];

  const base = path.split('/').pop();
  const suffix = '/' + path;

  let match = project.files.find((file) => file.path.endsWith(suffix));
  if (match) return match;

  match = project.files.find((file) => file.path.split('/').pop() === base);
  return match || null;
}

export function lineAt(file, line) {
  if (!file || !file.lines || !line) return null;
  const index = line - 1;
  if (index < 0 || index >= file.lines.length) return null;
  return file.lines[index].trim();
}

function traceReferences(text) {
  const refs = [];
  const re = /([A-Za-z0-9_./\\-]*[A-Za-z0-9_-]+\.[A-Za-z0-9]{1,10}):(\d+)/g;
  let match = re.exec(text);
  while (match) {
    refs.push({ path: match[1].replace(/\\/g, '/'), line: Number(match[2]) });
    match = re.exec(text);
  }
  return refs;
}

function firstLine(text) {
  const line = text.split('\n').map((item) => item.trim()).find(Boolean);
  return line || 'Error';
}

function hintFor(text) {
  return ERROR_HINTS.find((hint) => hint.re.test(text)) || null;
}

function adaptPresetToProject(preset, project) {
  const files = [];
  const ev = [];
  let matched = 0;

  preset.files.forEach(([path, line, reason]) => {
    const file = findProjectFile(project, path);
    if (!file) return;
    matched++;
    const realLine = line && lineAt(file, line) ? line : null;
    files.push([file.path, realLine, reason]);
  });

  preset.ev.forEach(([path, line, snippet]) => {
    const file = findProjectFile(project, path);
    if (!file) return;
    const realSnippet = lineAt(file, line) || snippet;
    ev.push([file.path, line, realSnippet]);
  });

  if (!matched && !ev.length) return null;

  const missing = preset.files
    .map((entry) => entry[0])
    .filter((path) => !findProjectFile(project, path));

  const conf = Math.max(
    2,
    Math.min(10, preset.conf - (matched === preset.files.length ? 0 : 1))
  );

  return {
    n: preset.n,
    log: preset.log,
    files: files.length ? files : preset.files,
    causes: preset.causes,
    steps: preset.steps,
    why: preset.why,
    conf,
    ev: ev.length ? ev : preset.ev,
    unk:
      preset.unk +
      (missing.length
        ? ' The upload does not contain ' +
        missing.join(', ') +
        ', so that part of the trace is not in the code.'
        : ''),
    tests: preset.tests
  };
}

function analyzeTrace(text, project) {
  const refs = traceReferences(text);
  const matched = [];

  refs.forEach((ref) => {
    const file = findProjectFile(project, ref.path);
    if (!file) return;
    if (matched.some((item) => item.path === file.path)) return;
    matched.push({ path: file.path, line: ref.line, file });
  });

  const hint = hintFor(text);
  const errorName = hint ? hint.name : firstLine(text).split(':')[0].slice(0, 40);

  const files = matched.map((item) => [
    item.path,
    item.line && lineAt(item.file, item.line) ? item.line : null,
    'Named in the stack trace'
  ]);

  const ev = matched
    .map((item) => {
      const snippet = lineAt(item.file, item.line);
      return snippet ? [item.path, item.line, snippet] : null;
    })
    .filter(Boolean)
    .slice(0, 4);

  const causes = hint
    ? [hint.cause]
    : [
      'The trace names ' +
      (matched.length ? matched[0].path : 'a file') +
      ', but the runtime state that produced the failure is not in the code.',
      'The next step is to reproduce the failure and watch the values around that line.'
    ];

  const steps = hint
    ? hint.steps
    : [
      'Reproduce the failure with the same input that produced the trace.',
      'Add a log line just before the frame named in the trace.',
      'Compare the logged value with what the code expects.'
    ];

  const tests = matched.length
    ? matched.slice(0, 3).map((item) => {
      const name = item.path.split('/').pop().replace(/\.[^.]+$/, '');
      return 'Add a regression test for ' + name + ' that fails with this error.';
    })
    : ['Add a test that reproduces the reported failure before changing any code.'];

  const conf = Math.max(2, Math.min(9, 3 + matched.length * 2));

  const why = matched.length
    ? 'The trace points into ' +
    matched[0].path +
    (matched[0].line ? ' at line ' + matched[0].line : '') +
    ' of the uploaded project, and the code at that line is shown as evidence below.'
    : 'The uploaded project was searched for every path in the trace, but none of them exist in it, so the failure cannot be pinned to a file yet.';

  return {
    n: errorName || 'Error',
    log: text,
    files: files.length
      ? files
      : [
        [
          'No matching file in the upload',
          null,
          'The trace names a path that is not part of this project'
        ]
      ],
    causes,
    steps,
    why,
    conf,
    ev: ev.length
      ? ev
      : [
        [
          'No matching file in the upload',
          0,
          'Every path in the trace was looked for in the upload and none matched.'
        ]
      ],
    unk: 'The uploaded code shows what the code does, not what happened at runtime. The input that triggered the failure and the state at that moment are not in the archive.',
    tests
  };
}

export function analyzeErrorLog(text, project) {
  if (!text || !text.trim()) return null;

  for (let i = 0; i < FAILURE_PRESETS.length; i++) {
    if (FAILURE_PRESETS[i].re.test(text)) {
      if (!project || project.source !== 'upload') return FAILURE_PRESETS[i];
      const adapted = adaptPresetToProject(FAILURE_PRESETS[i], project);
      return adapted || analyzeTrace(text, project);
    }
  }

  if (project && project.source === 'upload') {
    return analyzeTrace(text, project);
  }

  return null;
}

/**
 * Builds a realistic stack trace from a spot that was actually found in the
 * uploaded code, so the failure page starts from the project's own files.
 */
export function buildExampleTrace(project) {
  if (!project || !project.risks.length) return null;
  const risk = project.risks[0];

  let header = 'TypeError: Cannot read properties of undefined';
  if (risk.kind === 'Hard coded secret') {
    header = 'Error: credentials leaked into the build';
  } else if (risk.kind === 'Dynamic code execution') {
    header = 'SyntaxError: unexpected token';
  } else if (risk.kind === 'Silent error swallow') {
    header = 'TypeError: Cannot read properties of undefined';
  } else if (risk.kind === 'Unfinished work') {
    header = 'Error: unfinished work left in the release';
  }

  const stack = ['    at ' + risk.path + ':' + risk.line];
  const importers = project.importedBy[risk.path] || [];
  if (importers.length) {
    stack.push('    at ' + importers[0] + ':1');
  }

  return header + '\n' + stack.join('\n');
}
