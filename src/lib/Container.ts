import { Actor, ActorArgs, Color, Engine, ImageSource, Rectangle, ScreenElement, Vector } from "excalibur";

//#region SVG
const svgString = `<svg version="1.1"
	 id="svg2"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" sodipodi:docname="resize-full.svg" inkscape:version="0.48.4 r9939"
	 xmlns="http://www.w3.org/2000/svg"   width="15px" height="15px"
	 viewBox="0 0 1200 1200" enable-background="new 0 0 1200 1200" xml:space="preserve">
<path id="path18934" fill="#000000ff" inkscape:connector-curvature="0"  d="M670.312,0l177.246,177.295L606.348,418.506l175.146,175.146
	l241.211-241.211L1200,529.688V0H670.312z M418.506,606.348L177.295,847.559L0,670.312V1200h529.688l-177.246-177.295
	l241.211-241.211L418.506,606.348z"/>
</svg>`;

const blob = new Blob([svgString], { type: "image/svg+xml" });
const url = URL.createObjectURL(blob);
const image = document.createElement("img");
image.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
image.src = url;

const resizeSVGImageResource = new ImageSource(image.src);
await resizeSVGImageResource.load();
//#endregion SVG

//#region defines

export enum ContainerDirection {
  Horizontal,
  Vertical,
}

export enum ContainerResize {
  enabled,
  disabled,
}

export enum ContainerChildJustification {
  Start,
  End,
  Center,
  SpaceEvenly,
  SpaceBetween,
  SpaceAround,
}

export enum ContainerChildAlignment {
  Start,
  End,
  Center,
}

export type ContainerConfig = ActorArgs & {
  direction?: ContainerDirection;
  childJustification?: ContainerChildJustification;
  childAlignment?: ContainerChildAlignment;
  resize?: ContainerResize;
  gap?: number;
  gutterX: number;
  gutterY: number;
};

class DefaultRectangle extends Rectangle {
  constructor(size: Vector) {
    super({
      width: size.x,
      height: size.y,
      color: Color.Transparent,
      strokeColor: Color.White,
    });

    this.lineWidth = 3;
  }
}

class ResizeChild extends ScreenElement {
  coords: Vector = new Vector(0, 0);
  constructor(public owner: FlexContainer) {
    super({
      width: 15,
      height: 15,
      x: owner.width - 20,
      y: owner.height - 20,
      anchor: Vector.Zero,
      z: 100,
    });
    this.graphics.use(resizeSVGImageResource.toSprite());
  }
  onInitialize(engine: Engine): void {
    this.coords = new Vector(this.width, this.height);

    this.on("pointerup", () => {
      document.body.style.cursor = "grab";
      this.owner.isResizing = false;
    });

    this.on("pointerdragstart", e => {
      this.owner.isResizing = true;
      this.owner.origCoords = e.coordinates.screenPos;
      document.body.style.cursor = "grabbing";
    });
    this.on("pointerdragend", e => {
      this.owner.isResizing = false;
      document.body.style.cursor = "default";
    });
  }
}

//#endregion defines

export class FlexContainer extends ScreenElement {
  resize: ContainerResize = ContainerResize.enabled;
  registeredChildren: (ScreenElement | Actor)[] = [];
  direction: ContainerDirection = ContainerDirection.Horizontal;
  childJustification: ContainerChildJustification = ContainerChildJustification.Start;
  childAlignment: ContainerChildAlignment = ContainerChildAlignment.Start;
  resizeChild: ScreenElement | null;
  isResizing: boolean = false;
  origCoords: Vector = new Vector(0, 0);
  pointerPos: Vector = new Vector(0, 0);
  oldDims: Vector = new Vector(0, 0);
  gap: number = 0;
  gutterX: number = 0;
  gutterY: number = 0;
  dirtyFlags: boolean = false;

