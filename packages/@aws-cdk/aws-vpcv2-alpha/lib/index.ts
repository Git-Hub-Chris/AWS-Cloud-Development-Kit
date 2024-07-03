// The index.ts files contains a list of files we want to
// include as part of the public API of this module.
// In general, all files including L2 classes will be listed here,
// while all files including only utility functions will be omitted from here.

// obviously, the ExampleResource L2 should be exported
export * from './vpc-v2';
export * from './ipam';
export * from './vpc-v2-base';
export * from './subnet-v2';
export * from './route';

// notice that private/example-resource-common.ts is not exported!
