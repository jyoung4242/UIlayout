import { Engine, ScreenElement, Vector } from "excalibur";
import { NineSlice, NineSliceConfig, NineSliceStretch } from "../lib/9slice";
import { FlexContainer, ContainerConfig } from "../lib/Container";
import { Resources } from "../resources";

export class ParentHorizontal extends FlexContainer {
  firsttimeflag = true;
  slice: NineSlice;
  constructor(config: ContainerConfig) {
    super(config);
    const config9slice: NineSliceConfig = {
      source: Resources.frame,
      width: 400,
      height: 200,
      sourceConfig: {
        width: 96,
        height: 64,
        topMargin: 4,
        leftMargin: 3,
        bottomMargin: 4,
        rightMargin: 3,
      },
      destinationConfig: {
        drawCenter: true,
        stretchH: NineSliceStretch.Stretch,
        stretchV: NineSliceStretch.Stretch,
      },
    };

    this.slice = new NineSlice(config9slice);
    this.graphics.use(this.slice);

    class child extends ScreenElement {
      constructor() {
        super({
          width: 74,
          height: 74,
          x: 0,
          y: 0,
          anchor: Vector.Zero,
          z: 100,
        });
        this.graphics.use(Resources.texture2.toSprite());
      }
    }

    const mychild1 = new child();
    const mychild2 = new child();
    const mychild3 = new child();

    this.addChild(mychild1);
    this.addChild(mychild2);
    this.addChild(mychild3);
    this.registerChildPosition(mychild1);
    this.registerChildPosition(mychild2);
    this.registerChildPosition(mychild3);
  }

  onPostUpdate(engine: Engine, delta: number): void {
    if (this.isResizing && this.firsttimeflag) {
      //this.firsttimeflag = false;
      const delta = this.pointerPos.sub(this.origCoords);

      this.origCoords = this.pointerPos.clone();
      this.moveResizeChild(delta.x, delta.y);
      const config = this.slice.getConfig();

      if (!config.width || !config.height) return;
      config.width += delta.x;
      config.height += delta.y;
      this.slice = new NineSlice(config);
      this.graphics.use(this.slice);
    }
  }
}
