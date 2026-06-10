// 결정성 가드: src/core는 렌더/시간/비시드 난수 접근 금지 (플랜 §1 결정성 규약)
import tseslint from 'typescript-eslint';

const coreDeterminismRules = {
  'no-restricted-imports': ['error', { paths: [{ name: 'phaser', message: 'core는 렌더 import 금지' }] }],
  'no-restricted-globals': [
    'error',
    { name: 'Date', message: 'core에서 Date 금지 (틱 기반 시간만)' },
    { name: 'performance', message: 'core에서 performance 금지' },
    { name: 'window', message: 'core에서 DOM 금지' },
    { name: 'document', message: 'core에서 DOM 금지' },
  ],
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: '시드 RNG(rng.ts)만 사용' },
    { object: 'Math', property: 'sin', message: '초월함수 금지 — 단위벡터 연산 사용' },
    { object: 'Math', property: 'cos', message: '초월함수 금지 — 단위벡터 연산 사용' },
    { object: 'Math', property: 'tan', message: '초월함수 금지' },
    { object: 'Math', property: 'atan2', message: '초월함수 금지 — 단위벡터 연산 사용' },
    { object: 'Math', property: 'hypot', message: 'hypot 구현 비결정 — sqrt(x*x+y*y) 사용' },
    { object: 'Math', property: 'exp', message: '초월함수 금지' },
    { object: 'Math', property: 'log', message: '초월함수 금지' },
    { object: 'Math', property: 'pow', message: '** 또는 곱셈 사용 (정수 지수만)' },
  ],
};

export default [
  { ignores: ['dist/**', 'node_modules/**', 'e2e/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/core/**/*.ts', 'src/data/**/*.ts'],
    rules: coreDeterminismRules,
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['scripts/**/*.ts', 'tests/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
];
