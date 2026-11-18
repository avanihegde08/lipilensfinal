// In-memory hand-off of the current photo between the capture, crop and processing screens.
type CaptureState = { source: string | null; prepared: string | null };

let state: CaptureState = { source: null, prepared: null };

export const capture = {
  get: () => state,
  setSource(source: string) {
    state = { source, prepared: null };
  },
  setPrepared(prepared: string) {
    state = { ...state, prepared };
  },
  clear() {
    state = { source: null, prepared: null };
  },
};
