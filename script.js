// ========================
// Script.js — Final Version
// ========================

const regexExamples = {
  "a*b": "a*b",
  "ab|ba": "ab|ba",
  "(0|1)*11": "(0|1)*11"
};

function getPredefinedNFA(name) {
  const examples = {
    "starts-with-0": {
      states: ["q0", "q1"],
      alphabet: ["0", "1"],
      transitions: {
        q0: { "0": ["q1"] },
        q1: { "0": ["q1"], "1": ["q1"] }
      },
      startState: "q0",
      finalStates: ["q1"]
    },
    "ends-in-01": {
      states: ["q0", "q1", "q2"],
      alphabet: ["0", "1"],
      transitions: {
        q0: { "0": ["q0"], "1": ["q0", "q1"] },
        q1: { "1": ["q2"] },
        q2: {}
      },
      startState: "q0",
      finalStates: ["q2"]
    },
    "contains-101": {
      states: ["q0", "q1", "q2", "q3"],
      alphabet: ["0", "1"],
      transitions: {
        q0: { "0": ["q0"], "1": ["q0", "q1"] },
        q1: { "0": ["q2"] },
        q2: { "1": ["q3"] },
        q3: {}
      },
      startState: "q0",
      finalStates: ["q3"]
    },
    "even-zeros": {
      states: ["q0", "q1"],
      alphabet: ["0", "1"],
      transitions: {
        q0: { "0": ["q1"], "1": ["q0"] },
        q1: { "0": ["q0"], "1": ["q1"] }
      },
      startState: "q0",
      finalStates: ["q0"]
    },
    "epsilon-nfa": {
      states: ["q0", "q1", "q2"],
      alphabet: ["a", "b"],
      transitions: {
        q0: { "ε": ["q1"] },
        q1: { "a": ["q2"] },
        q2: {}
      },
      startState: "q0",
      finalStates: ["q2"]
    }
  };
  return examples[name];
}

const regexBtn = document.getElementById("regex-btn");
regexBtn.addEventListener("click", () => {
  const regex = document.getElementById("regex-select").value.trim();
  if (!regex) return alert("Select a regular expression.");

  const nfa = regexToNFA(regex);
  const dfa = convertNFAToDFA(nfa);
  showGraphs(nfa, dfa, document.getElementById("regexNfaGraph"), document.getElementById("regexDfaGraph"));
});

