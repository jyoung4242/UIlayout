import { ImageSource, Loader } from "excalibur";
import frame from "./assets/frame.png";
import texture from "./assets/texture2.png";
import texture2 from "./assets/frameH.png";

export const Resources = {
  frame: new ImageSource(frame),
  texture: new ImageSource(texture),
  texture2: new ImageSource(texture2),
} as const;

export const loader = new Loader();

for (let res of Object.values(Resources)) {
  loader.addResource(res);
}
