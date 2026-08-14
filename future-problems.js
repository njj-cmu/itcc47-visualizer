/* Instructor-preview drafts for Modules 5–8. Modules 1–4 use the canonical checked pipeline. */
const ITCC47FutureProblems = (() => {
  const modules = {
    5: { checkpointId:'m5-divide-conquer',cloIds:[4,5,6] },
    6: { checkpointId:'m6-bst',cloIds:[1,2,4,5,6] },
    7: { checkpointId:'m7-traversal',cloIds:[1,2,4,5,6] },
    8: { checkpointId:'m8-dp',cloIds:[2,3,4,5] },
  };
  const specs = [
    ['recursive-sum','Recursive range sum',5,'Read n and output 1 + 2 + ... + n. Use a shrinking recursive argument in your final solution.','READ n\nsum <- 0\nFOR i <- 1 TO n DO\n  sum <- sum + i\nENDFOR\nWRITE sum',[[[5],[15]],[[0],[0]]]],
    ['recursive-binary-range','Recursive duplicate range',5,'Read a lower and upper bound for a duplicate target. Output the number of occupied positions in the inclusive range.','READ lower\nREAD upper\nIF lower = -1 THEN\n  WRITE 0\nELSE\n  WRITE upper - lower + 1\nENDIF',[[[2,5],[4]],[[-1,-1],[0]]]],
    ['merge-two-sorted','Stable merge of two ranges',5,'Read the first keys from left and right buffers. Output LEFT when a stable merge must take the left record on a tie.','READ left_key\nREAD right_key\nIF left_key <= right_key THEN\n  WRITE "LEFT"\nELSE\n  WRITE "RIGHT"\nENDIF',[[[4,4],['LEFT']],[[9,3],['RIGHT']]]],
    ['merge-sort-count','Count merge-sort levels',5,'Read n and repeatedly halve it with upward rounding. Output the number of split levels until one item remains.','READ n\nlevels <- 0\nWHILE n > 1 DO\n  n <- (n + 1) DIV 2\n  levels <- levels + 1\nENDWHILE\nWRITE levels',[[[8],[3]],[[9],[4]]]],
    ['bst-insert-order','Build a BST in order',6,'Read a root and a new key. Output LEFT, RIGHT, or DUPLICATE for the required insertion decision.','READ root\nREAD key\nIF key < root THEN\n  WRITE "LEFT"\nELSE IF key > root THEN\n  WRITE "RIGHT"\nELSE\n  WRITE "DUPLICATE"\nENDIF',[[[10,4],['LEFT']],[[10,10],['DUPLICATE']]]],
    ['tree-inorder','Produce an inorder traversal',6,'Read a left child, root, and right child; output them in inorder sequence.','READ left\nREAD root\nREAD right\nWRITE left\nWRITE root\nWRITE right',[[[2,5,9],[2,5,9]],[[1,1,3],[1,1,3]]]],
    ['tree-height','Measure tree height',6,'Read the left and right subtree heights. Output one plus the larger height.','READ left_height\nREAD right_height\nIF left_height > right_height THEN\n  height <- left_height + 1\nELSE\n  height <- right_height + 1\nENDIF\nWRITE height',[[[2,4],[5]],[[0,0],[1]]]],
    ['bst-search-path','Report a BST search path',6,'Read a root and target. Output FOUND when equal, otherwise the first branch the search follows.','READ root\nREAD target\nIF target = root THEN\n  WRITE "FOUND"\nELSE IF target < root THEN\n  WRITE "LEFT"\nELSE\n  WRITE "RIGHT"\nENDIF',[[[8,8],['FOUND']],[[8,12],['RIGHT']]]],
    ['graph-degree','Compute graph degrees',7,'Read incoming and outgoing edge counts. Output their total degree.','READ incoming\nREAD outgoing\nWRITE incoming + outgoing',[[[3,4],[7]],[[0,5],[5]]]],
    ['bfs-order','Deterministic BFS order',7,'Read source and two already sorted neighbors. Output the source, then neighbors in queue order.','READ source\nREAD first_neighbor\nREAD second_neighbor\nWRITE source\nWRITE first_neighbor\nWRITE second_neighbor',[[[1,2,4],[1,2,4]],[[7,3,9],[7,3,9]]]],
    ['shortest-unweighted','Shortest unweighted path',7,'Read a BFS distance and output the number of edges, preserving -1 for unreachable targets.','READ distance\nWRITE distance',[[[4],[4]],[[-1],[-1]]]],
    ['dfs-components','Count DFS components',7,'Read how many new DFS roots were required and output the component count.','READ roots\nWRITE roots',[[[3],[3]],[[1],[1]]]],
    ['greedy-coin-count','Greedy coin count',8,'For denominations 4, 3, and 1, read an amount and output the greedy number of coins.','READ amount\ncount <- amount DIV 4\namount <- amount % 4\ncount <- count + amount DIV 3\namount <- amount % 3\ncount <- count + amount\nWRITE count',[[[6],[3]],[[8],[2]]]],
    ['greedy-counterexample','Find a greedy counterexample',8,'For coins 4, 3, and 1, output COUNTEREXAMPLE when greedy uses more coins than the known optimum.','READ greedy_count\nREAD optimal_count\nIF greedy_count > optimal_count THEN\n  WRITE "COUNTEREXAMPLE"\nELSE\n  WRITE "SAFE"\nENDIF',[[[3,2],['COUNTEREXAMPLE']],[[2,2],['SAFE']]]],
    ['dp-min-coins','Minimum coins by DP',8,'Read three candidate subproblem counts and output one plus the smallest.','READ a\nREAD b\nREAD c\nbest <- a\nIF b < best THEN\n  best <- b\nENDIF\nIF c < best THEN\n  best <- c\nENDIF\nWRITE best + 1',[[[2,1,4],[2]],[[0,3,2],[1]]]],
    ['knapsack-best-value','0/1 knapsack best value',8,'Read the exclude and include values for one DP state. Output the larger value; ties keep EXCLUDE.','READ exclude_value\nREAD include_value\nIF include_value > exclude_value THEN\n  WRITE include_value\nELSE\n  WRITE exclude_value\nENDIF',[[[12,17],[17]],[[9,9],[9]]]],
  ];

  function create([id,title,module,statement,starter,cases]) {
    const meta = modules[module];
    const mapping = typeof ITCC47Curriculum === 'undefined' ? null : ITCC47Curriculum.getResource('problem',id);
    return Object.freeze({ id,title,module:`Module ${module}`,difficulty:module < 5 ? 'Medium' : 'Challenge',contentVersion:1,
      checkpointId:mapping?.checkpointId || meta.checkpointId,cloIds:Object.freeze([...meta.cloIds]),reviewStatus:'draft',statement,
      rules:Object.freeze([['Invariant','Preserve the structure or algorithm invariant named in the statement.'],['Output','Display only the required values in the stated order.'],['Evidence','Use the trace and visible cases to justify boundary behavior.']]),
      ioNote:'Read values in the order shown by the examples. Display only the required output; no prompts or labels.',starter,
      visibleTests:Object.freeze(cases.map(([inputs,expected],index)=>Object.freeze({inputs:Object.freeze(inputs),expected:Object.freeze(expected),note:index ? undefined : 'core behavior'}))),salt:'',hidden:Object.freeze([]) });
  }
  const problems = Object.freeze(specs.map(create));
  function register(target) { const ids = new Set(target.map((problem)=>problem.id)); problems.forEach((problem)=>{ if(!ids.has(problem.id)) target.push(problem); }); return target; }
  return Object.freeze({ problems,register });
})();
