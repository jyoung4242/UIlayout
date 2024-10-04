import "./style.css";
import { UI } from "@peasy-lib/peasy-ui";
import { Engine, DisplayMode, Color, Vector } from "excalibur";
import { model, template } from "./UI/UI";
import { loader } from "./resources";
import { Parent } from "./UI/Parent";
import { ContainerDirection, ContainerResize, ContainerChildAlignment, ContainerChildJustification } from "./lib/Container";
import { ParentHorizontal } from "./UI/HParent";

await UI.create(document.body, model, template).attached;

const game = new Engine({
  width: 800, // the width of the canvas
  height: 600, // the height of the canvas
  canvasElementId: "cnv", // the DOM canvas element ID, if you are providing your own
  displayMode: DisplayMode.Fixed, // the display mode
  pixelArt: true,
  backgroundColor: Color.Gray,
  suppressPlayButton: true,
});

await game.start(loader);

const parentContainer = new Parent({
  name: "parentContainer",
  width: 325,
  height: 300,
  x: 50,
  y: 50,
  anchor: Vector.Zero,
  z: 4,
  opacity: 1,
  direction: ContainerDirection.Vertical,
  childJustification: ContainerChildJustification.Center,
  childAlignment: ContainerChildAlignment.Center,
  resize: ContainerResize.enabled,
  gap: 15,
  gutterX: 20,
  gutterY: 0,
});

const parentContainerH = new ParentHorizontal({
  name: "parentContainerH",
  width: 400,
  height: 200,
  x: 350,
  y: 375,
  anchor: Vector.Zero,
  z: 4,
  opacity: 1,
  direction: ContainerDirection.Horizontal,
  childJustification: ContainerChildJustification.SpaceBetween,
  childAlignment: ContainerChildAlignment.End,
  resize: ContainerResize.enabled,
  gap: 0,
  gutterX: 10,
  gutterY: 25,
});

game.add(parentContainer);
game.add(parentContainerH);
