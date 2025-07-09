function convertToDFA(nfa) {
  const dfaTransitions = [];
  const dfaStateNames = new Map(); // Key: sorted state string, Value: DFA state name
  const visited = new Set();
  const queue = [];

  const alphabet = nfa.alphabet.filter(a => a !== 'ε');
  let dfaStateCount = 0;

  function getStateName(nfaSet) {
    const key = Array.from(nfaSet).sort().join(',');
    if (!dfaStateNames.has(key)) {
      dfaStateNames.set(key, 'D' + dfaStateCount++);
    }
    return dfaStateNames.get(key);
  }

  function epsilonClosure(states) {
    const stack = [...states];
    const closure = new Set(states);
    while (stack.length) {
      const state = stack.pop();
      for (let t of nfa.transitions) {
        if (t.from === state && t.label === 'ε' && !closure.has(t.to)) {
          closure.add(t.to);
          stack.push(t.to);
        }
      }
    }
    return closure;
  }

  function move(states, symbol) {
    const result = new Set();
    for (let state of states) {
      for (let t of nfa.transitions) {
        if (t.from === state && t.label === symbol) {
          result.add(t.to);
        }
      }
    }
    return result;
  }

  const startClosure = epsilonClosure(new Set([nfa.startState]));
  const startKey = Array.from(startClosure).sort().join(',');
  dfaStateNames.set(startKey, 'D0');
  queue.push(startClosure);
  visited.add(startKey);

  const dfaAcceptStates = new Set();

  while (queue.length > 0) {
    const currentSet = queue.shift();
    const currentName = getStateName(currentSet);

    for (let symbol of alphabet) {
      const moveSet = move(currentSet, symbol);
      const closure = epsilonClosure(moveSet);
      if (closure.size === 0) continue;

      const closureKey = Array.from(closure).sort().join(',');
      const toName = getStateName(closure);

      dfaTransitions.push({
        from: currentName,
        to: toName,
        label: symbol
      });

      if (!visited.has(closureKey)) {
        visited.add(closureKey);
        queue.push(closure);
      }
    }

    for (let acc of nfa.acceptStates) {
      if (currentSet.has(acc)) {
        dfaAcceptStates.add(currentName);
      }
    }
  }

  return {
    transitions: dfaTransitions,
    acceptStates: Array.from(dfaAcceptStates)
  };
}
