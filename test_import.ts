import * as schema from './drizzle/schema';
console.log('Schema loaded successfully');
console.log('Tables:', Object.keys(schema).filter(k => typeof schema[k] === 'object' && schema[k] && 'name' in schema[k]));
