import { vec4 } from "gl-matrix";
import { GameContext } from "../../../GameContext";
import { GameObject } from "../GameObject";
import { Light } from "./Light";

export class AmbientLightObject extends GameObject implements Light { 
  color: vec4;
  intensity: number;

  constructor(ctx: GameContext) {
    super(ctx);
    this.color = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
    this.intensity = 0.3;
  }
}