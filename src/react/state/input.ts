import { useEffect, useRef } from 'react';

export type InputSnapshot = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  inspect: boolean;
  yawLeft: boolean;
  yawRight: boolean;
};

const emptySnapshot: InputSnapshot = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  inspect: false,
  yawLeft: false,
  yawRight: false
};

export function useKeyboardInput() {
  const keys = useRef(new Set<string>());
  const inspectQueued = useRef(false);

  useEffect(() => {
    const handleDown = (event: KeyboardEvent) => {
      keys.current.add(event.code);
      if (event.code === 'KeyF') {
        inspectQueued.current = true;
      }
    };

    const handleUp = (event: KeyboardEvent) => {
      keys.current.delete(event.code);
    };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  return {
    read(): InputSnapshot {
      const current = keys.current;
      const snapshot = {
        ...emptySnapshot,
        forward: current.has('KeyW') || current.has('ArrowUp'),
        backward: current.has('KeyS') || current.has('ArrowDown'),
        left: current.has('KeyA') || current.has('ArrowLeft'),
        right: current.has('KeyD') || current.has('ArrowRight'),
        sprint: current.has('ShiftLeft') || current.has('ShiftRight'),
        yawLeft: current.has('KeyQ'),
        yawRight: current.has('KeyE'),
        inspect: inspectQueued.current
      };
      inspectQueued.current = false;
      return snapshot;
    }
  };
}