function regexToNFA(regex) {
  let stateId = 0;
  const newState = () => `q${stateId++}`;

  function build(ast) {
    if (ast.type === 'char') {
      const start = newState(), end = newState();
      return {
        states: [start, end],
        alphabet: [ast.value],
        transitions: {
          [start]: { [ast.value]: [end] },
          [end]: {}
        },
        startState: start,
        finalStates: [end]
      };
    }
    if (ast.type === 'concat') {
      const left = build(ast.left), right = build(ast.right);
      const transitions = { ...left.transitions, ...right.transitions };
      left.finalStates.forEach(f => {
        transitions[f] ??= {};
        transitions[f]['ε'] ??= [];
        transitions[f]['ε'].push(right.startState);
      });
      return {
        states: [...left.states, ...right.states],
        alphabet: [...new Set([...left.alphabet, ...right.alphabet])],
        transitions,
        startState: left.startState,
        finalStates: right.finalStates
      };
    }
    if (ast.type === 'union') {
      const left = build(ast.left), right = build(ast.right);
      const start = newState(), end = newState();
      const transitions = {
        [start]: { 'ε': [left.startState, right.startState] },
        [end]: {},
        ...left.transitions,
        ...right.transitions
      };
      [...left.finalStates, ...right.finalStates].forEach(f => {
        transitions[f] ??= {};
        transitions[f]['ε'] ??= [];
        transitions[f]['ε'].push(end);
      });
      return {
        states: [start, end, ...left.states, ...right.states],
        alphabet: [...new Set([...left.alphabet, ...right.alphabet])],
        transitions,
        startState: start,
        finalStates: [end]
      };
    }
    if (ast.type === 'star') {
      const sub = build(ast.sub);
      const start = newState(), end = newState();
      const transitions = {
        [start]: { 'ε': [sub.startState, end] },
        [end]: {},
        ...sub.transitions
      };
      sub.finalStates.forEach(f => {
        transitions[f] ??= {};
        transitions[f]['ε'] ??= [];
        transitions[f]['ε'].push(sub.startState, end);
      });
      return {
        states: [start, end, ...sub.states],
        alphabet: sub.alphabet,
        transitions,
        startState: start,
        finalStates: [end]
      };
    }
  }

  function parse(regex) {
    const precedence = { '|': 1, '.': 2, '*': 3 };
    const tokens = [];
    const chars = regex.split('');

    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      tokens.push(c);
      const next = chars[i + 1];
      if (c !== '(' && c !== '|' && c !== '.' && next && (next === '(' || /[a-z01]/.test(next))) {
        tokens.push('.');
      }
    }

    const output = [], ops = [];
    for (const token of tokens) {
      if (/^[a-z01]$/.test(token)) {
        output.push({ type: 'char', value: token });
      } else if (token === '*') {
        const a = output.pop();
        output.push({ type: 'star', sub: a });
      } else if (token === '.' || token === '|') {
        while (ops.length && precedence[ops.at(-1)] >= precedence[token]) {
          const op = ops.pop();
          const right = output.pop();
          const left = output.pop();
          output.push({ type: op === '.' ? 'concat' : 'union', left, right });
        }
        ops.push(token);
      } else if (token === '(') {
        ops.push(token);
      } else if (token === ')') {
        while (ops.length && ops.at(-1) !== '(') {
          const op = ops.pop();
          const right = output.pop();
          const left = output.pop();
          output.push({ type: op === '.' ? 'concat' : 'union', left, right });
        }
        ops.pop();
      }
    }

    while (ops.length) {
      const op = ops.pop();
      const right = output.pop();
      const left = output.pop();
      output.push({ type: op === '.' ? 'concat' : 'union', left, right });
    }

    return output[0];
  }

  const ast = parse(regex);
  return build(ast);
}

function convertNFAToDFA(nfa) {
  // Compute epsilon closure of a set of states
  const epsilonClosure = (states) => {
    const stack = [...states];
    const closure = new Set(states);
    while (stack.length > 0) {
      const state = stack.pop();
      const epsTransitions = nfa.transitions[state]?.['ε'] || [];
      for (const target of epsTransitions) {
        if (!closure.has(target)) {
          closure.add(target);
          stack.push(target);
        }
      }
    }
    return [...closure].sort();
  };

  const dfaStatesMap = new Map();  // Maps "q1,q2" -> Set of NFA states
  const dfaTransitions = [];
  const queue = [];

  const startSet = epsilonClosure([nfa.startState]);
  const startName = startSet.join(',');

  dfaStatesMap.set(startName, new Set(startSet));
  queue.push(startName);

  while (queue.length > 0) {
    const currentName = queue.shift();
    const currentSet = dfaStatesMap.get(currentName);

    for (const symbol of nfa.alphabet) {
      if (symbol === 'ε') continue;

      let moveSet = new Set();
      for (const state of currentSet) {
        const targets = nfa.transitions[state]?.[symbol] || [];
        targets.forEach(t => moveSet.add(t));
      }

      const closureSet = epsilonClosure([...moveSet]);
      if (closureSet.length === 0) continue;

      const closureName = closureSet.join(',');
      if (!dfaStatesMap.has(closureName)) {
        dfaStatesMap.set(closureName, new Set(closureSet));
        queue.push(closureName);
      }

      dfaTransitions.push({ from: currentName, to: closureName, label: symbol });
    }
  }

  const finalStates = [];
  for (const [dfaStateName, nfaSubset] of dfaStatesMap.entries()) {
    for (const nfaFinal of nfa.finalStates) {
      if (nfaSubset.has(nfaFinal)) {
        finalStates.push(dfaStateName);
        break;
      }
    }
  }

  return {
    states: [...dfaStatesMap.keys()],
    alphabet: nfa.alphabet.filter(sym => sym !== 'ε'),
    transitions: dfaTransitions,
    startState: startName,
    finalStates
  };
}


