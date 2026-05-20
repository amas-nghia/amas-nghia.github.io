export class InputState {
  private readonly pressed = new Set<string>();
  private pointerLocked = false;

  public readonly pointer = {
    x: 0,
    y: 0,
    deltaX: 0,
    deltaY: 0
  };

  public constructor(private readonly target: HTMLElement) {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  public isDown(...codes: string[]): boolean {
    return codes.some((code) => this.pressed.has(code));
  }

  public requestPointerLock(): void {
    this.target.requestPointerLock?.();
  }

  public consumePointerDelta(): { x: number; y: number } {
    const delta = { x: this.pointer.deltaX, y: this.pointer.deltaY };
    this.pointer.deltaX = 0;
    this.pointer.deltaY = 0;
    return delta;
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.pressed.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    this.pointer.x = event.clientX;
    this.pointer.y = event.clientY;

    if (this.pointerLocked) {
      this.pointer.deltaX += event.movementX;
      this.pointer.deltaY += event.movementY;
    }
  };

  private readonly handlePointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.target;
  };
}
