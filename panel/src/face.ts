/**
 * The face at the top of the page. The page only talks to a face through this interface, so another face (or a
 * future build of the firmware's face engine as WebAssembly) can take its place without touching the rest.
 */
export type FaceState = "idle" | "listening" | "thinking" | "speaking" | "error";

export interface Face {
  /** What the assistant is doing */
  setState(state: FaceState): void;
  /** How loud the assistant's voice is right now (0..1), for lip-sync while it speaks */
  setLevel(level: number): void;
  /** Stop animating and let go of anything held */
  destroy(): void;
}

/** A face is made for an element to draw in */
export type FaceFactory = (host: HTMLElement) => Face;

/**
 * A stand-in until the Kattio face engine (components/kattio_face) is built for the browser: the icon and what the
 * assistant is doing, nothing more.
 */
export const placeholderFace: FaceFactory = (host) => {
  host.replaceChildren();
  const icon = document.createElement("ha-icon");
  icon.setAttribute("icon", "mdi:cat");
  icon.className = "face-icon";
  const status = document.createElement("div");
  status.className = "face-status";
  host.append(icon, status);
  const words: Record<FaceState, string> = {
    idle: "",
    listening: "Listening…",
    thinking: "Thinking…",
    speaking: "",
    error: "Something went wrong",
  };
  return {
    setState(state) {
      host.dataset.state = state;
      status.textContent = words[state];
    },
    setLevel() {},
    destroy() {
      host.replaceChildren();
    },
  };
};
