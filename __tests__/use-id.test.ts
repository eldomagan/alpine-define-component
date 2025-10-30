import { describe, it, expect, beforeEach } from 'vitest';
import { useId } from '../src/use-id';

describe('useId', () => {
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

    expect(id1).toMatch(/^custom-\d+$/);
    expect(id2).toMatch(/^custom-\d+$/);
    expect(id3).toMatch(/^custom-\d+$/);
    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
  });

  it('should maintain separate counters for different prefixes', () => {
    const id1 = useId('prefix1');
    const id2 = useId('prefix2');
    const id3 = useId('prefix1');
    const id4 = useId('prefix2');

    expect(id1).toMatch(/^prefix1-\d+$/);
    expect(id2).toMatch(/^prefix2-\d+$/);
    expect(id3).toMatch(/^prefix1-\d+$/);
    expect(id4).toMatch(/^prefix2-\d+$/);
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

    expect(id).toMatch(/^-\d+$/);
  });
});
