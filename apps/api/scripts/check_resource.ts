import { Resource } from '@opentelemetry/resources';
console.log(typeof Resource);
try {
  new Resource({});
  console.log('Resource instantiation success');
} catch (e) {
  console.log('Resource instantiation failed', e);
}
