import './recursion-contract.js';
import './recursion-questions.js';
import './recursion-presentation.js';
import { RecursionStack, RecursionInputs, RecursionHistory } from './recursion-workspace.jsx';
BSITVisualizerRegistry.registerRenderer('python-recursion', RecursionStack);
BSITVisualizerRegistry.registerInputControls('python-recursion-preset', RecursionInputs);
BSITVisualizerRegistry.registerEvidenceView('recursion-history', RecursionHistory, { label: 'Completed calls', icon: 'list' });
export { RecursionWorkspace, RecursionStack, RecursionInputs, RecursionHistory } from './recursion-workspace.jsx';
