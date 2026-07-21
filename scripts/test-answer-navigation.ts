import assert from 'node:assert/strict';
import {
  popAnswer,
  pushAnswer,
  type AnswerNavigationState,
} from '../components/chat/answer-navigation';

const empty: AnswerNavigationState = { stack: [] };
const parent = { turnId: 'answer-parent', scrollTop: 384 };
const child = { turnId: 'answer-child', scrollTop: 96 };

const nested = pushAnswer(pushAnswer(empty, parent), child);
assert.deepEqual(nested.stack, [parent, child]);

const firstBack = popAnswer(nested);
assert.deepEqual(firstBack.entry, child);
assert.deepEqual(firstBack.navigation.stack, [parent]);

const secondBack = popAnswer(firstBack.navigation);
assert.deepEqual(secondBack.entry, parent);
assert.deepEqual(secondBack.navigation.stack, []);

const atRoot = popAnswer(secondBack.navigation);
assert.equal(atRoot.entry, null);
assert.deepEqual(atRoot.navigation.stack, []);

console.log('Answer navigation stack tests passed.');