  constructor(config: ContainerConfig) {
    super(config);
    this.direction = config.direction || ContainerDirection.Horizontal;
    this.childJustification = config.childJustification || ContainerChildJustification.Start;
    this.childAlignment = config.childAlignment || ContainerChildAlignment.Start;
    this.resize = config.resize || ContainerResize.enabled;
    this.gap = config.gap || 0;
    this.gutterX = config.gutterX || 0;
    this.gutterY = config.gutterY || 0;

    this.graphics.use(new DefaultRectangle(new Vector(this.width, this.height)));

    if (this.resize === ContainerResize.enabled) {
      this.resizeChild = new ResizeChild(this);
      this.addChild(this.resizeChild);
      this.pointer.useGraphicsBounds = true;
    } else this.resizeChild = null;
  }

  onInitialize(engine: Engine): void {
    let childrenPositions = vectorizeChildren(this.registeredChildren);
    let newChildPositions = getPositionOfChildren({
      containerWidth: this.graphics.localBounds.width,
      containerHeight: this.graphics.localBounds.height,
      childrenWidths: childrenPositions.map(c => c.x),
      childrenHeights: childrenPositions.map(c => c.y),
      justifyContent: this.childJustification,
      alignItems: this.childAlignment,
      gap: this.gap,
      gutterX: this.gutterX,
      gutterY: this.gutterY,
      flexDirection: this.direction,
    });
    newChildPositions.forEach((c, i) => {
      this.registeredChildren[i].pos = c;
    });
    this.oldDims = new Vector(this.graphics.bounds.width, this.graphics.bounds.height);
  }

  moveResizeChild(deltaX: number, deltaY: number) {
    if (this.resizeChild == null) return;
    this.dirtyFlags = true;
    this.resizeChild.pos.x += deltaX;
    this.resizeChild.pos.y += deltaY;
    this.graphics.recalculateBounds();
    this.oldDims = new Vector(this.graphics.localBounds.width, this.graphics.localBounds.height);
  }

  registerChildPosition(child: ScreenElement | Actor) {
    this.registeredChildren.push(child);
  }

  update(engine: Engine, delta: number): void {
    super.update(engine, delta);

    if (this.resize === ContainerResize.enabled) {
      this.pointerPos = engine.input.pointers.primary.lastWorldPos;
    }
    //@ts-ignore

    this.graphics.recalculateBounds();

    let graphicW = this.graphics.current?.width;
    let graphicH = this.graphics.current?.height;

    if (
      this.dirtyFlags ||
      didParentChangeDims(this.oldDims, new Vector(this.graphics.localBounds.width, this.graphics.localBounds.height))
    ) {
      this.dirtyFlags = false;
      //update calculations
      let childrenPositions = vectorizeChildren(this.registeredChildren);
      let newChildPositions = getPositionOfChildren({
        containerWidth: this.graphics.localBounds.width,
        containerHeight: this.graphics.localBounds.height,
        childrenWidths: childrenPositions.map(c => c.x),
        childrenHeights: childrenPositions.map(c => c.y),
        justifyContent: this.childJustification,
        alignItems: this.childAlignment,
        gap: this.gap,
        gutterX: this.gutterX,
        gutterY: this.gutterY,
        flexDirection: this.direction,
      });
      newChildPositions.forEach((c, i) => {
        this.registeredChildren[i].pos = c;
      });
      this.oldDims = new Vector(this.graphics.localBounds.width, this.graphics.localBounds.height);
    } else return;
  }
}

function didParentChangeDims(old: Vector, New: Vector): boolean {
  if (old.x !== New.x || old.y !== New.y) return true;
  return false;
}

function vectorizeChildren(children: (ScreenElement | Actor)[]): Vector[] {
  let result: Vector[] = [];
  children.forEach(c => {
    result.push(new Vector(c.width, c.height));
  });
  return result;
}

interface FlexboxCanvasParams {
  containerWidth: number;
  containerHeight: number;
  childrenWidths: number[];
  childrenHeights: number[];
  justifyContent: ContainerChildJustification;
  alignItems: ContainerChildAlignment;
  gap: number; // Space between elements
  gutterX: number; // Horizontal gutter (left and right)
  gutterY: number; // Vertical gutter (top and bottom)
  flexDirection: ContainerDirection; // Direction of layout (row or column)
}

