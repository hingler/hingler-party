import { mat3, mat4, ReadonlyMat4, vec3, vec4 } from "gl-matrix";
import { ShaderProgramBuilder } from "../gl/ShaderProgramBuilder";
import { SpotLightStruct } from "../gl/struct/SpotLightStruct";
import { GameContext } from "../GameContext";
import { Model } from "../model/Model";
import { Material } from "./Material";
import { GLProgramWrap } from "../gl/internal/GLProgramWrap";
import { getEnginePath } from "../internal/getEnginePath";
import { AttributeType } from "nekogirl-valhalla/model/AttributeType";

// temp
export interface Light {
  pos: vec4,
  intensity: number,
  diffuse: vec4,
  ambient: vec4
}

// TODO: swap to a spotlight here
// don't bother with shadows yet -- write a temp func which ignores them to get attenuation working
// then get shadows working and then we're good :)

export class MatteMaterial implements Material {
  private prog: WebGLProgram;

  private progWrap: GLProgramWrap;
  private ctx: GameContext;
  private spot: Array<SpotLightStruct>;
  vpMat: ReadonlyMat4;
  modelMat: ReadonlyMat4;
  color: vec4;
  cameraPos: vec3;


  private locs: {
    modelMat: WebGLUniformLocation,
    vpMat: WebGLUniformLocation,
    normalMat: WebGLUniformLocation,
    surfaceColor: WebGLUniformLocation,
    lightCount: WebGLUniformLocation,
    lightCountNoShadow: WebGLUniformLocation,
    cameraPos: WebGLUniformLocation
  }

  private attribs: {
    pos: number,
    norm: number
  }
  
  constructor(ctx: GameContext) {
    this.ctx = ctx;
    this.prog = null;

    this.vpMat = mat4.identity(mat4.create());
    this.modelMat = mat4.identity(mat4.create());
    this.color = vec4.create();

    this.cameraPos = vec3.create();

    new ShaderProgramBuilder(ctx)
      .withVertexShader(getEnginePath("engine/glsl/matteshader/matteshader.vert"))
      .withFragmentShader(getEnginePath("engine/glsl/matteshader/matteshader.frag"))
      .build()
      .then((prog) => {
        this.prog = prog;
        let gl = this.ctx.getGLContext();

        this.locs = {
          modelMat: gl.getUniformLocation(prog, "model_matrix"),
          vpMat: gl.getUniformLocation(prog, "vp_matrix"),
          normalMat: gl.getUniformLocation(prog, "normal_matrix"),
          surfaceColor: gl.getUniformLocation(prog, "surface_color"),
          lightCount: gl.getUniformLocation(prog, "spotlightCount"),
          lightCountNoShadow: gl.getUniformLocation(prog, "spotlightCount_no_shadow"),
          cameraPos: gl.getUniformLocation(prog, "camera_pos")
        };

        this.attribs = {
          pos: gl.getAttribLocation(prog, "position"),
          norm: gl.getAttribLocation(prog, "normal")
        }

        this.progWrap = new GLProgramWrap(this.ctx.getGLContext(), this.prog);
      })
      .catch((err) => {
        console.error(err);
      })
  }

  setSpotLight(light: Array<SpotLightStruct>) {
    this.spot = light; 
    if (this.spot.length > 4) {
      this.spot = this.spot.slice(0, 4);
    }
  }

  // good TODO for here: create a debug camera that i can pilot around :3

  drawMaterial(model: Model) {
    let gl = this.ctx.getGLContext();
    const wrap = this.ctx.getGL();
    if (this.prog !== null) {
      wrap.useProgram(this.prog);
      let normalMat = mat3.create();
      mat3.fromMat4(normalMat, this.modelMat);
      mat3.invert(normalMat, normalMat);
      mat3.transpose(normalMat, normalMat);

      gl.uniformMatrix4fv(this.locs.modelMat, false, this.modelMat);
      gl.uniformMatrix4fv(this.locs.vpMat, false, this.vpMat);
      gl.uniformMatrix3fv(this.locs.normalMat, false, normalMat);
      gl.uniform4fv(this.locs.surfaceColor, this.color);

      // recalculates uniform locations on every bind
      // maybe if we've seen the prog and the name, we have the locations already?
      // whatever

      let shadowSpot = 0;
      let noShadowSpot = 0;
      if (this.spot) {
        for (let i = 0; i < this.spot.length; i++) {
          this.spot[i].setShadowTextureIndex(i + 4);
          if (this.spot[i].hasShadow() && shadowSpot < 4) {
            this.spot[i].bindToUniformByName(this.progWrap, `spotlight[${i}]`, true);
            shadowSpot++;
          } else {
            this.spot[i].bindToUniformByName(this.progWrap, `spotlight_no_shadow[${i}]`, false);
            noShadowSpot++;
          }
        }
      }

      gl.uniform1i(this.locs.lightCount, shadowSpot);
      gl.uniform1i(this.locs.lightCountNoShadow, noShadowSpot);

      gl.uniform3fv(this.locs.cameraPos, this.cameraPos);
      
      model.bindAttribute(AttributeType.POSITION, this.attribs.pos);
      model.bindAttribute(AttributeType.NORMAL, this.attribs.norm);

      model.draw();
    }
  }
}