function showGraphs(nfa, dfa, nfaTarget, dfaTarget) {
  const nfaNodes = new vis.DataSet();
  const nfaEdges = new vis.DataSet();
  const dfaNodes = new vis.DataSet();
  const dfaEdges = new vis.DataSet();

  nfa.states.forEach(state => {
    nfaNodes.add({ id: state, label: state, color: nfa.finalStates.includes(state) ? '#86efac' : '#bae6fd' });
  });
  for (const from in nfa.transitions) {
    for (const symbol in nfa.transitions[from]) {
      nfa.transitions[from][symbol].forEach(to => {
        nfaEdges.add({ from, to, label: symbol, arrows: "to" });
      });
    }
  }

  dfa.states.forEach(state => {
    dfaNodes.add({ id: state, label: state, color: dfa.finalStates.includes(state) ? '#86efac' : '#93c5fd' });
  });
  dfa.transitions.forEach(({ from, to, label }) => {
    dfaEdges.add({ from, to, label, arrows: "to" });
  });

  new vis.Network(nfaTarget, { nodes: nfaNodes, edges: nfaEdges }, { physics: false });
  new vis.Network(dfaTarget, { nodes: dfaNodes, edges: dfaEdges }, { physics: false });
}
// ==============================
// Predefined NFA Button Handler
// ==============================
const predefinedBtn = document.getElementById("start-btn");
predefinedBtn.addEventListener("click", () => {
  const selectedKey = document.getElementById("nfa-select").value;
  if (!selectedKey) return alert("Please select a predefined NFA example.");

  const nfa = getPredefinedNFA(selectedKey);
  const dfa = convertNFAToDFA(nfa);
  showGraphs(nfa, dfa, document.getElementById("nfaGraph"), document.getElementById("dfaGraph"));
});
// ==============================
// Custom Input Handler (UPDATED)
// ==============================
function handleCustomInput() {
  const input = document.getElementById("customInput").value.trim();
  if (!input || !/^[01abε]*$/.test(input)) {
    return alert("Please enter a valid string using only 0, 1, a, b, or ε.");
  }

  const nfa = buildNFAFromString(input);
  const dfa = convertNFAToDFA(nfa);
  showGraphs(nfa, dfa, document.getElementById("customNfaGraph"), document.getElementById("customDfaGraph"));
}

function buildNFAFromString(str) {
  const states = [];
  const transitions = {};
  const alphabet = new Set();
  let stateCount = 0;

  const startState = `q${stateCount++}`;
  states.push(startState);
  transitions[startState] = {};

  let currentStates = [startState];

  for (let i = 0; i < str.length; i++) {
    const symbol = str[i];
    if (symbol !== 'ε') alphabet.add(symbol);

    const newStates = [];

    currentStates.forEach(cs => {
      // Introduce non-determinism:
      // Option 1: Go to next state
      const next1 = `q${stateCount++}`;
      // Option 2: Stay at current state (self-loop)
      const next2 = cs;

      states.push(next1);
      if (!transitions[cs]) transitions[cs] = {};
      if (!transitions[cs][symbol]) transitions[cs][symbol] = [];

      transitions[cs][symbol].push(next1, next2);  // two options
      transitions[next1] = {};
      newStates.push(next1, next2);
    });

    currentStates = newStates;
  }

  return {
    states: Array.from(new Set(states)),
    alphabet: Array.from(alphabet),
    transitions,
    startState,
    finalStates: Array.from(new Set(currentStates))
  };
}