import { describe, it, expect, beforeEach } from 'vitest';
import { useId, resetIds } from '../src/use-id';

describe('useId', () => {
  beforeEach(() => {
    resetIds();
  });
  it('should generate unique IDs with default prefix', () => {
    const id1 = useId();
    const id2 = useId();
    const id3 = useId();

    expect(id1).toBe('id-1');
    expect(id2).toBe('id-2');
    expect(id3).toBe('id-3');
  });

  it('should generate unique IDs with custom prefix', () => {
    const id1 = useId('custom');
    const id2 = useId('custom');
    const id3 = useId('custom');

    expect(id1).toBe('custom-1');
    expect(id2).toBe('custom-2');
    expect(id3).toBe('custom-3');
  });

  it('should maintain separate counters for different prefixes', () => {
    const id1 = useId('prefix1');
    const id2 = useId('prefix2');
    const id3 = useId('prefix1');
    const id4 = useId('prefix2');

    expect(id1).toBe('prefix1-1');
    expect(id2).toBe('prefix2-1');
    expect(id3).toBe('prefix1-2');
    expect(id4).toBe('prefix2-2');
  });

  it('should increment counter for each call with same prefix', () => {
    const prefix = 'test';
    const ids: string[] = [];

    for (let i = 0; i < 5; i++) {
      ids.push(useId(prefix));
    }

    // Extract numbers from IDs
    const numbers = ids.map((id) => parseInt(id.split('-')[1]));

    // Check that numbers are sequential
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBe(numbers[i - 1] + 1);
    }
  });

  it('should handle empty string prefix', () => {
    const id = useId('');

    expect(id).toBe('-1');
  });
});
