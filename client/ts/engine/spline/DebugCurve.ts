import { vec2, vec3, vec4 } from "gl-matrix";
import { GameContext } from "../GameContext";
import { GLAttributeImpl } from "../gl/internal/GLAttributeImpl";
import { GLBuffer } from "../gl/internal/GLBuffer";
import { GLBufferImpl } from "../gl/internal/GLBufferImpl";
import { GLIndexImpl } from "../gl/internal/GLIndexImpl";
import { RenderType } from "../internal/performanceanalytics";
import { ModelImpl } from "../loaders/internal/ModelImpl";
import { FillMaterial } from "../material/FillMaterial";
import { Model } from "../model/Model";
import { GameObject } from "../object/game/GameObject";
import { RenderContext, RenderPass } from "../render/RenderContext";
import { ParametricCurve } from "./ParametricCurve";

const ONE_OVER_SQRT_2 = 1 / Math.sqrt(2);

export class DebugCurve extends GameObject {
  // simple sweep, just position
  // orient along tangent, cross tangent and normal to get binormal

  private mat: FillMaterial;
  private model: Model;
  private buf: GLBufferImpl;
  private ind: GLBufferImpl;
  private curve: ParametricCurve;
  steps: number;

  updateDebugCurveOnDraw: boolean;

  /**
   * Creates a new DebugCurve.
   * @param ctx - game context
   * @param curve - curve which we are drawing
   * @param steps - number of steps to take while tracing the curve.
   */
  constructor(ctx: GameContext, curve: ParametricCurve, steps?: number) {
    super(ctx);

    // add a function for treating the curve as a piecewise, where we will ignore the step count
    // and simply step along the control points

    // create an abstract subclass of parametric called piecewise and another called continuous
    // based on which its an instance of, we'll pick some default handling

    this.mat = new FillMaterial(ctx);

    this.steps = steps;
    this.updateDebugCurveOnDraw = false;
    this.curve = curve;

    if (!steps || steps < 2) {
      // choose a fair default
      this.steps = 256;
    }

    this.updateCurve();

  }
  
  /**
   * Updates the stored curve model.
   * If `this.updateDebugCurveOnDraw` is true, this will be performed each time the curve is drawn.
   */
  updateCurve() {
    // alternative: store a copy of all control points, update when they change :(
    // a "dirty" bit would be helpful but there's no way to decouple it
    // a basic interface for maintaining version would work?
    const gl = this.getContext().getGLContext();
    const ctx = this.getContext();
    const curve = this.curve;

    // fix stepcount here instead of in ctor
    let stepCount = this.steps;

    stepCount = Math.round(stepCount);
    this.buf = new GLBufferImpl(ctx, undefined, gl.STREAM_DRAW);
    this.ind = new GLBufferImpl(ctx);

    const positionBuffer = this.buf;
    const indexBuffer = this.ind;

    let cur = 0;

    let indcur = 0;

    const indexArray = [1, 0, 5, 0, 4, 5];

    const tStep = 1.0 / (stepCount - 1);
    let temp = vec3.create();

    let tangent = curve.getTangent(0);
    let normal = curve.getNormal(0);
    let cross = vec3.create();
    vec3.cross(cross, tangent, normal);
    
    let crossOld = vec3.zero(vec3.create());
    let normalOld = vec3.zero(vec3.create());

    vec3.copy(crossOld, cross);
    vec3.copy(normalOld, normal);
    
    for (let i = 0; i < stepCount; i++) {
      tangent = curve.getTangent(i * tStep);
      // project last normal and last cross onto tangent plane
      vec3.sub(cross, crossOld, vec3.scale(temp, tangent, vec3.dot(crossOld, tangent)));
      vec3.sub(normal, normalOld, vec3.scale(temp, tangent, vec3.dot(normalOld, tangent)));

      // normalize
      vec3.normalize(cross, cross);
      vec3.normalize(normal, normal);
      // that's our new coord system, with ideally minimal twist!
      // problem: what if they fold onto each other?

      // make cross and normal perpendicular to one another :D
      vec3.sub(cross, cross, vec3.scale(temp, normal, vec3.dot(cross, normal)));
      // modify cross to reduce overlap
      vec3.normalize(cross, cross);
      vec3.copy(crossOld, cross);
      vec3.copy(normalOld, normal);

      vec3.scale(cross, cross, 0.2);
      vec3.scale(normal, normal, 0.2);

      const origin = curve.getPosition(tStep * i);
      vec3.add(temp, origin, cross);
      positionBuffer.setFloatArray(cur, temp, true);
      vec3.add(temp, origin, normal);
      positionBuffer.setFloatArray(cur + 12, temp, true);
      vec3.sub(temp, origin, cross);
      positionBuffer.setFloatArray(cur + 24, temp, true);
      vec3.sub(temp, origin, normal);
      positionBuffer.setFloatArray(cur + 36, temp, true);

      cur += 48;
      
      if (i >= 1) {
        for (let j = 0; j < 4; j++) {
          for (let k = 0; k < indexArray.length; k++) {
            const input = (indexArray[k] < 4 ? (indexArray[k] + j) % 4 : ((indexArray[k] + j) % 4) + 4);
            indexBuffer.setUint16(indcur, input + 4 * (i - 1), true);
            indcur += 2;
          }
        }
      }

    }

    const index = GLIndexImpl.createFromValues(indexBuffer, gl.UNSIGNED_SHORT, indcur / 2, 0);
    const position = GLAttributeImpl.createFromValues(positionBuffer, 3, gl.FLOAT, 4 * stepCount, 0, 0);

    this.model = new ModelImpl([{ positions: position, indices: index }]);
  }

  get color() {
    return Array.from(this.mat.col) as vec4;
  }

  set color(col: vec4) {
    this.mat.col = Array.from(col) as vec4;
  }

  renderMaterial(rc: RenderContext): void {
    const timer = this.getContext().getGPUTimer();
    const id = timer.startQuery();

    // todo: implement sweeping one path along another :D
    // for now: just use parametric curves

    // texcoords: use arc length, and 

    if (this.updateDebugCurveOnDraw) {
      this.updateCurve();
    }

    this.mat.modelMat = this.getTransformationMatrix();
    this.mat.vpMat = rc.getActiveCameraInfo().vpMatrix;
    this.mat.col = [1, 1, 1, 1];
    this.mat.drawMaterial(this.model);

    timer.stopQueryAndLog(id, "DebugCurve", rc.getRenderPass() === RenderPass.SHADOW ? RenderType.SHADOW : RenderType.FINAL);
  }
}