function getPositionOfChildren(params: FlexboxCanvasParams): Vector[] {
  const {
    containerWidth,
    containerHeight,
    childrenWidths,
    childrenHeights,
    justifyContent,
    alignItems,
    gap,
    gutterX,
    gutterY,
    flexDirection,
  } = params;
  // debugger;
  const childrenCount = childrenWidths.length;

  if (flexDirection === ContainerDirection.Horizontal) {
    const totalChildrenWidth = childrenWidths.reduce((sum, w) => sum + w, 0) + (childrenCount - 1) * gap;
    const remainingWidth = containerWidth - totalChildrenWidth - 2 * gutterX;
    const positions = childrenWidths.map((_, index) => {
      // Only calculating positions
      const x = justifyStrategies[justifyContent]({
        remainingSpace: remainingWidth,
        count: childrenCount,
        index,
        sizes: childrenWidths,
        gutter: gutterX,
        gap,
      });

      const y = alignStrategies[alignItems]({
        containerSize: containerHeight,
        childSize: childrenHeights[index],
        gutter: gutterY,
      });
      return new Vector(x, y); // No size returned
    });
    return positions;
  } else {
    const totalChildrenHeight = childrenHeights.reduce((sum, h) => sum + h, 0) + (childrenCount - 1) * gap;
    const remainingHeight = containerHeight - totalChildrenHeight - 2 * gutterY;
    const positions = childrenHeights.map((_, index) => {
      const x = alignStrategies[alignItems]({
        containerSize: containerWidth,
        childSize: childrenWidths[index],
        gutter: gutterX,
      });
      const y = justifyStrategies[justifyContent]({
        remainingSpace: remainingHeight,
        count: childrenCount,
        index,
        sizes: childrenHeights,
        gutter: gutterY,
        gap,
      });
      return new Vector(x, y); // No size returned
    });
    return positions;
  }
}

// JustifyContent Strategies (horizontal alignment)
const justifyStrategies: { [key in ContainerChildJustification]: (params: any) => number } = {
  [ContainerChildJustification.Start]: ({ index, sizes, gutter, gap }: any) =>
    gutter + sizes.slice(0, index).reduce((sum: number, s: number) => sum + s, 0) + index * gap,

  [ContainerChildJustification.Center]: ({ remainingSpace, index, sizes, gutter, gap }: any) =>
    remainingSpace / 2 + gutter + sizes.slice(0, index).reduce((sum: number, s: number) => sum + s, 0) + index * gap,
  [ContainerChildJustification.End]: ({ remainingSpace, index, sizes, gutter, gap }: any) =>
    remainingSpace + gutter + sizes.slice(0, index).reduce((sum: number, s: number) => sum + s, 0) + index * gap,

  [ContainerChildJustification.SpaceBetween]: ({ remainingSpace, count, index, sizes, gutter }: any) =>
    gutter + sizes.slice(0, index).reduce((sum: number, s: number) => sum + s, 0) + (remainingSpace / (count - 1)) * index,

  [ContainerChildJustification.SpaceAround]: ({ remainingSpace, count, index, sizes, gutter }: any) =>
    gutter + (remainingSpace / count) * (index + 0.5) + sizes.slice(0, index).reduce((sum: number, s: number) => sum + s, 0),

  [ContainerChildJustification.SpaceEvenly]: ({ remainingSpace, count, index, sizes, gutter }: any) =>
    gutter + (remainingSpace / (count + 1)) * (index + 1) + sizes.slice(0, index).reduce((sum: number, s: number) => sum + s, 0),
};

// AlignItems Strategies (vertical alignment)
const alignStrategies: { [key in ContainerChildAlignment]: (params: any) => number } = {
  [ContainerChildAlignment.Start]: ({ gutter }: any) => gutter,

  [ContainerChildAlignment.Center]: ({ containerSize, childSize, gutter }: any) =>
    gutter + (containerSize - 2 * gutter - childSize) / 2,

  [ContainerChildAlignment.End]: ({ containerSize, childSize, gutter }: any) => containerSize - gutter - childSize,
};
